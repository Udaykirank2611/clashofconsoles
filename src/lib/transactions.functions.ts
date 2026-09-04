import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadTransactions } from "./transactions/load.server";
import { loadReconciliation } from "./transactions/reconcile.server";
import type { ReconciliationPayload, TransactionsPayload } from "./transactions/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Transaction ledger, expenses and cash/bank summary for a branch and date window. */
export const getTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: z.string().uuid().nullable(),
        from: z.string().regex(DATE),
        to: z.string().regex(DATE),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<TransactionsPayload> =>
    loadTransactions(context.supabase, data),
  );

/** Admin-editable transaction fields; booking figures stay automatic. */
export const updateTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        branchId: z.string().uuid(),
        status: z.enum(["pending", "completed", "cancelled", "refunded"]),
        source: z.enum(["website", "walk_in", "membership", "coupon"]),
        upiProvider: z.enum(["phonepe", "google_pay", "paytm", "other"]).nullable(),
        cashAmount: z.number().min(0),
        upiAmount: z.number().min(0),
        notes: z.string().max(500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await context.supabase.from("booking_transactions").upsert(
      {
        booking_id: data.bookingId,
        branch_id: data.branchId,
        transaction_status: data.status,
        booking_source: data.source,
        upi_provider: data.upiProvider,
        cash_amount: data.cashAmount,
        upi_amount: data.upiAmount,
        admin_notes: data.notes,
      },
      { onConflict: "booking_id" },
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/** Adds a daily expense entry. */
export const addExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: z.string().uuid(),
        date: z.string().regex(DATE),
        name: z.string().min(1).max(80),
        amount: z.number().min(0),
        description: z.string().max(300).default(""),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        paidFrom: z.enum(["cash", "bank"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await context.supabase.from("daily_expenses").insert({
      branch_id: data.branchId,
      expense_date: data.date,
      name: data.name,
      amount: data.amount,
      description: data.description,
      paid_at: `${data.time}:00`,
      paid_from: data.paidFrom,
      created_by: context.userId,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/**
 * Permanently deletes a transaction: the booking and every record attached to
 * it (ledger row, items, redemptions, notifications, rewards, passes) are
 * removed, so it disappears from bookings, reports and reconciliation.
 */
export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ bookingId: z.string().uuid(), branchId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    // Caller must already be able to see this booking under RLS.
    const { data: allowed, error: readError } = await context.supabase
      .from("bookings")
      .select("id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (readError) return { ok: false, message: readError.message };
    if (!allowed) return { ok: false, message: "Booking not found for this branch." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.bookingId;

    await Promise.all([
      supabaseAdmin.from("booking_transactions").delete().eq("booking_id", id),
      supabaseAdmin.from("booking_items").delete().eq("booking_id", id),
      supabaseAdmin.from("coupon_redemptions").delete().eq("booking_id", id),
      supabaseAdmin.from("admin_notifications").delete().eq("booking_id", id),
      supabaseAdmin.from("payments").delete().eq("booking_id", id),
      supabaseAdmin.from("loyalty_points").delete().eq("booking_id", id),
      supabaseAdmin.from("rewards").delete().eq("booking_id", id),
      supabaseAdmin.from("membership_passes").delete().eq("source_booking_id", id),
    ]);

    const { error } = await supabaseAdmin.from("bookings").delete().eq("id", id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });



/** Removes a daily expense entry. */
export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await context.supabase.from("daily_expenses").delete().eq("id", data.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/** Records money deposited into cash or bank. Opening balances carry forward automatically. */
export const addDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: z.string().uuid(),
        date: z.string().regex(DATE),
        name: z.string().min(1).max(80),
        amount: z.number().min(0),
        description: z.string().max(300).default(""),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        depositTo: z.enum(["cash", "bank"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await context.supabase.from("cash_deposits").insert({
      branch_id: data.branchId,
      deposit_date: data.date,
      name: data.name,
      amount: data.amount,
      description: data.description,
      paid_at: `${data.time}:00`,
      deposit_to: data.depositTo,
      created_by: context.userId,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/** Removes a deposit entry. */
export const deleteDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await context.supabase.from("cash_deposits").delete().eq("id", data.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/** Reconciles confirmed bookings against the ledger and the cash/bank summary. */
export const getReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: z.string().uuid().nullable(),
        from: z.string().regex(DATE),
        to: z.string().regex(DATE),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<ReconciliationPayload> =>
    loadReconciliation(context.supabase, data),
  );
