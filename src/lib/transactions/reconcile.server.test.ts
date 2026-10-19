import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loadReconciliation } from "./reconcile.server";

function client(bookings: Record<string, unknown>[]): SupabaseClient<Database> {
  return {
    from(table: string) {
      let rows = table === "bookings" ? bookings : [];
      const query = {
        select: () => query, gte: () => query, lte: () => query,
        in: () => query, order: () => query, eq: () => query,
        range(from: number) {
          rows = (table === "bookings" ? bookings : []).slice(from, from + 100);
          return query;
        },
        then(resolve: (value: { data: Record<string, unknown>[]; error: null }) => unknown) {
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
      };
      return query;
    },
  } as unknown as SupabaseClient<Database>;
}

const booking = (id: number) => ({
  id: String(id), reference: `COC-${id}`, booking_date: "2026-10-19",
  status: "completed", total_amount: 300, branches: { name: "Vanasthalipuram" },
  booking_items: [], booking_transactions: [{ cash_amount: 300, upi_amount: 0, transaction_status: "completed" }],
});
const scope = { branchId: null, from: "2026-10-19", to: "2026-10-19" };

describe("reconciliation ledger matching", () => {
  it("matches all 1027 embedded ledger rows without dropping the last page", async () => {
    const result = await loadReconciliation(client(Array.from({ length: 1027 }, (_, id) => booking(id))), scope);
    assert.equal(result.totals.bookingsCount, 1027);
    assert.equal(result.totals.missingLedgerCount, 0);
    assert.equal(result.totals.ledgerTotal, 308100);
    assert.equal(result.totals.variance, 0);
  });
  it("still reports a genuinely missing completed booking ledger", async () => {
    const result = await loadReconciliation(client([{ ...booking(1), booking_transactions: [] }]), scope);
    assert.equal(result.totals.missingLedgerCount, 1);
    assert.equal(result.issues[0]?.kind, "missing_ledger");
  });
  it("does not reconcile a confirmed timed VR addon before completion", async () => {
    const result = await loadReconciliation(client([{
      ...booking(1), status: "confirmed", booking_transactions: [],
      booking_items: [{ kind: "addon", start_time: "17:00:00", end_time: "17:30:00" }],
    }]), scope);
    assert.equal(result.totals.bookingsCount, 0);
    assert.equal(result.totals.missingLedgerCount, 0);
  });
});