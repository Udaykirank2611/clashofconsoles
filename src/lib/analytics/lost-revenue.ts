/**
 * Lost Revenue — estimates money the venue missed, from booking history.
 * Pure + client-safe. Idle/empty losses are measured against a target
 * occupancy so a quiet hour is not valued as if every station could be full.
 */

export const TARGET_OCCUPANCY = 0.6;
export const LOST_REASONS = [
  "Cancelled bookings",
  "No shows",
  "Empty time slots",
  "Idle consoles",
  "Maintenance downtime",
  "Late arrivals",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const TYPE_NAMES: Record<string, string> = {
  console: "PlayStation",
  vr: "VR",
  driving_simulator: "Cockpit Racing",
  private_theatre: "Private Theatre",
  snooker: "Snooker",
  private_lounge: "Private Lounge",
};

export interface LostInput {
  today: string; // IST YYYY-MM-DD
  nowMinutes: number;
  days: number; // look-back window incl. today
  branches: { id: string; name: string; opens_at: string; closes_at: string }[];
  stations: { id: string; branch_id: string; station_type: string; status: string; hourly_price: number }[];
  bookings: {
    branch_id: string;
    date: string;
    status: string;
    amount: number;
    slots: { stationId: string | null; start: number; end: number }[];
  }[];
  holidays?: { branch_id: string; date: string }[];
}

interface Entry { date: string; branch: string; type: string; hour: number; reason: LostReason; amount: number }

const dayMs = 86_400_000;
const shift = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * dayMs).toISOString().slice(0, 10);
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const hourText = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h % 24 < 12 ? "AM" : "PM"}`;

function openHours(opens: string, closes: string) {
  const o = Math.floor(toMin(opens) / 60);
  let c = Math.ceil(toMin(closes) / 60);
  if (c <= o) c += 24;
  return Array.from({ length: c - o }, (_, i) => o + i);
}

export function computeLostRevenue(input: LostInput) {
  const entries: Entry[] = [];
  const stationById = new Map(input.stations.map((s) => [s.id, s]));
  const rate = (branchId: string, type: string) => {
    const list = input.stations.filter((s) => s.branch_id === branchId && s.station_type === type && Number(s.hourly_price) > 0);
    return list.length ? list.reduce((a, s) => a + Number(s.hourly_price), 0) / list.length : 200;
  };
  const closed = new Set((input.holidays ?? []).map((h) => `${h.branch_id}|${h.date}`));
  const from = shift(input.today, -(input.days - 1));
  const branchName = new Map(input.branches.map((b) => [b.id, b.name]));

  // 1+2. Cancelled bookings and no-shows (holds that expired unpaid).
  for (const b of input.bookings) {
    if (b.date < from || b.date > input.today) continue;
    const reason: LostReason | null = b.status === "cancelled" ? "Cancelled bookings" : b.status === "expired" ? "No shows" : null;
    if (!reason || !(b.amount > 0)) continue;
    const first = b.slots[0];
    const type = first?.stationId ? (stationById.get(first.stationId)?.station_type ?? "console") : "console";
    entries.push({ date: b.date, branch: branchName.get(b.branch_id) ?? "", type, hour: first ? Math.floor(first.start / 60) % 24 : 12, reason, amount: b.amount });
  }

  // Booked station-minutes per branch|date|type|hour (live bookings only).
  const booked = new Map<string, number>();
  for (const b of input.bookings) {
    if (b.status === "cancelled" || b.status === "expired") continue;
    for (const s of b.slots) {
      const st = s.stationId ? stationById.get(s.stationId) : undefined;
      if (!st) continue;
      for (let h = Math.floor(s.start / 60); h * 60 < s.end; h += 1) {
        const overlap = Math.min(s.end, (h + 1) * 60) - Math.max(s.start, h * 60);
        if (overlap <= 0) continue;
        const k = `${b.branch_id}|${b.date}|${st.station_type}|${h}`;
        booked.set(k, (booked.get(k) ?? 0) + overlap);
      }
    }
  }

  // 3+4+5. Capacity gaps per elapsed open hour.
  for (const br of input.branches) {
    const hours = openHours(br.opens_at, br.closes_at);
    const own = input.stations.filter((s) => s.branch_id === br.id);
    const types = [...new Set(own.map((s) => s.station_type))];
    for (let d = from; d <= input.today; d = shift(d, 1)) {
      if (closed.has(`${br.id}|${d}`)) continue;
      for (const h of hours) {
        if (d === input.today && (h + 1) * 60 > input.nowMinutes) continue;
        const anyBooked = types.some((t) => (booked.get(`${br.id}|${d}|${t}|${h}`) ?? 0) > 0);
        for (const t of types) {
          const r = rate(br.id, t);
          const cap = own.filter((s) => s.station_type === t && s.status === "available").length;
          const down = own.filter((s) => s.station_type === t && s.status !== "available").length;
          const gap = Math.max(0, TARGET_OCCUPANCY * cap * 60 - (booked.get(`${br.id}|${d}|${t}|${h}`) ?? 0));
          if (gap > 0) entries.push({ date: d, branch: br.name, type: t, hour: h % 24, reason: anyBooked ? "Idle consoles" : "Empty time slots", amount: (gap / 60) * r });
          // Station status has no history, so downtime is only counted for today.
          if (down && d === input.today) entries.push({ date: d, branch: br.name, type: t, hour: h % 24, reason: "Maintenance downtime", amount: TARGET_OCCUPANCY * down * r });
        }
      }
    }
  }

  const sum = (list: Entry[]) => Math.round(list.reduce((a, e) => a + e.amount, 0));
  const weekFrom = shift(input.today, -6);
  const todayList = entries.filter((e) => e.date === input.today);
  const weekList = entries.filter((e) => e.date >= weekFrom);
  const total = sum(entries);

  const reasons = LOST_REASONS.map((reason) => {
    const amount = sum(entries.filter((e) => e.reason === reason));
    return { reason, amount, percent: total ? Math.round((amount / total) * 1000) / 10 : 0, tracked: reason !== "Late arrivals" };
  });
  const group = (key: (e: Entry) => string) => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(key(e), (m.get(key(e)) ?? 0) + e.amount);
    return [...m.entries()].map(([name, v]) => ({ name, value: Math.round(v) })).sort((a, b) => b.value - a.value);
  };
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: hourText(h), value: sum(entries.filter((e) => e.hour === h)) })).filter((r) => r.value > 0);
  const trend: { label: string; cancelled: number; idle: number; other: number }[] = [];
  for (let d = from; d <= input.today; d = shift(d, 1)) {
    const day = entries.filter((e) => e.date === d);
    trend.push({
      label: d.slice(5),
      cancelled: sum(day.filter((e) => e.reason === "Cancelled bookings" || e.reason === "No shows")),
      idle: sum(day.filter((e) => e.reason === "Idle consoles" || e.reason === "Empty time slots")),
      other: sum(day.filter((e) => e.reason === "Maintenance downtime")),
    });
  }

  // Recommendations derived from the biggest leaks.
  const recs: string[] = [];
  const pctOf = (r: LostReason) => reasons.find((x) => x.reason === r)?.percent ?? 0;
  const idlePct = pctOf("Idle consoles") + pctOf("Empty time slots");
  const quiet = [...byHour].sort((a, b) => b.value - a.value).slice(0, 2).map((r) => r.label);
  if (idlePct >= 30) recs.push(`Reduce idle hours: ${Math.round(idlePct)}% of the loss comes from unused stations. Push walk-in and group bookings.`);
  if (quiet.length) recs.push(`Launch offers during low demand — the biggest gaps are around ${quiet.join(" and ")}.`);
  const weekdayDown = weekList.some((e) => e.reason === "Maintenance downtime") || pctOf("Maintenance downtime") > 0;
  recs.push(weekdayDown
    ? "Schedule maintenance on weekday mornings — stations are under maintenance right now and losing bookable time."
    : "Schedule maintenance during weekday mornings, when demand is lowest, to protect weekend capacity.");
  if (pctOf("Cancelled bookings") + pctOf("No shows") >= 5) recs.push("Improve confirmation reminders: send a WhatsApp reminder before the slot to cut cancellations and no-shows.");
  const top = group((e) => TYPE_NAMES[e.type] ?? e.type)[0];
  if (top) recs.push(`${top.name} loses the most (${"₹" + top.value.toLocaleString("en-IN")}). Feature it in combos or happy-hour pricing.`);

  return {
    today: sum(todayList),
    week: sum(weekList),
    month: total,
    reasons,
    byBranch: group((e) => e.branch),
    byExperience: group((e) => TYPE_NAMES[e.type] ?? e.type),
    byHour,
    trend,
    recommendations: recs,
  };
}

export type LostRevenueResult = ReturnType<typeof computeLostRevenue>;
export { toMin as timeToMinutes };
