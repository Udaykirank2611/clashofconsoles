import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel } from "./primitives";

interface Holiday {
  id: string;
  holiday_date: string;
  reason: string;
}

const prettyDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Branch-specific holidays — bookings are blocked on these dates. */
export function HolidaysPanel({ branchId }: { branchId: string }) {
  const [rows, setRows] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("branch_holidays")
      .select("id, holiday_date, reason")
      .eq("branch_id", branchId)
      .order("holiday_date", { ascending: true });
    setRows((data as Holiday[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const add = async () => {
    if (!date) {
      toast.error("Pick a date first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("branch_holidays")
      .insert({ branch_id: branchId, holiday_date: date, reason: reason.trim() });
    setBusy(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "That date is already a holiday." : "Could not add that holiday.",
      );
      return;
    }
    setDate("");
    setReason("");
    toast.success("Holiday added — bookings are blocked on that day.");
    void load();
  };

  const saveReason = async (id: string, value: string) => {
    const { error } = await supabase
      .from("branch_holidays")
      .update({ reason: value.trim() })
      .eq("id", id);
    if (error) toast.error("Could not update that holiday.");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("branch_holidays").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove that holiday.");
      return;
    }
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Holiday removed.");
  };

  return (
    <Panel title="Holidays (bookings blocked)">
      <p className="mb-5 text-xs text-muted-foreground">
        Dates listed here are closed for this branch. Customers cannot pick them on the booking
        calendar.
      </p>

      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
        <AdminInput label="Date" type="date" value={date} onChange={setDate} />
        <AdminInput
          label="Reason (optional)"
          value={reason}
          onChange={setReason}
          placeholder="Diwali, maintenance…"
        />
        <AdminButton variant="primary" disabled={busy} onClick={() => void add()}>
          {busy ? "Adding…" : "Add holiday"}
        </AdminButton>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading holidays…</p>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground">No holidays added yet.</p>
        ) : (
          rows.map((h) => (
            <div
              key={h.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface/40 px-4 py-3 sm:grid-cols-[160px_minmax(0,1fr)_auto]"
            >
              <p className="text-sm font-bold">{prettyDate(h.holiday_date)}</p>
              <input
                defaultValue={h.reason}
                placeholder="Reason"
                onBlur={(e) => void saveReason(h.id, e.target.value)}
                className="col-span-2 w-full rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-cyan/50 sm:col-span-1"
              />
              <button
                type="button"
                aria-label="Remove holiday"
                onClick={() => void remove(h.id)}
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-destructive transition-colors hover:border-destructive/50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
