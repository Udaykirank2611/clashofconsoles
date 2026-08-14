/** Shared, client-safe types + date helpers for the admin analytics module. */

export type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  last_quarter: "Last quarter",
  this_year: "This year",
  last_year: "Last year",
  custom: "Custom",
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

/** Monday-start week. */
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** Resolve a preset into inclusive `from`/`to` dates (local time, YYYY-MM-DD). */
export function resolveRange(preset: RangePreset, custom?: { from: string; to: string }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const q = Math.floor(today.getMonth() / 3);

  switch (preset) {
    case "today":
      return { from: iso(today), to: iso(today) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: iso(y), to: iso(y) };
    }
    case "this_week":
      return { from: iso(startOfWeek(today)), to: iso(today) };
    case "last_week": {
      const s = addDays(startOfWeek(today), -7);
      return { from: iso(s), to: iso(addDays(s, 6)) };
    }
    case "this_month":
      return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
    case "last_month":
      return {
        from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    case "this_quarter":
      return { from: iso(new Date(today.getFullYear(), q * 3, 1)), to: iso(today) };
    case "last_quarter":
      return {
        from: iso(new Date(today.getFullYear(), q * 3 - 3, 1)),
        to: iso(new Date(today.getFullYear(), q * 3, 0)),
      };
    case "this_year":
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) };
    case "last_year":
      return {
        from: iso(new Date(today.getFullYear() - 1, 0, 1)),
        to: iso(new Date(today.getFullYear() - 1, 11, 31)),
      };
    case "custom":
      return { from: custom?.from ?? iso(today), to: custom?.to ?? iso(today) };
  }
}

export interface Kpis {
  totalRevenue: number;
  gamingRevenue: number;
  foodRevenue: number;
  pendingAmount: number;
  gamingBookings: number;
  foodOrders: number;
  totalBookings: number;
  completed: number;
  confirmed: number;
  cancelled: number;
  expired: number;
  pending: number;
  avgValue: number;
  upiRevenue: number;
  cashRevenue: number;
}

export interface PaymentModeStat {
  revenue: number;
  bookings: number;
}

export interface DayPoint {
  date: string;
  gaming: number;
  food: number;
  total: number;
  bookings: number;
  completed: number;
  cancelled: number;
  expired: number;
  pending: number;
}

export interface UtilizationRow {
  stationId: string;
  name: string;
  type: string;
  branch: string;
  status: string;
  bookedMinutes: number;
  capacityMinutes: number;
  utilization: number;
}

export interface ServiceRow {
  type: string;
  bookings: number;
  hours: number;
  revenue: number;
  avgValue: number;
}



export interface FoodItemRow {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

export interface BranchCompareRow {
  branchId: string;
  branch: string;
  revenue: number;
  gaming: number;
  food: number;
  bookings: number;
  foodOrders: number;
  avgBookingValue: number;
  gamingHours: number;
  utilization: number;
  visits: number;
}

export interface CouponTopRow {
  code: string;
  category: string;
  uses: number;
  discount: number;
}

export interface AnalyticsResult {
  range: { from: string; to: string };
  scope: { branchId: string | null; branchName: string };
  kpis: Kpis;
  series: DayPoint[];
  peakHours: { hour: number; bookings: number }[];
  utilization: UtilizationRow[];
  services: ServiceRow[];
  food: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    topByQuantity: FoodItemRow[];
    topByRevenue: FoodItemRow[];
    categories: { category: string; quantity: number; revenue: number }[];
  };
  customers: {
    unique: number;
    newCustomers: number;
    returning: number;
    completedVisits: number;
    repeatRate: number;
    approachingReward: number;
    buckets: { label: string; customers: number }[];
  };
  loyalty: { earned: number; redeemed: number; available: number };
  coupons: {
    created: number;
    redeemed: number;
    discount: number;
    byCategory: { gaming: number; food: number; entire_bill: number };
    top: CouponTopRow[];
  };
  student: { uses: number; amount: number; gamingRevenueAfter: number };
  memberships: { sold: number; revenue: number; topPlan: string | null; plansAvailable: number };
  payments: {
    confirmedRevenue: number;
    pendingVerification: number;
    awaitingPayment: number;
    rejected: number;
    expired: number;
    utrSubmitted: number;
  };
  paymentModes: { upi: PaymentModeStat; cash: PaymentModeStat; unrecorded: PaymentModeStat };
  branchComparison: BranchCompareRow[];
}

export type ReportType = "gaming" | "food" | "combined";

export interface ReportRow {
  date: string;
  branch: string;
  phone: string;
  customer: string;
  reference: string;
  kind: "Gaming" | "Food";
  service: string;
  amount: number;
  discount: number;
  finalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMode: string;
}

/** One underlying session/booking row behind a chart slice. */
export interface DrilldownRow {
  bookingId: string;
  reference: string;
  date: string;
  time: string;
  minutes: number;
  branch: string;
  station: string;
  service: string;
  customer: string;
  phone: string;
  players: number;
  status: string;
  paymentMode: string;
  amount: number;
}
