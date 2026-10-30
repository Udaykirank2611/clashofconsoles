import { mock, test, expect } from "bun:test";

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      const result = { data: table === "gaming_stations" ? { station_type: "vr" } :
        table === "station_rates" ? [
          { duration_minutes: 30, price: 200, is_extra_hour: false },
          { duration_minutes: 60, price: 300, is_extra_hour: false },
          { duration_minutes: 60, price: 150, is_extra_hour: true },
        ] : [] };
      const query = {
        select: () => query, eq: () => query,
        maybeSingle: () => Promise.resolve(result),
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  },
}));

const { pricedExtensionOption } = await import("./booking-admin.server");

test("the shared extension quote makes a 3:30–4:30 VR booking total 300", async () => {
  const quote = await pricedExtensionOption("branch", "vr", 1, 30, {
    date: "2026-10-30", endTime: "16:00", currentAmount: 200,
  });
  expect(quote?.minutes).toBe(30);
  expect(quote?.price).toBe(100);
  expect(200 + (quote?.price ?? 0)).toBe(300);
});

test("the shared quote replaces an earlier offer price with the whole regular rate", async () => {
  const quote = await pricedExtensionOption("branch", "vr", 1, 60, {
    date: "2026-10-30", endTime: "15:30", currentAmount: 200,
  });
  expect(quote?.minutes).toBe(60);
  expect(quote?.price).toBe(250);
  expect(200 + (quote?.price ?? 0)).toBe(450);
});