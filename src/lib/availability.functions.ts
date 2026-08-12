import { createServerFn } from "@tanstack/react-start";

/**
 * Live availability for the home page.
 * Everything is derived: working units come from the station catalogue the
 * admin manages (maintenance/blocked units are never counted) and occupied
 * units come from live bookings and active holds. No manual editing.
 */

export interface LiveService {
  station_type: string;
  label: string;
  total: number;
  available: number;
  /** "18:30" — earliest time a unit frees up when fully booked. */
  next_available: string | null;
}

export interface LiveBranchAvailability {
  id: string;
  slug: string;
  name: string;
  city: string;
  opens_at: string;
  closes_at: string;
  is_open: boolean;
  status: "open" | "closed" | "few" | "full";
  services: LiveService[];
}

const LABELS: Record<string, string> = {
  console: "PS5 Gaming",
  driving_simulator: "Racing Cockpit",
  vr: "VR Gaming",
  snooker: "Snooker",
  private_theatre: "Private Theatre",
  private_lounge: "Gaming Lounge",
};

const ORDER = [
  "console",
  "driving_simulator",
  "vr",
  "snooker",
  "private_theatre",
  "private_lounge",
];

const toMin = (t: string) => {
  const [h = "0", m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
};
const toHHMM = (mins: number) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** Current date + minute-of-day in the venue's timezone (IST). */
function nowInIst() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

export const getLiveAvailability = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveBranchAvailability[]> => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    const { date, minutes } = nowInIst();

    const [branchesRes, stationsRes] = await Promise.all([
      db
        .from("branches")
        .select("id, slug, name, city, opens_at, closes_at")
        .eq("is_active", true)
        .order("sort_order"),
      db.from("gaming_stations").select("id, branch_id, station_type, status"),
    ]);

    const branches = branchesRes.data ?? [];
    const stations = stationsRes.data ?? [];

    const out: LiveBranchAvailability[] = [];
    for (const b of branches) {
      const { data: busyRows } = await db.rpc("get_slot_availability", {
        _branch_id: b.id,
        _date: date,
      });
      const busy = (busyRows ?? []) as {
        station_id: string;
        start_time: string;
        end_time: string;
      }[];

      const open = toMin(b.opens_at);
      const close = toMin(b.closes_at);
      const isOpen = close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;

      // Working units only — maintenance and blocked consoles never count.
      const working = stations.filter((s) => s.branch_id === b.id && s.status === "available");

      const services: LiveService[] = [];
      for (const type of ORDER) {
        const units = working.filter((s) => s.station_type === type);
        if (!units.length) continue;

        let occupied = 0;
        let nextFree: number | null = null;
        for (const u of units) {
          const covering = busy.filter(
            (r) =>
              r.station_id === u.id &&
              toMin(r.start_time) <= minutes &&
              toMin(r.end_time) > minutes,
          );
          if (!covering.length) continue;
          occupied += 1;
          const end = Math.max(...covering.map((r) => toMin(r.end_time)));
          if (nextFree === null || end < nextFree) nextFree = end;
        }

        services.push({
          station_type: type,
          label: LABELS[type] ?? type,
          total: units.length,
          available: Math.max(0, units.length - occupied),
          next_available:
            units.length - occupied <= 0 && nextFree !== null ? toHHMM(nextFree) : null,
        });
      }

      const total = services.reduce((n, s) => n + s.total, 0);
      const free = services.reduce((n, s) => n + s.available, 0);
      const status: LiveBranchAvailability["status"] = !isOpen
        ? "closed"
        : total === 0 || free === 0
          ? "full"
          : free / total <= 0.34
            ? "few"
            : "open";

      out.push({
        id: b.id,
        slug: b.slug,
        name: b.name,
        city: b.city,
        opens_at: b.opens_at,
        closes_at: b.closes_at,
        is_open: isOpen,
        status,
        services,
      });
    }
    return out;
  },
);
