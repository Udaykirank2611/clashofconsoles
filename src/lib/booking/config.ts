/**
 * Placeholder booking configuration.
 * Everything here is meant to be swapped for real content later
 * (or moved into the database when the admin panel lands)
 * without touching any component code.
 */

export interface GameOption {
  id: string;
  title: string;
  /** Short placeholder label rendered inside the cover thumbnail. */
  cover: string;
}

/** Placeholder game library shown inside an expanded console card. */
export const PLACEHOLDER_GAMES: GameOption[] = [
  { id: "cod", title: "Call Of Duty", cover: "COD" },
  { id: "wwe", title: "WWE 2K", cover: "WWE" },
  { id: "eafc", title: "EA FC", cover: "FC" },
  { id: "mk", title: "Mortal Kombat", cover: "MK" },
  { id: "asphalt", title: "Asphalt", cover: "ASP" },
];

/** Placeholder hourly rate per number of players. */
export const PLAYER_RATES: Record<number, number> = {
  1: 150,
  2: 250,
  3: 350,
  4: 450,
};

export const PLAYER_OPTIONS = [1, 2, 3, 4] as const;

export interface DurationOption {
  minutes: number;
  label: string;
  tag?: string;
}

export const DURATIONS: DurationOption[] = [
  { minutes: 30, label: "30 Minutes", tag: "Quick run" },
  { minutes: 60, label: "1 Hour", tag: "Most picked" },
  { minutes: 120, label: "2 Hours", tag: "Squad time" },
  { minutes: 180, label: "3 Hours", tag: "Marathon" },
];

/** Hourly rate for a given player count (placeholder pricing). */
export const playerRate = (players: number) => PLAYER_RATES[players] ?? PLAYER_RATES[1]!;

/** Console session price = players hourly rate x duration. */
export const consolePrice = (players: number, minutes: number) =>
  Math.round((playerRate(players) * minutes) / 60);

/**
 * Session price for a players x duration combination.
 * Uses the admin-managed rate table when available, otherwise the placeholder rates.
 */
export function rateFor(
  rates: { players: number; duration_minutes: number; price: number }[] | undefined,
  players: number,
  minutes: number,
) {
  const match = rates?.find((r) => r.players === players && r.duration_minutes === minutes);
  return match ? Math.round(Number(match.price)) : consolePrice(players, minutes);
}
