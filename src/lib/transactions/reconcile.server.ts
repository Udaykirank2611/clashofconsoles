import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { computeOpening } from "./opening.server";
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
      "id, reference, booking_date, branch_id, customer_name, total_amount, payment_mode, status, station_id, branches(name)",
    )
    .gte("booking_date", input.from)
    .lte("booking_date", input.to)
    .or("status.eq.completed,and(status.eq.confirmed,station_id.is.null)")
    .order("booking_date", { ascending: true })
    .limit(5000);
  if (input.branchId) bq = bq.eq("branch_id", input.branchId);

  let eq_ = supabase
    .from("daily_expenses")
    .select("amount, paid_from")
    .gte("expense_date", input.from)
    .lte("expense_date", input.to);
  if (input.branchId) eq_ = eq_.eq("branch_id", input.branchId);

  let dq = supabase
    .from("cash_deposits")
    .select("amount, deposit_to")
    .gte("deposit_date", input.from)
    .lte("deposit_date", input.to);
  if (input.branchId) dq = dq.eq("branch_id", input.branchId);

  const [bookingsRes, txRes, expensesRes, depositsRes, opening] = await Promise.all([
    bq,
    supabase.from("booking_transactions").select("*"),
    eq_,
    dq,
    computeOpening(supabase, { branchId: input.branchId, from: input.from }),
  ]);

  const bookings = (bookingsRes.data ?? []) as unknown as (Record<string, unknown> & {
    branches: { name: string } | null;
  })[];
  const txByBooking = new Map(
    ((txRes.data ?? []) as Record<string, unknown>[]).map((t) => [String(t['booking_id']), t]),
  );

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
    const tx = txByBooking.get(id);
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

    const mode = b['payment_mode'] ? String(b['payment_mode']) : "";
    if ((mode === "cash" && upi > 0) || (mode === "upi" && cash > 0)) {
      issues.push({
        ...base,
        ledgerAmount: recorded,
        difference: 0,
        kind: "mode_mismatch",
        detail: `Booking marked as ${mode.toUpperCase()} but the ledger split records cash ${cash} / UPI ${upi}.`,
      });
      continue;
    }

    matched += 1;
  }

  const expenses = (expensesRes.data ?? []) as { amount: number; paid_from: string }[];
  const expensesCash = expenses
    .filter((e) => e.paid_from !== "bank")
    .reduce((s, e) => s + num(e.amount), 0);
  const expensesBank = expenses
    .filter((e) => e.paid_from === "bank")
    .reduce((s, e) => s + num(e.amount), 0);

  const depositRows = (depositsRes.data ?? []) as { amount: number; deposit_to: string }[];
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
