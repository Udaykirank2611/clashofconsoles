import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { moveBooking } from "@/lib/booking-admin.functions";
import { AdminButton, Panel } from "../primitives";
import { BookingEditPanel } from "./BookingEditPanel";
import { ModalPortal } from "../ModalPortal";
import {
  PAYMENT_FILTERS,
  STATUS_CLASS,
  STATUS_DOT,
  STATUS_FILTERS,
  STATUS_LABEL,
  matchesStatusFilter,
  paymentFilterMatches,
  paymentStatus,
  type CalStatus,
} from "./status";
import {
  addDays,
  isoDate,
  prettyTime,
  startOfWeek,
  toMinutes,
  clock,
  type CalBooking,
  type CalStation,
} from "./types";
import { cn } from "@/lib/utils";

type View = "day" | "week" | "month";

const SLOT = 30;
const ROW_PX = 44;

const field =
  "rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs outline-none focus:border-cyan/50";

interface PendingMove {
  booking: CalBooking;
  stationId: string;
  stationName: string;
  date: string;
  startTime: string;
}

export function BookingCalendar({
  branches,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  defaultBranchId: string | null;
}) {
  const branchId = defaultBranchId ?? branches[0]?.id ?? "";
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [bookings, setBookings] = useState<CalBooking[]>([]);
  const [stations, setStations] = useState<CalStation[]>([]);
  const [hours, setHours] = useState({ open: "10:00", close: "23:00" });
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");

  const [editing, setEditing] = useState<CalBooking | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [moving, setMoving] = useState(false);
  const doMove = useServerFn(moveBooking);

  const range = useMemo(() => {
    if (view === "day") return { from: isoDate(anchor), to: isoDate(anchor) };
    if (view === "week") {
      const s = startOfWeek(anchor);
      return { from: isoDate(s), to: isoDate(addDays(s, 6)) };
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: isoDate(first), to: isoDate(last) };
  }, [view, anchor]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const [b, s, br] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, reference, branch_id, station_id, booking_date, start_time, end_time, customer_name, customer_phone, booking_type, players, game_title, status, payment_utr, payment_mode, special_instructions, total_amount, gaming_stations(name), booking_items(kind, label, station_id, start_time, end_time, gaming_stations(name))",
        )
        .eq("branch_id", branchId)
        .gte("booking_date", range.from)
        .lte("booking_date", range.to)
        .order("start_time"),
      supabase
        .from("gaming_stations")
        .select("id, name, station_type, status, sort_order, is_addon")
        .eq("branch_id", branchId)
        .order("sort_order"),
      supabase.from("branches").select("opens_at, closes_at").eq("id", branchId).maybeSingle(),
    ]);
    // Experiences (snooker, VR, cockpit, theatre, lounge) live on add-on line items,
    // so borrow their station + slot times to place the booking in the right lane.
    setBookings(
      ((b.data ?? []) as unknown as CalBooking[]).map((bk) => {
        const addon = (bk.booking_items ?? []).find((i) => i.kind === "addon" && i.station_id);
        if (!addon || bk.station_id) return bk;
        return {
          ...bk,
          station_id: addon.station_id,
          start_time: bk.start_time ?? addon.start_time,
          end_time: bk.end_time ?? addon.end_time,
          gaming_stations: addon.gaming_stations ?? (addon.label ? { name: addon.label } : null),
        };
      }),
    );
    setStations((s.data ?? []) as unknown as CalStation[]);
    if (br.data)
      setHours({ open: String(br.data.opens_at).slice(0, 5), close: String(br.data.closes_at).slice(0, 5) });
    setLoading(false);
  }, [branchId, range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the grid live: extensions, moves and new bookings show up without a refresh.
  useEffect(() => {
    if (!branchId) return;
    const channel = supabase
      .channel(`calendar-bookings-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_items" }, () => void load())
      .subscribe();
    // A short polling fallback keeps this operational view live even when a
    // browser briefly loses its realtime socket.
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [branchId, load]);


  const filtered = useMemo(
    () =>
      bookings.filter(
        (b) =>
          matchesStatusFilter(b.status, statusFilter) &&
          paymentFilterMatches(b, payFilter) &&
          (typeFilter === "all" || (b.booking_type ?? "single") === typeFilter) &&
          (!nameQuery || b.customer_name.toLowerCase().includes(nameQuery.trim().toLowerCase())) &&
          (!phoneQuery || b.customer_phone.includes(phoneQuery.trim())),
      ),
    [bookings, statusFilter, payFilter, typeFilter, nameQuery, phoneQuery],
  );

  const openMinutes = toMinutes(hours.open);
  const closeMinutes = Math.max(toMinutes(hours.close), openMinutes + 60);
  const slots = useMemo(() => {
    const out: number[] = [];
    for (let m = openMinutes; m < closeMinutes; m += SLOT) out.push(m);
    return out;
  }, [openMinutes, closeMinutes]);

  const lanes = useMemo(() => stations.filter((s) => s.status !== "blocked"), [stations]);

  const requestMove = (booking: CalBooking, stationId: string, date: string, startTime: string) => {
    if (!booking.start_time || !booking.end_time) {
      toast.error("Cannot move booking because it has no timed session.");
      return;
    }
    const station = stations.find((s) => s.id === stationId);
    if (
      booking.station_id === stationId &&
      booking.booking_date === date &&
      booking.start_time.slice(0, 5) === startTime
    )
      return;
    setPending({ booking, stationId, stationName: station?.name ?? "—", date, startTime });
  };

  const confirmMove = async () => {
    if (!pending) return;
    setMoving(true);
    const res = await doMove({
      data: {
        bookingId: pending.booking.id,
        stationId: pending.stationId,
        date: pending.date,
        startTime: pending.startTime,
      },
    });
    setMoving(false);
    if (!res.ok) {
      toast.error(res.message ?? "Cannot move booking because the selected slot is unavailable.");
      return;
    }
    toast.success("Booking moved.");
    setPending(null);
    void load();
  };

  const title =
    view === "day"
      ? anchor.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : view === "week"
        ? `${startOfWeek(anchor).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${addDays(
            startOfWeek(anchor),
            6,
          ).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
        : anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const step = (dir: number) =>
    setAnchor((d) =>
      view === "day"
        ? addDays(d, dir)
        : view === "week"
          ? addDays(d, dir * 7)
          : new Date(d.getFullYear(), d.getMonth() + dir, 1),
    );

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => step(-1)} className="rounded-full border border-border p-2" aria-label="Previous">
              <ChevronLeft className="size-4" />
            </button>
            <h2 className="min-w-52 text-center text-sm font-black tracking-tight">{title}</h2>
            <button type="button" onClick={() => step(1)} className="rounded-full border border-border p-2" aria-label="Next">
              <ChevronRight className="size-4" />
            </button>
            <AdminButton onClick={() => setAnchor(new Date())}>Today</AdminButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] transition-colors",
                  view === v
                    ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground"
                    : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {v} view
              </button>
            ))}
            <AdminButton onClick={() => void load()}>
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
            </AdminButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Branch is chosen from the admin header selector — no duplicate control here. */}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={field}>
            <option value="all">All booking types</option>
            <option value="single">Single pass</option>
            <option value="group">Group pass</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={field}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className={field}>
            {PAYMENT_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={isoDate(anchor)}
            onChange={(e) => e.target.value && setAnchor(new Date(`${e.target.value}T00:00:00`))}
            className={field}
          />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Customer name"
              className="w-32 bg-transparent text-xs outline-none"
            />
          </span>
          <input
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            placeholder="Phone number"
            className={cn(field, "w-36")}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {(["pending", "confirmed", "completed", "cancelled", "expired"] as CalStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", STATUS_DOT[s])} /> {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </Panel>

      {view === "day" ? (
        <DayView
          slots={slots}
          lanes={lanes}
          date={isoDate(anchor)}
          bookings={filtered.filter((b) => b.booking_date === isoDate(anchor))}
          openMinutes={openMinutes}
          onOpen={setEditing}
          onDrop={requestMove}
        />
      ) : null}

      {view === "week" ? (
        <WeekView
          start={startOfWeek(anchor)}
          bookings={filtered}
          onOpen={setEditing}
          onDropDay={(booking, date) =>
            requestMove(booking, booking.station_id ?? "", date, (booking.start_time ?? "00:00").slice(0, 5))
          }
        />
      ) : null}

      {view === "month" ? (
        <MonthView
          anchor={anchor}
          bookings={filtered}
          onOpen={setEditing}
          onPickDay={(d) => {
            setAnchor(new Date(`${d}T00:00:00`));
            setView("day");
          }}
          onDropDay={(booking, date) =>
            requestMove(booking, booking.station_id ?? "", date, (booking.start_time ?? "00:00").slice(0, 5))
          }
        />
      ) : null}

      {editing ? (
        <BookingEditPanel
          booking={editing}
          stations={stations}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}

      {pending ? (
        <ModalPortal onClose={() => setPending(null)}>
          <Panel className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto bg-background">
            <h3 className="text-sm font-black tracking-tight">Move this booking?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {pending.booking.customer_name} · {pending.booking.reference}
            </p>
            <dl className="mt-4 space-y-2 text-xs">
              <Row
                label="Old time"
                value={`${pending.booking.booking_date} · ${prettyTime(pending.booking.start_time)} – ${prettyTime(pending.booking.end_time)}`}
              />
              <Row
                label="New time"
                value={`${pending.date} · ${prettyTime(pending.startTime)} – ${prettyTime(
                  clock(
                    toMinutes(pending.startTime) +
                      (toMinutes(pending.booking.end_time ?? "00:00") -
                        toMinutes(pending.booking.start_time ?? "00:00")),
                  ),
                )}`}
              />
              <Row label="Old console" value={pending.booking.gaming_stations?.name ?? "—"} />
              <Row label="New console" value={pending.stationName} />
            </dl>

            <div className="mt-5 flex gap-2">
              <AdminButton onClick={() => setPending(null)}>Cancel</AdminButton>
              <AdminButton variant="primary" disabled={moving} onClick={() => void confirmMove()}>
                {moving ? "Moving…" : "Confirm move"}
              </AdminButton>
            </div>
          </Panel>
        </ModalPortal>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/50 px-3 py-2">
      <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Card({
  booking,
  compact,
  onOpen,
}: {
  booking: CalBooking;
  compact?: boolean;
  onOpen: (b: CalBooking) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/booking", booking.id)}
      onClick={() => onOpen(booking)}
      className={cn(
        "h-full w-full cursor-grab overflow-hidden rounded-xl border px-2 py-1.5 text-left text-[0.65rem] leading-tight active:cursor-grabbing",
        STATUS_CLASS[booking.status as CalStatus],
      )}
    >
      <span className="block truncate font-bold">{booking.customer_name}</span>
      {compact ? null : (
        <>
          <span className="block truncate opacity-90">{booking.customer_phone}</span>
          <span className="block truncate opacity-90">
            {booking.gaming_stations?.name ?? "No console"} ·{" "}
            {booking.booking_type === "group" ? "Group" : "Single"}
          </span>
        </>
      )}
      <span className="block truncate opacity-90">
        {prettyTime(booking.start_time)} – {prettyTime(booking.end_time)}
      </span>
      <span className="block truncate opacity-80">
        {STATUS_LABEL[booking.status as CalStatus]} · {paymentStatus(booking)}
      </span>
    </button>
  );
}

function DayView({
  slots,
  lanes,
  date,
  bookings,
  openMinutes,
  onOpen,
  onDrop,
}: {
  slots: number[];
  lanes: CalStation[];
  date: string;
  bookings: CalBooking[];
  openMinutes: number;
  onOpen: (b: CalBooking) => void;
  onDrop: (b: CalBooking, stationId: string, date: string, startTime: string) => void;
}) {
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const unassigned = bookings.filter((b) => !b.station_id || !lanes.some((l) => l.id === b.station_id));

  return (
    <Panel className="overflow-x-auto p-3 sm:p-4">
      <div className="min-w-[720px]">
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `72px repeat(${Math.max(lanes.length, 1)}, minmax(150px, 1fr))` }}
        >
          <div className="sticky left-0 z-10 bg-surface/80 px-2 py-2 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Time
          </div>
          {lanes.map((l) => (
            <div
              key={l.id}
              className="truncate rounded-t-xl border-b border-border bg-surface/60 px-2 py-2 text-center text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
            >
              {l.name}
            </div>
          ))}
        </div>

        <div
          className="relative grid gap-px"
          style={{ gridTemplateColumns: `72px repeat(${Math.max(lanes.length, 1)}, minmax(150px, 1fr))` }}
        >
          <div>
            {slots.map((m) => (
              <div
                key={m}
                style={{ height: ROW_PX }}
                className="border-t border-border/60 px-2 text-[0.6rem] text-muted-foreground"
              >
                {clock(m)}
              </div>
            ))}
          </div>

          {lanes.map((lane) => (
            <div
              key={lane.id}
              className="relative"
              onDragOver={(e) => {
                // Allow dropping anywhere in the lane, including on top of other cards.
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/booking");
                const b = byId.get(id);
                if (!b) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const index = Math.max(
                  0,
                  Math.min(slots.length - 1, Math.floor((e.clientY - rect.top) / ROW_PX)),
                );
                onDrop(b, lane.id, date, clock(slots[index] ?? openMinutes));
              }}
            >
              {slots.map((m) => (
                <div
                  key={m}
                  style={{ height: ROW_PX }}
                  className="border-t border-l border-border/40 transition-colors hover:bg-primary/5"
                />
              ))}


              {bookings
                .filter((b) => b.station_id === lane.id && b.start_time && b.end_time)
                .map((b) => {
                  const s = toMinutes(b.start_time!);
                  const e = toMinutes(b.end_time!);
                  const top = ((s - openMinutes) / SLOT) * ROW_PX;
                  const height = Math.max(((e - s) / SLOT) * ROW_PX - 4, 30);
                  return (
                    <div key={b.id} className="absolute inset-x-1" style={{ top: Math.max(top, 0), height }}>
                      <Card booking={b} onOpen={onOpen} />
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {unassigned.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Food orders & passes (no console)
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {unassigned.map((b) => (
              <Card key={b.id} booking={b} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ) : null}

      {!bookings.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No bookings match these filters.</p>
      ) : null}
    </Panel>
  );
}

function WeekView({
  start,
  bookings,
  onOpen,
  onDropDay,
}: {
  start: Date;
  bookings: CalBooking[];
  onOpen: (b: CalBooking) => void;
  onDropDay: (b: CalBooking, date: string) => void;
}) {
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <Panel className="overflow-x-auto p-3 sm:p-4">
      <div className="grid min-w-[840px] grid-cols-7 gap-2">
        {days.map((d) => {
          const key = isoDate(d);
          const rows = bookings
            .filter((b) => b.booking_date === key)
            .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const b = byId.get(e.dataTransfer.getData("text/booking"));
                if (b) onDropDay(b, key);
              }}
              className="min-h-64 space-y-2 rounded-2xl border border-border bg-surface/50 p-2"
            >
              <p className="text-center text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              {rows.map((b) => (
                <Card key={b.id} booking={b} onOpen={onOpen} compact />
              ))}
              {!rows.length ? <p className="pt-6 text-center text-[0.65rem] text-muted-foreground">—</p> : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function MonthView({
  anchor,
  bookings,
  onOpen,
  onPickDay,
  onDropDay,
}: {
  anchor: Date;
  bookings: CalBooking[];
  onOpen: (b: CalBooking) => void;
  onPickDay: (date: string) => void;
  onDropDay: (b: CalBooking, date: string) => void;
}) {
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <Panel className="overflow-x-auto p-3 sm:p-4">
      <div className="grid min-w-[840px] grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <p key={d} className="text-center text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {d}
          </p>
        ))}
        {cells.map((d) => {
          const key = isoDate(d);
          const rows = bookings.filter((b) => b.booking_date === key);
          const inMonth = d.getMonth() === anchor.getMonth();
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const b = byId.get(e.dataTransfer.getData("text/booking"));
                if (b) onDropDay(b, key);
              }}
              className={cn(
                "min-h-28 space-y-1 rounded-2xl border border-border p-2",
                inMonth ? "bg-surface/50" : "bg-surface/20 opacity-60",
              )}
            >
              <button
                type="button"
                onClick={() => onPickDay(key)}
                className="text-[0.65rem] font-bold text-muted-foreground hover:text-foreground"
              >
                {d.getDate()}
              </button>
              {rows.slice(0, 3).map((b) => (
                <Card key={b.id} booking={b} onOpen={onOpen} compact />
              ))}
              {rows.length > 3 ? (
                <button
                  type="button"
                  onClick={() => onPickDay(key)}
                  className="text-[0.6rem] text-muted-foreground underline"
                >
                  +{rows.length - 3} more
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
