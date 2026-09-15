/** Client-safe membership pass domain types + rules. No server imports. */

export type PassKind = "bronze" | "silver" | "gold" | "membership" | "combo" | "unlimited";

/** The three games a Combo Pass covers, each with its own 1-hour balance. */
export type ComboGame = "console" | "vr" | "driving_simulator";

export const COMBO_GAMES: ComboGame[] = ["console", "vr", "driving_simulator"];

export const COMBO_GAME_LABELS: Record<ComboGame, string> = {
  console: "PS5 Console",
  vr: "VR Arena",
  driving_simulator: "Racing Cockpit",
};

/** A Combo Pass books exactly one hour of a game at a time. */
export const COMBO_SESSION_MINUTES = 60;

export type ComboBalances = Record<ComboGame, number>;

export interface PassInfo {
  id: string;
  code: string;
  branchId: string;
  branchName: string;
  customerName: string;
  phone: string;
  passType: PassKind;
  planName: string;
  purchasedAt: string;
  expiresOn: string;
  /** Null when the pass is not metered in hours (combo / unlimited). */
  remainingMinutes: number | null;
  totalMinutes: number | null;
  remainingUses: number | null;
  /** Per-game minutes left on a Combo Pass; null for every other pass type. */
  combo: ComboBalances | null;
  status: "active" | "expired" | "used";
}

/** Games on a Combo Pass that still have time left. */
export const comboGamesLeft = (b: ComboBalances | null): ComboGame[] =>
  b ? COMBO_GAMES.filter((g) => (b[g] ?? 0) >= COMBO_SESSION_MINUTES) : [];

export const PASS_TYPE_LABELS: Record<PassKind, string> = {
  bronze: "Bronze Membership",
  silver: "Silver Membership",
  gold: "Gold Membership",
  membership: "Membership",
  combo: "Combo Offer",
  unlimited: "Unlimited Pass",
};

/** Bronze / Silver / Gold memberships only cover PS5 console play. */
export const isConsoleOnlyPass = (t: PassKind) =>
  t === "bronze" || t === "silver" || t === "gold" || t === "membership";

/** The Unlimited Pass allows exactly one hour per booking. */
export const UNLIMITED_MAX_MINUTES = 60;

export function passRuleNote(p: PassInfo): string {
  if (p.passType === "combo") return "Valid Today Only · one redemption";
  if (p.passType === "unlimited")
    return "Unlimited Pass · Valid for 30 Days · Maximum 1 Hour per booking. Unlimited bookings allowed during validity.";
  return "PS5 console play only · 1 player per booking. Booked hours are deducted from your pass.";
}

export const hoursLabel = (minutes: number | null) =>
  minutes === null ? "Unlimited" : `${Math.round((minutes / 60) * 10) / 10} h`;
