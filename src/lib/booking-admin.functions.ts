import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TIME = /^\d{2}:\d{2}(:\d{2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;

export interface AdminMoveResult {
  ok: boolean;
  message?: string;
}

/**
 * Slots already taken on one station for a date, ignoring the booking being edited.
 * Mirrors the availability rules used by the customer flow so admin edits can
 * never double-book a console.
 */
async function isSlotFree(
  branchId: string,
  stationId: string,
  date: string,
  startMinutes: number,
  endMinutes: number,
  excludeBookingId: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: bookings }, { data: items }, { data: locks }, { data: station }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id, station_id, start_time, end_time, status, payment_expires_at")
      .eq("branch_id", branchId)
      .eq("booking_date", date)
      .neq("id", excludeBookingId),
    supabaseAdmin
      .from("booking_items")
      .select("booking_id, station_id, start_time, end_time, bookings!inner(branch_id, booking_date, status, payment_expires_at)")
      .eq("bookings.branch_id", branchId)
      .eq("bookings.booking_date", date)
      .neq("booking_id", excludeBookingId),
    supabaseAdmin
      .from("reservation_locks")
      .select("station_id, start_time, end_time, expires_at, released_at")
      .eq("branch_id", branchId)
      .eq("booking_date", date)
      .is("released_at", null),
    supabaseAdmin.from("gaming_stations").select("id, status").eq("id", stationId).maybeSingle(),
  ]);

  if (!station) return "That console no longer exists.";
  if (station.status !== "available") return "That console is out of service.";

  const blocking = (status: string, expiry: string | null) =>
    ["pending", "confirmed", "completed", "payment_pending"].includes(status) ||
    (status === "awaiting_payment" && (!expiry || new Date(expiry).getTime() > Date.now()));

  const overlaps = (s?: string | null, e?: string | null) => {
    if (!s || !e) return false;
    return toMinutes(s) < endMinutes && toMinutes(e) > startMinutes;
  };

  for (const b of bookings ?? []) {
    if (b.station_id !== stationId) continue;
    if (!blocking(String(b.status), b.payment_expires_at)) continue;
    if (overlaps(b.start_time, b.end_time)) return "Another booking already uses that console at that time.";
  }
  for (const i of (items ?? []) as unknown as {
    station_id: string | null;
    start_time: string | null;
    end_time: string | null;
    bookings: { status: string; payment_expires_at: string | null };
  }[]) {
    if (i.station_id !== stationId) continue;
    if (!blocking(String(i.bookings.status), i.bookings.payment_expires_at)) continue;
    if (overlaps(i.start_time, i.end_time)) return "An add-on session already uses that console at that time.";
  }
  for (const l of locks ?? []) {
    if (l.station_id !== stationId) continue;
    if (new Date(l.expires_at).getTime() <= Date.now()) continue;
    if (overlaps(l.start_time, l.end_time)) return "A guest is currently holding that slot.";
  }
  return null;
}

/** Drag & drop: move a booking to another console, time or date. Duration is preserved. */
export const moveBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        stationId: z.string().uuid(),
        date: z.string().regex(DATE),
        startTime: z.string().regex(TIME),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<AdminMoveResult> => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false, message: "You cannot edit this booking." };
    if (!booking.start_time || !booking.end_time)
      return { ok: false, message: "This booking has no timed session to move." };

    const duration = toMinutes(String(booking.end_time)) - toMinutes(String(booking.start_time));
    const start = toMinutes(data.startTime);
    const end = start + duration;
    if (end > 24 * 60) return { ok: false, message: "Cannot move booking because it would run past midnight." };

    const conflict = await isSlotFree(
      String(booking.branch_id),
      data.stationId,
      data.date,
      start,
      end,
      data.bookingId,
    );
    if (conflict) return { ok: false, message: `Cannot move booking because the selected slot is unavailable. ${conflict}` };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({
        station_id: data.stationId,
        booking_date: data.date,
        start_time: clock(start),
        end_time: clock(end),
      })
      .eq("id", data.bookingId);
    if (error) return { ok: false, message: error.message };
    // Keep the ledger, reports and reconciliation in step with the moved slot.
    const { recomputeBookingTotals } = await import("@/lib/booking-admin.server");
    await recomputeBookingTotals(data.bookingId);

    return { ok: true };
  });

