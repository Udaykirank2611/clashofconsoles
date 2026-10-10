import { useState } from "react";
import type { AdminBranch } from "@/lib/admin/useAdminSession";
import { SmartPricingPanel } from "./SmartPricingPanel";

/** AI Insights — Smart Pricing, computed separately for each branch. */
export function AIInsightsView({ branches, defaultBranchId }: { branches: AdminBranch[]; defaultBranchId: string | null }) {
  const [sel, setSel] = useState<string>(branches.length > 1 ? "all" : (defaultBranchId ?? "all"));
  const shown = sel === "all" ? branches : branches.filter((b) => b.id === sel);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">AI Insights</h1>
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          aria-label="Branch"
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold"
        >
          {branches.length > 1 ? <option value="all">All branches</option> : null}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      {shown.map((b) => (
        <div key={b.id} className="space-y-2 rounded-3xl border border-border p-4 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{b.name}</p>
          <SmartPricingPanel branchId={b.id} />
        </div>
      ))}
    </div>
  );
}
