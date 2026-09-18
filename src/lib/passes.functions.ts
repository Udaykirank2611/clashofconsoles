import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  COMBO_SESSION_MINUTES,
  comboGamesLeft,
  isConsoleOnlyPass,
  UNLIMITED_MAX_MINUTES,
  type ComboBalances,
  type ComboGame,
  type PassInfo,
  type PassKind,
} from "@/lib/passes";

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(6)
  .max(24)
  .regex(/^[A-Z0-9-]+$/, "Enter a valid Pass ID");

/** Combo balances from a database row; null for every other pass type. */
export function comboFromRow(row: {
  pass_type: string;
  combo_console_minutes: number | null;
  combo_vr_minutes: number | null;
  combo_sim_minutes: number | null;
}): ComboBalances | null {
  if (row.pass_type !== "combo") return null;
  return {
    console: Number(row.combo_console_minutes ?? 0),
    vr: Number(row.combo_vr_minutes ?? 0),
    driving_simulator: Number(row.combo_sim_minutes ?? 0),
  };
}

export interface PassLookup {
  found: boolean;
  valid: boolean;
  message: string;
  pass?: PassInfo;
  /** Booking rules the flow must enforce for this pass. */
  rules?: {
    consoleOnly: boolean;
    maxMinutes: number | null;
    oneUseOnly: boolean;
    /** Combo Pass: only these games may be booked, one hour each. */
    comboGames: ComboGame[] | null;
  };
}

/**
 * Look up a membership / combo / unlimited pass by its Pass ID and validate it
 * for redemption. Public: guests redeem their own pass on the booking page and
 * staff use the same lookup inside the admin panel.
 */
export const lookupPass = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ code: codeSchema }).parse(i))
  .handler(async ({ data }): Promise<PassLookup> => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    await db.rpc("expire_membership_passes");

    const { data: row } = await db
      .from("membership_passes")
      .select("*, branches(name)")
      .eq("code", data.code)
      .maybeSingle();

    if (!row) return { found: false, valid: false, message: "No pass found with that Pass ID." };

    const passType = row.pass_type as PassKind;
    const pass: PassInfo = {
      id: row.id,
      code: row.code,
      branchId: row.branch_id,
      branchName: (row as unknown as { branches?: { name?: string } }).branches?.name ?? "",
      customerName: row.customer_name,
      phone: row.phone,
      passType,
      planName: row.plan_name,
      purchasedAt: row.purchased_at,
      expiresOn: row.expires_on,
      remainingMinutes: row.remaining_minutes === null ? null : Number(row.remaining_minutes),
      totalMinutes: row.total_minutes === null ? null : Number(row.total_minutes),
      remainingUses: row.remaining_uses === null ? null : Number(row.remaining_uses),
      combo: comboFromRow(row as never),
      status: row.status as PassInfo["status"],
    };

    const comboGames = comboGamesLeft(pass.combo);
    const today = new Date().toISOString().slice(0, 10);
    let message = "";
    if (pass.status === "used") message = "This pass has already been fully used.";
    else if (pass.status === "expired" || pass.expiresOn < today) message = "This pass has expired.";
    else if (passType === "combo" && !comboGames.length)
      message = "All three games on this Combo Pass have been used.";
    else if (pass.remainingMinutes !== null && pass.remainingMinutes <= 0)
      message = "This pass has no remaining hours.";
    else if (pass.remainingUses !== null && pass.remainingUses <= 0)
      message = "This pass has no remaining uses.";

    return {
      found: true,
      valid: !message,
      message: message || "Pass verified.",
      pass,
      rules: {
        consoleOnly: isConsoleOnlyPass(passType),
        maxMinutes:
          passType === "combo"
            ? COMBO_SESSION_MINUTES
            : passType === "unlimited"
              ? UNLIMITED_MAX_MINUTES
              : pass.remainingMinutes === null
                ? null
                : pass.remainingMinutes,
        oneUseOnly: false,
        comboGames: passType === "combo" ? comboGames : null,
      },
    };
  });

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Pass ID for a staff-created custom pass: COC-CP-XXXXXX. */
function makePassCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += chars[b % chars.length];
  return `COC-CP-${s}`;
}

