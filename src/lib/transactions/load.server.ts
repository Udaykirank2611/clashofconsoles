import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { computeOpening } from "./opening.server";
import type {
  CashBankSummary,
  DepositRow,
  ExpenseRow,
  TransactionRow,
  TransactionTotals,
  TransactionsPayload,
  TxSource,
  TxStatus,
  UpiProvider,
} from "./types";

type Client = SupabaseClient<Database>;

const num = (v: unknown) => Number(v ?? 0) || 0;
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const SERVICE_BY_TYPE: Record<string, string> = {
  console: "PS5",
  driving_simulator: "Cockpit",
  vr: "VR",
  snooker: "Snooker Table",
  private_theatre: "Private Theatre",
  private_lounge: "Gaming Lounge",
};

/** Every confirmed booking in the window, shaped as a transaction ledger row. */
export async function loadTransactions(
  supabase: Client,
  input: { branchId: string | null; from: string; to: string },
): Promise<TransactionsPayload> {
  // Bookings are only completed when staff press "Mark completed" — never automatically.
  let q = supabase
    .from("bookings")
    .select(
      "id, reference, booking_date, branch_id, customer_name, customer_phone, players, booking_type, start_time, end_time, station_id, pass_id, coupon_id, session_amount, addons_amount, food_amount, student_discount_amount, gaming_discount_amount, food_discount_amount, bill_discount_amount, total_amount, payment_mode, status, special_instructions, branches(name), gaming_stations(name, station_type), booking_items(kind, label, station_id, start_time, end_time, gaming_stations(name, station_type))",
    )
    .gte("booking_date", input.from)
    .lte("booking_date", input.to)
    .in("status", ["confirmed", "completed", "cancelled"])
    .order("booking_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (input.branchId) q = q.eq("branch_id", input.branchId);

  let ex = supabase
    .from("daily_expenses")
    .select("*")
    .gte("expense_date", input.from)
    .lte("expense_date", input.to)
    .order("expense_date", { ascending: true })
    .order("paid_at", { ascending: true });
  if (input.branchId) ex = ex.eq("branch_id", input.branchId);

  let dp = supabase
    .from("cash_deposits")
    .select("*")
    .gte("deposit_date", input.from)
    .lte("deposit_date", input.to)
    .order("deposit_date", { ascending: true })
    .order("paid_at", { ascending: true });
  if (input.branchId) dp = dp.eq("branch_id", input.branchId);

  const [bookingsRes, txRes, expensesRes, depositsRes, opening, customersRes] = await Promise.all([
    q,
    supabase.from("booking_transactions").select("*"),
    ex,
    dp,
    computeOpening(supabase, { branchId: input.branchId, from: input.from }),
    supabase.from("customers").select("phone, total_visits"),
  ]);

  const bookings = ((bookingsRes.data ?? []) as unknown[]) as unknown as (Record<string, unknown> & {
    branches: { name: string } | null;
    gaming_stations: { name: string; station_type: string } | null;
    booking_items:
      | {
          kind: string;
          label: string | null;
          station_id: string | null;
          start_time: string | null;
          end_time: string | null;
          gaming_stations: { name: string; station_type: string } | null;
        }[]
      | null;
  })[];

  const txByBooking = new Map(
    ((txRes.data ?? []) as Record<string, unknown>[]).map((t) => [String(t['booking_id']), t]),
  );
  const visits = new Map(
    ((customersRes.data ?? []) as { phone: string; total_visits: number }[]).map((c) => [
      c.phone,
      Number(c.total_visits ?? 0),
    ]),
  );

  const rows: TransactionRow[] = bookings.flatMap((b) => {
    const tx = txByBooking.get(String(b['id']));
    const gaming = num(b['session_amount']) + num(b['addons_amount']);
    const food = num(b['food_amount']);
    const coupon =
      num(b['gaming_discount_amount']) + num(b['food_discount_amount']) + num(b['bill_discount_amount']);
    const student = num(b['student_discount_amount']);
    const total = num(b['total_amount']);
    const membership = b['pass_id']
      ? Math.max(0, Math.round(gaming + food - coupon - student - total))
      : 0;

    // Experiences (cockpit, VR, theatre, lounge) are booked as add-on line items,
    // so the station and the slot times live on the item, not the booking row.
    const addons = (b.booking_items ?? []).filter((i) => i.kind === "addon" && i.gaming_stations);
    const timed = addons.filter((i) => i.start_time && i.end_time);
    const station = b.gaming_stations ?? addons[0]?.gaming_stations ?? null;
    const start = b['start_time']
      ? String(b['start_time'])
      : (timed.map((i) => i.start_time!).sort()[0] ?? null);
    const end = b['end_time']
      ? String(b['end_time'])
      : (timed.map((i) => i.end_time!).sort().at(-1) ?? null);

    // A confirmed session is only money once staff mark it completed; passes and
    // food-only sales have no slot to wait for, so they land in the ledger at once.
    if (b['status'] === "confirmed" && start && end) return [];

    const service = b['booking_type'] === "group"
      ? "Party Booking"
      : station
        ? (SERVICE_BY_TYPE[station.station_type] ?? station.name)
        : b['pass_id']
          ? "Membership Redemption"
          : food > 0
            ? "Food Only"
            : b['coupon_id']
              ? "Coupon Redemption"
              : "Booking";

    const phone = String(b['customer_phone'] ?? "");

    return [{
      id: String(b['id']),
      bookingId: String(b['id']),
      reference: String(b['reference'] ?? ""),
      date: String(b['booking_date']),
      branchId: String(b['branch_id']),
      branch: b.branches?.name ?? "—",
      customer: String(b['customer_name'] ?? ""),
      phone,
      service,
      consoleName: station?.name ?? addons[0]?.label ?? "—",
      checkIn: start,
      checkOut: end,
      durationMinutes: start && end ? Math.max(0, minutes(end) - minutes(start)) : 0,
      players: Number(b['players'] ?? 1),
      visitNumber: visits.get(phone) ?? 0,
      gamingAmount: gaming,
      foodAmount: food,
      membershipDiscount: membership,
      couponDiscount: coupon,
      studentDiscount: student,
      totalDiscount: coupon + student + membership,
      finalAmount: total,
      // Derived from the recorded split so the ledger is the single source of truth.
      paymentMode: (() => {
        const c = num(tx?.['cash_amount']);
        const u = num(tx?.['upi_amount']);
        if (c > 0 && u > 0) return "mixed" as const;
        if (c > 0) return "cash" as const;
        if (u > 0) return "upi" as const;
        return (b['payment_mode'] === "cash" || b['payment_mode'] === "upi" ? b['payment_mode'] : "") as
          | "cash"
          | "upi"
          | "";
      })(),
      upiProvider: (tx?.['upi_provider'] as UpiProvider | null) ?? null,
      cashAmount: num(tx?.['cash_amount']),
      upiAmount: num(tx?.['upi_amount']),
      status: (tx?.['transaction_status'] as TxStatus) ?? (b['status'] === "completed" ? "completed" : "pending"),
      source: (tx?.['booking_source'] as TxSource) ?? "website",
      notes: String(tx?.['admin_notes'] ?? b['special_instructions'] ?? ""),
    }];
  });

  const expenses: ExpenseRow[] = ((expensesRes.data ?? []) as Record<string, unknown>[]).map((e) => ({
    id: String(e['id']),
    branchId: String(e['branch_id']),
    date: String(e['expense_date']),
    name: String(e['name']),
    amount: num(e['amount']),
    description: String(e['description'] ?? ""),
    time: String(e['paid_at'] ?? "").slice(0, 5),
    paidFrom: (e['paid_from'] as "cash" | "bank") ?? "cash",
  }));

  const deposits: DepositRow[] = ((depositsRes.data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: String(d['id']),
    branchId: String(d['branch_id']),
    date: String(d['deposit_date']),
    name: String(d['name']),
    amount: num(d['amount']),
    description: String(d['description'] ?? ""),
    time: String(d['paid_at'] ?? "").slice(0, 5),
    depositTo: (d['deposit_to'] as "cash" | "bank") ?? "cash",
  }));

  const live = rows.filter((r) => r.status !== "cancelled" && r.status !== "refunded");
  const totals: TransactionTotals = {
    gamingRevenue: live.reduce((s, r) => s + r.gamingAmount, 0),
    foodRevenue: live.reduce((s, r) => s + r.foodAmount, 0),
    totalRevenue: live.reduce((s, r) => s + r.finalAmount, 0),
    cashCollection: live.reduce((s, r) => s + r.cashAmount, 0),
    upiCollection: live.reduce((s, r) => s + r.upiAmount, 0),
    totalDiscounts: live.reduce((s, r) => s + r.totalDiscount, 0),
    totalBookings: live.length,
    averageBookingValue: live.length
      ? Math.round(live.reduce((s, r) => s + r.finalAmount, 0) / live.length)
      : 0,
    totalGamingHours:
      Math.round((live.reduce((s, r) => s + r.durationMinutes, 0) / 60) * 10) / 10,
  };



  const expensesCash = expenses.filter((e) => e.paidFrom === "cash").reduce((s, e) => s + e.amount, 0);
  const expensesBank = expenses.filter((e) => e.paidFrom === "bank").reduce((s, e) => s + e.amount, 0);

  const depositsCash = deposits.filter((d) => d.depositTo === "cash").reduce((s, d) => s + d.amount, 0);
  const depositsBank = deposits.filter((d) => d.depositTo === "bank").reduce((s, d) => s + d.amount, 0);

  // Month-to-date averages: divide by the day-of-month of the window's end date.
  const monthStart = `${input.to.slice(0, 7)}-01`;
  const dayOfMonth = Math.max(1, Number(input.to.slice(8, 10)) || 1);
  let mq = supabase
    .from("bookings")
    .select("total_amount, status")
    .gte("booking_date", monthStart)
    .lte("booking_date", input.to)
    .eq("status", "completed")
    .limit(5000);
  if (input.branchId) mq = mq.eq("branch_id", input.branchId);
  const monthRes = await mq;
  const monthRevenue = ((monthRes.data ?? []) as Record<string, unknown>[]).reduce(
    (s, b) => s + num(b['total_amount']),
    0,
  );

  const closingCash = opening.cash + totals.cashCollection + depositsCash - expensesCash;
  const closingBank = opening.bank + totals.upiCollection + depositsBank - expensesBank;

  const cashBank: CashBankSummary = {
    openingCash: opening.cash,
    openingBank: opening.bank,
    cashReceived: totals.cashCollection,
    upiReceived: totals.upiCollection,
    depositsCash,
    depositsBank,
    expensesCash,
    expensesBank,
    closingCash,
    closingBank,
    avgBalance: Math.round((closingCash + closingBank) / dayOfMonth),
    avgRevenue: Math.round(monthRevenue / dayOfMonth),
  };


  return {
    from: input.from,
    to: input.to,
    branchName: input.branchId ? (rows[0]?.branch ?? "Branch") : "All branches",
    rows,
    expenses,
    deposits,
    totals,
    cashBank,
    totalExpenses: expensesCash + expensesBank,
    totalDeposits: depositsCash + depositsBank,
  };
}
