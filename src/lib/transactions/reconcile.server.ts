import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { computeOpening } from "./opening.server";
import { readAllPages } from "./pages";
import type { ReconciliationPayload, ReconciliationIssue } from "./types";

type Client = SupabaseClient<Database>;

const num = (v: unknown) => Number(v ?? 0) || 0;
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Compares the transaction ledger against confirmed bookings and the
 * opening/closing cash & bank summary, and reports every discrepancy.
 */
export async function loadReconciliation(
  supabase: Client,
  input: { branchId: string | null; from: string; to: string },
): Promise<ReconciliationPayload> {
  let bq = supabase
    .from("bookings")
    .select(
      "id, reference, booking_date, branch_id, customer_name, total_amount, payment_mode, status, station_id, start_time, end_time, branches(name), booking_items(kind, start_time, end_time), booking_transactions(booking_id, cash_amount, upi_amount, transaction_status)",
    )
    .gte("booking_date", input.from)
    .lte("booking_date", input.to)
    .in("status", ["completed", "confirmed"])
    .order("booking_date", { ascending: true })
    .order("id", { ascending: true });
  if (input.branchId) bq = bq.eq("branch_id", input.branchId);

  let eq_ = supabase
    .from("daily_expenses")
    .select("amount, paid_from")
    .gte("expense_date", input.from)
    .lte("expense_date", input.to)
    .order("id", { ascending: true });
  if (input.branchId) eq_ = eq_.eq("branch_id", input.branchId);

  let dq = supabase
    .from("cash_deposits")
    .select("amount, deposit_to")
    .gte("deposit_date", input.from)
    .lte("deposit_date", input.to)
    .order("id", { ascending: true });
  if (input.branchId) dq = dq.eq("branch_id", input.branchId);

  // Read each booking with its own ledger row; never match against a separate,
  // potentially incomplete global ledger fetch. RLS still applies to both.
  const [bookingRows, expenseRows, depositRows, opening] = await Promise.all([
    readAllPages((from, to) => bq.range(from, to)),
    readAllPages((from, to) => eq_.range(from, to)),
    readAllPages((from, to) => dq.range(from, to)),
    computeOpening(supabase, { branchId: input.branchId, from: input.from }),
  ]);

  const bookings = (bookingRows as unknown as (Record<string, unknown> & {
    branches: { name: string } | null;
    booking_items: { kind: string; start_time: string | null; end_time: string | null }[] | null;
    booking_transactions: Record<string, unknown>[] | Record<string, unknown> | null;
  })[]).filter((b) => b['status'] === "completed" || !(
    (b['start_time'] && b['end_time']) ||
    b.booking_items?.some((i) => i.kind === "addon" && i.start_time && i.end_time)
  ));

  const issues: ReconciliationIssue[] = [];
  let bookingsTotal = 0;
  let ledgerTotal = 0;
  let ledgerCash = 0;
  let ledgerUpi = 0;
  let matched = 0;
  let missing = 0;

  for (const b of bookings) {
    const id = String(b['id']);
    const total = num(b['total_amount']);
    const tx = Array.isArray(b.booking_transactions) ? b.booking_transactions[0] : b.booking_transactions;
    bookingsTotal += total;

    const base = {
      bookingId: id,
      reference: String(b['reference'] ?? ""),
      date: String(b['booking_date']),
      branch: b.branches?.name ?? "—",
      customer: String(b['customer_name'] ?? ""),
      bookingAmount: total,
    };

    if (!tx) {
      missing += 1;
      issues.push({
        ...base,
        ledgerAmount: 0,
        difference: total,
        kind: "missing_ledger",
        detail: "Confirmed booking has no transaction ledger entry.",
      });
      continue;
    }

    const cash = num(tx['cash_amount']);
    const upi = num(tx['upi_amount']);
    const recorded = cash + upi;
    ledgerTotal += recorded;
    ledgerCash += cash;
    ledgerUpi += upi;

    const status = String(tx['transaction_status'] ?? "");
    if (status === "cancelled" || status === "refunded") {
      issues.push({
        ...base,
        ledgerAmount: recorded,
        difference: round(total - recorded),
        kind: "status_mismatch",
        detail: `Booking is ${String(b['status'])} but the ledger entry is ${status}.`,
      });
      continue;
    }

    const diff = round(total - recorded);
    if (Math.abs(diff) >= 1) {
      issues.push({
        ...base,
        ledgerAmount: recorded,
        difference: diff,
        kind: recorded === 0 ? "unrecorded_payment" : "amount_mismatch",
        detail:
          recorded === 0
            ? "No cash or UPI amount recorded against this booking."
            : `Cash + UPI recorded (${recorded}) does not match the booking total (${total}).`,
      });
      continue;
    }

    matched += 1;
  }

  const expenses = expenseRows as { amount: number; paid_from: string }[];
  const expensesCash = expenses
    .filter((e) => e.paid_from !== "bank")
    .reduce((s, e) => s + num(e.amount), 0);
  const expensesBank = expenses
    .filter((e) => e.paid_from === "bank")
    .reduce((s, e) => s + num(e.amount), 0);

  const depositsCash = depositRows
    .filter((d) => d.deposit_to !== "bank")
    .reduce((s, d) => s + num(d.amount), 0);
  const depositsBank = depositRows
    .filter((d) => d.deposit_to === "bank")
    .reduce((s, d) => s + num(d.amount), 0);

  const expectedClosingCash = round(opening.cash + ledgerCash + depositsCash - expensesCash);
  const expectedClosingBank = round(opening.bank + ledgerUpi + depositsBank - expensesBank);

  return {
    from: input.from,
    to: input.to,
    branchName: input.branchId ? (bookings[0]?.branches?.name ?? "Branch") : "All branches",
    totals: {
      bookingsCount: bookings.length,
      matchedCount: matched,
      issueCount: issues.length,
      missingLedgerCount: missing,
      bookingsTotal: round(bookingsTotal),
      ledgerTotal: round(ledgerTotal),
      variance: round(bookingsTotal - ledgerTotal),
      ledgerCash: round(ledgerCash),
      ledgerUpi: round(ledgerUpi),
    },
    cash: {
      openingCash: round(opening.cash),
      openingBank: round(opening.bank),
      cashReceived: round(ledgerCash),
      upiReceived: round(ledgerUpi),
      depositsCash: round(depositsCash),
      depositsBank: round(depositsBank),
      expensesCash: round(expensesCash),
      expensesBank: round(expensesBank),
      expectedClosingCash,
      expectedClosingBank,
    },
    issues,
  };
}