/**
 * Admin: sell a bespoke pass at the counter. Creates the pass (redeemable with
 * its code by the customer's phone number), a completed booking so the sale
 * shows in transactions and reports, and the cash / UPI payment split.
 */
export const createCustomPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        phone: z.string().trim().min(6).max(20),
        price: z.number().min(0).max(1_000_000),
        players: z.number().int().min(1).max(50),
        consoleHours: z.number().min(0).max(100),
        vrHours: z.number().min(0).max(100),
        simHours: z.number().min(0).max(100),
        expiresOn: z.string().regex(DATE),
        cashAmount: z.number().min(0),
        upiAmount: z.number().min(0),
        upiProvider: z.enum(["phonepe", "google_pay", "paytm", "other"]).nullable().default(null),
        notes: z.string().max(300).default(""),
      })
      .transform((v) => ({ ...v, phone: v.phone.replace(/[^\d]/g, "").slice(-10) }))
      .parse(i),
  )
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; message?: string; code?: string }> => {
      if (!/^[6-9]\d{9}$/.test(data.phone))
        return { ok: false, message: "Enter a valid 10-digit mobile number." };
      if (data.consoleHours + data.vrHours + data.simHours <= 0)
        return { ok: false, message: "Add at least one hour to the pass." };

      // Caller must be allowed to see this branch under RLS.
      const { data: branch } = await context.supabase
        .from("branches")
        .select("id")
        .eq("id", data.branchId)
        .maybeSingle();
      if (!branch) return { ok: false, message: "Branch not available for this account." };

      const { adminClient, makeReference } = await import("@/lib/booking/repository.server");
      const db = await adminClient();

      const today = new Date().toISOString().slice(0, 10);
      const paymentMode =
        data.cashAmount > 0 && data.upiAmount > 0 ? "mixed" : data.upiAmount > 0 ? "upi" : "cash";
      const reference = makeReference();

      const { data: booking, error: bookingError } = await db
        .from("bookings")
        .insert({
          reference,
          branch_id: data.branchId,
          booking_date: today,
          customer_name: data.name,
          customer_phone: data.phone,
          players: data.players,
          session_amount: 0,
          addons_amount: data.price,
          food_amount: 0,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: data.price,
          status: "completed",
          booking_type: "single",
          payment_mode: paymentMode,
          special_instructions: data.notes || "Custom pass sold at counter",
        })
        .select("id")
        .single();
      if (bookingError || !booking)
        return { ok: false, message: bookingError?.message ?? "Could not record the sale." };

      const code = makePassCode();
      const { error: passError } = await db.from("membership_passes").insert({
        code,
        branch_id: data.branchId,
        phone: data.phone,
        customer_name: data.name,
        pass_type: "combo",
        plan_name: "Custom Pass",
        source_booking_id: booking.id,
        expires_on: data.expiresOn,
        price: data.price,
        status: "active",
        combo_console_minutes: Math.round(data.consoleHours * 60),
        combo_vr_minutes: Math.round(data.vrHours * 60),
        combo_sim_minutes: Math.round(data.simHours * 60),
      });
      if (passError) {
        await db.from("bookings").delete().eq("id", booking.id);
        return { ok: false, message: passError.message };
      }

      await db.from("booking_items").insert({
        booking_id: booking.id,
        kind: "addon",
        label: `Custom Pass · ${code}`,
        unit_price: data.price,
        quantity: 1,
        line_total: data.price,
      });

      await db.from("booking_transactions").upsert(
        {
          booking_id: booking.id,
          branch_id: data.branchId,
          transaction_status: "completed",
          booking_source: "membership",
          upi_provider: data.upiAmount > 0 ? (data.upiProvider ?? "other") : null,
          cash_amount: data.cashAmount,
          upi_amount: data.upiAmount,
          admin_notes: data.notes,
        },
        { onConflict: "booking_id" },
      );

      return { ok: true, code };
    },
  );

