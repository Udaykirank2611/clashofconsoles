/** Booking status colours shared across every admin surface. */
export type CalStatus =
  | "awaiting_payment"
  | "payment_pending"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "expired";

export const STATUS_LABEL: Record<CalStatus, string> = {
  awaiting_payment: "Pending payment",
  payment_pending: "Pending payment",
  pending: "Pending payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

/** Orange pending · green confirmed · blue completed · red cancelled · grey expired. */
export const STATUS_CLASS: Record<CalStatus, string> = {
  awaiting_payment: "border-orange-300 bg-orange-100 text-orange-800",
  payment_pending: "border-orange-300 bg-orange-100 text-orange-800",
  pending: "border-orange-300 bg-orange-100 text-orange-800",
  confirmed: "border-emerald-300 bg-emerald-100 text-emerald-800",
  completed: "border-sky-300 bg-sky-100 text-sky-800",
  cancelled: "border-rose-300 bg-rose-100 text-rose-800",
  expired: "border-border bg-muted text-foreground",
};

export const STATUS_DOT: Record<CalStatus, string> = {
  awaiting_payment: "bg-orange-400",
  payment_pending: "bg-orange-400",
  pending: "bg-orange-400",
  confirmed: "bg-emerald-400",
  completed: "bg-sky-400",
  cancelled: "bg-rose-400",
  expired: "bg-muted-foreground",
};

export const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "pending", label: "Pending payment" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "expired", label: "Expired" },
];

export const matchesStatusFilter = (status: string, filter: string) => {
  if (filter === "all") return true;
  if (filter === "pending")
    return status === "pending" || status === "payment_pending" || status === "awaiting_payment";
  return status === filter;
};

/** Payment state derived from the booking, never changing the verification flow. */
export const paymentStatus = (b: { status: string; payment_utr: string | null; payment_mode: string | null }) => {
  if (b.status === "confirmed" || b.status === "completed")
    return b.payment_mode ? `Paid · ${b.payment_mode.toUpperCase()}` : "Paid";
  if (b.status === "payment_pending" || b.status === "pending")
    return b.payment_utr ? "Verification pending" : "Payment pending";
  if (b.status === "awaiting_payment") return "Awaiting payment";
  if (b.status === "cancelled") return "Refund / cancelled";
  return "Expired";
};

export const paymentFilterMatches = (
  b: { status: string; payment_utr: string | null; payment_mode: string | null },
  filter: string,
) => {
  if (filter === "all") return true;
  if (filter === "paid") return b.status === "confirmed" || b.status === "completed";
  if (filter === "verification") return (b.status === "payment_pending" || b.status === "pending") && !!b.payment_utr;
  if (filter === "unpaid") return b.status === "awaiting_payment" || (!b.payment_utr && b.status === "pending");
  if (filter === "upi") return b.payment_mode === "upi";
  if (filter === "cash") return b.payment_mode === "cash";
  return true;
};

export const PAYMENT_FILTERS = [
  { id: "all", label: "All payments" },
  { id: "paid", label: "Paid" },
  { id: "verification", label: "Verification pending" },
  { id: "unpaid", label: "Unpaid" },
  { id: "upi", label: "UPI" },
  { id: "cash", label: "Cash" },
];
