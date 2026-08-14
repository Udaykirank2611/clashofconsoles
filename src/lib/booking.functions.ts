import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { addMinutes, computeBill, isRangeBusy, slotPrice } from "@/lib/booking/pricing";
import type { CouponCategory } from "@/lib/booking/pricing";

import { rateFor } from "@/lib/booking/config";
import type {
  AvailabilityEntry,
  Branch,
  BookingSummary,
  CouponResult,
  MenuItem,
  PassOption,
  GroupPassRate,
  SessionOption,
  Station,
  StationRate,
  StationGame,
} from "@/lib/booking/types";

const uuid = z.string().uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const duration = z.number().int().min(15).max(720);

/** Branches + stations + menu + sessions — the whole public catalogue in one round trip.
 *  Every operational row carries its branch, so the booking page never mixes branches. */
export const getCatalogue = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    branches: Branch[];
    stations: Station[];
    menu: MenuItem[];
    sessions: SessionOption[];
    groupRates: GroupPassRate[];
    stationRates: StationRate[];
    stationGames: StationGame[];
    passes: PassOption[];
  }> => {
    const { publicClient } = await import("@/lib/booking/repository.server");
    const db = publicClient();
    const [branches, stations, menu, sessions, groupRates, stationRates, stationGames, plans, offers] =
      await Promise.all([
        db.from("branches").select("*").eq("is_active", true).order("sort_order"),
        db.from("gaming_stations").select("*").order("sort_order"),
        db.from("menu_items").select("*").eq("is_available", true).order("sort_order"),
        db
          .from("session_options")
          .select("id, branch_id, label, duration_minutes, players, price, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        db
          .from("group_pass_rates")
          .select("id, branch_id, label, duration_minutes, price, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        db.from("station_rates").select("*").eq("is_active", true).order("sort_order"),
        db
          .from("station_games")
          .select("id, station_id, branch_id, name, image_url, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        db.from("membership_plans").select("*").eq("is_visible", true).order("sort_order"),
        db.from("site_offers").select("*").eq("is_visible", true),
      ]);

    const passes: PassOption[] = [
      ...(plans.data ?? []).map((p) => ({
        id: `membership:${p.id}`,
        branch_id: p.branch_id as string,
        kind: "membership" as const,
        name: `${p.name} Membership`,
        subtitle: `${Number(p.hours_included)} hours included`,
        price: Number(p.price),
        validity: p.validity ?? "",
        badge: p.badge ?? "",
        perks: (p.perks ?? []) as string[],
      })),
      ...(offers.data ?? []).map((o) => ({
        id: `offer:${o.branch_id}:${o.id}`,
        branch_id: o.branch_id as string,
        kind: "offer" as const,
        name: o.title,
        subtitle: o.subtitle ?? "",
        price: Number(o.price),
        validity: o.validity ?? "",
        badge: "",
        perks: (o.features ?? []) as string[],
      })),
    ].filter((p) => p.price > 0);
    return {
      branches: (branches.data ?? []) as unknown as Branch[],
      stations: (stations.data ?? []) as unknown as Station[],
      menu: (menu.data ?? []) as unknown as MenuItem[],
      sessions: (sessions.data ?? []) as unknown as SessionOption[],
      groupRates: (groupRates.data ?? []) as unknown as GroupPassRate[],
      stationRates: (stationRates.data ?? []) as unknown as StationRate[],
      stationGames: (stationGames.data ?? []) as unknown as StationGame[],
      passes,
    };
  },
);


/** Busy time ranges (booked + actively locked) for a branch on a date — no PII.
 *  A visitor's own temporary reservation is never reported as busy to that visitor,
 *  so they can freely re-pick the slot they are already holding. */
export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: uuid,
        date: dateStr,
        sessionToken: z.string().min(8).max(64).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<AvailabilityEntry[]> => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    const now = new Date().toISOString();

    // Expire unpaid bookings + sweep expired locks so slots self-heal for everyone.
    await db.rpc("expire_stale_bookings");
    await db
      .from("reservation_locks")
      .update({ released_at: now })
      .is("released_at", null)
      .lt("expires_at", now);


    const { data: rows } = await db.rpc("get_slot_availability", {
      _branch_id: data.branchId,
      _date: data.date,
    });
    const entries = (rows ?? []) as unknown as AvailabilityEntry[];
    if (!data.sessionToken) return entries;

    const { data: ownLocks } = await db
      .from("reservation_locks")
      .select("station_id, start_time")
      .eq("session_token", data.sessionToken)
      .eq("booking_date", data.date)
      .is("released_at", null)
      .gt("expires_at", now);
    const own = new Set((ownLocks ?? []).map((l) => `${l.station_id}|${l.start_time}`));
    if (!own.size) return entries;
    return entries.filter((e) => !(e.source === "locked" && own.has(`${e.station_id}|${e.start_time}`)));
  });

