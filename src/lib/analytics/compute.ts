import type {
  AnalyticsResult,
  BranchCompareRow,
  DayPoint,
  FoodItemRow,
  ReportRow,
  ReportType,
  ServiceRow,
  UtilizationRow,
} from "./types";

/* Pure aggregation helpers. Everything here is derived from live booking rows —
   no totals are stored or duplicated anywhere. */

export interface RawItem {
  kind: "food" | "addon";
  label: string;
  quantity: number;
  line_total: number;
  unit_price: number;
  menu_item_id: string | null;
  station_id: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface RawBooking {
  id: string;
  reference: string;
  branch_id: string;
  station_id: string | null;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  players: number;
  status: string;
  customer_name: string;
  customer_phone: string;
  coupon_code: string | null;
  session_amount: number;
  addons_amount: number;
  food_amount: number;
  gaming_discount_amount: number;
  food_discount_amount: number;
  bill_discount_amount: number;
  discount_amount: number;
  student_discount: boolean;
  student_discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_utr: string | null;
  payment_mode: string | null;
  booking_type?: string | null;
  group_members?: number | null;
  pass_id?: string | null;
  pass_minutes?: number | null;
  payment_submitted_at: string | null;
  created_at: string;
  /** Recorded cash/UPI split — the single source of truth for collections. */
  booking_transactions?:
    | { cash_amount: number | string | null; upi_amount: number | string | null }[]
    | { cash_amount: number | string | null; upi_amount: number | string | null }
    | null;
  gaming_stations: { name: string; station_type: string } | null;
  booking_items: RawItem[];
}


export interface RawStation {
  id: string;
  branch_id: string;
  name: string;
  station_type: string;
  status: string;
  is_addon: boolean;
}

export interface RawBranch {
  id: string;
  name: string;
  opens_at: string;
  closes_at: string;
}

/** Statuses that represent money actually earned (a session is earned once it ends). */
export const REVENUE_STATUSES = ["completed"] as const;
/** Statuses that represent money still unconfirmed. */
export const PENDING_STATUSES = ["pending", "payment_pending", "awaiting_payment"] as const;

const n = (v: unknown) => Number(v ?? 0) || 0;
export const isRevenue = (s: string) => (REVENUE_STATUSES as readonly string[]).includes(s);
/**
 * Money is realised only once the session is over. Non-refundable purchases
 * without a gaming slot (passes, food) count as soon as they are confirmed.
 */
export const isRealized = (b: { status: string; station_id?: string | null }) =>
  b.status === "completed" || (b.status === "confirmed" && !b.station_id);
export const isPending = (s: string) => (PENDING_STATUSES as readonly string[]).includes(s);

export const SERVICE_LABELS: Record<string, string> = {
  console: "PS5 Gaming",
  driving_simulator: "Cockpit Racing",
  vr: "VR Gaming",
  snooker: "Snooker",
  private_theatre: "Private Theatre",
  private_lounge: "Private Gaming Lounge",
};

/** The ledger row attached to a booking, whichever shape PostgREST returns. */
const ledgerRow = (b: RawBooking) =>
  Array.isArray(b.booking_transactions) ? b.booking_transactions[0] : b.booking_transactions;

/** Cash collected against a booking, straight from the transaction ledger. */
export const ledgerCash = (b: RawBooking) => Number(ledgerRow(b)?.cash_amount ?? 0) || 0;
/** UPI collected against a booking, straight from the transaction ledger. */
export const ledgerUpi = (b: RawBooking) => Number(ledgerRow(b)?.upi_amount ?? 0) || 0;

/** Normalised payment-mode label used everywhere in analytics + reports. */
export const paymentModeLabel = (mode?: string | null) =>
  mode === "upi" ? "UPI" : mode === "cash" ? "Cash" : mode === "mixed" ? "Cash + UPI" : "Not recorded";

/** Payment label derived from what was actually collected against a booking. */
export const bookingPaymentLabel = (b: RawBooking) => {
  const cash = ledgerCash(b);
  const upi = ledgerUpi(b);
  if (cash > 0 && upi > 0) return "Cash + UPI";
  if (cash > 0) return "Cash";
  if (upi > 0) return "UPI";
  return paymentModeLabel(b.payment_mode);
};


const minutes = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Splits one booking's money into gaming vs food, mirroring the live billing
 * order: category coupons + student discount first, then the entire-bill coupon
 * spread proportionally, then tax spread proportionally.
 */
export function splitBooking(b: RawBooking) {
  const gamingGross = n(b.session_amount) + n(b.addons_amount);
  const foodGross = n(b.food_amount);
  const gBase = Math.max(0, gamingGross - n(b.gaming_discount_amount) - n(b.student_discount_amount));
  const fBase = Math.max(0, foodGross - n(b.food_discount_amount));
  const base = gBase + fBase;
  const bill = Math.min(n(b.bill_discount_amount), base);
  const gBill = base > 0 ? (bill * gBase) / base : 0;
  const gNet = gBase - gBill;
  const fNet = fBase - (bill - gBill);
  const net = gNet + fNet;
  const tax = n(b.tax_amount);
  const gTax = net > 0 ? (tax * gNet) / net : 0;
  return {
    gamingGross,
    foodGross,
    gamingDiscount: n(b.gaming_discount_amount) + n(b.student_discount_amount) + gBill,
    foodDiscount: n(b.food_discount_amount) + (bill - gBill),
    gaming: gNet + gTax,
    food: fNet + (tax - gTax),
    total: n(b.total_amount),
  };
}

export const isFoodOnly = (b: RawBooking) => n(b.session_amount) + n(b.addons_amount) <= 0 && n(b.food_amount) > 0;
export const hasGaming = (b: RawBooking) => n(b.session_amount) + n(b.addons_amount) > 0;

const dayList = (from: string, to: string) => {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (d <= end && out.length < 800) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

/** Total booked minutes on a station inside one booking (session slot + timed add-ons). */
function stationMinutes(b: RawBooking) {
  const out = new Map<string, number>();
  const add = (stationId: string | null, start?: string | null, end?: string | null) => {
    const s = minutes(start);
    const e = minutes(end);
    if (!stationId || s == null || e == null || e <= s) return;
    out.set(stationId, (out.get(stationId) ?? 0) + (e - s));
  };
  add(b.station_id, b.start_time, b.end_time);
  for (const item of b.booking_items) {
    if (item.kind === "addon" && item.station_id) add(item.station_id, item.start_time, item.end_time);
  }
  return out;
}

export interface ComputeInput {
  from: string;
  to: string;
  branchId: string | null;
  branchName: string;
  bookings: RawBooking[];
  stations: RawStation[];
  branches: RawBranch[];
  menuCategories: Map<string, string>;
  couponsCreated: number;
  redemptions: { coupon_code: string; discount_amount: number; category: string; booking_id: string }[];
  rewards: { status: string; booking_id: string | null; phone: string }[];
  lifetimeVisits: Map<string, number>;
  firstSeen: Map<string, string>;
  membershipPlans: { name: string; branch_id: string }[];
}

export function computeAnalytics(input: ComputeInput): AnalyticsResult {
  const { bookings, stations, branches } = input;
  const branchName = new Map(branches.map((b) => [b.id, b.name]));

  const revenueRows = bookings.filter(isRealized);
  const pendingRows = bookings.filter((b) => isPending(b.status));

  let gamingRevenue = 0;
  let foodRevenue = 0;
  let totalRevenue = 0;
  for (const b of revenueRows) {
    const s = splitBooking(b);
    gamingRevenue += s.gaming;
    foodRevenue += s.food;
    totalRevenue += s.total;
  }
  const pendingAmount = pendingRows.reduce((s, b) => s + n(b.total_amount), 0);

  const counted = bookings.filter((b) => b.status !== "cancelled" && b.status !== "expired");
  const gamingBookings = counted.filter(hasGaming).length;
  const foodOrders = counted.filter(isFoodOnly).length;

  const kpis = {
    totalRevenue: Math.round(totalRevenue),
    gamingRevenue: Math.round(gamingRevenue),
    foodRevenue: Math.round(foodRevenue),
    pendingAmount: Math.round(pendingAmount),
    gamingBookings,
    foodOrders,
    totalBookings: bookings.length,
    completed: bookings.filter((b) => b.status === "completed").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    expired: bookings.filter((b) => b.status === "expired").length,
    pending: pendingRows.length,
    avgValue: revenueRows.length ? Math.round(totalRevenue / revenueRows.length) : 0,
    // Collections come from the transaction ledger, the single source of truth.
    upiRevenue: Math.round(revenueRows.reduce((s2, b) => s2 + ledgerUpi(b), 0)),
    cashRevenue: Math.round(revenueRows.reduce((s2, b) => s2 + ledgerCash(b), 0)),

    ...(() => {
      /* Membership passes redeemed instead of paying for the session. */
      const passRows = counted.filter((b) => Boolean(b.pass_id));
      return {
        passRedemptions: passRows.length,
        passMinutes: passRows.reduce((s2, b) => s2 + n(b.pass_minutes), 0),
      };
    })(),
    ...(() => {
      /* Group Pass: whole-café bookings, tracked separately from single passes. */
      const groupCounted = counted.filter((b) => b.booking_type === "group");
      const groupRevenueRows = revenueRows.filter((b) => b.booking_type === "group");
      const members = groupCounted.reduce((s2, b) => s2 + n(b.group_members), 0);
      const minutes = groupCounted.reduce(
        (s2, b) => s2 + [...stationMinutes(b).values()].reduce((a, m) => a + m, 0),
        0,
      );
      return {
        groupBookings: groupCounted.length,
        groupRevenue: Math.round(
          groupRevenueRows.reduce((s2, b) => s2 + splitBooking(b).total, 0),
        ),
        avgGroupSize: groupCounted.length ? Math.round((members / groupCounted.length) * 10) / 10 : 0,
        avgGroupDurationMinutes: groupCounted.length ? Math.round(minutes / groupCounted.length) : 0,
      };
    })(),
  };

  // ---- payment modes ------------------------------------------------------
  // Split bookings contribute to both buckets, exactly as recorded in the ledger.
  const paymentModes = {
    upi: {
      revenue: Math.round(revenueRows.reduce((s2, b) => s2 + ledgerUpi(b), 0)),
      bookings: revenueRows.filter((b) => ledgerUpi(b) > 0).length,
    },
    cash: {
      revenue: Math.round(revenueRows.reduce((s2, b) => s2 + ledgerCash(b), 0)),
      bookings: revenueRows.filter((b) => ledgerCash(b) > 0).length,
    },
    unrecorded: (() => {
      const rows = revenueRows.filter((b) => ledgerCash(b) + ledgerUpi(b) <= 0);
      return {
        revenue: Math.round(rows.reduce((s2, b) => s2 + n(b.total_amount), 0)),
        bookings: rows.length,
      };
    })(),
  };


  // ---- daily series -------------------------------------------------------
  const byDay = new Map<string, DayPoint>();
  for (const date of dayList(input.from, input.to)) {
    byDay.set(date, {
      date,
      gaming: 0,
      food: 0,
      total: 0,
      bookings: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
      pending: 0,
    });
  }
  for (const b of bookings) {
    const point = byDay.get(b.booking_date);
    if (!point) continue;
    point.bookings += 1;
    if (b.status === "completed") point.completed += 1;
    if (b.status === "cancelled") point.cancelled += 1;
    if (b.status === "expired") point.expired += 1;
    if (isPending(b.status)) point.pending += 1;
    if (isRealized(b)) {
      const s = splitBooking(b);
      point.gaming += Math.round(s.gaming);
      point.food += Math.round(s.food);
      point.total += Math.round(s.total);
    }
  }
  const series = [...byDay.values()];

  // ---- peak hours ---------------------------------------------------------
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, bookings: 0 }));
  for (const b of counted) {
    if (!hasGaming(b)) continue;
    const start = minutes(b.start_time);
    const end = minutes(b.end_time);
    if (start == null) continue;
    const last = end != null && end > start ? Math.ceil(end / 60) : Math.floor(start / 60) + 1;
    for (let h = Math.floor(start / 60); h < Math.min(24, last); h += 1) hours[h]!.bookings += 1;
  }

  // ---- console utilisation ------------------------------------------------
  const days = dayList(input.from, input.to).length || 1;
  const capacityFor = (branchId: string) => {
    const br = branches.find((x) => x.id === branchId);
    const open = minutes(br?.opens_at) ?? 600;
    const close = minutes(br?.closes_at) ?? 1380;
    return Math.max(0, (close > open ? close - open : 24 * 60 - open + close)) * days;
  };
  const bookedByStation = new Map<string, number>();
  const gamingMinutesByBranch = new Map<string, number>();
  for (const b of counted) {
    for (const [stationId, mins] of stationMinutes(b)) {
      bookedByStation.set(stationId, (bookedByStation.get(stationId) ?? 0) + mins);
      gamingMinutesByBranch.set(b.branch_id, (gamingMinutesByBranch.get(b.branch_id) ?? 0) + mins);
    }
  }
  const utilization: UtilizationRow[] = stations
    .map((st) => {
      const booked = bookedByStation.get(st.id) ?? 0;
      // Stations out of service contribute no bookable capacity.
      const capacity = st.status === "available" ? capacityFor(st.branch_id) : 0;
      return {
        stationId: st.id,
        name: st.name,
        type: SERVICE_LABELS[st.station_type] ?? st.station_type,
        branch: branchName.get(st.branch_id) ?? "",
        status: st.status,
        bookedMinutes: booked,
        capacityMinutes: capacity,
        utilization: capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0,
      };
    })
    .sort((a, b) => b.utilization - a.utilization);

  // ---- service performance ------------------------------------------------
  const stationType = new Map(stations.map((s) => [s.id, s.station_type]));
  const serviceMap = new Map<string, { bookings: number; minutes: number; revenue: number }>();
  for (const b of counted) {
    const revenue = isRealized(b) ? splitBooking(b).gaming : 0;
    const mins = stationMinutes(b);
    const total = [...mins.values()].reduce((s, m) => s + m, 0);
    for (const [stationId, m] of mins) {
      const type = stationType.get(stationId) ?? b.gaming_stations?.station_type ?? "console";
      const row = serviceMap.get(type) ?? { bookings: 0, minutes: 0, revenue: 0 };
      row.bookings += 1;
      row.minutes += m;
      row.revenue += total > 0 ? (revenue * m) / total : 0;
      serviceMap.set(type, row);
    }
  }
  const services: ServiceRow[] = [...serviceMap.entries()]
    .map(([type, r]) => ({
      type: SERVICE_LABELS[type] ?? type,
      bookings: r.bookings,
      hours: Math.round((r.minutes / 60) * 10) / 10,
      revenue: Math.round(r.revenue),
      avgValue: r.bookings ? Math.round(r.revenue / r.bookings) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ---- food ---------------------------------------------------------------
  const foodItems = new Map<string, FoodItemRow>();
  let foodOrderCount = 0;
  for (const b of revenueRows) {
    const lines = b.booking_items.filter((i) => i.kind === "food");
    if (lines.length) foodOrderCount += 1;
    for (const line of lines) {
      const category = (line.menu_item_id ? input.menuCategories.get(line.menu_item_id) : null) ?? "Other";
      const key = `${line.label}|${category}`;
      const row = foodItems.get(key) ?? { name: line.label, category, quantity: 0, revenue: 0 };
      row.quantity += n(line.quantity);
      row.revenue += n(line.line_total);
      foodItems.set(key, row);
    }
  }
  const foodRows = [...foodItems.values()];
  const categoryMap = new Map<string, { category: string; quantity: number; revenue: number }>();
  for (const r of foodRows) {
    const c = categoryMap.get(r.category) ?? { category: r.category, quantity: 0, revenue: 0 };
    c.quantity += r.quantity;
    c.revenue += r.revenue;
    categoryMap.set(r.category, c);
  }

  // ---- customers & loyalty ------------------------------------------------
  const phones = new Set(counted.map((b) => b.customer_phone));
  const completedByPhone = new Map<string, number>();
  for (const b of bookings) {
    if (b.status !== "completed") continue;
    completedByPhone.set(b.customer_phone, (completedByPhone.get(b.customer_phone) ?? 0) + 1);
  }
  const newCustomers = [...phones].filter((p) => {
    const first = input.firstSeen.get(p);
    return !first || (first >= input.from && first <= input.to);
  }).length;
  const completedVisits = [...completedByPhone.values()].reduce((s, v) => s + v, 0);
  const buckets = [1, 2, 3, 4].map((v) => ({
    label: `${v} visit${v === 1 ? "" : "s"}`,
    customers: [...phones].filter((p) => (input.lifetimeVisits.get(p) ?? 0) === v).length,
  }));
  buckets.push({
    label: "5+ visits",
    customers: [...phones].filter((p) => (input.lifetimeVisits.get(p) ?? 0) >= 5).length,
  });

  const scopedRewards = input.rewards.filter((r) => phones.size === 0 || phones.has(r.phone));
  const loyalty = {
    earned: scopedRewards.length,
    redeemed: scopedRewards.filter((r) => r.status === "used").length,
    available: scopedRewards.filter((r) => r.status === "available").length,
  };

  // ---- coupons ------------------------------------------------------------
  const couponTop = new Map<string, { code: string; category: string; uses: number; discount: number }>();
  const byCategory = { gaming: 0, food: 0, entire_bill: 0 };
  let couponDiscount = 0;
  for (const r of input.redemptions) {
    couponDiscount += n(r.discount_amount);
    if (r.category in byCategory) byCategory[r.category as keyof typeof byCategory] += n(r.discount_amount);
    const row = couponTop.get(r.coupon_code) ?? {
      code: r.coupon_code,
      category: r.category,
      uses: 0,
      discount: 0,
    };
    row.uses += 1;
    row.discount += n(r.discount_amount);
    couponTop.set(r.coupon_code, row);
  }

  // ---- student discount ---------------------------------------------------
  const studentRows = revenueRows.filter((b) => b.student_discount && n(b.student_discount_amount) > 0);
  const studentAmount = studentRows.reduce((s, b) => s + n(b.student_discount_amount), 0);

  // ---- memberships (passes bought as booking lines) ------------------------
  const planNames = new Set(input.membershipPlans.map((p) => p.name.toLowerCase()));
  let passSold = 0;
  let passRevenue = 0;
  const planCount = new Map<string, number>();
  for (const b of revenueRows) {
    for (const line of b.booking_items) {
      if (line.kind !== "addon" || line.station_id) continue;
      if (!planNames.has(line.label.toLowerCase())) continue;
      passSold += n(line.quantity);
      passRevenue += n(line.line_total);
      planCount.set(line.label, (planCount.get(line.label) ?? 0) + n(line.quantity));
    }
  }
  const topPlan = [...planCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // ---- branch comparison --------------------------------------------------
  const compareIds = input.branchId ? [input.branchId] : branches.map((b) => b.id);
  const branchComparison: BranchCompareRow[] = compareIds.map((id) => {
    const rows = bookings.filter((b) => b.branch_id === id);
    const rev = rows.filter(isRealized);
    let g = 0;
    let f = 0;
    let t = 0;
    for (const b of rev) {
      const s = splitBooking(b);
      g += s.gaming;
      f += s.food;
      t += s.total;
    }
    const branchStations = stations.filter((s) => s.branch_id === id && s.status === "available");
    const capacity = branchStations.length * capacityFor(id);
    const bookedMins = branchStations.reduce((s, st) => s + (bookedByStation.get(st.id) ?? 0), 0);
    const activeRows = rows.filter((b) => b.status !== "cancelled" && b.status !== "expired");
    return {
      branchId: id,
      branch: branchName.get(id) ?? "",
      revenue: Math.round(t),
      gaming: Math.round(g),
      food: Math.round(f),
      bookings: activeRows.filter(hasGaming).length,
      foodOrders: activeRows.filter(isFoodOnly).length,
      avgBookingValue: rev.length ? Math.round(t / rev.length) : 0,
      gamingHours: Math.round(((gamingMinutesByBranch.get(id) ?? 0) / 60) * 10) / 10,
      utilization: capacity > 0 ? Math.min(100, Math.round((bookedMins / capacity) * 100)) : 0,
      visits: rows.filter((b) => b.status === "completed").length,
    };
  });

  return {
    range: { from: input.from, to: input.to },
    scope: { branchId: input.branchId, branchName: input.branchName },
    kpis,
    series,
    peakHours: hours,
    utilization,
    services,
    food: {
      revenue: Math.round(foodRevenue),
      orders: foodOrderCount,
      avgOrderValue: foodOrderCount ? Math.round(foodRevenue / foodOrderCount) : 0,
      topByQuantity: [...foodRows].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
      topByRevenue: [...foodRows].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      categories: [...categoryMap.values()].sort((a, b) => b.revenue - a.revenue),
    },
    customers: {
      unique: phones.size,
      newCustomers,
      returning: phones.size - newCustomers,
      completedVisits,
      repeatRate: phones.size ? Math.round(((phones.size - newCustomers) / phones.size) * 100) : 0,
      approachingReward: [...phones].filter((p) => {
        const v = input.lifetimeVisits.get(p) ?? 0;
        return v % 5 === 4;
      }).length,
      buckets,
    },
    loyalty,
    coupons: {
      created: input.couponsCreated,
      redeemed: input.redemptions.length,
      discount: Math.round(couponDiscount),
      byCategory: {
        gaming: Math.round(byCategory.gaming),
        food: Math.round(byCategory.food),
        entire_bill: Math.round(byCategory.entire_bill),
      },
      top: [...couponTop.values()].sort((a, b) => b.uses - a.uses).slice(0, 10),
    },
    student: {
      uses: studentRows.length,
      amount: Math.round(studentAmount),
      gamingRevenueAfter: Math.round(gamingRevenue),
    },
    memberships: {
      sold: passSold,
      revenue: Math.round(passRevenue),
      topPlan,
      plansAvailable: input.membershipPlans.length,
    },
    payments: {
      confirmedRevenue: Math.round(totalRevenue),
      pendingVerification: bookings.filter((b) => b.status === "payment_pending" || b.status === "pending").length,
      awaitingPayment: bookings.filter((b) => b.status === "awaiting_payment").length,
      rejected: bookings.filter((b) => b.status === "cancelled").length,
      expired: bookings.filter((b) => b.status === "expired").length,
      utrSubmitted: bookings.filter((b) => !!b.payment_utr).length,
    },
    paymentModes,
    branchComparison,
  };
}

const paymentStatus = (b: RawBooking) =>
  b.status === "confirmed" || b.status === "completed"
    ? "Paid"
    : b.status === "payment_pending" || b.status === "pending"
      ? "Verification pending"
      : b.status === "awaiting_payment"
        ? "Awaiting payment"
        : b.status === "cancelled"
          ? "Rejected"
          : "Expired";

/** Flat report rows for the report table and exports. */
export function buildReportRows(
  bookings: RawBooking[],
  branchName: Map<string, string>,
  type: ReportType,
  related?: {
    redemptions?: { coupon_code: string; discount_amount: number; category: string; booking_id: string; created_at: string }[];
    rewards?: { status: string; booking_id: string | null; phone: string; minutes: number; created_at: string }[];
  },
): ReportRow[] {
  const rows: ReportRow[] = [];
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));

  if (type === "coupons") {
    for (const redemption of related?.redemptions ?? []) {
      const booking = bookingById.get(redemption.booking_id);
      if (!booking) continue;
      const discount = Math.round(n(redemption.discount_amount));
      rows.push({
        date: redemption.created_at.slice(0, 10),
        branch: branchName.get(booking.branch_id) ?? "",
        phone: booking.customer_phone,
        customer: booking.customer_name,
        reference: booking.reference,
        kind: "Coupon",
        service: `${redemption.coupon_code} · ${redemption.category.replaceAll("_", " ")}`,
        amount: discount,
        discount,
        finalAmount: Math.round(n(booking.total_amount)),
        status: booking.status,
        paymentStatus: paymentStatus(booking),
        paymentMode: bookingPaymentLabel(booking),
      });
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  if (type === "loyalty") {
    for (const reward of related?.rewards ?? []) {
      const booking = reward.booking_id ? bookingById.get(reward.booking_id) : undefined;
      rows.push({
        date: reward.created_at.slice(0, 10),
        branch: booking ? (branchName.get(booking.branch_id) ?? "") : "—",
        phone: reward.phone,
        customer: booking?.customer_name ?? "—",
        reference: booking?.reference ?? "—",
        kind: "Loyalty",
        service: `${reward.minutes} free minutes · ${reward.status}`,
        amount: 0,
        discount: 0,
        finalAmount: 0,
        status: reward.status,
        paymentStatus: "—",
        paymentMode: "—",
      });
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  for (const b of bookings) {
    const split = splitBooking(b);
    const branch = branchName.get(b.branch_id) ?? "";
    if (type === "student" && (!b.student_discount || n(b.student_discount_amount) <= 0)) continue;
    if (type === "visits" && b.status !== "completed") continue;

    if (["bookings", "visits", "branches", "student"].includes(type)) {
      rows.push({
        date: b.booking_date,
        branch,
        phone: b.customer_phone,
        customer: b.customer_name,
        reference: b.reference,
        kind: type === "visits" ? "Visit" : type === "student" ? "Student" : "Booking",
        service: b.gaming_stations?.name ?? (isFoodOnly(b) ? "Food order" : "Passes / add-ons"),
        amount: Math.round(n(b.total_amount) + n(b.discount_amount)),
        discount: Math.round(type === "student" ? n(b.student_discount_amount) : n(b.discount_amount)),
        finalAmount: Math.round(n(b.total_amount)),
        status: b.status,
        paymentStatus: paymentStatus(b),
        paymentMode: bookingPaymentLabel(b),
      });
      continue;
    }
    if (type !== "food" && split.gamingGross > 0) {
      rows.push({
        date: b.booking_date,
        branch,
        phone: b.customer_phone,
        customer: b.customer_name,
        reference: b.reference,
        kind: "Gaming",
        service: b.gaming_stations?.name ?? "Passes / add-ons",
        amount: Math.round(split.gamingGross),
        discount: Math.round(split.gamingDiscount),
        finalAmount: Math.round(split.gaming),
        status: b.status,
        paymentStatus: paymentStatus(b),
        paymentMode: bookingPaymentLabel(b),
      });
    }
    if (type !== "gaming" && split.foodGross > 0) {
      const items = b.booking_items
        .filter((i) => i.kind === "food")
        .map((i) => `${i.quantity}× ${i.label}`)
        .join(", ");
      rows.push({
        date: b.booking_date,
        branch,
        phone: b.customer_phone,
        customer: b.customer_name,
        reference: b.reference,
        kind: "Food",
        service: items || "Food order",
        amount: Math.round(split.foodGross),
        discount: Math.round(split.foodDiscount),
        finalAmount: Math.round(split.food),
        status: b.status,
        paymentStatus: paymentStatus(b),
        paymentMode: bookingPaymentLabel(b),
      });
    }
  }
  return rows.sort((a, b) => (a.date === b.date ? a.reference.localeCompare(b.reference) : b.date.localeCompare(a.date)));
}

/* ---------------------------------------------------------------------------
   Drill-down: the exact bookings / sessions behind one chart slice.
--------------------------------------------------------------------------- */

export interface DrilldownSelection {
  /** Which chart the admin clicked. */
  kind: "hour" | "station" | "service";
  /** Hour (0-23) for peak hours, station id for utilisation, station type for services. */
  key: string;
}

export function buildDrilldownRows(
  bookings: RawBooking[],
  stations: RawStation[],
  branchName: Map<string, string>,
  sel: DrilldownSelection,
): import("./types").DrilldownRow[] {
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const counted = bookings.filter((b) => b.status !== "cancelled" && b.status !== "expired");
  const rows: import("./types").DrilldownRow[] = [];

  for (const b of counted) {
    const slots: { stationId: string | null; start: string | null; end: string | null; label: string }[] = [
      { stationId: b.station_id, start: b.start_time, end: b.end_time, label: b.gaming_stations?.name ?? "Session" },
      ...b.booking_items
        .filter((i) => i.kind === "addon" && i.station_id)
        .map((i) => ({ stationId: i.station_id, start: i.start_time, end: i.end_time, label: i.label })),
    ].filter((s) => s.stationId || (s.start && s.end));

    for (const slot of slots) {
      const st = slot.stationId ? stationById.get(slot.stationId) : undefined;
      const start = minutes(slot.start);
      const end = minutes(slot.end);

      if (sel.kind === "hour") {
        const hour = Number(sel.key);
        if (start == null) continue;
        const last = end != null && end > start ? Math.ceil(end / 60) : Math.floor(start / 60) + 1;
        if (hour < Math.floor(start / 60) || hour >= last) continue;
      } else if (sel.kind === "station") {
        if (slot.stationId !== sel.key) continue;
      } else {
        const type = st?.station_type ?? b.gaming_stations?.station_type ?? "";
        if ((SERVICE_LABELS[type] ?? type) !== sel.key) continue;
      }

      const split = splitBooking(b);
      rows.push({
        bookingId: b.id,
        reference: b.reference,
        date: b.booking_date,
        time: slot.start && slot.end ? `${slot.start.slice(0, 5)} – ${slot.end.slice(0, 5)}` : "—",
        minutes: start != null && end != null && end > start ? end - start : 0,
        branch: branchName.get(b.branch_id) ?? "",
        station: st?.name ?? slot.label,
        service: SERVICE_LABELS[st?.station_type ?? ""] ?? st?.station_type ?? "—",
        customer: b.customer_name,
        phone: b.customer_phone,
        players: n(b.players),
        status: b.status,
        paymentMode: bookingPaymentLabel(b),
        amount: Math.round(isRealized(b) ? split.gaming : 0),
      });
    }
  }

  return rows.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : b.date.localeCompare(a.date)));
}
