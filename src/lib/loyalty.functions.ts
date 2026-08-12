import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface LoyaltyCustomer {
  phone: string;
  name: string;
  totalVisits: number;
  rewardsAvailable: number;
  /** Visits completed inside the current 5-visit cycle. */
  cycleProgress: number;
  visitsToReward: number;
}

export const VISITS_PER_REWARD = 5;
export const REWARD_MINUTES = 30;

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

const shape = (row: { phone: string; name: string; total_visits: number }, rewards: number): LoyaltyCustomer => {
  const totalVisits = Number(row.total_visits ?? 0);
  const cycleProgress = totalVisits % VISITS_PER_REWARD;
  return {
    phone: row.phone,
    name: row.name,
    totalVisits,
    rewardsAvailable: rewards,
    cycleProgress,
    visitsToReward: VISITS_PER_REWARD - cycleProgress,
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
    const { count } = await db
      .from("rewards")
      .select("id", { count: "exact", head: true })
      .eq("phone", data.phone)
      .eq("status", "available");
    return { found: true, customer: shape(row as never, count ?? 0) };
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
    if (existing) return { ok: true, customer: shape(existing as never, 0) };

    const { data: created, error } = await db
      .from("customers")
      .insert({ phone: data.phone, name: data.name, total_visits: 0 })
      .select("phone, name, total_visits")
      .maybeSingle();
    if (error || !created) return { ok: false, customer: null, message: "Could not save your details." };
    return { ok: true, customer: shape(created as never, 0) };
  });