/** Temporarily hold a station range for 5 minutes. */
export const holdStation = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: uuid,
        date: dateStr,
        sessionToken: z.string().min(8).max(64),
        holds: z
          .array(z.object({ stationId: uuid, startTime: timeStr, durationMinutes: duration }))
          .min(1)
          .max(40),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; expiresAt?: string; message?: string }> => {
    const { adminClient, LOCK_MINUTES } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    const now = new Date();

    // Sweep expired locks first so slots self-heal.
    await db
      .from("reservation_locks")
      .update({ released_at: now.toISOString() })
      .is("released_at", null)
      .lt("expires_at", now.toISOString());

    // Drop this visitor's previous hold.
    await db
      .from("reservation_locks")
      .update({ released_at: now.toISOString() })
      .eq("session_token", data.sessionToken)
      .is("released_at", null);

    const { data: busy } = await db.rpc("get_slot_availability", {
      _branch_id: data.branchId,
      _date: data.date,
    });
    const rows = (busy ?? []) as unknown as AvailabilityEntry[];
    for (const h of data.holds) {
      if (isRangeBusy(rows, h.stationId, h.startTime, h.durationMinutes)) {
        return { ok: false, message: "That slot was just taken. Please pick another time." };
      }
    }

    const expiresAt = new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString();
    const { error } = await db.from("reservation_locks").insert(
      data.holds.map((h) => ({
        branch_id: data.branchId,
        station_id: h.stationId,
        booking_date: data.date,
        start_time: h.startTime,
        end_time: addMinutes(h.startTime, h.durationMinutes),
        session_token: data.sessionToken,
        expires_at: expiresAt,
      })),
    );
    if (error) {
      return { ok: false, message: "That station was just taken. Please pick another." };
    }
    return { ok: true, expiresAt };
  });

export const releaseHold = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ sessionToken: z.string().min(8) }).parse(i))
  .handler(async ({ data }) => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    await db
      .from("reservation_locks")
      .update({ released_at: new Date().toISOString() })
      .eq("session_token", data.sessionToken)
      .is("released_at", null);
    return { ok: true };
  });

/** Restore an in-progress reservation after a page refresh. */
export const getActiveHold = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ sessionToken: z.string().min(8).max(64) }).parse(i))
  .handler(
    async ({
      data,
    }): Promise<{
      active: boolean;
      expiresAt?: string;
      branchId?: string;
      date?: string;
      holds?: { stationId: string; startTime: string; endTime: string }[];
    }> => {
      const { adminClient } = await import("@/lib/booking/repository.server");
      const db = await adminClient();
      const now = new Date().toISOString();
      const { data: rows } = await db
        .from("reservation_locks")
        .select("branch_id, booking_date, station_id, start_time, end_time, expires_at")
        .eq("session_token", data.sessionToken)
        .is("released_at", null)
        .gt("expires_at", now)
        .order("start_time");
      if (!rows?.length) return { active: false };
      const first = rows[0]!;
      return {
        active: true,
        expiresAt: first.expires_at,
        branchId: first.branch_id,
        date: first.booking_date,
        holds: rows.map((r) => ({
          stationId: r.station_id,
          startTime: r.start_time,
          endTime: r.end_time,
        })),
      };
    },
  );


export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: uuid,
        code: z.string().trim().min(2).max(32),
        /** Kept for older callers — treated as the gaming portion. */
        amount: z.number().min(0).optional(),
        gamingAmount: z.number().min(0).optional(),
        foodAmount: z.number().min(0).optional(),
        date: dateStr,
        startTime: timeStr.nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<CouponResult> => {
    const { publicClient } = await import("@/lib/booking/repository.server");
    const { checkCouponSchedule } = await import("@/lib/booking/coupon-schedule");
    const { data: coupon } = await publicClient()
      .from("coupons")
      .select("*")
      .eq("branch_id", data.branchId)
      .eq("code", data.code.toUpperCase())
      .maybeSingle();

    if (!coupon) return { valid: false, message: "This coupon code isn't valid at this branch." };

    const now = Date.now();
    if (!coupon.is_active) return { valid: false, message: "This coupon is no longer active." };
    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now)
      return { valid: false, message: "This coupon isn't active yet." };
    if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now)
      return { valid: false, message: "This coupon has expired." };
    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit)
      return { valid: false, message: "This coupon has been fully redeemed." };

    const category = (coupon.category ?? "entire_bill") as CouponCategory;
    const gaming = Math.round(data.gamingAmount ?? data.amount ?? 0);
    const food = Math.round(data.foodAmount ?? 0);
    const base = category === "gaming" ? gaming : category === "food" ? food : gaming + food;

    if (base <= 0)
      return {
        valid: false,
        message:
          category === "gaming"
            ? "This coupon applies to gaming charges only — add a gaming session first."
            : category === "food"
              ? "This coupon applies to food & drinks only — add something from the menu first."
              : "Add something to your booking first.",
      };
    if (base < Number(coupon.min_order_amount))
      return {
        valid: false,
        message: `Minimum ${
          category === "gaming" ? "gaming" : category === "food" ? "food" : "order"
        } amount of ₹${Number(coupon.min_order_amount)} required.`,
      };

    const schedule = checkCouponSchedule(
      {
        activeDays: coupon.active_days,
        activeStartTime: coupon.active_start_time,
        activeEndTime: coupon.active_end_time,
      },
      data.date,
      data.startTime ?? null,
    );
    if (!schedule.ok) return { valid: false, message: schedule.message };

    let discount =
      coupon.discount_type === "percent"
        ? (base * Number(coupon.value)) / 100
        : Number(coupon.value);
    if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
    discount = Math.min(discount, base);

    const scope =
      category === "gaming"
        ? "gaming charges"
        : category === "food"
          ? "food & drinks"
          : "the entire bill";

    return {
      valid: true,
      message: coupon.description ?? `Coupon applied to ${scope}`,
      code: coupon.code,
      couponId: coupon.id,
      category,
      timesUsed: Number(coupon.used_count ?? 0),
      remainingUses:
        coupon.usage_limit == null
          ? null
          : Math.max(0, Number(coupon.usage_limit) - Number(coupon.used_count ?? 0)),
      expiresAt: coupon.ends_at ?? null,
      discount: Math.round(discount),

    };
  });

