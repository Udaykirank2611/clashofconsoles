import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadClosingHistory, loadDailyClosing } from "./closing/load.server";
import type { ClosingReportRow, DailyClosingSummary } from "./closing/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Live Daily Closing summary for one branch and one date. */
export const getDailyClosing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ branchId: z.string().uuid(), date: z.string().regex(DATE) }).parse(i),
  )
  .handler(async ({ data, context }): Promise<DailyClosingSummary | null> =>
    loadDailyClosing(context.supabase, context.userId, data),
  );

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
        snapshot: summary as unknown as Record<string, unknown>,
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
  .handler(async ({ data, context }): Promise<ClosingReportRow[]> =>
    loadClosingHistory(context.supabase, data),
  );
