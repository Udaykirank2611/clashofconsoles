export type TxStatus = "pending" | "completed" | "cancelled" | "refunded";
export type TxSource = "website" | "walk_in" | "membership" | "coupon";
export type UpiProvider = "phonepe" | "google_pay" | "paytm" | "other";

export interface TransactionRow {
  id: string;
  bookingId: string;
  reference: string;
  date: string;
  branchId: string;
  branch: string;
  customer: string;
  phone: string;
  service: string;
  consoleName: string;
  checkIn: string | null;
  checkOut: string | null;
  durationMinutes: number;
  players: number;
  visitNumber: number;
  gamingAmount: number;
  foodAmount: number;
  membershipDiscount: number;
  couponDiscount: number;
  studentDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  paymentMode: "cash" | "upi" | "mixed" | "";
  upiProvider: UpiProvider | null;
  cashAmount: number;
  upiAmount: number;
  status: TxStatus;
  source: TxSource;
  notes: string;
}

export interface ExpenseRow {
  id: string;
  branchId: string;
  date: string;
  name: string;
  amount: number;
  description: string;
  time: string;
  paidFrom: "cash" | "bank";
}

export interface TransactionTotals {
  gamingRevenue: number;
  foodRevenue: number;
  totalRevenue: number;
  cashCollection: number;
  upiCollection: number;
  totalDiscounts: number;
  totalBookings: number;
  averageBookingValue: number;
  /** Total gaming time booked in the window, in hours. */
  totalGamingHours: number;
}

export interface CashBankSummary {
  openingCash: number;
  openingBank: number;
  cashReceived: number;
  upiReceived: number;
  expensesCash: number;
  expensesBank: number;
  closingCash: number;
  closingBank: number;
}

export interface TransactionsPayload {
  from: string;
  to: string;
  branchName: string;
  rows: TransactionRow[];
  expenses: ExpenseRow[];
  totals: TransactionTotals;
  cashBank: CashBankSummary;
  totalExpenses: number;
}

export type ReconciliationIssueKind =
  | "missing_ledger"
  | "amount_mismatch"
  | "unrecorded_payment"
  | "mode_mismatch"
  | "status_mismatch";

export interface ReconciliationIssue {
  bookingId: string;
  reference: string;
  date: string;
  branch: string;
  customer: string;
  bookingAmount: number;
  ledgerAmount: number;
  difference: number;
  kind: ReconciliationIssueKind;
  detail: string;
}

export interface ReconciliationTotals {
  bookingsCount: number;
  matchedCount: number;
  issueCount: number;
  missingLedgerCount: number;
  bookingsTotal: number;
  ledgerTotal: number;
  variance: number;
  ledgerCash: number;
  ledgerUpi: number;
}

export interface ReconciliationCash {
  openingCash: number;
  openingBank: number;
  cashReceived: number;
  upiReceived: number;
  expensesCash: number;
  expensesBank: number;
  expectedClosingCash: number;
  expectedClosingBank: number;
}

export interface ReconciliationPayload {
  from: string;
  to: string;
  branchName: string;
  totals: ReconciliationTotals;
  cash: ReconciliationCash;
  issues: ReconciliationIssue[];
}
