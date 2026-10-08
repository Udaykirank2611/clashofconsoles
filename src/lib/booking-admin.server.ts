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

/**
 * Rate-card pricing for a session length, taken from the branch's active
 * session options (the same prices used during PS5 checkout).
 *
 * The first hour costs the 1-hour rate, the second hour costs the difference up
 * to the 2-hour rate, and every hour after that costs half of the 2-hour rate.
 */
export async function priceForMinutes(branchId: string, players: number, minutes: number) {
  const p = Math.min(4, Math.max(1, Math.round(players || 1)));
  // session_options is the admin-managed PS5 rate card used by checkout.
  // Keep pricing_rates only as a compatibility fallback for older branches.
  const [{ data: sessions }, { data: legacyRates }] = await Promise.all([
    supabaseAdmin
      .from("session_options")
      .select("duration_minutes, price")
      .eq("branch_id", branchId)
      .eq("players", p)
      .eq("is_active", true),
    supabaseAdmin
      .from("pricing_rates")
      .select("duration_minutes, price")
      .eq("branch_id", branchId)
      .eq("players", p),
  ]);
  const rates = sessions?.length ? sessions : legacyRates;
  const at = (d: number) => {
    const row = (rates ?? []).find((r) => Number(r.duration_minutes) === d);
    return row ? Number(row.price) : null;
  };
  const oneHour = at(60) ?? 100 + 50 * p;
  const twoHours = at(120) ?? oneHour * 2;

  const hourCost = (n: number) => (n === 1 ? oneHour : n === 2 ? twoHours - oneHour : twoHours / 2);

  const total = Math.max(0, Math.round(minutes));
  const whole = Math.floor(total / 60);
  const rest = total - whole * 60;
  let sum = 0;
  for (let i = 1; i <= whole; i += 1) sum += hourCost(i);
  if (rest > 0) sum += (hourCost(whole + 1) * rest) / 60;
  return Math.round(sum);
}

/** Cost of adding `hours` on top of a session that currently runs `currentMinutes`. */
export async function extensionPrice(
  branchId: string,
  players: number,
  currentMinutes: number,
  hours: number,
) {
  const now = await priceForMinutes(branchId, players, currentMinutes);
  const later = await priceForMinutes(branchId, players, currentMinutes + hours * 60);
  return Math.max(0, later - now);
}

export interface ExtensionOption {
  minutes: number;
  price: number;
  label: string;
}

/** Human label for a minute step ("15 minutes", "1 hour"). */
const stepLabel = (m: number) =>
  m % 60 === 0 ? `${m / 60} hour${m / 60 > 1 ? "s" : ""}` : `${m} minutes`;

/**
 * Next extension step for a booking's station.
 *
 * PS5/console sessions extend in whole hours off the branch rate card.
 * Slab-priced services (driving simulator, VR, …) climb their own rate ladder:
 * a 15-minute booking may extend by 15 minutes (to the 30-minute price), then by
 * 30 minutes (to the 1-hour price), after which no extension is offered.
 */
export async function extensionOption(
  branchId: string,
  stationId: string | null,
  players: number,
  currentMinutes: number,
): Promise<ExtensionOption | null> {
  const hourly = async (): Promise<ExtensionOption> => ({
    minutes: 60,
    price: await extensionPrice(branchId, players, currentMinutes, 1),
    label: "1 hour",
  });
  if (!stationId) return hourly();

  const [{ data: station }, { data: rates }] = await Promise.all([
    supabaseAdmin.from("gaming_stations").select("station_type").eq("id", stationId).maybeSingle(),
    supabaseAdmin
      .from("station_rates")
      .select("duration_minutes, price, is_extra_hour")
      .eq("station_id", stationId)
      .eq("is_active", true),
  ]);
  if (!station || station.station_type === "console") return hourly();

  // Cheapest price per duration builds the ladder (rates can list party sizes).
  const ladder = new Map<number, number>();
  for (const r of rates ?? []) {
    if (r.is_extra_hour) continue;
    const d = Number(r.duration_minutes);
    const p = Number(r.price);
    if (!ladder.has(d) || p < (ladder.get(d) ?? 0)) ladder.set(d, p);
  }
  const steps = [...ladder.entries()].map(([minutes, price]) => ({ minutes, price })).sort((a, b) => a.minutes - b.minutes);
  if (!steps.length) return hourly();

  const priceAt = (m: number) => {
    const exact = steps.find((s) => s.minutes === m);
    if (exact) return exact.price;
    const below = [...steps].reverse().find((s) => s.minutes <= m);
    return below ? below.price : 0;
  };

  const next = steps.find((s) => s.minutes > currentMinutes);
  if (next) {
    return {
      minutes: next.minutes - currentMinutes,
      price: Math.max(0, next.price - priceAt(currentMinutes)),
      label: stepLabel(next.minutes - currentMinutes),
    };
  }

  // Past the ladder: only services with an explicit extra-hour rate can extend.
  const extra = (rates ?? []).find((r) => r.is_extra_hour);
  if (extra) return { minutes: 60, price: Number(extra.price), label: "1 hour" };
  return null;
}


/**
 * Rate-card price for a slab-priced station (VR, cockpit, snooker, …) at a given
 * length. Returns null for consoles or stations without a rate card, so callers
 * fall back to the PS5 hourly pricing.
 */
export async function stationPriceForMinutes(stationId: string, minutes: number): Promise<number | null> {
  const [{ data: station }, { data: rates }] = await Promise.all([
    supabaseAdmin.from("gaming_stations").select("station_type").eq("id", stationId).maybeSingle(),
    supabaseAdmin
      .from("station_rates")
      .select("duration_minutes, price, is_extra_hour")
      .eq("station_id", stationId)
      .eq("is_active", true),
  ]);
  if (!station || station.station_type === "console") return null;
  const ladder = new Map<number, number>();
  let extraHour: number | null = null;
  for (const r of rates ?? []) {
    const p = Number(r.price);
    if (r.is_extra_hour) {
      extraHour = extraHour === null ? p : Math.min(extraHour, p);
      continue;
    }
    const d = Number(r.duration_minutes);
    if (!ladder.has(d) || p < (ladder.get(d) ?? 0)) ladder.set(d, p);
  }
  const steps = [...ladder.entries()].sort((a, b) => a[0] - b[0]);
  if (!steps.length) return null;
  const exact = ladder.get(minutes);
  if (exact !== undefined) return exact;
  const top = steps[steps.length - 1];
  if (!top) return null;
  if (minutes > top[0]) {
    const perHour = extraHour ?? (top[1] / top[0]) * 60;
    return Math.round(top[1] + ((minutes - top[0]) / 60) * perHour);
  }
  // Between two slabs: charge the next slab up.
  const up = steps.find(([d]) => d >= minutes);
  return up ? up[1] : top[1];
}

export const durationLabel = (m: number) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  const hp = h ? `${h} Hour${h > 1 ? "s" : ""}` : "";
  const mp = r ? `${r} Minutes` : "";
  return [hp, mp].filter(Boolean).join(" ");
};
