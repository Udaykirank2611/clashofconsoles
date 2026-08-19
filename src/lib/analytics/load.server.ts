import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  buildDrilldownRows,
  buildReportRows,
  computeAnalytics,
  hasGaming,
  isFoodOnly,
  isPending,
  isRealized,
  SERVICE_LABELS,
  type RawBooking,
  type RawBranch,
  type RawStation,
  type DrilldownSelection,
} from "./compute";
import type { AnalyticsResult, DrilldownRow, ReportRow, ReportType } from "./types";

type Client = SupabaseClient<Database>;

const BOOKING_SELECT =
  "id, reference, branch_id, station_id, booking_date, start_time, end_time, players, booking_type, group_members, status, customer_name, customer_phone, coupon_code, session_amount, addons_amount, food_amount, gaming_discount_amount, food_discount_amount, bill_discount_amount, discount_amount, student_discount, student_discount_amount, tax_amount, total_amount, payment_utr, payment_mode, pass_id, pass_minutes, payment_submitted_at, created_at, booking_transactions(cash_amount, upi_amount), gaming_stations(name, station_type), booking_items(kind, label, quantity, line_total, unit_price, menu_item_id, station_id, start_time, end_time)";

/** Branch ids this admin may read, or null when the account has no admin role. */
async function resolveScope(supabase: Client, userId: string, branchId: string | null) {
  const [{ data: roles }, { data: branchRows }] = await Promise.all([
    supabase.from("user_roles").select("role, branch_id").eq("user_id", userId),
    supabase.from("branches").select("id, name, opens_at, closes_at").order("sort_order"),
  ]);
  if (!roles?.length) return null;
  const isOwner = roles.some((r) => r.role === "owner");
  const all = (branchRows ?? []) as RawBranch[];
  const allowed = isOwner ? all : all.filter((b) => roles.some((r) => r.branch_id === b.id));
  if (!allowed.length) return null;
  if (branchId && !allowed.some((b) => b.id === branchId)) return null;
  const branches = branchId ? allowed.filter((b) => b.id === branchId) : allowed;
  return {
    isOwner,
    branches,
    ids: branches.map((b) => b.id),
    branchName: branchId ? (branches[0]?.name ?? "") : "All branches",
  };
}

async function fetchBookings(supabase: Client, ids: string[], from: string, to: string) {
  // Flip finished sessions to completed so revenue only lands after the slot ends.
  {
    // Runs with server privileges: the routine is not exposed to signed-in clients.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("complete_past_bookings");
  }
  const { data } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .in("branch_id", ids)
    .gte("booking_date", from)
    .lte("booking_date", to)
    .order("booking_date", { ascending: false })
    .limit(5000);
  return (data ?? []) as unknown as RawBooking[];
}

export async function loadAnalytics(
  supabase: Client,
  userId: string,
  input: { branchId: string | null; from: string; to: string },
): Promise<AnalyticsResult | null> {
  const scope = await resolveScope(supabase, userId, input.branchId);
  if (!scope) return null;

  const [bookings, stationsRes, menuRes, couponRes, redemptionRes, plansRes] = await Promise.all([
    fetchBookings(supabase, scope.ids, input.from, input.to),
    supabase.from("gaming_stations").select("id, branch_id, name, station_type, status, is_addon").in("branch_id", scope.ids),
    supabase.from("menu_items").select("id, category").in("branch_id", scope.ids),
    supabase.from("coupons").select("id, code, category").in("branch_id", scope.ids),
    supabase
      .from("coupon_redemptions")
      .select("coupon_id, coupon_code, discount_amount, booking_id, created_at")
      .in("branch_id", scope.ids)
      .gte("created_at", `${input.from}T00:00:00`)
      .lte("created_at", `${input.to}T23:59:59.999`),
    supabase.from("membership_plans").select("name, branch_id").in("branch_id", scope.ids),
  ]);

  // customers + rewards are owner-restricted rows; read them with the service
  // client only after the role check above succeeded.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: customers }, { data: rewards }] = await Promise.all([
    supabaseAdmin.from("customers").select("phone, total_visits"),
    supabaseAdmin.from("rewards").select("phone, status, booking_id"),
  ]);

  const couponCategory = new Map((couponRes.data ?? []).map((c) => [c.id, String(c.category)]));
  const phonesInScope = new Set(bookings.map((b) => b.customer_phone));

  // First-ever booking date per phone decides "new" vs "returning" in this range.
  const { data: firstRows } = await supabase
    .from("bookings")
    .select("customer_phone, booking_date")
    .in("branch_id", scope.ids)
    .in("customer_phone", [...phonesInScope].slice(0, 800))
    .order("booking_date", { ascending: true })
    .limit(5000);
  const firstSeen = new Map<string, string>();
  for (const r of firstRows ?? []) {
    if (!firstSeen.has(r.customer_phone)) firstSeen.set(r.customer_phone, r.booking_date);
  }

  return computeAnalytics({
    from: input.from,
    to: input.to,
    branchId: input.branchId,
    branchName: scope.branchName,
    bookings,
    stations: (stationsRes.data ?? []) as RawStation[],
    branches: scope.branches,
    menuCategories: new Map((menuRes.data ?? []).map((m) => [m.id, m.category])),
    couponsCreated: couponRes.data?.length ?? 0,
    redemptions: (redemptionRes.data ?? []).map((r) => ({
      coupon_code: r.coupon_code,
      discount_amount: Number(r.discount_amount),
      category: couponCategory.get(r.coupon_id) ?? "entire_bill",
      booking_id: r.booking_id,
    })),
    rewards: (rewards ?? []).map((r) => ({ status: r.status, booking_id: r.booking_id, phone: r.phone })),
    lifetimeVisits: new Map((customers ?? []).map((c) => [c.phone, Number(c.total_visits ?? 0)])),
    firstSeen,
    membershipPlans: (plansRes.data ?? []).map((p) => ({ name: p.name, branch_id: p.branch_id })),
  });
}

