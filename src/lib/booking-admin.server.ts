import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface BookingTotals {
  gross: number;
  addons: number;
  food: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Recomputes a booking's money from its line items.
 * `extraBillDiscount` is an admin-applied last-minute discount added on top of
 * whatever discount the guest already had; it lands in the bill-discount bucket
 * so reports keep the breakdown.
 */
export async function recomputeBookingTotals(
  bookingId: string,
  extraBillDiscount = 0,
): Promise<BookingTotals | null> {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;

  const [{ data: lines }, { data: branch }] = await Promise.all([
    supabaseAdmin.from("booking_items").select("kind, line_total").eq("booking_id", bookingId),
    supabaseAdmin.from("branches").select("tax_percent").eq("id", booking.branch_id).maybeSingle(),
  ]);

  const addons = (lines ?? [])
    .filter((l) => l.kind === "addon")
    .reduce((s, l) => s + Number(l.line_total), 0);
  const food = (lines ?? [])
    .filter((l) => l.kind === "food")
    .reduce((s, l) => s + Number(l.line_total), 0);

  const gross = Number(booking.session_amount) + addons + food;
  const extra = Math.max(0, Math.round(extraBillDiscount));
  const discount = Math.min(Number(booking.discount_amount ?? 0) + extra, gross);
  const billDiscount = Number(booking.bill_discount_amount ?? 0) + extra;
  const taxable = Math.max(0, gross - discount);
  const tax = Math.round((taxable * Number(branch?.tax_percent ?? 0)) / 100);
  const total = taxable + tax;

  await supabaseAdmin
    .from("bookings")
    .update({
      addons_amount: addons,
      food_amount: food,
      discount_amount: discount,
      bill_discount_amount: billDiscount,
      tax_amount: tax,
      total_amount: total,
    })
    .eq("id", bookingId);

  return { gross, addons, food, discount, tax, total };
}

/**
 * Overrides the cash/UPI split on the ledger row for a booking.
 * Used when part of a bill (e.g. food added later) was paid a different way
 * than the original booking payment.
 */
export async function setLedgerSplit(bookingId: string, cash: number, upi: number) {
  const { data: row } = await supabaseAdmin
    .from("booking_transactions")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (!row) return;
  await supabaseAdmin
    .from("booking_transactions")
    .update({ cash_amount: Math.max(0, Math.round(cash)), upi_amount: Math.max(0, Math.round(upi)) })
    .eq("id", row.id);
}
