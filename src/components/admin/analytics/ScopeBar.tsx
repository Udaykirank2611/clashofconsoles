import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANGE_LABELS, RANGE_ORDER, type AnalyticsScope } from "./scope";

export function ScopeBar({
  scope,
  branches,
  allowAllBranches,
  children,
}: {
  scope: AnalyticsScope;
  branches: { id: string; name: string }[];
  allowAllBranches: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-surface/60 p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-cyan">
          <CalendarRange className="size-3.5" /> Range
        </span>
        {RANGE_ORDER.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => scope.setPreset(p)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition-colors",
              scope.preset === p
                ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {RANGE_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {scope.preset === "custom" ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="date"
              value={scope.custom.from}
              onChange={(e) => scope.setCustom({ ...scope.custom, from: e.target.value })}
              className="rounded-full border border-border bg-surface/70 px-3 py-1.5 outline-none focus:border-cyan/50"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={scope.custom.to}
              onChange={(e) => scope.setCustom({ ...scope.custom, to: e.target.value })}
              className="rounded-full border border-border bg-surface/70 px-3 py-1.5 outline-none focus:border-cyan/50"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {scope.range.from} → {scope.range.to}
          </p>
        )}

        <select
          value={scope.branchId ?? ""}
          onChange={(e) => scope.setBranchId(e.target.value || null)}
          className="rounded-full border border-border bg-surface/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] outline-none focus:border-cyan/50"
        >
          {allowAllBranches ? <option value="">All branches</option> : null}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
