import type { AnalyticsResult } from "@/lib/analytics/types";

/** Everything shown on the Daily Closing page for one branch + one date. */
export interface DailyClosingSummary {
  date: string;
  branchId: string;
  branchName: string;
  totals: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    pendingBookings: number;
    totalCustomers: number;
    walkInCustomers: number;
    websiteBookings: number;
    gamingRevenue: number;
    foodRevenue: number;
    membershipRevenue: number;
    couponDiscounts: number;
    studentDiscounts: number;
    cashRevenue: number;
    upiRevenue: number;
    totalRevenue: number;
  };
  popular: {
    console: string;
    game: string;
    food: string;
    coupon: string;
    membership: string;
  };
  insights: {
    peakHour: string;
    avgDurationMinutes: number;
    avgCustomerSpend: number;
    mostActiveBranch: string;
    consoleUtilization: number;
  };
  /** Full analytics payload for the day, kept for report exports and history. */
  analytics: AnalyticsResult;
  /** Set when this day has already been closed. */
  closed: { id: string; closedAt: string; closedBy: string | null; notes: string } | null;
}

export interface ClosingReportRow {
  id: string;
  branchId: string;
  branchName: string;
  reportDate: string;
  closedAt: string;
  closedByEmail: string | null;
  notes: string;
  totalBookings: number;
  totalRevenue: number;
  summary: DailyClosingSummary | null;
}
