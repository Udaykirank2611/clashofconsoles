import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, Panel, money } from "./primitives";
import { SessionsPanel } from "./SessionsPanel";
import { GroupPassPanel } from "./GroupPassPanel";
import type {
  AdminGroupPassRate,
  AdminMenuItem,
  AdminSessionOption,
  AdminStation,
} from "@/lib/admin/useBranchData";

/** All pricing for the signed-in branch. Nothing here is shared with another branch. */
export function PricingPanel({
  sessions,
  groupRates,
  stations,
  menu,
  branchId,
  branchName,
  onChanged,
}: {
  sessions: AdminSessionOption[];
  groupRates: AdminGroupPassRate[];
  stations: AdminStation[];
  menu: AdminMenuItem[];
  branchId: string;
  branchName: string;
  onChanged: () => void;
}) {
  const [hourly, setHourly] = useState<Record<string, string>>({});
  const [food, setFood] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHourly(Object.fromEntries(stations.map((s) => [s.id, String(Math.round(Number(s.hourly_price)))])));
    setFood(Object.fromEntries(menu.map((m) => [m.id, String(Math.round(Number(m.price)))])));
  }, [stations, menu]);

  const save = async () => {
    setSaving(true);
    const jobs: PromiseLike<unknown>[] = [];
    for (const s of stations) {
      const next = Number(hourly[s.id]);
      if (Number.isFinite(next) && next !== Number(s.hourly_price)) {
        jobs.push(supabase.from("gaming_stations").update({ hourly_price: next }).eq("id", s.id));
      }
    }
    for (const m of menu) {
      const next = Number(food[m.id]);
      if (Number.isFinite(next) && next !== Number(m.price)) {
        jobs.push(supabase.from("menu_items").update({ price: next }).eq("id", m.id));
      }
    }
    await Promise.all(jobs);
    setSaving(false);
    toast.success(jobs.length ? `Pricing updated for ${branchName}.` : "Nothing to update.");
    onChanged();
  };

  return (
    <div className="space-y-6">
      <SessionsPanel sessions={sessions} branchId={branchId} branchName={branchName} onChanged={onChanged} />

      <GroupPassPanel rates={groupRates} branchId={branchId} branchName={branchName} onChanged={onChanged} />



      <Panel title={`Experience hourly rates · ${branchName}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {stations.map((s) => (
            <label
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-3"
            >
              <span className="text-sm">{s.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">₹/hr</span>
                <input
                  value={hourly[s.id] ?? ""}
                  inputMode="numeric"
                  onChange={(e) => setHourly((c) => ({ ...c, [s.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                  className="w-24 rounded-xl border border-border bg-surface/70 px-3 py-1.5 text-center text-sm outline-none focus:border-cyan/50"
                />
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Used to price VR, cockpit racing, snooker, theatre and lounge add-ons at this branch.
        </p>
      </Panel>

      <Panel title={`Food & drink prices · ${branchName}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {menu.map((m) => (
            <label
              key={m.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="min-w-0 text-sm break-words">
                {m.name}
                <span className="ml-2 text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {m.category}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{money(m.price)}</span>
                <input
                  value={food[m.id] ?? ""}
                  inputMode="numeric"
                  onChange={(e) => setFood((f) => ({ ...f, [m.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                  className="w-24 rounded-xl border border-border bg-surface/70 px-3 py-1.5 text-center text-sm outline-none focus:border-cyan/50"
                />
              </span>
            </label>
          ))}
        </div>
      </Panel>

      <div className="flex justify-end">
        <AdminButton variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save all pricing"}
        </AdminButton>
      </div>
    </div>
  );
}
