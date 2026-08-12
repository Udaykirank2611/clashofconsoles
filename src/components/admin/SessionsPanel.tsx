import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import type { AdminSessionOption } from "@/lib/admin/useBranchData";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

const blank = { label: "", duration: "60", players: "1", price: "" };

/** Dynamic per-branch session pricing: any duration, any player count, fully admin managed. */
export function SessionsPanel({
  sessions,
  branchId,
  branchName,
  onChanged,
}: {
  sessions: AdminSessionOption[];
  branchId: string;
  branchName: string;
  onChanged: () => void;
}) {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const add = async () => {
    const minutes = Number(form.duration);
    const players = Number(form.players);
    if (!Number.isFinite(minutes) || minutes < 15) {
      toast.error("Duration must be at least 15 minutes.");
      return;
    }
    setBusy("new");
    const { error } = await supabase.from("session_options").insert({
      branch_id: branchId,
      label: form.label.trim() || `${minutes} Minutes`,
      duration_minutes: minutes,
      players: Number.isFinite(players) && players > 0 ? players : 1,
      price: Number(form.price) || 0,
      is_active: true,
      sort_order: sessions.length + 1,
    });
    setBusy(null);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "That duration and player combination already exists."
          : "Could not add this session.",
      );
      return;
    }
    setForm(blank);
    toast.success("Session added.");
    onChanged();
  };

  const patch = async (row: AdminSessionOption, values: Partial<AdminSessionOption>, msg?: string) => {
    setBusy(row.id);
    const { error } = await supabase.from("session_options").update(values).eq("id", row.id);
    setBusy(null);
    if (error) toast.error("Could not update this session.");
    else {
      if (msg) toast.success(msg);
      onChanged();
    }
  };

  const move = async (row: AdminSessionOption, dir: -1 | 1) => {
    const ordered = [...sessions].sort((a, b) => a.sort_order - b.sort_order);
    const i = ordered.findIndex((r) => r.id === row.id);
    const swap = ordered[i + dir];
    if (!swap) return;
    setBusy(row.id);
    await Promise.all([
      supabase.from("session_options").update({ sort_order: swap.sort_order }).eq("id", row.id),
      supabase.from("session_options").update({ sort_order: row.sort_order }).eq("id", swap.id),
    ]);
    setBusy(null);
    onChanged();
  };

  const remove = async (row: AdminSessionOption) => {
    if (!window.confirm(`Delete "${row.label}"?`)) return;
    setBusy(row.id);
    const { error } = await supabase.from("session_options").delete().eq("id", row.id);
    setBusy(null);
    if (error) toast.error("Could not delete this session.");
    else {
      toast.success("Session deleted.");
      onChanged();
    }
  };

  const priceValue = (row: AdminSessionOption) =>
    draft[row.id] ?? String(Math.round(Number(row.price)));

  return (
    <Panel title={`Session pricing · ${branchName}`}>
      <p className="mb-5 text-xs text-muted-foreground">
        These durations and prices belong to this branch only, and are exactly what customers see on the
        booking page.
      </p>

      <div className="mb-6 grid gap-3 rounded-3xl border border-cyan/25 bg-cyan/5 p-4 sm:grid-cols-5">
        <AdminInput
          label="Label"
          value={form.label}
          onChange={(v) => setForm((f) => ({ ...f, label: v }))}
          placeholder="1.5 Hours"
        />
        <AdminInput
          label="Minutes"
          value={form.duration}
          onChange={(v) => setForm((f) => ({ ...f, duration: v.replace(/[^0-9]/g, "") }))}
        />
        <AdminInput
          label="Players"
          value={form.players}
          onChange={(v) => setForm((f) => ({ ...f, players: v.replace(/[^0-9]/g, "") }))}
        />
        <AdminInput
          label="Price (₹)"
          value={form.price}
          onChange={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9]/g, "") }))}
        />
        <div className="flex items-end">
          <AdminButton variant="primary" disabled={busy === "new"} onClick={() => void add()} className="w-full py-3">
            <Plus className="size-3.5" /> Add
          </AdminButton>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No sessions yet — add the durations this branch sells.
        </p>
      ) : (
        <ul className="space-y-2">
          {[...sessions]
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
                <span className="text-xs text-muted-foreground">
                  {row.duration_minutes} min · {row.players} player{row.players > 1 ? "s" : ""}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <input
                    value={priceValue(row)}
                    inputMode="numeric"
                    onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isFinite(next) && next !== Number(row.price)) void patch(row, { price: next });
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
                <AdminButton disabled={busy === row.id} onClick={() => void move(row, -1)}>
                  <ArrowUp className="size-3.5" />
                </AdminButton>
                <AdminButton disabled={busy === row.id} onClick={() => void move(row, 1)}>
                  <ArrowDown className="size-3.5" />
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
