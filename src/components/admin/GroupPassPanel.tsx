import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import type { AdminGroupPassRate } from "@/lib/admin/useBranchData";
import { Plus, Trash2 } from "lucide-react";

const blank = { label: "", duration: "60", price: "" };

/**
 * Group Pass pricing for one branch. Prices are completely independent per
 * branch — editing one branch never touches another.
 */
export function GroupPassPanel({
  rates,
  branchId,
  branchName,
  onChanged,
}: {
  rates: AdminGroupPassRate[];
  branchId: string;
  branchName: string;
  onChanged: () => void;
}) {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const add = async () => {
    const minutes = Number(form.duration);
    if (!Number.isFinite(minutes) || minutes < 30) {
      toast.error("Duration must be at least 30 minutes.");
      return;
    }
    setBusy("new");
    const { error } = await supabase.from("group_pass_rates").insert({
      branch_id: branchId,
      label: form.label.trim() || `${Math.round(minutes / 60)} Hours`,
      duration_minutes: minutes,
      price: Number(form.price) || 0,
      is_active: true,
      sort_order: rates.length + 1,
    });
    setBusy(null);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "That duration already exists for this branch."
          : "Could not add this duration.",
      );
      return;
    }
    setForm(blank);
    toast.success("Group pass duration added.");
    onChanged();
  };

  const patch = async (row: AdminGroupPassRate, values: Partial<AdminGroupPassRate>, msg?: string) => {
    setBusy(row.id);
    const { error } = await supabase.from("group_pass_rates").update(values).eq("id", row.id);
    setBusy(null);
    if (error) toast.error("Could not update this duration.");
    else {
      if (msg) toast.success(msg);
      onChanged();
    }
  };

  const remove = async (row: AdminGroupPassRate) => {
    if (!window.confirm(`Delete "${row.label}"?`)) return;
    setBusy(row.id);
    const { error } = await supabase.from("group_pass_rates").delete().eq("id", row.id);
    setBusy(null);
    if (error) toast.error("Could not delete this duration.");
    else {
      toast.success("Duration deleted.");
      onChanged();
    }
  };

  return (
    <Panel title={`Group pass pricing · ${branchName}`}>
      <p className="mb-5 text-xs text-muted-foreground">
        A Group Pass reserves the entire café (up to 10 members) for the chosen duration. These prices
        belong to this branch only.
      </p>

      <div className="mb-6 grid gap-3 rounded-3xl border border-cyan/25 bg-cyan/5 p-4 sm:grid-cols-4">
        <AdminInput
          label="Label"
          value={form.label}
          onChange={(v) => setForm((f) => ({ ...f, label: v }))}
          placeholder="2 Hours"
        />
        <AdminInput
          label="Minutes"
          value={form.duration}
          onChange={(v) => setForm((f) => ({ ...f, duration: v.replace(/[^0-9]/g, "") }))}
        />
        <AdminInput
          label="Price (₹)"
          value={form.price}
          onChange={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9]/g, "") }))}
        />
        <div className="flex items-end">
          <AdminButton
            variant="primary"
            disabled={busy === "new"}
            onClick={() => void add()}
            className="w-full py-3"
          >
            <Plus className="size-3.5" /> Add
          </AdminButton>
        </div>
      </div>

      {rates.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No group pass durations yet — add the ones this branch sells.
        </p>
      ) : (
        <ul className="space-y-2">
          {[...rates]
            .sort((a, b) => a.sort_order - b.sort_order || a.duration_minutes - b.duration_minutes)
            .map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-3"
              >
                <input
                  value={row.label}
                  onChange={(e) => void patch(row, { label: e.target.value })}
                  className="w-40 rounded-xl border border-border bg-surface/70 px-3 py-1.5 text-sm outline-none focus:border-cyan/50"
                />
                <span className="text-xs text-muted-foreground">{row.duration_minutes} min</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <input
                    value={draft[row.id] ?? String(Math.round(Number(row.price)))}
                    inputMode="numeric"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [row.id]: e.target.value.replace(/[^0-9]/g, "") }))
                    }
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isFinite(next) && next !== Number(row.price))
                        void patch(row, { price: next });
                    }}
                    className="w-24 rounded-xl border border-border bg-surface/70 px-3 py-1.5 text-center text-sm outline-none focus:border-cyan/50"
                  />
                </span>
                <Pill tone={row.is_active ? "good" : "muted"}>{row.is_active ? "Live" : "Off"}</Pill>
                <AdminButton
                  disabled={busy === row.id}
                  onClick={() =>
                    void patch(
                      row,
                      { is_active: !row.is_active },
                      row.is_active ? "Hidden from booking." : "Live on booking.",
                    )
                  }
                >
                  {row.is_active ? "Disable" : "Enable"}
                </AdminButton>
                <AdminButton variant="danger" disabled={busy === row.id} onClick={() => void remove(row)}>
                  <Trash2 className="size-3.5" />
                </AdminButton>
              </li>
            ))}
        </ul>
      )}
    </Panel>
  );
}
