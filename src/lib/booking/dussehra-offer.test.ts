import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dussehraExtensionCharge, dussehraExperiencePrice } from "./dussehra-offer";

describe("offer extension cutoff", () => {
  it("charges the full regular price for a 3:30–4:30 PM VR session", () => {
    assert.equal(dussehraExperiencePrice("2026-10-30", "15:30", "vr", 60), null);
    assert.equal(dussehraExtensionCharge({ date: "2026-10-30", endTime: "16:00", currentMinutes: 30, addedMinutes: 30, currentAmount: 200, regularTotal: 300, standardCharge: 0 }), 100);
  });
  it("recovers the original offer discount when an extension crosses 4 PM", () => {
    assert.equal(dussehraExtensionCharge({ date: "2026-10-30", endTime: "15:30", currentMinutes: 60, addedMinutes: 60, currentAmount: 200, regularTotal: 450, standardCharge: 150 }), 250);
  });
  it("keeps a session finishing exactly at 4 PM eligible", () => {
    assert.equal(dussehraExperiencePrice("2026-10-30", "15:00", "vr", 60), 200);
  });
  it("leaves extensions outside the promotional dates unchanged", () => {
    assert.equal(dussehraExtensionCharge({ date: "2026-11-01", endTime: "16:00", currentMinutes: 30, addedMinutes: 30, currentAmount: 200, regularTotal: 300, standardCharge: 100 }), 100);
  });
});