/** Side-panel edit: times, console, notes, booking status and recorded payment mode. */
export const updateBookingDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        stationId: z.string().uuid().nullable(),
        date: z.string().regex(DATE),
        startTime: z.string().regex(TIME).nullable(),
        endTime: z.string().regex(TIME).nullable(),
        notes: z.string().max(500),
        status: z.enum([
          "awaiting_payment",
          "payment_pending",
          "pending",
          "confirmed",
          "completed",
          "cancelled",
          "expired",
        ]),
        paymentMode: z.enum(["upi", "cash", "none"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<AdminMoveResult> => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false, message: "You cannot edit this booking." };

    let start: number | null = null;
    let end: number | null = null;
    if (data.startTime && data.endTime) {
      start = toMinutes(data.startTime);
      end = toMinutes(data.endTime);
      if (end <= start) return { ok: false, message: "The end time must come after the start time." };
      if (end > 24 * 60) return { ok: false, message: "The session cannot run past midnight." };
      if (data.stationId) {
        const conflict = await isSlotFree(
          String(booking.branch_id),
          data.stationId,
          data.date,
          start,
          end,
          data.bookingId,
        );
        if (conflict) return { ok: false, message: `Cannot save because the selected slot is unavailable. ${conflict}` };
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({
        station_id: data.stationId,
        booking_date: data.date,
        start_time: start === null ? null : clock(start),
        end_time: end === null ? null : clock(end),
        special_instructions: data.notes || null,
        status: data.status,
        payment_mode: data.paymentMode === "none" ? null : data.paymentMode,
      })
      .eq("id", data.bookingId);
    if (error) return { ok: false, message: error.message };

    // A longer or shorter session is repriced off the branch rate card, then the
    // bill (and with it the ledger and every report) is rebuilt.
    const { extensionPrice, recomputeBookingTotals } = await import("@/lib/booking-admin.server");
    const oldMinutes =
      booking.start_time && booking.end_time
        ? toMinutes(String(booking.end_time)) - toMinutes(String(booking.start_time))
        : 0;
    const newMinutes = start !== null && end !== null ? end - start : 0;
    if (oldMinutes > 0 && newMinutes > 0 && newMinutes !== oldMinutes && !booking.pass_id) {
      const players = Number(booking.players ?? 1);
      const branch = String(booking.branch_id);
      const delta =
        newMinutes > oldMinutes
          ? await extensionPrice(branch, players, oldMinutes, (newMinutes - oldMinutes) / 60)
          : -(await extensionPrice(branch, players, newMinutes, (oldMinutes - newMinutes) / 60));
      const next = Math.max(0, Math.round(Number(booking.session_amount ?? 0) + delta));
      await supabaseAdmin.from("bookings").update({ session_amount: next }).eq("id", data.bookingId);
    }
    await recomputeBookingTotals(data.bookingId);
    return { ok: true };

  });

/** Approve a payment, optionally applying a last-minute admin discount. */
export const approveBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        extraDiscount: z.number().min(0).max(1000000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<AdminMoveResult> => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false, message: "You cannot edit this booking." };

    const { recomputeBookingTotals } = await import("@/lib/booking-admin.server");
    const totals = await recomputeBookingTotals(data.bookingId, data.extraDiscount);
    if (!totals) return { ok: false, message: "Booking not found." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", data.bookingId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/**
 * Marks a booking completed and records exactly how the bill was settled.
 * The cash/UPI split written here is the single source of truth for the
 * dashboard, reports, transactions and reconciliation.
 */
export const completeBookingWithSplit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        cash: z.number().min(0).max(10000000),
        upi: z.number().min(0).max(10000000),
        extraDiscount: z.number().min(0).max(1000000).default(0),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<AdminMoveResult> => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id, total_amount")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false, message: "You cannot edit this booking." };

    const { recomputeBookingTotals, setLedgerSplit } = await import("@/lib/booking-admin.server");
    let total = Math.round(Number(booking.total_amount ?? 0));
    if (data.extraDiscount > 0) {
      const totals = await recomputeBookingTotals(data.bookingId, data.extraDiscount);
      if (!totals) return { ok: false, message: "Booking not found." };
      total = Math.round(totals.total);
    }

    const cash = Math.round(data.cash);
    const upi = Math.round(data.upi);
    if (cash + upi !== total)
      return { ok: false, message: `Cash + UPI must add up to ${total}.` };

    const mode = cash > 0 && upi > 0 ? "mixed" : cash > 0 ? "cash" : upi > 0 ? "upi" : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "completed", payment_mode: mode })
      .eq("id", data.bookingId);
    if (error) return { ok: false, message: error.message };

    await setLedgerSplit(data.bookingId, cash, upi);
    return { ok: true };
  });



