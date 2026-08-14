import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** True once at least one admin account exists (used to gate first-time setup). */
export const adminExists = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
});

/** One-time bootstrap: creates the very first owner account. No-ops once an admin exists. */
export const bootstrapOwner = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(120),
        password: z.string().min(8).max(72),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return { ok: false, message: "Setup has already been completed." };

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false, message: error?.message ?? "Could not create the account." };

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "owner" });
    if (roleError) return { ok: false, message: roleError.message };
    return { ok: true };
  });

/** Owner-only: create a login that can manage exactly one branch. */
export const createBranchAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(120),
        password: z.string().min(8).max(72),
        branchId: z.string().uuid(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { data: ownerRow } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "owner")
      .maybeSingle();
    if (!ownerRow) return { ok: false, message: "Only the owner can add branch logins." };


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false, message: error?.message ?? "Could not create the login." };

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "branch_admin", branch_id: data.branchId });
    if (roleError) return { ok: false, message: roleError.message };
    return { ok: true };
  });

/**
 * Staff edit of a booking's extra hours before accepting it.
 * Shrinking the hours immediately shortens the blocked time so the freed
 * hour becomes bookable for everyone again; totals are recomputed server-side.
 */
export const updateBookingExtraHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        itemId: z.string().uuid(),
        extraHours: z.number().int().min(0).max(12),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { data: booking, error: readError } = await context.supabase
      .from("bookings")
      .select("id, branch_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    // RLS scopes this read to the branches this admin manages.
    if (readError || !booking) return { ok: false, message: "You cannot edit this booking." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item } = await supabaseAdmin
      .from("booking_items")
      .select("*")
      .eq("id", data.itemId)
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (!item || !item.start_time || !item.end_time)
      return { ok: false, message: "This line cannot be edited." };

    const hourPrice = Number(item.extra_hour_price ?? 0);
    if (hourPrice <= 0) return { ok: false, message: "This line has no extra-hour rate." };

    const oldHours = Number(item.extra_hours ?? 0);
    const basePrice = Number(item.unit_price) - oldHours * hourPrice;
    const [h, m] = String(item.end_time).split(":").map(Number);
    const endMinutes = h! * 60 + m! + (data.extraHours - oldHours) * 60;
    if (endMinutes <= 0 || endMinutes > 24 * 60)
      return { ok: false, message: "That would push the session past midnight." };
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const newPrice = Math.round(basePrice + data.extraHours * hourPrice);
    const cleanLabel = String(item.label).replace(/ \+ \d+ extra hours?$/, "");

    const { error: itemError } = await supabaseAdmin
      .from("booking_items")
      .update({
        extra_hours: data.extraHours,
        unit_price: newPrice,
        line_total: newPrice,
        end_time: endTime,
        label: data.extraHours
          ? `${cleanLabel} + ${data.extraHours} extra hour${data.extraHours > 1 ? "s" : ""}`
          : cleanLabel,
      })
      .eq("id", data.itemId);
    if (itemError) return { ok: false, message: "Could not update this booking." };

    // Recompute the money for the whole booking from its lines.
    const [{ data: full }, { data: lines }, { data: branch }] = await Promise.all([
      supabaseAdmin.from("bookings").select("*").eq("id", data.bookingId).maybeSingle(),
      supabaseAdmin.from("booking_items").select("kind, line_total").eq("booking_id", data.bookingId),
      supabaseAdmin.from("branches").select("tax_percent").eq("id", booking.branch_id).maybeSingle(),
    ]);
    if (!full) return { ok: false, message: "Booking not found." };
    const addons = (lines ?? [])
      .filter((l) => l.kind === "addon")
      .reduce((s, l) => s + Number(l.line_total), 0);
    const food = (lines ?? [])
      .filter((l) => l.kind === "food")
      .reduce((s, l) => s + Number(l.line_total), 0);
    const gross = Number(full.session_amount) + addons + food;
    const discount = Math.min(Number(full.discount_amount), gross);
    const taxable = gross - discount;
    const tax = Math.round((taxable * Number(branch?.tax_percent ?? 0)) / 100);
    await supabaseAdmin
      .from("bookings")
      .update({
        addons_amount: addons,
        food_amount: food,
        discount_amount: discount,
        tax_amount: tax,
        total_amount: taxable + tax,
      })
      .eq("id", data.bookingId);

    return { ok: true };
  });

/** Admin > Customers: read-only loyalty roster. */
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<
      {
        phone: string;
        name: string;
        totalVisits: number;
        rewardsAvailable: number;
        rewardMinutes: number | null;
        rewardStatus: "available" | "none";
        rewardExpiresAtVisit: number | null;
      }[]
    > => {
      const { data: role } = await context.supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!role) return [];

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: customers }, { data: rewards }] = await Promise.all([
        supabaseAdmin.from("customers").select("phone, name, total_visits").order("total_visits", { ascending: false }),
        supabaseAdmin
          .from("rewards")
          .select("phone, minutes, expires_at_visit")
          .eq("status", "available"),
      ]);
      // A customer never holds more than one milestone reward.
      const active = new Map<string, { minutes: number; expiresAtVisit: number | null }>();
      for (const r of rewards ?? [])
        active.set(r.phone, {
          minutes: Number(r.minutes ?? 30),
          expiresAtVisit: r.expires_at_visit === null ? null : Number(r.expires_at_visit),
        });
      return (customers ?? []).map((c) => {
        const reward = active.get(c.phone) ?? null;
        const visits = Number(c.total_visits ?? 0);
        return {
          phone: c.phone,
          name: c.name,
          totalVisits: visits,
          rewardsAvailable: reward ? 1 : 0,
          rewardMinutes: reward?.minutes ?? null,
          rewardStatus: (reward ? "available" : "none") as "available" | "none",
          rewardExpiresAtVisit:
            reward?.expiresAtVisit ?? (reward ? visits + (5 - (visits % 5)) : null),
        };
      });
    },
  );
