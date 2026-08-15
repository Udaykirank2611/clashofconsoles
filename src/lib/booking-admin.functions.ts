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
    return { ok: true };
  });

/** Approve a payment, optionally applying a last-minute admin discount. */
export const approveBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        paymentMode: z.enum(["upi", "cash"]),
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
      .update({ status: "confirmed", payment_mode: data.paymentMode })
      .eq("id", data.bookingId);
    if (error) return { ok: false, message: error.message };
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
          .min(1)
          .max(50),
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
    const { data: menu } = await supabaseAdmin
      .from("menu_items")
      .select("id, name, price")
      .eq("branch_id", booking.branch_id)
      .in("id", data.items.map((i) => i.menuItemId));
    if (!menu?.length) return { ok: false, message: "Those items are not on this branch's menu." };

    const rows = data.items
      .map((i) => {
        const item = menu.find((m) => m.id === i.menuItemId);
        if (!item) return null;
        const unit = Number(item.price);
        return {
          booking_id: data.bookingId,
          kind: "food" as const,
          menu_item_id: item.id,
          label: item.name,
          unit_price: unit,
          quantity: i.quantity,
          line_total: Math.round(unit * i.quantity),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (!rows.length) return { ok: false, message: "Nothing to add." };

    const added = rows.reduce((s, r) => s + r.line_total, 0);
    const { error: insertError } = await supabaseAdmin.from("booking_items").insert(rows);
    if (insertError) return { ok: false, message: insertError.message };

    const previousTotal = Number(booking.total_amount ?? 0);
    const { recomputeBookingTotals, setLedgerSplit } = await import("@/lib/booking-admin.server");
    const totals = await recomputeBookingTotals(data.bookingId);
    if (!totals) return { ok: false, message: "Booking not found." };

    // Keep the ledger honest when the food was paid a different way than the session.
    const foodPaid = Math.max(0, totals.total - previousTotal);
    const basePaid = Math.max(0, totals.total - foodPaid);
    const baseMode = booking.payment_mode === "cash" ? "cash" : booking.payment_mode === "upi" ? "upi" : null;
    const cash = (baseMode === "cash" ? basePaid : 0) + (data.paymentMode === "cash" ? foodPaid : 0);
    const upi = (baseMode === "upi" ? basePaid : 0) + (data.paymentMode === "upi" ? foodPaid : 0);
    await setLedgerSplit(data.bookingId, cash, upi);

    return { ok: true, total: added };
  });
