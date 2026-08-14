import { createServerFn } from "@tanstack/react-start";
import type { LiveBranchAvailability } from "@/lib/availability";

export type { LiveBranchAvailability, LiveService } from "@/lib/availability";

/**
 * Live availability for the home page.
 * Working units come from the station catalogue (maintenance/blocked units are
 * never counted); occupied units come from live bookings and active holds.
 */
export const getLiveAvailability = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveBranchAvailability[]> => {
    const { adminClient } = await import("@/lib/booking/repository.server");
    const { LABELS, ORDER, toMin, toHHMM, nowInIst } = await import("@/lib/availability");
    const db = await adminClient();
    const { date, minutes } = nowInIst();

    const [branchesRes, stationsRes] = await Promise.all([
      db
        .from("branches")
        .select("id, slug, name, city, opens_at, closes_at")
        .eq("is_active", true)
        .order("sort_order"),
      db.from("gaming_stations").select("id, branch_id, station_type, status"),
    ]);

    const branches = branchesRes.data ?? [];
    const stations = stationsRes.data ?? [];

    const out: LiveBranchAvailability[] = [];
    for (const b of branches) {
      const { data: busyRows } = await db.rpc("get_slot_availability", {
        _branch_id: b.id,
        _date: date,
      });
      const busy = (busyRows ?? []) as {
        station_id: string;
        start_time: string;
        end_time: string;
      }[];

      const open = toMin(b.opens_at);
      const close = toMin(b.closes_at);
      const isOpen =
        close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;

      const working = stations.filter((s) => s.branch_id === b.id && s.status === "available");

      const services = [];
      for (const type of ORDER) {
        const units = working.filter((s) => s.station_type === type);
        if (!units.length) continue;

        let occupied = 0;
        let nextFree: number | null = null;
        for (const u of units) {
          const covering = busy.filter(
            (r) =>
              r.station_id === u.id && toMin(r.start_time) <= minutes && toMin(r.end_time) > minutes,
          );
          if (!covering.length) continue;
          occupied += 1;
          const end = Math.max(...covering.map((r) => toMin(r.end_time)));
          if (nextFree === null || end < nextFree) nextFree = end;
        }

        services.push({
          station_type: type,
          label: LABELS[type] ?? type,
          total: units.length,
          available: Math.max(0, units.length - occupied),
          next_available:
            units.length - occupied <= 0 && nextFree !== null ? toHHMM(nextFree) : null,
        });
      }

      const total = services.reduce((n, s) => n + s.total, 0);
      const free = services.reduce((n, s) => n + s.available, 0);
      const status: LiveBranchAvailability["status"] = !isOpen
        ? "closed"
        : total === 0 || free === 0
          ? "full"
          : free / total <= 0.34
            ? "few"
            : "open";

      out.push({
        id: b.id,
        slug: b.slug,
        name: b.name,
        city: b.city,
        opens_at: b.opens_at,
        closes_at: b.closes_at,
        is_open: isOpen,
        status,
        services,
      });
    }
    return out;
  },
);
