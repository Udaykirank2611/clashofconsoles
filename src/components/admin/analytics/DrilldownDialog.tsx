import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { getDrilldown } from "@/lib/analytics.functions";
import { money } from "../primitives";
import { ScrollTable } from "./TodayPanel";
import { cn } from "@/lib/utils";
import { ModalPortal } from "../ModalPortal";

export interface Drilldown {
  kind: "hour" | "station" | "service";
  key: string;
  title: string;
}

/** Underlying bookings + sessions behind one analytics chart slice. */
export function DrilldownDialog({
  drilldown,
  branchId,
  range,
  onClose,
}: {
  drilldown: Drilldown | null;
  branchId: string | null;
  range: { from: string; to: string };
  onClose: () => void;
}) {
  const fetchDrilldown = useServerFn(getDrilldown);
  const [mode, setMode] = useState("all");

  const { data = [], isFetching } = useQuery({
    queryKey: ["drilldown", branchId, range.from, range.to, drilldown?.kind, drilldown?.key],
    queryFn: () =>
      fetchDrilldown({
        data: { branchId, ...range, kind: drilldown!.kind, key: drilldown!.key },
      }),
    enabled: Boolean(drilldown),
  });

  const rows = useMemo(
    () => (mode === "all" ? data : data.filter((r) => r.paymentMode === mode)),
    [data, mode],
  );

  if (!drilldown) return null;

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const totalHours = Math.round((rows.reduce((s, r) => s + r.minutes, 0) / 60) * 10) / 10;

  return (
    <ModalPortal onClose={onClose}>
      <div className="mx-auto max-h-[88dvh] w-full max-w-5xl overflow-auto rounded-3xl border border-border bg-surface p-5 shadow-2xl sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-cyan">Drill-down</h2>
            <p className="mt-1 text-sm font-bold">{drilldown.title}</p>
            <p className="text-xs text-muted-foreground">
              {range.from} → {range.to} · {rows.length} session{rows.length === 1 ? "" : "s"} · {totalHours} h ·{" "}
              {money(totalAmount)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {["all", "UPI", "Cash", "Not recorded"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] transition-colors",
                  mode === m
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "all" ? "All modes" : m}
              </button>
            ))}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drill-down"
              className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {isFetching ? <p className="pb-3 text-xs text-muted-foreground">Loading sessions…</p> : null}

        <ScrollTable
          head={[
            "Date",
            "Time",
            "Ref",
            "Customer",
            "Phone",
            "Branch",
            "Station",
            "Service",
            "Players",
            "Status",
            "Payment mode",
            "Gaming value",
          ]}
          empty="No bookings behind this slice."
          rows={rows.map((r) => [
            r.date,
            r.time,
            r.reference.replace("COC-", ""),
            r.customer,
            r.phone,
            r.branch,
            r.station,
            r.service,
            String(r.players),
            r.status.replace("_", " "),
            r.paymentMode,
            money(r.amount),
          ])}
        />
      </div>
    </ModalPortal>
  );
}
