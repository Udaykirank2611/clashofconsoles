import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTodayOverview } from "@/lib/analytics.functions";
import type { AdminBooking, AdminStation } from "@/lib/admin/useBranchData";
import { Panel, Pill, StatCard, money } from "../primitives";
import { StatusPill } from "../BookingsPanel";
import { formatTime } from "@/lib/booking/pricing";

const isFood = (b: AdminBooking) => Number(b.session_amount) + Number(b.addons_amount) <= 0 && Number(b.food_amount) > 0;

/** Today's live operational status + today's bookings and food orders. */
export function TodayPanel({
  branchId,
  bookings,
  stations,
}: {
  branchId: string;
  bookings: AdminBooking[];
  stations: AdminStation[];
}) {
  const fetchToday = useServerFn(getTodayOverview);
  const { data } = useQuery({
    queryKey: ["today-overview", branchId],
    queryFn: () => fetchToday({ data: { branchId } }),
    refetchInterval: 20_000,
  });

  // Venue day in IST, so late-evening sessions stay on "today".
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const todays = useMemo(
    () => bookings.filter((b) => b.booking_date === today),
    [bookings, today],
  );
  const gamingRows = todays.filter((b) => !isFood(b));
  const foodRows = todays.filter(isFood);
  const branchStatus = data?.branches.find((b) => b.branchId === branchId) ?? data?.branches[0];

  return (
    <div className="space-y-6">
      <Panel
        title="Today's live overview"
        action={
          branchStatus ? (
            <Pill tone={branchStatus.open ? "good" : "muted"}>
              {branchStatus.open ? "Open now" : "Closed"} · {formatTime(branchStatus.opensAt)} –{" "}
              {formatTime(branchStatus.closesAt)}
            </Pill>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active sessions" value={data?.activeSessions ?? 0} tone="good" />
          <StatCard label="Upcoming today" value={data?.upcoming ?? 0} />
          <StatCard
            label="Payment verification"
            value={data?.pendingVerification ?? 0}
            tone={data?.pendingVerification ? "warn" : "default"}
          />
          <StatCard
            label="Pending food orders"
            value={data?.pendingFoodOrders ?? 0}
            tone={data?.pendingFoodOrders ? "warn" : "default"}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(branchStatus?.services ?? []).map((s) => (
            <div key={s.type} className="rounded-2xl border border-border bg-surface/50 p-4">
              <p className="text-sm font-bold">{s.type}</p>
              <p className="mt-1 text-2xl font-black tracking-tight">
                {s.available} / {s.total}
                <span className="ml-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  available
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.occupied} occupied · {s.maintenance} under maintenance
              </p>
            </div>
          ))}
          {!branchStatus?.services.length ? (
            <p className="text-sm text-muted-foreground">No stations set up for this branch yet.</p>
          ) : null}
        </div>
      </Panel>

      <TodayBookings rows={gamingRows} stations={stations} />
      <TodayFoodOrders rows={foodRows} />
    </div>
  );
}

function TodayBookings({ rows, stations }: { rows: AdminBooking[]; stations: AdminStation[] }) {
  const [status, setStatus] = useState("all");
  const [station, setStation] = useState("all");
  const filtered = rows
    .filter((b) => (status === "all" ? true : b.status === status))
    .filter((b) => (station === "all" ? true : b.station_id === station))
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));

  return (
    <Panel
      title="Today's gaming bookings"
      action={
        <div className="flex flex-wrap gap-2">
          <Select value={status} onChange={setStatus} options={["all", "pending", "payment_pending", "confirmed", "completed", "cancelled", "expired"]} />
          <select
            value={station}
            onChange={(e) => setStation(e.target.value)}
            className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] outline-none"
          >
            <option value="all">All consoles</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <ScrollTable
        head={["Ref", "Customer", "Phone", "Console", "Time", "Players", "Gaming", "Food", "Discount", "Final", "Status"]}
        empty="No gaming bookings today."
        rows={filtered.map((b) => [
          b.reference.replace("COC-", ""),
          b.customer_name,
          b.customer_phone,
          b.gaming_stations?.name ?? "—",
          b.start_time && b.end_time ? `${formatTime(b.start_time)} – ${formatTime(b.end_time)}` : "—",
          String(b.players),
          money(Number(b.session_amount) + Number(b.addons_amount)),
          money(b.food_amount),
          money(b.discount_amount + Number(b.student_discount_amount ?? 0)),
          money(b.total_amount),
          <StatusPill key="s" status={b.status} />,
        ])}
      />
    </Panel>
  );
}

function TodayFoodOrders({ rows }: { rows: AdminBooking[] }) {
  const [status, setStatus] = useState("all");
  const filtered = rows
    .filter((b) => (status === "all" ? true : b.status === status))
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  return (
    <Panel
      title="Today's food orders"
      action={<Select value={status} onChange={setStatus} options={["all", "pending", "payment_pending", "confirmed", "completed", "cancelled"]} />}
    >
      <ScrollTable
        head={["Order", "Customer", "Phone", "Items", "Qty", "Subtotal", "Discount", "Final", "Status", "Ordered"]}
        empty="No food-only orders today."
        rows={filtered.map((b) => {
          const items = b.booking_items.filter((i) => i.kind === "food");
          return [
            b.reference.replace("COC-", ""),
            b.customer_name,
            b.customer_phone,
            items.map((i) => `${i.quantity}× ${i.label}`).join(", ") || "—",
            String(items.reduce((s, i) => s + i.quantity, 0)),
            money(b.food_amount),
            money(b.discount_amount),
            money(b.total_amount),
            <StatusPill key="s" status={b.status} />,
            new Date(b.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
          ];
        })}
      />
    </Panel>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "all" ? "All statuses" : o.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}

export function ScrollTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: (string | React.ReactNode)[][];
  empty: string;
}) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-border pb-2 pr-4 text-left text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="whitespace-nowrap py-2.5 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