/** Admin: change a pass's validity date, reactivating it when moved forward. */
export const updatePassExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ passId: z.string().uuid(), expiresOn: z.string().regex(DATE) }).parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { data: row } = await context.supabase
      .from("membership_passes")
      .select("id, status, remaining_minutes, remaining_uses, combo_console_minutes, combo_vr_minutes, combo_sim_minutes")
      .eq("id", data.passId)
      .maybeSingle();
    if (!row) return { ok: false, message: "Pass not found for this branch." };

    const balanceLeft =
      (Number(row.remaining_minutes ?? 0) > 0 ||
        Number(row.remaining_uses ?? 0) > 0 ||
        Number(row.combo_console_minutes ?? 0) > 0 ||
        Number(row.combo_vr_minutes ?? 0) > 0 ||
        Number(row.combo_sim_minutes ?? 0) > 0) &&
      row.status !== "used";

    const today = new Date().toISOString().slice(0, 10);
    const { adminClient } = await import("@/lib/booking/repository.server");
    const { error } = await (await adminClient())
      .from("membership_passes")
      .update({
        expires_on: data.expiresOn,
        status:
          data.expiresOn >= today && balanceLeft
            ? "active"
            : data.expiresOn < today
              ? "expired"
              : row.status,
      })
      .eq("id", data.passId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/** Admin: every pass issued for a branch, newest first. */
export const listPasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ branchId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<PassInfo[]> => {
    {
      const { adminClient } = await import("@/lib/booking/repository.server");
      await (await adminClient()).rpc("expire_membership_passes");
    }
    const { data: rows } = await context.supabase
      .from("membership_passes")
      .select("*, branches(name)")
      .eq("branch_id", data.branchId)
      .order("purchased_at", { ascending: false })
      .limit(500);

    return (rows ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      branchId: row.branch_id,
      branchName: (row as unknown as { branches?: { name?: string } }).branches?.name ?? "",
      customerName: row.customer_name,
      phone: row.phone,
      passType: row.pass_type as PassKind,
      planName: row.plan_name,
      purchasedAt: row.purchased_at,
      expiresOn: row.expires_on,
      remainingMinutes: row.remaining_minutes === null ? null : Number(row.remaining_minutes),
      totalMinutes: row.total_minutes === null ? null : Number(row.total_minutes),
      remainingUses: row.remaining_uses === null ? null : Number(row.remaining_uses),
      combo: comboFromRow(row as never),
      status: row.status as PassInfo["status"],
    }));
  });

/**
 * Every still-usable pass belonging to a phone number, oldest purchase first.
 * Used to pre-fill the Pass ID box once the guest has entered their number.
 */
export const passesForPhone = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({ phone: z.string().trim().min(6).max(20) })
      .transform((v) => ({ phone: v.phone.replace(/[^\d]/g, "").slice(-10) }))
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ codes: string[] }> => {
    if (!/^[6-9]\d{9}$/.test(data.phone)) return { codes: [] };
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    await db.rpc("expire_membership_passes");

    const today = new Date().toISOString().slice(0, 10);
    const { data: rows } = await db
      .from("membership_passes")
      .select("code, purchased_at, expires_on, status, remaining_minutes, remaining_uses")
      .eq("phone", data.phone)
      .eq("status", "active")
      .gte("expires_on", today)
      .order("purchased_at", { ascending: true })
      .limit(20);

    const usable = (rows ?? []).filter(
      (r) =>
        (r.remaining_minutes === null || Number(r.remaining_minutes) > 0) &&
        (r.remaining_uses === null || Number(r.remaining_uses) > 0),
    );
    return { codes: usable.map((r) => r.code) };
  });
