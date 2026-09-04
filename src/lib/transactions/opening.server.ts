import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

const num = (v: unknown) => Number(v ?? 0) || 0;

/**
 * Opening balances are never entered by staff. Each branch has one baseline
 * row in `daily_opening_balances`; every day after that opens with whatever
 * the previous days left behind:
 *
 *   opening = baseline + collections + deposits - expenses  (before `from`)
 *
 * Because the carry-forward is derived, a late-entered expense dated before
 * the current day immediately corrects today's opening balance.
 */
export async function computeOpening(
  supabase: Client,
  input: { branchId: string | null; from: string },
): Promise<{ cash: number; bank: number }> {
  let ob = supabase
    .from("daily_opening_balances")
    .select("branch_id, balance_date, opening_cash, opening_bank")
    .lte("balance_date", input.from)
    .order("balance_date", { ascending: true });
  if (input.branchId) ob = ob.eq("branch_id", input.branchId);
  const { data: baseRows } = await ob;

  // Latest baseline at or before the requested day, per branch.
  const baseline = new Map<string, { date: string; cash: number; bank: number }>();
  for (const r of (baseRows ?? []) as Record<string, unknown>[]) {
    baseline.set(String(r['branch_id']), {
      date: String(r['balance_date']),
      cash: num(r['opening_cash']),
      bank: num(r['opening_bank']),
    });
  }
  if (!baseline.size) return { cash: 0, bank: 0 };

  const earliest = [...baseline.values()].map((b) => b.date).sort()[0]!;
  if (earliest >= input.from) {
    return [...baseline.values()].reduce(
      (a, b) => ({ cash: a.cash + b.cash, bank: a.bank + b.bank }),
      { cash: 0, bank: 0 },
    );
  }

  let ex = supabase
    .from("daily_expenses")
    .select("branch_id, expense_date, amount, paid_from")
    .gte("expense_date", earliest)
    .lt("expense_date", input.from);
  let dp = supabase
    .from("cash_deposits")
    .select("branch_id, deposit_date, amount, deposit_to")
    .gte("deposit_date", earliest)
    .lt("deposit_date", input.from);
  let bk = supabase
    .from("booking_transactions")
    .select("branch_id, cash_amount, upi_amount, transaction_status, bookings!inner(booking_date, status, start_time, end_time)")
    .gte("bookings.booking_date", earliest)
    .lt("bookings.booking_date", input.from);
  if (input.branchId) {
    ex = ex.eq("branch_id", input.branchId);
    dp = dp.eq("branch_id", input.branchId);
    bk = bk.eq("branch_id", input.branchId);
  }

  const [exRes, dpRes, bkRes] = await Promise.all([ex, dp, bk]);

  const totals = { cash: 0, bank: 0 };
  for (const [branchId, base] of baseline) {
    totals.cash += base.cash;
    totals.bank += base.bank;

    for (const e of (exRes.data ?? []) as Record<string, unknown>[]) {
      if (String(e['branch_id']) !== branchId || String(e['expense_date']) < base.date) continue;
      if (e['paid_from'] === "bank") totals.bank -= num(e['amount']);
      else totals.cash -= num(e['amount']);
    }
    for (const d of (dpRes.data ?? []) as Record<string, unknown>[]) {
      if (String(d['branch_id']) !== branchId || String(d['deposit_date']) < base.date) continue;
      if (d['deposit_to'] === "bank") totals.bank += num(d['amount']);
      else totals.cash += num(d['amount']);
    }
    for (const t of (bkRes.data ?? []) as unknown as (Record<string, unknown> & {
      bookings: { booking_date: string; status: string; start_time: string | null; end_time: string | null } | null;
    })[]) {
      if (String(t['branch_id']) !== branchId) continue;
      const b = t.bookings;
      if (!b || b.booking_date < base.date) continue;
      const status = String(t['transaction_status'] ?? "");
      if (status === "cancelled" || status === "refunded") continue;
      if (b.status === "cancelled") continue;
      // A confirmed session is only money once staff mark it completed.
      if (b.status === "confirmed" && b.start_time && b.end_time) continue;
      totals.cash += num(t['cash_amount']);
      totals.bank += num(t['upi_amount']);
    }
  }

  return { cash: Math.round(totals.cash * 100) / 100, bank: Math.round(totals.bank * 100) / 100 };
}
