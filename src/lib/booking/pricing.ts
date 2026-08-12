import type { Branch, CartLine, Station } from "./types";

/** Format paise-free INR amounts. */
export const inr = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

/** "14:30:00" -> "2:30 PM" */
export function formatTime(t: string) {
  const [h = "0", m = "00"] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${suffix}`;
}

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Next `count` bookable days starting today. */
export function upcomingDays(count = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

/** Half-hour (or branch-configured) slots between opening and closing time. */
export function generateSlots(branch: Pick<Branch, "opens_at" | "closes_at" | "slot_minutes">) {
  const toMin = (t: string) => {
    const [h = "0", m = "0"] = t.split(":");
    return Number(h) * 60 + Number(m);
  };
  const step = branch.slot_minutes || 30;
  const slots: string[] = [];
  for (let m = toMin(branch.opens_at); m + step <= toMin(branch.closes_at); m += step) {
    slots.push(
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`,
    );
  }
  return slots;
}

export function addMinutes(time: string, minutes: number) {
  const [h = "0", m = "0"] = time.split(":");
  const total = Number(h) * 60 + Number(m) + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
}

/** Slot price for a station derived from its hourly rate. */
export function slotPrice(station: Pick<Station, "hourly_price">, slotMinutes: number) {
  return (Number(station.hourly_price) * slotMinutes) / 60;
}

export interface Totals {
  session: number;
  addons: number;
  food: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

export function computeTotals(opts: {
  session: number;
  addons: number;
  cart: CartLine[];
  discount: number;
  taxPercent: number;
}): Totals {
  const food = opts.cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const gross = opts.session + opts.addons + food;
  const discount = Math.min(opts.discount, gross);
  const taxable = gross - discount;
  const tax = (taxable * opts.taxPercent) / 100;
  return {
    session: opts.session,
    addons: opts.addons,
    food,
    discount,
    taxable,
    tax,
    total: taxable + tax,
  };
}

/** "HH:MM(:SS)" -> minutes from midnight. */
export function timeToMinutes(t: string) {
  const [h = "0", m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
}

/** Does [start, start+minutes) overlap any busy range for this station? */
export function isRangeBusy(
  busy: { station_id: string; start_time: string; end_time: string }[],
  stationId: string,
  start: string,
  minutes: number,
) {
  const s = timeToMinutes(start);
  const e = s + minutes;
  return busy.some((b) => {
    if (b.station_id !== stationId) return false;
    const bs = timeToMinutes(b.start_time);
    const be = Math.max(timeToMinutes(b.end_time), bs + 30);
    return s < be && bs < e;
  });
}
