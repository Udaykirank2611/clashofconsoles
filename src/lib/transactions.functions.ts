import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadTransactions } from "./transactions/load.server";
import type { TransactionsPayload } from "./transactions/types";

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

/** Removes a daily expense entry. */
export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await context.supabase.from("daily_expenses").delete().eq("id", data.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/** Sets the opening cash and bank balance for one branch and day. */
export const setOpeningBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        branchId: z.string().uuid(),
        date: z.string().regex(DATE),
        openingCash: z.number().min(0),
        openingBank: z.number().min(0),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await context.supabase.from("daily_opening_balances").upsert(
      {
        branch_id: data.branchId,
        balance_date: data.date,
        opening_cash: data.openingCash,
        opening_bank: data.openingBank,
      },
      { onConflict: "branch_id,balance_date" },
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });
