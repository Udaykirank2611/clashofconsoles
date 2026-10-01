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

const minutesFromTime = (time: string) => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

export function isDussehraOfferDate(date: string) {
  return date >= DUSSEHRA_OFFER_START && date <= DUSSEHRA_OFFER_END;
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
) {
  if (stationType !== "vr" && stationType !== "driving_simulator") return null;
  if (!isDussehraOfferSlot(date, startTime, durationMinutes)) return null;
  return 200 * (durationMinutes / 60);
}
