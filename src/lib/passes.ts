/** Client-safe membership pass domain types + rules. No server imports. */

export type PassKind = "bronze" | "silver" | "gold" | "membership" | "combo" | "unlimited";

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
  status: "active" | "expired" | "used";
}

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
