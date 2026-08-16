import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, AdminInput, Panel, Pill } from "./primitives";
import { StationRatesPanel } from "./StationRatesPanel";
import { StationGamesPanel } from "./StationGamesPanel";
import type { AdminBooking, AdminStation } from "@/lib/admin/useBranchData";
import { formatTime } from "@/lib/booking/pricing";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Pencil, Plus, Trash2, X } from "lucide-react";

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Under maintenance" },
  { value: "blocked", label: "Unavailable" },
] as const;

const TYPES = [
  { value: "console", label: "PlayStation / console" },
  { value: "driving_simulator", label: "Racing cockpit" },
  { value: "vr", label: "VR rig" },
  { value: "snooker", label: "Snooker table" },
  { value: "private_lounge", label: "Private gaming lounge" },
  { value: "private_theatre", label: "Private theatre" },
] as const;


const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function StationsPanel({
  stations,
  bookings,
  branchId,
  onChanged,
}: {
  stations: AdminStation[];
  bookings: AdminBooking[];
  branchId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<(typeof TYPES)[number]["value"]>("console");
  const [newPrice, setNewPrice] = useState("200");
  const [newGroup, setNewGroup] = useState("");

  // Timed experiences are only bookable once they have at least one rate card.
  const [rateCounts, setRateCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.from("station_rates").select("station_id").eq("branch_id", branchId).eq("is_active", true);
      if (!alive) return;
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.station_id] = (counts[r.station_id] ?? 0) + 1;
      setRateCounts(counts);
    })();
    return () => {
      alive = false;
    };
  }, [branchId, stations]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const setStatus = async (station: AdminStation, status: string) => {
    setBusy(station.id);
    const { error } = await supabase
      .from("gaming_stations")
      .update({ status: status as AdminStation["status"] })
      .eq("id", station.id);
    setBusy(null);
    if (error) {
      toast.error("Could not update this station.");
      return;
    }
    toast.success(`${station.name} is now ${status === "blocked" ? "unavailable" : status}.`);
    onChanged();
  };

  const rename = async (station: AdminStation) => {
    const name = draftName.trim();
    if (name.length < 2) {
      toast.error("Enter a name with at least 2 characters.");
      return;
    }
    setBusy(station.id);
    const { error } = await supabase.from("gaming_stations").update({ name }).eq("id", station.id);
    setBusy(null);
    setEditing(null);
    if (error) {
      toast.error("Could not rename this station.");
      return;
    }
    toast.success("Station renamed.");
    onChanged();
  };

  const savePrice = async (station: AdminStation, value: string) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid hourly price.");
      return;
    }
    if (price === Number(station.hourly_price)) return;
    setBusy(station.id);
    const { error } = await supabase
      .from("gaming_stations")
      .update({ hourly_price: price })
      .eq("id", station.id);
    setBusy(null);
    if (error) {
      toast.error("Could not update the price.");
      return;
    }
    toast.success(`${station.name} is now ₹${price}/hr.`);
    onChanged();
  };

  type DraftKey = "group_label" | "description" | "image_url" | "games_text";

  /** Text fields save themselves shortly after typing stops. */
  const draftVal = (station: AdminStation, key: DraftKey) => {
    const draft = drafts[`${station.id}:${key}`];
    if (draft !== undefined) return draft;
    if (key === "games_text") return (station.games ?? []).join(", ");
    return (station[key] as string | null) ?? "";
  };

  const saveField = (station: AdminStation, key: DraftKey, value: string) => {
    const id = `${station.id}:${key}`;
    setDrafts((prev) => ({ ...prev, [id]: value }));
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(async () => {
      const payload =
        key === "games_text"
          ? {
              games: value
                .split(",")
                .map((g) => g.trim())
                .filter(Boolean),
            }
          : { [key]: key === "group_label" ? value.trim() : value.trim() || null };
      const { error } = await supabase.from("gaming_stations").update(payload).eq("id", station.id);
      if (error) toast.error("Could not save this change.");
      else onChanged();
    }, 800);
  };

  const remove = async (station: AdminStation) => {
    const active = bookings.filter(
      (b) => b.station_id === station.id && (b.status === "pending" || b.status === "confirmed"),
    );
    if (active.length) {
      toast.error("Cannot remove this station", {
        description: `${active.length} booking(s) still reference it. Reject or complete them first.`,
      });
      return;
    }
    if (!window.confirm(`Remove ${station.name}? This cannot be undone.`)) return;
    setBusy(station.id);
    const { error } = await supabase.from("gaming_stations").delete().eq("id", station.id);
    setBusy(null);
    if (error) {
      toast.error("Could not remove this station", {
        description: "It is still linked to past bookings — mark it unavailable instead.",
      });
      return;
    }
    toast.success("Station removed.");
    onChanged();
  };

  const add = async () => {
    const name = newName.trim();
    if (name.length < 2) {
      toast.error("Give the new station a name.");
      return;
    }
    setBusy("new");
    const price = Number(newPrice) || 0;
    const { data: created, error } = await supabase
      .from("gaming_stations")
      .insert({
        branch_id: branchId,
        name,
        station_type: newType,
        group_label: newGroup.trim() || TYPES.find((t) => t.value === newType)!.label,
        hourly_price: price,
        is_addon: newType !== "console",
        sort_order: stations.length + 1,
        status: "available",
      })
      .select("id")
      .single();
    // A timed experience with no rate card cannot be booked, so it starts with
    // a 1 hour package the team can rename, reprice or extend right away.
    if (created && newType !== "console") {
      await supabase.from("station_rates").insert({
        station_id: created.id,
        branch_id: branchId,
        label: "1 Hour",
        note: "",
        duration_minutes: 60,
        price,
        sort_order: 1,
        is_active: true,
        is_extra_hour: false,
      });
    }
    setBusy(null);
    if (error) {
      toast.error("Could not add this station.");
      return;
    }
    setAdding(false);
    setNewName("");
    setNewPrice("200");
    setNewType("console");
    setNewGroup("");
    toast.success("Station added — customers can book it right away.");
    onChanged();
  };

  return (
    <Panel
      title="PlayStations & stations"
      action={
        <AdminButton variant="primary" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-3.5" /> {adding ? "Cancel" : "Add station"}
        </AdminButton>
      }
    >
      {adding ? (
        <div className="mb-5 grid gap-3 rounded-3xl border border-cyan/25 bg-cyan/5 p-4 sm:grid-cols-5">
          <AdminInput label="Name" value={newName} onChange={setNewName} placeholder="PlayStation 5 — Bay 5" />
          <label className="block">
            <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Type
            </span>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as typeof newType)}
              className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-cyan/50"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <AdminInput
            label="Booking page group"
            value={newGroup}
            onChange={setNewGroup}
            placeholder="PS5 Gaming"
          />
          <AdminInput label="Hourly rate (₹)" value={newPrice} onChange={(v) => setNewPrice(v.replace(/[^0-9]/g, ""))} />
          <div className="flex items-end">
            <AdminButton variant="primary" disabled={busy === "new"} onClick={() => void add()} className="w-full py-3">
              {busy === "new" ? "Adding…" : "Save station"}
            </AdminButton>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {stations.map((s) => {
          const today = bookings
            .filter(
              (b) =>
                b.booking_date === todayKey &&
                (b.status === "pending" || b.status === "confirmed") &&
                b.station_id === s.id,
            )
            .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
          const current = today.find(
            (b) => toMinutes(b.start_time) <= nowMin && toMinutes(b.end_time) > nowMin,
          );
          const next = today.find((b) => toMinutes(b.start_time) > nowMin);

          return (
            <article
              key={s.id}
              className="rounded-3xl border border-border bg-surface/60 p-5 transition-all duration-500 hover:-translate-y-0.5 hover:border-cyan/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editing === s.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={draftName}
                        autoFocus
                        onChange={(e) => setDraftName(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-border bg-surface/70 px-3 py-1.5 text-sm outline-none focus:border-cyan/50"
                      />
                      <button
                        type="button"
                        aria-label="Save name"
                        onClick={() => void rename(s)}
                        className="grid size-8 place-items-center rounded-lg border border-emerald-400/40 text-emerald-300"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel rename"
                        onClick={() => setEditing(null)}
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="flex items-center gap-2 text-base font-bold">
                      <span className="truncate">{s.name}</span>
                      <button
                        type="button"
                        aria-label={`Rename ${s.name}`}
                        onClick={() => {
                          setEditing(s.id);
                          setDraftName(s.name);
                        }}
                        className="text-muted-foreground transition-colors hover:text-cyan"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </h3>
                  )}
                  <p className="mt-0.5 text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                    {s.station_type.replace(/_/g, " ")}
                  </p>
                </div>
                {s.station_type !== "console" && !rateCounts[s.id] ? (
                  <Pill tone="bad">No rates</Pill>
                ) : null}
                {s.status === "available" ? (
                  <Pill tone="good">Available</Pill>
                ) : s.status === "maintenance" ? (
                  <Pill tone="warn">Maintenance</Pill>
                ) : (
                  <Pill tone="bad">Unavailable</Pill>
                )}
              </div>

              <dl className="mt-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Hourly price</dt>
                  <dd className="flex items-center gap-1 text-right">
                    <span className="text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min={0}
                      aria-label={`Hourly price for ${s.name}`}
                      defaultValue={String(Number(s.hourly_price))}
                      key={`${s.id}-${s.hourly_price}`}
                      disabled={busy === s.id}
                      onBlur={(e) => void savePrice(s, e.target.value)}
                      className="w-20 rounded-lg border border-border bg-surface/70 px-2 py-1 text-right text-xs font-semibold outline-none focus:border-cyan/50"
                    />
                    <span className="text-muted-foreground">/hr</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Now playing</dt>
                  <dd className="text-right">
                    {current ? `${current.customer_name} · until ${formatTime(current.end_time)}` : "Free"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Next booking</dt>
                  <dd className="text-right">
                    {next ? `${formatTime(next.start_time)} · ${next.customer_name}` : "Nothing today"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 grid gap-3">
                <AdminInput
                  label="Booking page group"
                  value={draftVal(s, "group_label") as string}
                  onChange={(v) => saveField(s, "group_label", v)}
                  placeholder="PS5 Gaming"
                />
                <AdminInput
                  label="Short description"
                  value={(draftVal(s, "description") as string) ?? ""}
                  onChange={(v) => saveField(s, "description", v)}
                  placeholder="4K 120Hz · DualSense controllers"
                />
                <AdminInput
                  label="Image link"
                  value={(draftVal(s, "image_url") as string) ?? ""}
                  onChange={(v) => saveField(s, "image_url", v)}
                  placeholder="https://…"
                />
              </div>

              <StationGamesPanel stationId={s.id} branchId={branchId} stationName={s.name} />

              {s.station_type !== "console" && !rateCounts[s.id] ? (
                <p className="mt-4 flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Customers cannot book {s.name} until you add at least one rate below.
                </p>
              ) : null}

              {s.station_type !== "console" ? (
                <StationRatesPanel stationId={s.id} branchId={branchId} stationName={s.name} />
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {STATUSES.map((o) => (
                  <AdminButton
                    key={o.value}
                    variant={s.status === o.value ? "primary" : "ghost"}
                    disabled={busy === s.id}
                    onClick={() => void setStatus(s, o.value)}
                    className={cn(s.status === o.value && "pointer-events-none")}
                  >
                    {o.label}
                  </AdminButton>
                ))}
                <AdminButton variant="danger" disabled={busy === s.id} onClick={() => void remove(s)}>
                  <Trash2 className="size-3.5" /> Remove
                </AdminButton>
              </div>
            </article>
          );
        })}
      </div>

      {!stations.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No stations yet — add your first PlayStation above.
        </p>
      ) : null}
    </Panel>
  );
}
