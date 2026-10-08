/**
 * Smart Pricing Insights — offline, read-only recommendation engine.
 * Works purely on historical booking slots; it NEVER changes any price.
 */

export interface SlotRecord {
  date: string; // YYYY-MM-DD
  start: number; // minutes from midnight
  end: number;
  type: string; // station_type
  revenue: number;
}

export interface SmartPricingData {
  today: string; // IST date
  nowMinutes: number; // IST minutes from midnight
  slots: SlotRecord[];
  capacity: Record<string, number>; // stations per type
}

export const HOURS = Array.from({ length: 13 }, (_, i) => 10 + i); // 10 AM – 10 PM
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const TYPE_LABELS: Record<string, string> = {
  console: "PlayStation",
  vr: "VR",
  driving_simulator: "Cockpit Racing",
  private_theatre: "Private Theatre",
  snooker: "Snooker",
  private_lounge: "Private Lounge",
};

export const hourName = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 || h === 24 ? "AM" : "PM"}`;
const dayMs = 86_400_000;
const toDate = (d: string) => new Date(`${d}T00:00:00Z`);
const weekdayOf = (d: string) => (toDate(d).getUTCDay() + 6) % 7; // Monday = 0
const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / dayMs);
const shift = (d: string, n: number) => new Date(toDate(d).getTime() + n * dayMs).toISOString().slice(0, 10);

/** Weight of a past date relative to today: last 4 weeks 60%, previous 2 months 30%, older 10%. */
export function ageBucket(ageDays: number): 0 | 1 | 2 {
  if (ageDays <= 28) return 0;
  if (ageDays <= 90) return 1;
  return 2;
}
const BUCKET_WEIGHTS = [0.6, 0.3, 0.1];

/** Weighted mean of values grouped by age bucket; empty buckets are dropped and weights renormalised. */
export function weightedAverage(samples: { ageDays: number; value: number }[]) {
  const sums: number[] = [0, 0, 0];
  const counts: number[] = [0, 0, 0];
  for (const s of samples) {
    const b = ageBucket(s.ageDays);
    sums[b] = (sums[b] ?? 0) + s.value;
    counts[b] = (counts[b] ?? 0) + 1;
  }
  let w = 0;
  let total = 0;
  for (let i = 0; i < 3; i += 1) {
    const c = counts[i] ?? 0;
    if (!c) continue;
    const bw = BUCKET_WEIGHTS[i] ?? 0;
    total += bw * ((sums[i] ?? 0) / c);
    w += bw;
  }
  return w ? total / w : 0;
}

export type Demand = "high" | "normal" | "moderate" | "low";

export function classifyDemand(current: number, average: number): Demand {
  if (average >= 0.8 || current >= 0.85) return "high";
  if (average <= 0 || current >= average * 0.9) return "normal";
  if (current >= average * 0.7) return "moderate";
  return "low";
}

export interface Promotion {
  name: string;
  lift: number; // expected relative occupancy improvement
  discount: number; // fraction of revenue given away
}

/** Exactly one promotion (or none) for a demand level. */
export function pickPromotion(demand: Demand, average: number, weekday: number, hour: number): Promotion | null {
  if (demand === "high" || demand === "normal") return null;
  const weekend = weekday >= 5;
  if (demand === "moderate") {
    if (!weekend && hour < 17) return { name: "10% Student Discount", lift: 0.12, discount: 0.1 };
    return { name: "Free Soft Drink", lift: 0.08, discount: 0.04 };
  }
  if (average < 0.15) return { name: "20% OFF", lift: 0.25, discount: 0.2 };
  if (average < 0.3) return { name: "Buy 2 Hours Get 30 Minutes Free", lift: 0.18, discount: 0.2 };
  if (weekend) return { name: "Combo Offer", lift: 0.15, discount: 0.12 };
  return { name: "15% OFF", lift: 0.16, discount: 0.15 };
}

export interface Filters {
  type: string | "all";
  from: string;
  to: string;
}

function occupancyMap(slots: SlotRecord[], capacity: number) {
  // key `${date}|${hour}` -> booked station-minutes
  const booked = new Map<string, number>();
  const revenue = new Map<string, number>();
  for (const s of slots) {
    const len = Math.max(1, s.end - s.start);
    for (const h of HOURS) {
      const overlap = Math.min(s.end, (h + 1) * 60) - Math.max(s.start, h * 60);
      if (overlap <= 0) continue;
      const k = `${s.date}|${h}`;
      booked.set(k, (booked.get(k) ?? 0) + overlap);
      revenue.set(k, (revenue.get(k) ?? 0) + (s.revenue * overlap) / len);
    }
  }
  const occ = (date: string, h: number) => (capacity ? Math.min(1, (booked.get(`${date}|${h}`) ?? 0) / (capacity * 60)) : 0);
  const rev = (date: string, h: number) => revenue.get(`${date}|${h}`) ?? 0;
  return { occ, rev };
}

export function computeSmartPricing(data: SmartPricingData, filters: Filters) {
  const slots = filters.type === "all" ? data.slots : data.slots.filter((s) => s.type === filters.type);
  const capacity =
    filters.type === "all"
      ? Object.values(data.capacity).reduce((a, b) => a + b, 0)
      : (data.capacity[filters.type] ?? 0);
  const { occ, rev } = occupancyMap(slots, capacity);
  const today = data.today;
  const firstDate = slots.reduce((m, s) => (s.date < m ? s.date : m), today);
  const nowHour = Math.min(22, Math.max(10, Math.floor(data.nowMinutes / 60)));
  const wd = weekdayOf(today);

  // Same weekday + same hour history (never mixes weekends with weekdays).
  const history = (h: number, metric: (d: string, h: number) => number) => {
    const samples: { ageDays: number; value: number }[] = [];
    for (let d = shift(today, -7); d >= firstDate; d = shift(d, -7)) {
      samples.push({ ageDays: daysBetween(d, today), value: metric(d, h) });
    }
    return { avg: weightedAverage(samples), n: samples.length };
  };

  const cur = occ(today, nowHour);
  const hist = history(nowHour, occ);
  const demand = classifyDemand(cur, hist.avg);
  const promo = pickPromotion(demand, hist.avg, wd, nowHour);
  const curRevenue = rev(today, nowHour);
  const expectedRevenue = history(nowHour, rev).avg;
  const confidence = hist.n >= 8 ? "High" : hist.n >= 4 ? "Medium" : "Low";

  const todays = slots.filter((s) => s.date === today);
  const todayRevenue = todays.reduce((s, x) => s + x.revenue, 0);
  const remaining = HOURS.filter((h) => h * 60 >= data.nowMinutes).reduce((s, h) => s + history(h, rev).avg, 0);
  const predictedEod = todayRevenue + remaining;
  const todayOcc = HOURS.filter((h) => h <= nowHour).reduce((s, h) => s + occ(today, h), 0) / Math.max(1, HOURS.filter((h) => h <= nowHour).length);

  // Impact estimate for the current slot.
  const avgSlotRevenue = slots.length ? slots.reduce((s, x) => s + x.revenue, 0) / slots.length : 0;
  const expectedOcc = promo ? Math.min(1, cur + promo.lift) : cur;
  const extraCustomers = promo ? Math.max(0, Math.round((expectedOcc - cur) * capacity * 2)) : 0;
  const extraRevenue = promo ? Math.round(extraCustomers * avgSlotRevenue * (1 - promo.discount)) : 0;

  const fmtPct = (v: number) => `${Math.round(v * 100)}%`;
  const slotName = `${WEEKDAYS[wd]} ${hourName(nowHour)}–${hourName(nowHour + 1)}`;
  const reason = !promo
    ? demand === "high"
      ? `${slotName} usually runs at ${fmtPct(hist.avg)} occupancy and is ${fmtPct(cur)} full right now. Demand is strong, so a discount would only give money away.`
      : `${slotName} is at ${fmtPct(cur)} against a usual ${fmtPct(hist.avg)}. Demand is on track, so no promotion is needed.`
    : `Occupancy during ${slotName} has averaged ${fmtPct(hist.avg)} on past ${WEEKDAYS[wd]}s (recent weeks weigh most), but it is only ${fmtPct(cur)} now — ${Math.round((1 - cur / Math.max(hist.avg, 0.01)) * 100)}% below normal. A "${promo.name}" offer is expected to lift occupancy by about ${Math.round(promo.lift * 100)} points.`;

  // Range-scoped charts.
  const dates: string[] = [];
  for (let d = filters.from; d <= filters.to && d <= today; d = shift(d, 1)) dates.push(d);
  const heat = WEEKDAYS.map((_, w) =>
    HOURS.map((h) => {
      const ds = dates.filter((d) => weekdayOf(d) === w);
      return ds.length ? ds.reduce((s, d) => s + occ(d, h), 0) / ds.length : 0;
    }),
  );
  const inRange = slots.filter((s) => s.date >= filters.from && s.date <= filters.to);
  const trend = dates.map((d) => ({
    label: d.slice(5),
    occupancy: Math.round((HOURS.reduce((s, h) => s + occ(d, h), 0) / HOURS.length) * 100),
    revenue: Math.round(inRange.filter((s) => s.date === d).reduce((s, x) => s + x.revenue, 0)),
  }));
  const byHour = HOURS.map((h) => ({
    label: hourName(h),
    bookings: inRange.filter((s) => Math.floor(s.start / 60) === h).length,
  }));
  const byWeekday = WEEKDAYS.map((name, w) => ({
    label: name.slice(0, 3),
    bookings: inRange.filter((s) => weekdayOf(s.date) === w).length,
  }));
  const byType = new Map<string, number>();
  for (const s of inRange) byType.set(s.type, (byType.get(s.type) ?? 0) + s.revenue);
  const revenueByExperience = [...byType.entries()].map(([t, v]) => ({ name: TYPE_LABELS[t] ?? t, value: Math.round(v) }));
  const dist = [0, 0, 0, 0];
  for (const d of dates) for (const h of HOURS) {
    const o = occ(d, h);
    const k = o < 0.25 ? 0 : o < 0.5 ? 1 : o < 0.75 ? 2 : 3;
    dist[k] = (dist[k] ?? 0) + 1;
  }
  const distribution = ["Under 25%", "25–50%", "50–75%", "75%+"].map((name, i) => ({ name, value: dist[i] }));

  return {
    capacity,
    kpis: {
      occupancy: todayOcc,
      todayRevenue,
      todayBookings: todays.length,
      predictedEod,
      activeOffer: promo?.name ?? "None",
      extraRevenue,
    },
    slot: { name: slotName, current: cur, average: hist.avg, diff: cur - hist.avg, curRevenue, expectedRevenue, demand },
    promo,
    impact: { currentOcc: cur, expectedOcc, currentRevenue: todayRevenue, predictedRevenue: predictedEod + extraRevenue, extraCustomers, confidence },
    reason,
    heat,
    trend,
    byHour,
    byWeekday,
    revenueByExperience,
    distribution,
  };
}