export async function loadReport(
  supabase: Client,
  userId: string,
  input: { branchId: string | null; from: string; to: string; type: ReportType },
): Promise<ReportRow[]> {
  const scope = await resolveScope(supabase, userId, input.branchId);
  if (!scope) return [];
  const bookings = await fetchBookings(supabase, scope.ids, input.from, input.to);
  return buildReportRows(bookings, new Map(scope.branches.map((b) => [b.id, b.name])), input.type);
}

/** Underlying bookings/sessions behind one analytics chart slice. */
export async function loadDrilldown(
  supabase: Client,
  userId: string,
  input: { branchId: string | null; from: string; to: string } & DrilldownSelection,
): Promise<DrilldownRow[]> {
  const scope = await resolveScope(supabase, userId, input.branchId);
  if (!scope) return [];
  const [bookings, stationsRes] = await Promise.all([
    fetchBookings(supabase, scope.ids, input.from, input.to),
    supabase
      .from("gaming_stations")
      .select("id, branch_id, name, station_type, status, is_addon")
      .in("branch_id", scope.ids),
  ]);
  return buildDrilldownRows(
    bookings,
    (stationsRes.data ?? []) as RawStation[],
    new Map(scope.branches.map((b) => [b.id, b.name])),
    { kind: input.kind, key: input.key },
  );
}

export interface TodayOverview {
  date: string;
  branches: {
    branchId: string;
    branch: string;
    open: boolean;
    opensAt: string;
    closesAt: string;
    services: { type: string; total: number; available: number; occupied: number; maintenance: number }[];
  }[];
  activeSessions: number;
  upcoming: number;
  pendingVerification: number;
  pendingFoodOrders: number;
  todaysRevenue: number;
  todaysBookings: number;
}

export async function loadTodayOverview(
  supabase: Client,
  userId: string,
  branchId: string | null,
): Promise<TodayOverview | null> {
  const scope = await resolveScope(supabase, userId, branchId);
  if (!scope) return null;
  // The venue runs on IST; the server clock is UTC, so derive both the date and
  // the current minute-of-day in Asia/Kolkata or availability lags by hours.
  const { nowInIst } = await import("@/lib/availability");
  const { date, minutes: nowMinutes } = nowInIst();


  const [bookings, stationsRes] = await Promise.all([
    fetchBookings(supabase, scope.ids, date, date),
    supabase
      .from("gaming_stations")
      .select("id, branch_id, name, station_type, status, is_addon")
      .in("branch_id", scope.ids),
  ]);
  const stations = (stationsRes.data ?? []) as RawStation[];

  const toMin = (t?: string | null) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const live = bookings.filter((b) => b.status !== "cancelled" && b.status !== "expired");
  const occupiedStations = new Set<string>();
  let activeSessions = 0;
  let upcoming = 0;
  for (const b of live) {
    const slots: { stationId: string | null; start: number | null; end: number | null }[] = [
      { stationId: b.station_id, start: toMin(b.start_time), end: toMin(b.end_time) },
      ...b.booking_items
        .filter((i) => i.kind === "addon" && i.station_id)
        .map((i) => ({ stationId: i.station_id, start: toMin(i.start_time), end: toMin(i.end_time) })),
    ];
    let running = false;
    let later = false;
    for (const s of slots) {
      if (s.start == null || s.end == null) continue;
      if (s.start <= nowMinutes && nowMinutes < s.end) {
        running = true;
        if (s.stationId) occupiedStations.add(s.stationId);
      } else if (s.start > nowMinutes) later = true;
    }
    if (running) activeSessions += 1;
    else if (later) upcoming += 1;
  }

  const branchRows = scope.branches.map((br) => {
    const open = (() => {
      const o = toMin(br.opens_at) ?? 0;
      const c = toMin(br.closes_at) ?? 0;
      return c > o ? nowMinutes >= o && nowMinutes < c : nowMinutes >= o || nowMinutes < c;
    })();
    const byType = new Map<string, { total: number; available: number; occupied: number; maintenance: number }>();
    for (const st of stations.filter((s) => s.branch_id === br.id)) {
      const key = SERVICE_LABELS[st.station_type] ?? st.station_type;
      const row = byType.get(key) ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
      row.total += 1;
      if (st.status !== "available") row.maintenance += 1;
      else if (occupiedStations.has(st.id)) row.occupied += 1;
      else row.available += 1;
      byType.set(key, row);
    }
    return {
      branchId: br.id,
      branch: br.name,
      open,
      opensAt: br.opens_at,
      closesAt: br.closes_at,
      services: [...byType.entries()].map(([type, v]) => ({ type, ...v })),
    };
  });

  return {
    date,
    branches: branchRows,
    activeSessions,
    upcoming,
    pendingVerification: bookings.filter((b) => b.status === "payment_pending" || b.status === "pending").length,
    pendingFoodOrders: bookings.filter((b) => isFoodOnly(b) && isPending(b.status)).length,
    todaysRevenue: Math.round(
      bookings
        .filter(isRealized)
        .reduce((s, b) => s + Number(b.total_amount), 0),
    ),
    todaysBookings: live.filter(hasGaming).length,
  };
}
