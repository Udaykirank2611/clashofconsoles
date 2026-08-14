/**
 * Types and pure helpers for live arena availability.
 * Kept out of the server-function file: server-fn splitting strips runtime
 * siblings from that module at build time.
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

export const LABELS: Record<string, string> = {
  console: "PS5 Gaming",
  driving_simulator: "Racing Cockpit",
  vr: "VR Gaming",
  snooker: "Snooker",
  private_theatre: "Private Theatre",
  private_lounge: "Gaming Lounge",
};

export const ORDER = [
  "console",
  "driving_simulator",
  "vr",
  "snooker",
  "private_theatre",
  "private_lounge",
];

export const toMin = (t: string) => {
  const [h = "0", m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
};

export const toHHMM = (mins: number) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** Current date + minute-of-day in the venue's timezone (IST). */
export function nowInIst() {
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