/** Creates the booking. All pricing is recomputed server-side. */
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: uuid,
        // A pass-only booking (membership / unlimited pass / combo offer) has no
        // gaming slot at all, so the station and time are optional.
        stationId: uuid.optional().nullable(),
        date: dateStr,
        startTime: timeStr.optional().nullable(),
        durationMinutes: duration.optional().nullable(),
        players: z.number().int().min(1).max(4),
        /** "group" reserves the whole café for one time range. */
        bookingType: z.enum(["single", "group"]).optional(),
        groupMembers: z.number().int().min(1).max(10).optional(),
        groupRateId: uuid.optional(),
        gameTitle: z.string().trim().max(60).optional().or(z.literal("")),

        extras: z
          .array(
            z.object({
              stationId: uuid,
              startTime: timeStr,
              durationMinutes: duration,
              rateId: uuid.optional(),
              extraHours: z.number().int().min(0).max(12).optional(),
            }),
          )
          .max(5)
          .optional(),
        passes: z
          .array(z.object({ id: z.string().min(3).max(80), quantity: z.number().int().min(1).max(10) }))
          .max(10)
          .optional(),
        cart: z.array(z.object({ menuItemId: uuid, quantity: z.number().int().min(1).max(20) })),
        /** Redeem a membership / combo / unlimited pass instead of paying for gaming. */
        passCode: z.string().trim().toUpperCase().max(24).optional().or(z.literal("")),
        couponCode: z.string().trim().max(32).optional(),
        studentDiscount: z.boolean().optional(),
        /** Redeem an available loyalty reward: it extends the console session for free. */
        useReward: z.boolean().optional(),
        sessionToken: z.string().min(8).max(64),
        customer: z.object({
          fullName: z.string().trim().min(2).max(80),
          phone: z
            .string()
            .trim()
            .refine((v) => {
              const digits = v.replace(/[^\d]/g, "");
              const local =
                digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits.replace(/^0/, "");
              return /^[6-9]\d{9}$/.test(local);
            }, "Enter a valid 10-digit mobile number"),

          email: z.string().trim().email().max(120).optional().or(z.literal("")),
          instructions: z.string().trim().max(500).optional().or(z.literal("")),
        }),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; reference?: string; message?: string }> => {
    const { adminClient, makeReference } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    await db.rpc("expire_stale_bookings");


    const { data: branch } = await db
      .from("branches")
      .select("*")
      .eq("id", data.branchId)
      .maybeSingle();
    if (!branch) return { ok: false, message: "Branch unavailable." };

    /* ---- Membership pass redemption ------------------------------------
       A pass funds the gaming portion of this booking. The slot is still
       reserved exactly like a paid booking, so nobody else can take it. */
    let pass:
      | {
          id: string;
          code: string;
          pass_type: string;
          plan_name: string;
          remaining_minutes: number | null;
          remaining_uses: number | null;
          branch_id: string;
        }
      | null = null;
    if (data.passCode) {
      await db.rpc("expire_membership_passes");
      const { data: row } = await db
        .from("membership_passes")
        .select("id, code, pass_type, plan_name, remaining_minutes, remaining_uses, branch_id, status, expires_on")
        .eq("code", data.passCode)
        .maybeSingle();
      if (!row) return { ok: false, message: "No pass found with that Pass ID." };
      if (row.branch_id !== data.branchId)
        return { ok: false, message: "This pass belongs to a different branch." };
      if (row.status === "used") return { ok: false, message: "This pass has already been fully used." };
      const today = new Date().toISOString().slice(0, 10);
      if (row.status === "expired" || String(row.expires_on) < today)
        return { ok: false, message: "This pass has expired." };
      if (row.remaining_minutes !== null && Number(row.remaining_minutes) <= 0)
        return { ok: false, message: "This pass has no remaining hours." };
      if (row.remaining_uses !== null && Number(row.remaining_uses) <= 0)
        return { ok: false, message: "This pass has no remaining uses." };
      pass = {
        id: row.id,
        code: row.code,
        pass_type: row.pass_type as string,
        plan_name: row.plan_name,
        remaining_minutes: row.remaining_minutes === null ? null : Number(row.remaining_minutes),
        remaining_uses: row.remaining_uses === null ? null : Number(row.remaining_uses),
        branch_id: row.branch_id,
      };
      if (data.bookingType === "group")
        return { ok: false, message: "A membership pass cannot be used for a Group Pass booking." };
      if ((data.passes ?? []).length)
        return { ok: false, message: "You cannot buy a new pass while redeeming one." };
    }

    /* Group Pass reserves the entire café, so it never carries a single
       station or extra experiences — only one time range across everything. */
    const isGroup = data.bookingType === "group";
    let groupRate: { id: string; label: string; duration_minutes: number; price: number } | null = null;
    let groupStations: { id: string; name: string }[] = [];
    if (isGroup) {
      if (!data.startTime || !data.groupRateId)
        return { ok: false, message: "Pick a start time and duration for your group pass." };
      const { data: rate } = await db
        .from("group_pass_rates")
        .select("id, label, duration_minutes, price")
        .eq("id", data.groupRateId)
        .eq("branch_id", data.branchId)
        .eq("is_active", true)
        .maybeSingle();
      if (!rate) return { ok: false, message: "That group pass duration is no longer available." };
      groupRate = { ...rate, price: Math.round(Number(rate.price)) };
      const { data: all } = await db
        .from("gaming_stations")
        .select("id, name")
        .eq("branch_id", data.branchId)
        .eq("status", "available");
      groupStations = all ?? [];
      if (!groupStations.length)
        return { ok: false, message: "No gaming experiences are available at this branch right now." };
    }

    const extras = isGroup ? [] : (data.extras ?? []);
    const hasSlot = !isGroup && Boolean(data.stationId && data.startTime && data.durationMinutes);
    const ids = isGroup
      ? []
      : [...(data.stationId ? [data.stationId] : []), ...extras.map((e) => e.stationId)];
    const { data: stations } = ids.length
      ? await db.from("gaming_stations").select("*").in("id", ids)
      : { data: [] as any[] };
    const station = stations?.find((s) => s.id === data.stationId);
    if (hasSlot && (!station || station.status !== "available"))
      return { ok: false, message: "This station is no longer available." };
    if (!isGroup && !hasSlot && !extras.length && !(data.passes ?? []).length)
      return { ok: false, message: "Add a gaming session or a pass before confirming." };
    for (const e of extras) {
      const st = stations?.find((s) => s.id === e.stationId);
      if (!st || st.status !== "available")
        return { ok: false, message: "One of the selected experiences is no longer available." };
    }


    /* Pass rules: Bronze/Silver/Gold cover PS5 console play only, the
       Unlimited Pass allows a single hour per booking, and a metered pass can
       never book more time than it has left. */
    if (pass) {
      const minutes = data.durationMinutes ?? 0;
      if (!hasSlot) return { ok: false, message: "Pick a console, date and time to redeem your pass." };
      const { isConsoleOnlyPass, UNLIMITED_MAX_MINUTES } = await import("@/lib/passes");
      if (isConsoleOnlyPass(pass.pass_type as never)) {
        if (station?.station_type !== "console")
          return { ok: false, message: "This membership can only be used for PS5 console sessions." };
        if (extras.length)
          return { ok: false, message: "This membership covers PS5 console play only." };
      }
      if (pass.pass_type === "unlimited" && minutes > UNLIMITED_MAX_MINUTES)
        return { ok: false, message: "The Unlimited Pass allows a maximum of 1 hour per booking." };
      if (pass.remaining_minutes !== null && minutes > pass.remaining_minutes)
        return {
          ok: false,
          message: `This pass has only ${Math.round((pass.remaining_minutes / 60) * 10) / 10} hours left.`,
        };
    }

    // Final conflict check, ignoring this visitor's own active locks.
    const { data: busyRows } = await db.rpc("get_slot_availability", {
      _branch_id: data.branchId,
      _date: data.date,
    });
    const { data: ownLocks } = await db
      .from("reservation_locks")
      .select("station_id,start_time,end_time")
      .eq("session_token", data.sessionToken)
      .eq("booking_date", data.date)
      .is("released_at", null);
    const own = new Set((ownLocks ?? []).map((l) => `${l.station_id}|${l.start_time}`));
    const busy = ((busyRows ?? []) as unknown as AvailabilityEntry[]).filter(
      (b) => !(b.source === "locked" && own.has(`${b.station_id}|${b.start_time}`)),
    );
    const TAKEN = "This slot has just become unavailable. Please choose another available time.";
    const NEXT_SLOT_BUSY =
      "The next time slot is unavailable. Please select another booking time or continue without using your reward.";

    /* Loyalty reward: it never discounts the bill — it extends the booked
       gaming session, provided the immediately following slot is free. */
    const { normalizePhone, REWARD_MIN_BOOKING_MINUTES } = await import("@/lib/loyalty.functions");
    const loyaltyPhone = normalizePhone(data.customer.phone);
    let rewardId: string | null = null;
    let rewardMinutes = 0;
    if (data.useReward && hasSlot && (data.durationMinutes ?? 0) >= REWARD_MIN_BOOKING_MINUTES) {
      const { data: reward } = await db
        .from("rewards")
        .select("id, minutes")
        .eq("phone", loyaltyPhone)
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reward) {
        rewardId = reward.id;
        rewardMinutes = Number(reward.minutes ?? 30);
      }
    }
    /** Total minutes the station is blocked for: paid time + free reward time. */
    const slotMinutes = (data.durationMinutes ?? 0) + rewardMinutes;

    if (hasSlot && isRangeBusy(busy, data.stationId!, data.startTime!, slotMinutes)) {
      // The paid slot is fine and only the reward extension collides → tell the
      // guest exactly that and keep their reward untouched.
      if (rewardMinutes && !isRangeBusy(busy, data.stationId!, data.startTime!, data.durationMinutes!))
        return { ok: false, message: NEXT_SLOT_BUSY };
      return { ok: false, message: TAKEN };
    }
    if (hasSlot && rewardMinutes) {
      const startM = Number(data.startTime!.slice(0, 2)) * 60 + Number(data.startTime!.slice(3, 5));
      const closeM =
        Number(String(branch.closes_at).slice(0, 2)) * 60 + Number(String(branch.closes_at).slice(3, 5));
      if (closeM > startM && startM + slotMinutes > closeM) return { ok: false, message: NEXT_SLOT_BUSY };
    }
    for (const e of extras) {
      const minutes = e.durationMinutes + (e.extraHours ?? 0) * 60;
      if (isRangeBusy(busy, e.stationId, e.startTime, minutes)) return { ok: false, message: TAKEN };
    }

    /* Group Pass: every gaming experience at the branch must be free for the
       whole duration, and the range must fit inside opening hours. */
    if (isGroup) {
      const minutes = groupRate!.duration_minutes;
      const gStart = Number(data.startTime!.slice(0, 2)) * 60 + Number(data.startTime!.slice(3, 5));
      const closeM =
        Number(String(branch.closes_at).slice(0, 2)) * 60 + Number(String(branch.closes_at).slice(3, 5));
      if (closeM > gStart && gStart + minutes > closeM) return { ok: false, message: TAKEN };
      for (const st of groupStations)
        if (isRangeBusy(busy, st.id, data.startTime!, minutes)) return { ok: false, message: TAKEN };
    }

    // The same phone number may not hold two overlapping bookings.
    const { data: samePhone } = await db
      .from("bookings")
      .select("start_time, end_time")
      .eq("customer_phone", data.customer.phone)
      .eq("booking_date", data.date)
      .in("status", ["pending", "confirmed", "awaiting_payment", "payment_pending"]);
    const occupiesTime = hasSlot || isGroup;
    const blockMinutes = isGroup ? groupRate!.duration_minutes : slotMinutes;
    const startMin = occupiesTime
      ? Number(data.startTime!.slice(0, 2)) * 60 + Number(data.startTime!.slice(3, 5))
      : 0;
    const endMin = startMin + blockMinutes;
    const clashes =
      occupiesTime &&
      (samePhone ?? []).some((b) => {
        if (!b.start_time || !b.end_time) return false;
        const bs = Number(b.start_time.slice(0, 2)) * 60 + Number(b.start_time.slice(3, 5));
        const be = Number(b.end_time.slice(0, 2)) * 60 + Number(b.end_time.slice(3, 5));
        return startMin < be && bs < endMin;
      });

    if (clashes)
      return {
        ok: false,
        message: "You already have a booking that overlaps this time. Please pick a different slot.",
      };


    const { data: sessionRows } = await db
      .from("session_options")
      .select("players, duration_minutes, price")
      .eq("branch_id", data.branchId)
      .eq("is_active", true);
    const rateRows = (sessionRows ?? []).map((r) => ({
      players: r.players ?? 1,
      duration_minutes: r.duration_minutes,
      price: Number(r.price),
    }));
    const fullSessionAmount = !hasSlot
      ? 0
      : rateFor(rateRows, data.players, data.durationMinutes ?? 0);

    // The reward is free play time, never a discount: the guest still pays the
    // full price of the duration they booked. A Group Pass is a flat branch rate.
    const sessionAmount = pass ? 0 : isGroup ? groupRate!.price : fullSessionAmount;



    // Tiered experience prices (theatre / cockpit / snooker / lounge) are priced
    // from the admin-managed rate card, never from the client.
    const extraStationIds = extras.map((e) => e.stationId);
    const { data: allRates } = extraStationIds.length
      ? await db.from("station_rates").select("*").in("station_id", extraStationIds).eq("is_active", true)
      : { data: [] as any[] };

    const extraLines = extras.map((e) => {
      const st = stations!.find((s) => s.id === e.stationId)!;
      const rate = (allRates ?? []).find((r: any) => r.id === e.rateId && r.station_id === st.id);
      const extraRate = (allRates ?? []).find((r: any) => r.station_id === st.id && r.is_extra_hour);
      const hours = rate && extraRate ? (e.extraHours ?? 0) : 0;
      const extraHourPrice = extraRate ? Math.round(Number(extraRate.price)) : 0;
      const base = rate ? Math.round(Number(rate.price)) : Math.round(slotPrice(st, e.durationMinutes));
      const price = base + hours * extraHourPrice;
      // Duration is derived server-side so the blocked time always matches what was paid for.
      const minutes = rate ? Number(rate.duration_minutes) + hours * 60 : e.durationMinutes;
      return {
        station_id: st.id,
        label: rate
          ? `${st.name} · ${rate.label}${hours ? ` + ${hours} extra hour${hours > 1 ? "s" : ""}` : ""}`
          : st.name,
        unit_price: price,
        quantity: 1,
        line_total: price,
        start_time: e.startTime,
        end_time: addMinutes(e.startTime, minutes),
        extra_hours: hours,
        extra_hour_price: extraHourPrice,
      };
    });

    // Passes / memberships / offers — priced server-side from the database.
    const passLines: { label: string; unit_price: number; quantity: number; line_total: number }[] = [];
    const requested = data.passes ?? [];
    if (requested.length) {
      const planIds = requested
        .filter((p) => p.id.startsWith("membership:"))
        .map((p) => p.id.slice("membership:".length));
      const offerIds = requested
        .filter((p) => p.id.startsWith("offer:"))
        .map((p) => p.id.split(":").slice(2).join(":"));
      const [plans, offers] = await Promise.all([
        planIds.length
          ? db
              .from("membership_plans")
              .select("id,name,price,is_visible,branch_id")
              .eq("branch_id", data.branchId)
              .in("id", planIds)
          : Promise.resolve({ data: [] as any[] }),
        offerIds.length
          ? db
              .from("site_offers")
              .select("id,title,price,is_visible,branch_id")
              .eq("branch_id", data.branchId)
              .in("id", offerIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      for (const p of requested) {
        if (p.id.startsWith("membership:")) {
          const row = (plans.data ?? []).find((r: any) => r.id === p.id.slice(11));
          if (!row || row.is_visible === false) continue;
          const unit = Number(row.price);
          passLines.push({
            label: `${row.name} Membership`,
            unit_price: unit,
            quantity: p.quantity,
            line_total: unit * p.quantity,
          });
        } else if (p.id.startsWith("offer:")) {
          const oid = p.id.split(":").slice(2).join(":");
          const row = (offers.data ?? []).find((r: any) => r.id === oid);
          if (!row || row.is_visible === false) continue;
          const unit = Number(row.price);
          passLines.push({
            label: row.title,
            unit_price: unit,
            quantity: p.quantity,
            line_total: unit * p.quantity,
          });
        }

      }
    }

    const addonsAmount =
      extraLines.reduce((s, l) => s + l.line_total, 0) +
      passLines.reduce((s, l) => s + l.line_total, 0);

    let foodAmount = 0;
    const foodLines: {
      menu_item_id: string;
      label: string;
      unit_price: number;
      quantity: number;
      line_total: number;
    }[] = [];
    if (data.cart.length) {
      const { data: menu } = await db
        .from("menu_items")
        .select("*")
        .eq("branch_id", data.branchId)
        .in("id", data.cart.map((c) => c.menuItemId));

      for (const line of data.cart) {
        const item = menu?.find((m) => m.id === line.menuItemId);
        if (!item) continue;
        const total = Number(item.price) * line.quantity;
        foodAmount += total;
        foodLines.push({
          menu_item_id: item.id,
          label: item.name,
          unit_price: Number(item.price),
          quantity: line.quantity,
          line_total: total,
        });
      }
    }

    const gamingAmount = sessionAmount + addonsAmount;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    let couponCategory: CouponCategory = "entire_bill";
    let couponDiscount = 0;
    if (data.couponCode) {
      const { data: coupon } = await db
        .from("coupons")
        .select("*")
        .eq("branch_id", data.branchId)
        .eq("code", data.couponCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      const { checkCouponSchedule } = await import("@/lib/booking/coupon-schedule");
      const slotStart = data.startTime ?? data.extras?.[0]?.startTime ?? null;
      const schedule = coupon
        ? checkCouponSchedule(
            {
              activeDays: coupon.active_days,
              activeStartTime: coupon.active_start_time,
              activeEndTime: coupon.active_end_time,
            },
            data.date,
            slotStart,
          )
        : { ok: false as const, message: "" };

      const category = (coupon?.category ?? "entire_bill") as CouponCategory;
      const base =
        category === "gaming" ? gamingAmount : category === "food" ? foodAmount : gamingAmount + foodAmount;

      // Expired or fully redeemed coupons are ignored server-side.
      const nowMs = Date.now();
      const usable =
        !!coupon &&
        !(coupon.starts_at && new Date(coupon.starts_at).getTime() > nowMs) &&
        !(coupon.ends_at && new Date(coupon.ends_at).getTime() < nowMs) &&
        !(coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit));

      if (coupon && usable && schedule.ok && base > 0 && base >= Number(coupon.min_order_amount)) {

        let d =
          coupon.discount_type === "percent"
            ? (base * Number(coupon.value)) / 100
            : Number(coupon.value);
        if (coupon.max_discount != null) d = Math.min(d, Number(coupon.max_discount));
        couponDiscount = Math.min(Math.round(d), base);
        couponCategory = category;
        couponId = coupon.id;
        couponCode = coupon.code;
      }
    }

    /* Category-aware bill: gaming coupon → food coupon → entire-bill coupon →
       student discount (20% of the gaming portion only, min ₹1000 gaming). */
    const bill = computeBill({
      gamingSubtotal: gamingAmount,
      foodSubtotal: foodAmount,
      coupon: couponId ? { category: couponCategory, discount: couponDiscount } : null,
      isStudent: Boolean(data.studentDiscount),
      taxPercent: Number(branch.tax_percent),
    });
    const studentEligible = bill.studentEligible;
    const studentDiscount = bill.studentDiscount;
    const discount = bill.totalDiscount;
    const tax = Math.round(bill.tax);
    const total = Math.round(bill.taxable) + tax;

    // Manual-UPI flow: the booking is created immediately in "awaiting payment"
    // and holds its slot until it expires (admin-configurable, default 10 min).
    const { data: pay } = await db
      .from("payment_settings")
      .select("expiry_minutes")
      .eq("branch_id", data.branchId)
      .maybeSingle();
    const expiryMinutes = Math.max(1, Number(pay?.expiry_minutes ?? 10));
    const paymentExpiresAt = new Date(Date.now() + expiryMinutes * 60_000).toISOString();

    const { data: refRow } = await db.rpc("next_booking_reference");
    const reference = (refRow as unknown as string) || makeReference();

    const { data: booking, error } = await db
      .from("bookings")
      .insert({
        reference,
        branch_id: data.branchId,
        station_id: isGroup ? null : (data.stationId ?? null),
        booking_date: data.date,
        booking_type: isGroup ? "group" : "single",
        group_members: isGroup ? (data.groupMembers ?? 1) : 0,
        start_time: isGroup ? data.startTime! : hasSlot ? data.startTime! : null,
        end_time: isGroup
          ? addMinutes(data.startTime!, groupRate!.duration_minutes)
          : hasSlot
            ? addMinutes(data.startTime!, slotMinutes)
            : null,
        reward_minutes: hasSlot ? rewardMinutes : 0,
        players: isGroup ? Math.min(4, data.groupMembers ?? 1) : data.players,
        game_title: data.gameTitle || null,
        customer_name: data.customer.fullName,
        customer_phone: data.customer.phone,
        customer_email: data.customer.email || null,
        special_instructions: data.customer.instructions || null,
        coupon_id: couponId,
        coupon_code: couponCode,
        session_amount: sessionAmount,
        addons_amount: addonsAmount,
        food_amount: foodAmount,
        discount_amount: discount,
        gaming_discount_amount: bill.gamingDiscount,
        food_discount_amount: bill.foodDiscount,
        bill_discount_amount: bill.billDiscount,
        student_discount: studentEligible,
        student_discount_amount: studentDiscount,
        tax_amount: tax,
        total_amount: total,
        pass_id: pass?.id ?? null,
        pass_minutes: pass ? (data.durationMinutes ?? 0) : 0,
        status: pass && total <= 0 ? "confirmed" : "awaiting_payment",
        payment_expires_at: pass && total <= 0 ? null : paymentExpiresAt,
      })
      .select("id, reference")
      .maybeSingle();

    if (error || !booking)
      return { ok: false, message: TAKEN };

    // Every object in a bulk PostgREST insert must have the same shape.  Food,
    // timed experiences and passes previously supplied different key sets, so
    // a mixed order could create the booking totals while silently rejecting
    // the entire booking_items insert.  Normalise every row before inserting.
    const items = [
      ...foodLines.map((l) => ({
        booking_id: booking.id,
        kind: "food" as const,
        menu_item_id: l.menu_item_id,
        station_id: null,
        label: l.label,
        unit_price: l.unit_price,
        quantity: l.quantity,
        line_total: l.line_total,
        start_time: null,
        end_time: null,
        extra_hours: 0,
        extra_hour_price: 0,
      })),
      ...extraLines.map((l) => ({
        booking_id: booking.id,
        kind: "addon" as const,
        menu_item_id: null,
        station_id: l.station_id,
        label: l.label,
        unit_price: l.unit_price,
        quantity: l.quantity,
        line_total: l.line_total,
        start_time: l.start_time,
        end_time: l.end_time,
        extra_hours: l.extra_hours,
        extra_hour_price: l.extra_hour_price,
      })),
      /* A Group Pass blocks every experience for its window; the price sits on
         the booking itself, so these lines are zero-value placeholders. */
      ...(isGroup
        ? groupStations.map((st) => ({
            booking_id: booking.id,
            kind: "addon" as const,
            menu_item_id: null,
            station_id: st.id,
            label: `${st.name} · Group Pass`,
            unit_price: 0,
            quantity: 1,
            line_total: 0,
            start_time: data.startTime!,
            end_time: addMinutes(data.startTime!, groupRate!.duration_minutes),
            extra_hours: 0,
            extra_hour_price: 0,
          }))
        : []),
      ...passLines.map((l) => ({
        booking_id: booking.id,
        kind: "addon" as const,
        menu_item_id: null,
        station_id: null,
        label: l.label,
        unit_price: l.unit_price,
        quantity: l.quantity,
        line_total: l.line_total,
        start_time: null,
        end_time: null,
        extra_hours: 0,
        extra_hour_price: 0,
      })),
    ];
    if (items.length) {
      const { error: itemsError } = await db.from("booking_items").insert(items);
      if (itemsError) {
        // Never leave behind a misleading booking whose total includes lines
        // that staff and guests cannot see.
        await db.from("bookings").delete().eq("id", booking.id);
        return { ok: false, message: "Could not save the complete order. Please try again." };
      }
    }
    // Attach the redeemed reward — it is only marked "used" once the booking completes.
    if (rewardId) {
      await db
        .from("rewards")
        .update({ booking_id: booking.id })
        .eq("id", rewardId)
        .eq("status", "available");
    }
    /* Deduct from the pass only once the slot is safely reserved. */
    if (pass) {
      const minutes = data.durationMinutes ?? 0;
      if (pass.remaining_minutes !== null) {
        const left = Math.max(0, pass.remaining_minutes - minutes);
        await db
          .from("membership_passes")
          .update({ remaining_minutes: left, status: left <= 0 ? "used" : "active" })
          .eq("id", pass.id);
      } else if (pass.remaining_uses !== null) {
        const left = Math.max(0, pass.remaining_uses - 1);
        await db
          .from("membership_passes")
          .update({ remaining_uses: left, status: left <= 0 ? "used" : "active" })
          .eq("id", pass.id);
      }
    }

    if (couponId) {
      const { data: c } = await db
        .from("coupons")
        .select("used_count")
        .eq("id", couponId)
        .maybeSingle();
      await db.from("coupons").update({ used_count: (c?.used_count ?? 0) + 1 }).eq("id", couponId);
    }
    await db
      .from("reservation_locks")
      .update({ released_at: new Date().toISOString() })
      .eq("session_token", data.sessionToken)
      .is("released_at", null);

    return { ok: true, reference: booking.reference };
  });

/** Everything the public payment page needs: the booking + the branch's UPI details. */
export const getPaymentDetails = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ reference: z.string().trim().min(6).max(24) }).parse(i))
  .handler(
    async ({
      data,
    }): Promise<{
      found: boolean;
      booking?: {
        reference: string;
        status: string;
        branch_name: string;
        station_name: string;
        booking_date: string;
        start_time: string | null;
        end_time: string | null;
        players: number;
        reward_minutes: number;

        customer_name: string;
        customer_phone: string;
        total_amount: number;
        payment_utr: string | null;
        payment_expires_at: string | null;
        items: {
          kind?: string;
          label: string;
          quantity: number;
          line_total: number;
          start_time?: string | null;
          end_time?: string | null;
        }[];
      };
      settings?: {
        upi_id: string;
        account_name: string;
        qr_image_url: string | null;
        instructions: string;
        expiry_minutes: number;
      };
    }> => {
      const { adminClient } = await import("@/lib/booking/repository.server");
      const db = await adminClient();
      await db.rpc("expire_stale_bookings");

      const { data: b } = await db
        .from("bookings")
        .select(
          "*, branches(name), gaming_stations(name), booking_items(kind,label,quantity,line_total,start_time,end_time)",
        )
        .eq("reference", data.reference.toUpperCase())
        .maybeSingle();
      if (!b) return { found: false };
      const row = b as unknown as Record<string, any>;

      const { data: s } = await db
        .from("payment_settings")
        .select("upi_id, account_name, qr_image_url, instructions, expiry_minutes")
        .eq("branch_id", row["branch_id"])
        .maybeSingle();

      return {
        found: true,
        booking: {
          reference: row["reference"],
          status: row["status"],
          branch_name: row["branches"]?.name ?? "",
          station_name: row["gaming_stations"]?.name ?? "",
          booking_date: row["booking_date"],
          start_time: row["start_time"],
          end_time: row["end_time"],
          players: row["players"],
          customer_name: row["customer_name"],
          customer_phone: row["customer_phone"],
          total_amount: Number(row["total_amount"]),
          payment_utr: row["payment_utr"] ?? null,
          payment_expires_at: row["payment_expires_at"] ?? null,
          items: (row["booking_items"] ?? []).map((i: any) => ({
            kind: i.kind,
            label: i.label,
            quantity: i.quantity,
            line_total: Number(i.line_total),
            start_time: i.start_time ?? null,
            end_time: i.end_time ?? null,
          })),
        },
        settings: {
          upi_id: s?.upi_id ?? "example@upi",
          account_name: s?.account_name ?? "Clash of Consoles",
          qr_image_url: s?.qr_image_url ?? null,
          instructions:
            s?.instructions ??
            "Please scan the QR code below using any UPI app. After successful payment enter your UTR number.",
          expiry_minutes: Number(s?.expiry_minutes ?? 10),
        },
      };
    },
  );

