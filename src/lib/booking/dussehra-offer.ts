import type { StationType } from "./types";

/** Temporary Dussehra offer advertised for 1–31 October 2026. */
export const DUSSEHRA_OFFER_START = "2026-10-01";
export const DUSSEHRA_OFFER_END = "2026-10-31";
export const DUSSEHRA_OFFER_START_MINUTES = 10 * 60;
export const DUSSEHRA_OFFER_END_MINUTES = 16 * 60;

const PS5_HOURLY_BY_PLAYERS: Record<number, number> = {
  1: 100,
  2: 150,
  3: 200,
  4: 250,
};

const PRIVATE_THEATRE_OFFER_BY_LABEL: Record<string, number> = {
  "2 members": 499,
  "4-5 people": 999,
  "4-5 members": 999,
  "6-8 people": 1499,
  "6-8 members": 1499,
};

const minutesFromTime = (time: string) => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

export function isDussehraOfferDate(date: string) {
  return date >= DUSSEHRA_OFFER_START && date <= DUSSEHRA_OFFER_END;
}

/** Before a slot is chosen, preview promotional prices only during offer hours in India. */
export function dussehraPreviewTime(date: string, startTime: string | null) {
  if (startTime) return startTime;
  if (!isDussehraOfferDate(date)) return null;

  const india = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    india.find((entry) => entry.type === type)?.value ?? "00";
  const indiaDate = `${part("year")}-${part("month")}-${part("day")}`;
  const indiaMinutes = Number(part("hour")) * 60 + Number(part("minute"));

  return date === indiaDate &&
    indiaMinutes >= DUSSEHRA_OFFER_START_MINUTES &&
    indiaMinutes < DUSSEHRA_OFFER_END_MINUTES
    ? "10:00:00"
    : null;
}

/** The complete paid session must start at/after 10 AM and finish by 4 PM. */
export function isDussehraOfferSlot(date: string, startTime: string, durationMinutes: number) {
  const start = minutesFromTime(startTime);
  return (
    isDussehraOfferDate(date) &&
    durationMinutes >= 60 &&
    durationMinutes % 60 === 0 &&
    start >= DUSSEHRA_OFFER_START_MINUTES &&
    start + durationMinutes <= DUSSEHRA_OFFER_END_MINUTES
  );
}

export function dussehraPs5Price(
  date: string,
  startTime: string,
  players: number,
  durationMinutes: number,
) {
  if (!isDussehraOfferSlot(date, startTime, durationMinutes)) return null;
  const hourly = PS5_HOURLY_BY_PLAYERS[players];
  return hourly === undefined ? null : hourly * (durationMinutes / 60);
}

export function dussehraExperiencePrice(
  date: string,
  startTime: string,
  stationType: StationType,
  durationMinutes: number,
  rateLabel?: string | null,
) {
  if (!isDussehraOfferSlot(date, startTime, durationMinutes)) return null;
  if (stationType === "vr" || stationType === "driving_simulator") {
    return 200 * (durationMinutes / 60);
  }
  if (stationType === "snooker") return 150 * (durationMinutes / 60);
  if (stationType === "private_theatre") {
    const normalized = rateLabel?.trim().toLowerCase() ?? "";
    return PRIVATE_THEATRE_OFFER_BY_LABEL[normalized] ?? null;
  }
  return null;
}
