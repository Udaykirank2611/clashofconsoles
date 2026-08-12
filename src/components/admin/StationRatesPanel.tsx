import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput } from "./primitives";
import type { StationRate } from "@/lib/booking/types";

/**
 * Editable price tiers for one experience station (private theatre, racing
 * cockpit, snooker, private gaming lounge). Everything the booking page shows
 * for that experience comes from these rows.
 */
export function StationRatesPanel({
  stationId,
  branchId,
  stationName,
}: {
  stationId: string;
  branchId: string;
  stationName: string;
}) {
  const [rows, setRows] = useState<StationRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("station_rates")
      .select("*")
      .eq("station_id", stationId)
      .order("sort_order");
    setRows((data ?? []) as unknown as StationRate[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]);

  const patch = (id: string, changes: Partial<StationRate>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...changes } : x)));

  const saveAll = async () => {
    setBusy(true);
    const results = await Promise.all(
      rows.map((r) =>
        supabase
          .from("station_rates")
          .update({
            label: r.label,
            note: r.note ?? "",
            price: Number(r.price) || 0,
            duration_minutes: Number(r.duration_minutes) || 60,
            is_active: r.is_active,
            is_extra_hour: r.is_extra_hour,
          })
          .eq("id", r.id),
      ),
    );
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) toast.error(failed.error.message);
    else toast.success(`${stationName} pricing updated — live on the booking page.`);
    void load();
  };

  const add = async () => {
    setBusy(true);
    const { error } = await supabase.from("station_rates").insert({
      station_id: stationId,
      branch_id: branchId,
      label: "New package",
      note: "",
      price: 0,
      duration_minutes: 60,
      sort_order: rows.length + 1,
    });
    setBusy(false);
    if (error) toast.error("Could not add this package.");
    else void load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this package?")) return;
    const { error } = await supabase.from("station_rates").delete().eq("id", id);
    if (error) toast.error("Could not remove this package.");
    else void load();
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-cyan">
          Booking packages & prices
        </p>
        <div className="flex gap-2">
          <AdminButton disabled={busy} onClick={() => void add()}>
            <Plus className="size-3.5" /> Add
          </AdminButton>
          <AdminButton variant="primary" disabled={busy} onClick={() => void saveAll()}>
            {busy ? "Saving…" : "Save"}
          </AdminButton>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading packages…</p>
      ) : !rows.length ? (
        <p className="text-xs text-muted-foreground">
          No packages yet — the hourly rate above is used instead.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-2 rounded-xl border border-border bg-surface/50 p-3">
              <div className="grid gap-2 sm:grid-cols-[1.3fr_0.7fr_0.7fr]">
                <AdminInput label="Package" value={r.label} onChange={(v) => patch(r.id, { label: v })} />
                <AdminInput
                  label="Price (₹)"
                  type="number"
                  value={String(r.price)}
                  onChange={(v) => patch(r.id, { price: Number(v) })}
                />
                <AdminInput
                  label="Minutes"
                  type="number"
                  value={String(r.duration_minutes)}
                  onChange={(v) => patch(r.id, { duration_minutes: Number(v) })}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                <AdminInput
                  label="Note"
                  value={r.note ?? ""}
                  onChange={(v) => patch(r.id, { note: v })}
                  placeholder="2 members · 30 mins each"
                />
                <AdminButton
                  variant={r.is_extra_hour ? "primary" : "ghost"}
                  onClick={() => patch(r.id, { is_extra_hour: !r.is_extra_hour })}
                >
                  {r.is_extra_hour ? "Extra-hour add-on" : "Base package"}
                </AdminButton>
                <AdminButton onClick={() => patch(r.id, { is_active: !r.is_active })}>
                  {r.is_active ? "Hide" : "Show"}
                </AdminButton>
                <AdminButton variant="danger" onClick={() => void remove(r.id)}>
                  <Trash2 className="size-3.5" />
                </AdminButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
