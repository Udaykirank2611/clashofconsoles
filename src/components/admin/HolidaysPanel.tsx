import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel } from "./primitives";

interface Holiday {
  id: string;
  holiday_date: string;
  reason: string;
  start_time: string | null;
  end_time: string | null;
}

const prettyDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const prettyTime = (t: string) => {
  const h = Number(t.slice(0, 2));
  const m = t.slice(3, 5);
  return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, "0")}:${m} ${h < 12 ? "AM" : "PM"}`;
};

/** Branch-specific closures — whole-day holidays or a closed time window. */
export function HolidaysPanel({ branchId }: { branchId: string }) {
  const [rows, setRows] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [wholeDay, setWholeDay] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("branch_holidays")
      .select("id, holiday_date, reason, start_time, end_time")
      .eq("branch_id", branchId)
      .order("holiday_date", { ascending: true });
    setRows((data as unknown as Holiday[]) ?? []);
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
    if (!wholeDay && (!from || !to || from >= to)) {
      toast.error("Set a closing window that ends after it starts.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("branch_holidays").insert({
      branch_id: branchId,
      holiday_date: date,
      reason: reason.trim(),
      start_time: wholeDay ? null : `${from}:00`,
      end_time: wholeDay ? null : `${to}:00`,
    } as never);
    setBusy(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "That date is already a holiday." : "Could not add that holiday.",
      );
      return;
    }
    setDate("");
    setReason("");
    setFrom("");
    setTo("");
    setWholeDay(true);
    toast.success(
      wholeDay
        ? "Holiday added — bookings are blocked all day."
        : "Closure added — only those hours are blocked.",
    );
    void load();
  };

  const saveReason = async (id: string, value: string) => {
    const { error } = await supabase
      .from("branch_holidays")
      .update({ reason: value.trim() })
      .eq("id", id);
    if (error) toast.error("Could not update that holiday.");
  };

  const saveTimes = async (row: Holiday, start: string, end: string) => {
    if (start && end && start >= end) {
      toast.error("Closing window must end after it starts.");
      return;
    }
    const { error } = await supabase
      .from("branch_holidays")
      .update({
        start_time: start && end ? `${start}:00` : null,
        end_time: start && end ? `${end}:00` : null,
      } as never)
      .eq("id", row.id);
    if (error) {
      toast.error("Could not update those hours.");
      return;
    }
    void load();
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
        Dates listed here are closed for this branch. Leave the hours empty to close the whole day,
        or set a window to block only those hours.
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

      <div className="mt-3 grid gap-3 sm:grid-cols-[180px_180px_minmax(0,1fr)] sm:items-end">
        <label className="flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={wholeDay}
            onChange={(e) => setWholeDay(e.target.checked)}
            className="size-4 accent-pink"
          />
          Closed the whole day
        </label>
        {!wholeDay ? (
          <>
            <AdminInput label="Closed from" type="time" value={from} onChange={setFrom} />
            <AdminInput label="Closed until" type="time" value={to} onChange={setTo} />
          </>
        ) : null}
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
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface/40 px-4 py-3 sm:grid-cols-[160px_minmax(0,1fr)_auto_auto]"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">{prettyDate(h.holiday_date)}</p>
                <p className="text-[0.7rem] font-semibold text-muted-foreground">
                  {h.start_time && h.end_time
                    ? `Closed ${prettyTime(h.start_time)} – ${prettyTime(h.end_time)}`
                    : "Closed all day"}
                </p>
              </div>
              <input
                defaultValue={h.reason}
                placeholder="Reason"
                onBlur={(e) => void saveReason(h.id, e.target.value)}
                className="col-span-2 w-full rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-cyan/50 sm:col-span-1"
              />
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <input
                  type="time"
                  defaultValue={h.start_time ? h.start_time.slice(0, 5) : ""}
                  onBlur={(e) =>
                    void saveTimes(h, e.target.value, h.end_time ? h.end_time.slice(0, 5) : "")
                  }
                  className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus:border-cyan/50"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="time"
                  defaultValue={h.end_time ? h.end_time.slice(0, 5) : ""}
                  onBlur={(e) =>
                    void saveTimes(h, h.start_time ? h.start_time.slice(0, 5) : "", e.target.value)
                  }
                  className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus:border-cyan/50"
                />
              </div>
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
