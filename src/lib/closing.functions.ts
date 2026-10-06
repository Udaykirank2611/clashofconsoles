import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadClosingHistory, loadDailyClosing } from "./closing/load.server";
import type { ClosingReportRow, DailyClosingSummary } from "./closing/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Ctx = { supabase: Parameters<typeof loadDailyClosing>[0]; userId: string };

/** IST calendar date `daysAgo` days before today. */
const istDate = (daysAgo: number) =>
  new Date(Date.now() + 5.5 * 3600_000 - daysAgo * 86_400_000).toISOString().slice(0, 10);

/**
 * Auto-closes finished business days (last 3 days, India time) that nobody closed manually.
 * Never overwrites an existing report, so manual closes always win.
 */
async function autoCloseMissedDays({ supabase, userId }: Ctx) {
  const dates = [1, 2, 3].map(istDate);
  const { data: branches } = await supabase.from("branches").select("id").eq("is_active", true);
  const { data: existing } = await supabase
    .from("daily_closing_reports")
    .select("branch_id, report_date")
    .in("report_date", dates);
  const done = new Set((existing ?? []).map((r) => `${r.branch_id}|${r.report_date}`));
  for (const br of branches ?? []) {
    for (const date of dates) {
      if (done.has(`${br.id}|${date}`)) continue;
      const summary = await loadDailyClosing(supabase, userId, { branchId: br.id, date });
      if (!summary) break; // no access to this branch
      const t = summary.totals;
      await supabase.from("daily_closing_reports").upsert(
        {
          branch_id: br.id,
          report_date: date,
          closed_by: null,
          closed_by_email: "Auto-closed",
          notes: "Automatically closed after the business day ended.",
          total_bookings: t.totalBookings,
          completed_bookings: t.completedBookings,
          cancelled_bookings: t.cancelledBookings,
          pending_bookings: t.pendingBookings,
          total_customers: t.totalCustomers,
          gaming_revenue: t.gamingRevenue,
          food_revenue: t.foodRevenue,
          membership_revenue: t.membershipRevenue,
          coupon_discounts: t.couponDiscounts,
          student_discounts: t.studentDiscounts,
          cash_revenue: t.cashRevenue,
          upi_revenue: t.upiRevenue,
          total_revenue: t.totalRevenue,
          snapshot: JSON.parse(JSON.stringify({ ...summary, closed: null })),
        },
        { onConflict: "branch_id,report_date", ignoreDuplicates: true },
      );
    }
  }
}

/** Live Daily Closing summary for one branch and one date. */
export const getDailyClosing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ branchId: z.string().uuid(), date: z.string().regex(DATE) }).parse(i),
  )
  .handler(async ({ data, context }): Promise<DailyClosingSummary | null> => {
    await autoCloseMissedDays(context).catch(() => undefined);
    return loadDailyClosing(context.supabase, context.userId, data);
  });

/** Permanently stores the day's closing report. Re-closing refreshes the stored snapshot. */
export const closeBusinessDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: z.string().uuid(),
        date: z.string().regex(DATE),
        notes: z.string().max(500).default(""),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const summary = await loadDailyClosing(context.supabase, context.userId, data);
    if (!summary) return { ok: false, message: "You cannot close this branch's day." };

    const t = summary.totals;
    const { error } = await context.supabase.from("daily_closing_reports").upsert(
      {
        branch_id: data.branchId,
        report_date: data.date,
        closed_by: context.userId,
        closed_by_email: (context.claims as { email?: string } | null)?.email ?? null,
        notes: data.notes,
        total_bookings: t.totalBookings,
        completed_bookings: t.completedBookings,
        cancelled_bookings: t.cancelledBookings,
        pending_bookings: t.pendingBookings,
        total_customers: t.totalCustomers,
        gaming_revenue: t.gamingRevenue,
        food_revenue: t.foodRevenue,
        membership_revenue: t.membershipRevenue,
        coupon_discounts: t.couponDiscounts,
        student_discounts: t.studentDiscounts,
        cash_revenue: t.cashRevenue,
        upi_revenue: t.upiRevenue,
        total_revenue: t.totalRevenue,
        snapshot: JSON.parse(JSON.stringify(summary)),
      },
      { onConflict: "branch_id,report_date" },
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/** Saved Daily Closing reports for the history view. */
export const listClosingReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: z.string().uuid().nullable(),
        from: z.string().regex(DATE),
        to: z.string().regex(DATE),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<ClosingReportRow[]> => {
    await autoCloseMissedDays(context).catch(() => undefined);
    return loadClosingHistory(context.supabase, data);
  });