/** Add food/drinks to an already confirmed booking and collect payment for it. */
export const addFoodToBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        paymentMode: z.enum(["upi", "cash"]),
        items: z
          .array(z.object({ menuItemId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }))
          .max(50)
          .default([]),
        /** Free-text lines the admin typed in (name + price), for anything off-menu. */
        custom: z
          .array(
            z.object({
              name: z.string().min(1).max(80),
              price: z.number().min(0).max(100000),
              quantity: z.number().int().min(1).max(99),
            }),
          )
          .max(20)
          .default([]),
      })

      .parse(i),
  )
  .handler(async ({ data, context }): Promise<AdminMoveResult & { total?: number }> => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id, branch_id, total_amount, payment_mode")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false, message: "You cannot edit this booking." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu } = data.items.length
      ? await supabaseAdmin
          .from("menu_items")
          .select("id, name, price")
          .eq("branch_id", booking.branch_id)
          .in("id", data.items.map((i) => i.menuItemId))
      : { data: [] as { id: string; name: string; price: number }[] };
    if (data.items.length && !menu?.length)
      return { ok: false, message: "Those items are not on this branch's menu." };

    const rows = [
      ...data.items
        .map((i) => {
          const item = (menu ?? []).find((m) => m.id === i.menuItemId);
          if (!item) return null;
          const unit = Number(item.price);
          return {
            booking_id: data.bookingId,
            kind: "food" as const,
            menu_item_id: item.id as string | null,
            label: item.name,
            unit_price: unit,
            quantity: i.quantity,
            line_total: Math.round(unit * i.quantity),
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
      ...data.custom.map((c) => ({
        booking_id: data.bookingId,
        kind: "food" as const,
        menu_item_id: null as string | null,
        label: c.name.trim(),
        unit_price: Math.round(c.price),
        quantity: c.quantity,
        line_total: Math.round(c.price * c.quantity),
      })),
    ];
    if (!rows.length) return { ok: false, message: "Nothing to add." };


    const added = rows.reduce((s, r) => s + r.line_total, 0);
    const { error: insertError } = await supabaseAdmin.from("booking_items").insert(rows);
    if (insertError) return { ok: false, message: insertError.message };

    const previousTotal = Number(booking.total_amount ?? 0);
    const { recomputeBookingTotals, setLedgerSplit } = await import("@/lib/booking-admin.server");
    const totals = await recomputeBookingTotals(data.bookingId);
    if (!totals) return { ok: false, message: "Booking not found." };

    // Keep the ledger honest when the food was paid a different way than the session.
    const { data: ledger } = await supabaseAdmin
      .from("booking_transactions")
      .select("cash_amount, upi_amount")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    const recorded = Number(ledger?.cash_amount ?? 0) + Number(ledger?.upi_amount ?? 0);
    const foodPaid = Math.max(0, totals.total - previousTotal);
    const basePaid = Math.max(0, totals.total - foodPaid);
    const baseMode = booking.payment_mode === "cash" ? "cash" : booking.payment_mode === "upi" ? "upi" : null;
    // Prefer the split already recorded against the booking; fall back to the
    // single payment mode captured when the booking was approved.
    const baseCash = recorded > 0 ? Math.round((basePaid * Number(ledger?.cash_amount ?? 0)) / recorded) : baseMode === "cash" ? basePaid : 0;
    const baseUpi = recorded > 0 ? basePaid - baseCash : baseMode === "upi" ? basePaid : 0;
    const cash = baseCash + (data.paymentMode === "cash" ? foodPaid : 0);
    const upi = baseUpi + (data.paymentMode === "upi" ? foodPaid : 0);
    await setLedgerSplit(data.bookingId, cash, upi);
    // Keep the booking's payment label in step with the recorded split.
    await supabaseAdmin
      .from("bookings")
      .update({ payment_mode: cash > 0 && upi > 0 ? "mixed" : cash > 0 ? "cash" : upi > 0 ? "upi" : null })
      .eq("id", data.bookingId);




    return { ok: true, total: added };
  });

export interface ExtendResult extends AdminMoveResult {
  /** Set when the current console is busy for the extra hour. */
  conflict?: boolean;
  /** Other consoles that are free for the requested extra window. */
  alternatives?: { id: string; name: string; price: number }[];
  window?: { start: string; end: string };
}

/**
 * Extends a confirmed booking by one or more hours.
 * The same console is used when it is free; otherwise the admin is offered the
 * consoles that are free for that window and the extra hour is booked there as
 * an add-on line so every calendar and availability check stays in sync.
 */
export const extendBookingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        hours: z.number().int().min(1).max(6).default(1),
        /** Pick another console when the original one is busy. */
        stationId: z.string().uuid().nullable().default(null),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<ExtendResult> => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false, message: "You cannot edit this booking." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // The session window is either on the booking itself or on its add-on line.
    let baseStation = booking.station_id as string | null;
    let endTime = booking.end_time as string | null;
    let itemId: string | null = null;

    // Every timed line on this booking, so the extension is priced against the
    // total time the guest has already bought (rate-card slabs).
    const { data: timedItems } = await supabaseAdmin
      .from("booking_items")
      .select("id, station_id, start_time, end_time")
      .eq("booking_id", data.bookingId)
      .not("end_time", "is", null)
      .order("end_time", { ascending: false });

    if (!endTime) {
      const item = (timedItems ?? [])[0];
      if (item) {
        baseStation = item.station_id;
        endTime = item.end_time;
        itemId = item.id;
      }
    }
    if (!endTime || !baseStation) return { ok: false, message: "This booking has no timed session to extend." };

    const currentMinutes =
      (booking.start_time && booking.end_time
        ? toMinutes(String(booking.end_time)) - toMinutes(String(booking.start_time))
        : 0) +
      (timedItems ?? []).reduce(
        (s, i) =>
          s + (i.start_time && i.end_time ? toMinutes(String(i.end_time)) - toMinutes(String(i.start_time)) : 0),
        0,
      );

    const { extensionPrice } = await import("@/lib/booking-admin.server");
    const price = await extensionPrice(
      String(booking.branch_id),
      Number(booking.players ?? 1),
      currentMinutes,
      data.hours,
    );

    const start = toMinutes(String(endTime));
    const end = start + data.hours * 60;
    if (end > 24 * 60) return { ok: false, message: "The extension would run past midnight." };

    const target = data.stationId ?? baseStation;
    const conflict = await isSlotFree(
      String(booking.branch_id),
      target,
      String(booking.booking_date),
      start,
      end,
      data.bookingId,
    );

    if (conflict) {
      const { data: stations } = await supabaseAdmin
        .from("gaming_stations")
        .select("id, name, hourly_price, status")
        .eq("branch_id", booking.branch_id)
        .eq("status", "available")
        .order("sort_order");
      const alternatives: { id: string; name: string; price: number }[] = [];
      for (const s of stations ?? []) {
        if (s.id === target) continue;
        const busy = await isSlotFree(
          String(booking.branch_id),
          s.id,
          String(booking.booking_date),
          start,
          end,
          data.bookingId,
        );
        if (!busy) alternatives.push({ id: s.id, name: s.name, price });
      }
      return {
        ok: false,
        conflict: true,
        message: conflict,
        alternatives,
        window: { start: clock(start), end: clock(end) },
      };
    }

    const { data: station } = await supabaseAdmin
      .from("gaming_stations")
      .select("id, name, hourly_price")
      .eq("id", target)
      .maybeSingle();


    if (target === baseStation) {
      // Same console: simply push the session end time out.
      if (itemId) {
        await supabaseAdmin.from("booking_items").update({ end_time: clock(end) }).eq("id", itemId);
      } else {
        await supabaseAdmin.from("bookings").update({ end_time: clock(end) }).eq("id", data.bookingId);
      }
      await supabaseAdmin
        .from("bookings")
        .update({ session_amount: Number(booking.session_amount ?? 0) + price })
        .eq("id", data.bookingId);
    } else {
      // Different console: book the extra window there as an add-on line so it
      // blocks that console everywhere.
      const { error } = await supabaseAdmin.from("booking_items").insert({
        booking_id: data.bookingId,
        kind: "addon",
        station_id: target,
        label: `${station?.name ?? "Console"} — extra ${data.hours}h`,
        unit_price: price,
        quantity: 1,
        line_total: price,
        start_time: clock(start),
        end_time: clock(end),
      });
      if (error) return { ok: false, message: error.message };
    }

    const { recomputeBookingTotals } = await import("@/lib/booking-admin.server");
    await recomputeBookingTotals(data.bookingId);
    return { ok: true, message: `Extended to ${clock(end).slice(0, 5)} on ${station?.name ?? "the same console"}.` };
  });

/** Price preview for extending a session, using the branch rate card. */
export const quoteExtension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ bookingId: z.string().uuid(), hours: z.number().int().min(1).max(6).default(1) }).parse(i),
  )
  .handler(async ({ data, context }): Promise<{ price: number }> => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("branch_id, players, start_time, end_time")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { price: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: items } = await supabaseAdmin
      .from("booking_items")
      .select("start_time, end_time")
      .eq("booking_id", data.bookingId)
      .not("end_time", "is", null);
    const current =
      (booking.start_time && booking.end_time
        ? toMinutes(String(booking.end_time)) - toMinutes(String(booking.start_time))
        : 0) +
      (items ?? []).reduce(
        (s, i) =>
          s + (i.start_time && i.end_time ? toMinutes(String(i.end_time)) - toMinutes(String(i.start_time)) : 0),
        0,
      );
    const { extensionPrice } = await import("@/lib/booking-admin.server");
    return {
      price: await extensionPrice(String(booking.branch_id), Number(booking.players ?? 1), current, data.hours),
    };
  });
