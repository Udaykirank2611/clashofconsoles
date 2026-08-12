/**
 * Coupon scheduling: happy-hour windows and weekday restrictions.
 *
 * Both checks run against the SLOT the guest is booking (the date and start
 * time of the session), never the moment they happen to be on the site.
 * Empty `activeDays` = every day; missing window = all day.
 */

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type CouponSchedule = {
  activeDays?: number[] | null;
  activeStartTime?: string | null;
  activeEndTime?: string | null;
};

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const pretty = (t: string) => {
  const m = toMinutes(t);
  const h = Math.floor(m / 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${suffix}`;
};

export const daysLabel = (days?: number[] | null) => {
  if (!days || days.length === 0 || days.length === 7) return "All days";
  return [...days].sort((a, b) => a - b).map((d) => DAY_LABELS[d] ?? "").join(", ");
};

export const windowLabel = (start?: string | null, end?: string | null) =>
  start && end ? `${pretty(start)} – ${pretty(end)}` : "All day";

/**
 * @param date  Booking date as YYYY-MM-DD.
 * @param startTime Slot start as HH:MM(:SS), or null for pass-only bookings.
 */
export function checkCouponSchedule(
  coupon: CouponSchedule,
  date: string,
  startTime: string | null,
): { ok: true } | { ok: false; message: string } {
  const days = coupon.activeDays ?? [];
  if (days.length > 0 && days.length < 7) {
    const dow = new Date(`${date}T00:00:00`).getDay();
    if (!days.includes(dow))
      return { ok: false, message: `This coupon is only valid on ${daysLabel(days)}.` };
  }

  const { activeStartTime: from, activeEndTime: to } = coupon;
  if (from && to) {
    if (!startTime)
      return {
        ok: false,
        message: `This coupon only applies to sessions between ${windowLabel(from, to)}.`,
      };
    const at = toMinutes(startTime);
    const s = toMinutes(from);
    const e = toMinutes(to);
    // A window that wraps past midnight (e.g. 22:00 – 02:00) stays valid.
    const inside = s <= e ? at >= s && at < e : at >= s || at < e;
    if (!inside)
      return {
        ok: false,
        message: `Happy hours only: pick a slot between ${windowLabel(from, to)}.`,
      };
  }

  return { ok: true };
}
