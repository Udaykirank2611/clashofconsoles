import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadAnalytics, loadDrilldown, loadReport, loadTodayOverview } from "./analytics/load.server";
import type { AnalyticsResult, DrilldownRow, ReportRow } from "./analytics/types";
import type { TodayOverview } from "./analytics/load.server";

const scopeSchema = z.object({
  branchId: z.string().uuid().nullable(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Aggregated analytics for the selected branch scope + date range. */
export const getAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => scopeSchema.parse(i))
  .handler(async ({ data, context }): Promise<AnalyticsResult | null> =>
    loadAnalytics(context.supabase, context.userId, data),
  );

/** Flat report rows honouring the same scope, plus the report type. */
export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    scopeSchema.extend({ type: z.enum(["gaming", "food", "combined"]) }).parse(i),
  )
  .handler(async ({ data, context }): Promise<ReportRow[]> =>
    loadReport(context.supabase, context.userId, data),
  );

/** Exact bookings/sessions behind a clicked chart slice. */
export const getDrilldown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    scopeSchema
      .extend({ kind: z.enum(["hour", "station", "service"]), key: z.string().min(1) })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<DrilldownRow[]> =>
    loadDrilldown(context.supabase, context.userId, data),
  );

/** Live operational snapshot for today, for the selected branch scope. */
export const getTodayOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ branchId: z.string().uuid().nullable() }).parse(i))
  .handler(async ({ data, context }): Promise<TodayOverview | null> =>
    loadTodayOverview(context.supabase, context.userId, data.branchId),
  );
