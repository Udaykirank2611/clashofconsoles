import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { readAllPages } from "./pages";

describe("complete ledger reads", () => {
  test("loads all 1027 rows even when the API returns less than the requested page", async () => {
    const source = Array.from({ length: 1027 }, (_, id) => ({ id }));
    const rows = await readAllPages(async (from) => ({ data: source.slice(from, from + 100), error: null }));
    assert.deepEqual(rows, source);
    assert.equal(rows.at(-1)?.id, 1026);
  });

  test("does not present a failed page as missing ledger entries", async () => {
    await assert.rejects(readAllPages(async (from) => from === 0
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: { message: "Request failed" } },
    ), /Request failed/);
  });
});