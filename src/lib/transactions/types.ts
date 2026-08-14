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
  paymentMode: "cash" | "upi" | "";
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
