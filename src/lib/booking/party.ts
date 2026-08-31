/**
 * Party Booking (whole-group) station scope.
 *
 * A Party Booking does NOT reserve every unit in the café — only the units
 * listed here per branch. Availability checks, holds and blocking all use
 * this same list on the client and the server.
 */

/** Station names (case-insensitive) included in a Party Booking, per branch slug. */
export const PARTY_STATIONS_BY_BRANCH: Record<string, string[]> = {
  vanasthalipuram: ["Console 2", "Console 4", "VR Arena", "Driving Simulator"],
  "sheriguda-ibp": ["Console 1", "Console 2", "VR Arena", "Driving Simulator"],
};

/** Fallback when a branch has no explicit list: 2 consoles + VR + racing cockpit. */
function fallbackNames(stations: { name: string; station_type: string }[]) {
  const consoles = stations
    .filter((s) => s.station_type === "console")
    .slice(0, 2)
    .map((s) => s.name);
  const others = stations
    .filter((s) => s.station_type === "vr" || s.station_type === "driving_simulator")
    .map((s) => s.name);
  return [...consoles, ...others];
}

/** Filter a branch's stations down to the ones a Party Booking reserves. */
export function partyStations<T extends { name: string; station_type: string; status?: string }>(
  branchSlug: string | null | undefined,
  stations: T[],
): T[] {
  const available = stations.filter((s) => (s.status ?? "available") === "available");
  const names = PARTY_STATIONS_BY_BRANCH[branchSlug ?? ""] ?? fallbackNames(available);
  const wanted = new Set(names.map((n) => n.trim().toLowerCase()));
  return available.filter((s) => wanted.has(s.name.trim().toLowerCase()));
}

/** Human-readable summary of what a Party Booking includes at this branch. */
export function partyScopeLabel(stationNames: string[]) {
  return stationNames.length ? stationNames.join(", ") : "2 consoles, VR Arena and Cockpit Racing";
}
