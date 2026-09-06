import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface LoyaltyReward {
  /** Free minutes this reward adds to a gaming session. */
  minutes: number;
  /** Completed-visit milestone at which this reward expires if unused. */
  expiresAtVisit: number;
}

export interface LoyaltyCustomer {
  phone: string;
  name: string;
  totalVisits: number;
  /** 0 or 1 — a customer never holds more than one milestone reward. */
  rewardsAvailable: number;
  /** The single active reward, when there is one. */
  reward: LoyaltyReward | null;
  /** Visits completed inside the current 5-visit cycle. */
  cycleProgress: number;
  visitsToReward: number;
  /** Visit number of the next milestone, and what it unlocks. */
  nextMilestoneVisit: number;
  nextRewardMinutes: number;
}

export const VISITS_PER_REWARD = 5;
export const REWARD_MINUTES = 30;
/** Minimum booked gaming duration before a reward can extend the session. */
export const REWARD_MIN_BOOKING_MINUTES = 60;

/** 5th visit → 30 minutes, 10th visit → 1 hour, then alternating every 5 visits. */
export const rewardMinutesForVisit = (visit: number) => (visit % 10 === 0 ? 60 : 30);

export const rewardLabel = (minutes: number) =>
  minutes >= 60
    ? minutes % 60 === 0
      ? `${minutes / 60} Hour${minutes / 60 > 1 ? "s" : ""}`
      : `${Math.floor(minutes / 60)} Hour ${minutes % 60} Minutes`
    : `${minutes} Minutes`;

/** 10-digit Indian mobile, tolerant of +91 / 0 prefixes and spaces. */
export const normalizePhone = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local;
};

const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");

const shape = (
  row: { phone: string; name: string; total_visits: number },
  reward: LoyaltyReward | null,
): LoyaltyCustomer => {
  const totalVisits = Number(row.total_visits ?? 0);
  const cycleProgress = totalVisits % VISITS_PER_REWARD;
  const nextMilestoneVisit = totalVisits + (VISITS_PER_REWARD - cycleProgress);
  return {
    phone: row.phone,
    name: row.name,
    totalVisits,
    rewardsAvailable: reward ? 1 : 0,
    reward,
    cycleProgress,
    visitsToReward: VISITS_PER_REWARD - cycleProgress,
    nextMilestoneVisit,
    nextRewardMinutes: rewardMinutesForVisit(nextMilestoneVisit),
  };
};

/** Look up a customer by phone. No OTP, no login — just a lookup. */
export const lookupCustomer = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ phone: phoneSchema }).parse(i))
  .handler(async ({ data }): Promise<{ found: boolean; customer: LoyaltyCustomer | null }> => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    const { data: row } = await db
      .from("customers")
      .select("phone, name, total_visits")
      .eq("phone", data.phone)
      .maybeSingle();
    if (!row) return { found: false, customer: null };
    const visits = Number((row as { total_visits: number }).total_visits ?? 0);
    /* A reward stays usable for two visits after the milestone that unlocked it. */
    const { data: reward } = await db
      .from("rewards")
      .select("minutes, expires_at_visit")
      .eq("phone", data.phone)
      .eq("status", "available")
      .gte("expires_at_visit", visits + 1)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      found: true,
      customer: shape(
        row as never,
        reward
          ? {
              minutes: Number(reward.minutes ?? REWARD_MINUTES),
              expiresAtVisit: Number(reward.expires_at_visit ?? visits + VISITS_PER_REWARD),
            }
          : null,
      ),
    };
  });

/** Creates a brand-new customer (name + phone only) and returns their loyalty state. */
export const registerCustomer = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ phone: phoneSchema, name: z.string().trim().min(2).max(80) }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; customer: LoyaltyCustomer | null; message?: string }> => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    const { data: existing } = await db
      .from("customers")
      .select("phone, name, total_visits")
      .eq("phone", data.phone)
      .maybeSingle();
    if (existing) return { ok: true, customer: shape(existing as never, null) };

    const { data: created, error } = await db
      .from("customers")
      .insert({ phone: data.phone, name: data.name, total_visits: 0 })
      .select("phone, name, total_visits")
      .maybeSingle();
    if (error || !created) return { ok: false, customer: null, message: "Could not save your details." };
    return { ok: true, customer: shape(created as never, null) };
  });
