import { describe, expect, test } from "bun:test";
import { readAllPages } from "./pages";

describe("complete ledger reads", () => {
  test("loads all 1027 rows even when the API returns less than the requested page", async () => {
    const source = Array.from({ length: 1027 }, (_, id) => ({ id }));
    const rows = await readAllPages(async (from) => ({ data: source.slice(from, from + 100), error: null }));
    expect(rows).toEqual(source);
    expect(rows.at(-1)?.id).toBe(1026);
  });

  test("does not present a failed page as missing ledger entries", async () => {
    await expect(readAllPages(async (from) => from === 0
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: { message: "Request failed" } },
    )).rejects.toThrow("Request failed");
  });
});