/** Customer submits their UPI transaction reference. Updates the SAME booking. */
export const submitPaymentUtr = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        reference: z.string().trim().min(6).max(24),
        utr: z.string().trim().min(4).max(40),
        note: z.string().trim().max(300).optional().or(z.literal("")),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    await db.rpc("expire_stale_bookings");

    const { data: b } = await db
      .from("bookings")
      .select("id, status")
      .eq("reference", data.reference.toUpperCase())
      .maybeSingle();
    if (!b) return { ok: false, message: "Booking not found." };
    if (b.status === "expired")
      return { ok: false, message: "This booking expired. Please make a new booking." };
    if (b.status === "cancelled")
      return { ok: false, message: "This booking was cancelled." };

    const { error } = await db
      .from("bookings")
      .update({
        payment_utr: data.utr,
        payment_note: data.note || null,
        payment_submitted_at: new Date().toISOString(),
        status: b.status === "confirmed" ? "confirmed" : "payment_pending",
      })
      .eq("id", b.id);
    if (error) return { ok: false, message: "Could not save your payment details." };
    return { ok: true };
  });


/** Look up a booking by its (unguessable) reference code. */
export const getBooking = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ reference: z.string().trim().min(6).max(20) }).parse(i))
  .handler(async ({ data }): Promise<BookingSummary | null> => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const db = await adminClient();
    const { data: b } = await db
      .from("bookings")
      .select(
        "*, branches(name,address), gaming_stations(name), booking_items(kind,label,quantity,unit_price,line_total,station_id,extra_hours,start_time,end_time)",
      )
      .eq("reference", data.reference.toUpperCase())
      .maybeSingle();
    if (!b) return null;
    const row = b as unknown as Record<string, any>;
    return {
      reference: row["reference"],
      status: row["status"],
      branch_name: row["branches"]?.name ?? "",
      branch_address: row["branches"]?.address ?? "",
      station_name: row["gaming_stations"]?.name ?? "",
      booking_date: row["booking_date"],
      booking_type: row["booking_type"] === "group" ? "group" : "single",
      group_members: Number(row["group_members"] ?? 0),
      start_time: row["start_time"],
      end_time: row["end_time"],
      players: Number(row["players"] ?? 1),
      game_title: row["game_title"] ?? null,
      customer_name: row["customer_name"],
      customer_phone: row["customer_phone"],
      customer_email: row["customer_email"],
      special_instructions: row["special_instructions"],
      coupon_code: row["coupon_code"],
      session_amount: Number(row["session_amount"]),
      addons_amount: Number(row["addons_amount"]),
      food_amount: Number(row["food_amount"]),
      discount_amount: Number(row["discount_amount"]),
      gaming_discount_amount: Number(row["gaming_discount_amount"] ?? 0),
      food_discount_amount: Number(row["food_discount_amount"] ?? 0),
      bill_discount_amount: Number(row["bill_discount_amount"] ?? 0),
      student_discount_amount: Number(row["student_discount_amount"] ?? 0),

      tax_amount: Number(row["tax_amount"]),
      total_amount: Number(row["total_amount"]),
      items: (row["booking_items"] ?? []).map((i: any) => ({
        kind: i.kind,
        label: i.label,
        quantity: i.quantity,
        unit_price: Number(i.unit_price ?? 0),
        line_total: Number(i.line_total),
        station_id: i.station_id ?? null,
        extra_hours: Number(i.extra_hours ?? 0),
        start_time: i.start_time ?? null,
        end_time: i.end_time ?? null,
      })),
    };
  });
