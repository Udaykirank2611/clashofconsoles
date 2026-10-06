import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loadAnalytics } from "@/lib/analytics/load.server";
import type { ClosingReportRow, DailyClosingSummary } from "./types";

type Client = SupabaseClient<Database>;

const hourLabel = (hour: number) =>
  `${String(hour % 12 === 0 ? 12 : hour % 12).padStart(2, "0")}:00 ${hour < 12 ? "AM" : "PM"}`;

/** Builds the complete Daily Closing summary for one branch and one date. */
export async function loadDailyClosing(
  supabase: Client,
  userId: string,
  input: { branchId: string; date: string },
): Promise<DailyClosingSummary | null> {
  const analytics = await loadAnalytics(supabase, userId, {
    branchId: input.branchId,
    from: input.date,
    to: input.date,
  });
  if (!analytics) return null;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("game_title, start_time, end_time, status")
    .eq("branch_id", input.branchId)
    .eq("booking_date", input.date);

  const gameCount = new Map<string, number>();
  let durationTotal = 0;
  let durationRows = 0;
  for (const b of bookings ?? []) {
    if (b.game_title) gameCount.set(b.game_title, (gameCount.get(b.game_title) ?? 0) + 1);
    if (b.start_time && b.end_time && b.status !== "cancelled" && b.status !== "expired") {
      const mins =
        Number(b.end_time.slice(0, 2)) * 60 + Number(b.end_time.slice(3, 5)) -
        (Number(b.start_time.slice(0, 2)) * 60 + Number(b.start_time.slice(3, 5)));
      if (mins > 0) {
        durationTotal += mins;
        durationRows += 1;
      }
    }
  }

  const k = analytics.kpis;
  const topStation = [...analytics.utilization].sort((a, b) => b.bookedMinutes - a.bookedMinutes)[0];
  const topFood = analytics.food.topByQuantity[0];
  const topCoupon = analytics.coupons.top[0];
  const topGame = [...gameCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const peak = [...analytics.peakHours].sort((a, b) => b.bookings - a.bookings)[0];
  const topBranch = [...analytics.branchComparison].sort((a, b) => b.revenue - a.revenue)[0];
  const capacity = analytics.utilization.reduce((s, r) => s + r.capacityMinutes, 0);
  const booked = analytics.utilization.reduce((s, r) => s + r.bookedMinutes, 0);

  const { data: closedRow } = await supabase
    .from("daily_closing_reports")
    .select("id, created_at, closed_by_email, notes")
    .eq("branch_id", input.branchId)
    .eq("report_date", input.date)
    .maybeSingle();

  return {
    date: input.date,
    branchId: input.branchId,
    branchName: analytics.scope.branchName,
    totals: {
      totalBookings: k.totalBookings,
      completedBookings: k.completed,
      cancelledBookings: k.cancelled,
      pendingBookings: k.pending,
      totalCustomers: analytics.customers.unique,
      // Every booking currently reaches the system through the website.
      walkInCustomers: 0,
      websiteBookings: k.totalBookings,
      gamingRevenue: k.gamingRevenue,
      foodRevenue: k.foodRevenue,
      membershipRevenue: analytics.memberships.revenue,
      couponDiscounts: analytics.coupons.discount,
      studentDiscounts: analytics.student.amount,
      cashRevenue: k.cashRevenue,
      upiRevenue: k.upiRevenue,
      totalRevenue: k.totalRevenue,
    },
    popular: {
      console: topStation?.name ?? "—",
      game: topGame?.[0] ?? "—",
      food: topFood?.name ?? "—",
      coupon: topCoupon?.code ?? "—",
      membership: analytics.memberships.topPlan ?? "—",
    },
    insights: {
      peakHour: peak && peak.bookings > 0 ? hourLabel(peak.hour) : "—",
      avgDurationMinutes: durationRows ? Math.round(durationTotal / durationRows) : 0,
      avgCustomerSpend: analytics.customers.unique
        ? Math.round(k.totalRevenue / analytics.customers.unique)
        : 0,
      mostActiveBranch: topBranch?.branch ?? analytics.scope.branchName,
      consoleUtilization: capacity ? Math.round((booked / capacity) * 100) : 0,
    },
    analytics,
    closed: closedRow
      ? {
          id: closedRow.id,
          closedAt: closedRow.created_at,
          closedBy: closedRow.closed_by_email,
          notes: closedRow.notes,
        }
      : null,
  };
}

/** Saved closing reports, newest first, within an optional date window. */
export async function loadClosingHistory(
  supabase: Client,
  input: { branchId: string | null; from: string; to: string },
): Promise<ClosingReportRow[]> {
  let query = supabase
    .from("daily_closing_reports")
    .select("*, branches(name)")
    .gte("report_date", input.from)
    .lte("report_date", input.to)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (input.branchId) query = query.eq("branch_id", input.branchId);
  const { data } = await query;
  return ((data ?? []) as unknown as (Record<string, unknown> & { branches: { name: string } | null })[]).map(
    (r) => ({
      id: String(r['id']),
      branchId: String(r['branch_id']),
      branchName: r.branches?.name ?? "—",
      reportDate: String(r['report_date']),
      closedAt: String(r['created_at']),
      closedByEmail: (r['closed_by_email'] as string | null) ?? null,
      notes: String(r['notes'] ?? ""),
      totalBookings: Number(r['total_bookings'] ?? 0),
      totalRevenue: Number(r['total_revenue'] ?? 0),
      summary: (r['snapshot'] as DailyClosingSummary | null) ?? null,
    }),
  );
}
