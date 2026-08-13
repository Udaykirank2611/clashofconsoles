import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAnalytics } from "@/lib/analytics.functions";
import { Panel, StatCard, money } from "../primitives";
import { ScopeBar } from "./ScopeBar";
import { useAnalyticsScope } from "./scope";
import { BookingTrendChart, RevenueChart, SplitPie, groupSeries } from "./charts";
import { ScrollTable } from "./TodayPanel";
import { cn } from "@/lib/utils";

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const hourLabel = (h: number) =>
  `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"} – ${(h + 1) % 12 === 0 ? 12 : (h + 1) % 12} ${h + 1 < 12 || h + 1 === 24 ? "AM" : "PM"}`;

export function AnalyticsView({
  branches,
  isOwner,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  isOwner: boolean;
  defaultBranchId: string | null;
}) {
  const scope = useAnalyticsScope(isOwner ? null : defaultBranchId);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const fetchAnalytics = useServerFn(getAnalytics);

  const { data, isFetching } = useQuery({
    queryKey: ["analytics", scope.branchId, scope.range.from, scope.range.to],
    queryFn: () => fetchAnalytics({ data: { branchId: scope.branchId, ...scope.range } }),
  });

  const series = data ? groupSeries(data.series, granularity) : [];

  return (
    <div className="space-y-6">
      <ScopeBar scope={scope} branches={branches} allowAllBranches={isOwner}>
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </ScopeBar>

      {!data ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading analytics…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total revenue" value={money(data.kpis.totalRevenue)} tone="good" hint="Confirmed + completed only" />
            <StatCard label="Gaming revenue" value={money(data.kpis.gamingRevenue)} />
            <StatCard label="Food revenue" value={money(data.kpis.foodRevenue)} />
            <StatCard label="Pending / unpaid" value={money(data.kpis.pendingAmount)} tone="warn" hint="Not counted as revenue" />
            <StatCard label="Gaming bookings" value={data.kpis.gamingBookings} />
            <StatCard label="Food orders" value={data.kpis.foodOrders} />
            <StatCard label="Completed" value={data.kpis.completed} tone="good" />
            <StatCard label="Cancelled" value={data.kpis.cancelled} tone={data.kpis.cancelled ? "bad" : "default"} />
            <StatCard label="Pending" value={data.kpis.pending} tone="warn" />
            <StatCard label="Expired" value={data.kpis.expired} />
            <StatCard label="Avg booking value" value={money(data.kpis.avgValue)} />
            <StatCard label="UTR submitted" value={data.payments.utrSubmitted} />
          </div>

          <Panel
            title="Revenue overview"
            action={
              <div className="flex gap-1.5">
                {(["daily", "weekly", "monthly"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGranularity(g)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]",
                      granularity === g
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            }
          >
            <RevenueChart data={series} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Gaming vs food">
              <SplitPie gaming={data.kpis.gamingRevenue} food={data.kpis.foodRevenue} />
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-border bg-surface/50 p-3">
                  <p className="font-bold">{money(data.kpis.gamingRevenue)}</p>
                  <p className="text-xs text-muted-foreground">
                    Gaming · {pct(data.kpis.gamingRevenue, data.kpis.totalRevenue)}%
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface/50 p-3">
                  <p className="font-bold">{money(data.kpis.foodRevenue)}</p>
                  <p className="text-xs text-muted-foreground">
                    Food · {pct(data.kpis.foodRevenue, data.kpis.totalRevenue)}%
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title="Booking trend">
              <BookingTrendChart data={series} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Peak hours">
              <Bars
                rows={data.peakHours
                  .filter((h) => h.bookings > 0)
                  .map((h) => ({ label: hourLabel(h.hour), value: h.bookings, display: `${h.bookings}` }))}
                empty="No timed bookings in this range."
              />
            </Panel>

            <Panel title="Console utilisation">
              <Bars
                rows={data.utilization.map((u) => ({
                  label: `${u.name}${u.branch && !scope.branchId ? ` · ${u.branch}` : ""}${u.status !== "available" ? " (out of service)" : ""}`,
                  value: u.utilization,
                  display: `${u.utilization}%`,
                }))}
                empty="No stations configured."
              />
            </Panel>
          </div>

          <Panel title="Service performance">
            <ScrollTable
              head={["Service", "Bookings", "Gaming hours", "Revenue", "Avg value"]}
              empty="No gaming activity in this range."
              rows={data.services.map((s) => [s.type, String(s.bookings), `${s.hours} h`, money(s.revenue), money(s.avgValue)])}
            />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Food analytics">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Food revenue" value={money(data.food.revenue)} />
                <StatCard label="Orders" value={data.food.orders} />
                <StatCard label="Avg order" value={money(data.food.avgOrderValue)} />
              </div>
              <h3 className="mt-5 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Top 10 by quantity
              </h3>
              <ScrollTable
                head={["Item", "Category", "Qty", "Revenue"]}
                empty="No food sold in this range."
                rows={data.food.topByQuantity.map((f) => [f.name, f.category, String(f.quantity), money(f.revenue)])}
              />
              <h3 className="mt-5 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Top 10 by revenue
              </h3>
              <ScrollTable
                head={["Item", "Category", "Qty", "Revenue"]}
                empty="No food sold in this range."
                rows={data.food.topByRevenue.map((f) => [f.name, f.category, String(f.quantity), money(f.revenue)])}
              />
            </Panel>

            <Panel title="Category performance">
              <Bars
                rows={data.food.categories.map((c) => ({
                  label: c.category,
                  value: pct(c.revenue, data.food.revenue),
                  display: money(c.revenue),
                }))}
                empty="No food categories sold yet."
              />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Customers">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Unique customers" value={data.customers.unique} />
                <StatCard label="New" value={data.customers.newCustomers} />
                <StatCard label="Returning" value={data.customers.returning} />
                <StatCard label="Completed visits" value={data.customers.completedVisits} />
                <StatCard label="Repeat rate" value={`${data.customers.repeatRate}%`} />
                <StatCard label="1 visit from reward" value={data.customers.approachingReward} tone="warn" />
              </div>
            </Panel>

            <Panel title="Loyalty">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Rewards earned" value={data.loyalty.earned} />
                <StatCard label="Redeemed" value={data.loyalty.redeemed} tone="good" />
                <StatCard label="Available" value={data.loyalty.available} tone="warn" />
              </div>
              <div className="mt-4">
                <Bars
                  rows={data.customers.buckets.map((b) => ({
                    label: b.label,
                    value: pct(b.customers, data.customers.unique),
                    display: String(b.customers),
                  }))}
                  empty="No customer visits yet."
                />
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Coupons">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Coupons created" value={data.coupons.created} />
                <StatCard label="Redeemed" value={data.coupons.redeemed} />
                <StatCard label="Discount given" value={money(data.coupons.discount)} />
                <StatCard label="Gaming coupons" value={money(data.coupons.byCategory.gaming)} />
                <StatCard label="Food coupons" value={money(data.coupons.byCategory.food)} />
                <StatCard label="Entire bill" value={money(data.coupons.byCategory.entire_bill)} />
              </div>
              <div className="mt-4">
                <ScrollTable
                  head={["Code", "Applies to", "Uses", "Discount"]}
                  empty="No coupon redemptions in this range."
                  rows={data.coupons.top.map((c) => [
                    c.code,
                    c.category.replace("_", " "),
                    String(c.uses),
                    money(c.discount),
                  ])}
                />
              </div>
            </Panel>

            <Panel title="Student discount & memberships">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Student discounts" value={data.student.uses} />
                <StatCard label="Student amount" value={money(data.student.amount)} />
                <StatCard label="Gaming after discount" value={money(data.student.gamingRevenueAfter)} />
                <StatCard label="Passes sold" value={data.memberships.sold} />
                <StatCard label="Pass revenue" value={money(data.memberships.revenue)} />
                <StatCard label="Most popular plan" value={data.memberships.topPlan ?? "—"} />
              </div>
            </Panel>
          </div>

          <Panel title="Payments">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Confirmed revenue" value={money(data.payments.confirmedRevenue)} tone="good" />
              <StatCard label="Verification pending" value={data.payments.pendingVerification} tone="warn" />
              <StatCard label="Awaiting payment" value={data.payments.awaitingPayment} />
              <StatCard label="Rejected / cancelled" value={data.payments.rejected} tone="bad" />
              <StatCard label="Expired" value={data.payments.expired} />
              <StatCard label="UTR submitted" value={data.payments.utrSubmitted} />
            </div>
          </Panel>

          {!scope.branchId && data.branchComparison.length > 1 ? (
            <Panel title="Branch comparison">
              <ScrollTable
                head={[
                  "Branch",
                  "Revenue",
                  "Gaming",
                  "Food",
                  "Bookings",
                  "Food orders",
                  "Avg value",
                  "Gaming hours",
                  "Utilisation",
                  "Visits",
                ]}
                empty="No branch data."
                rows={data.branchComparison.map((b) => [
                  b.branch,
                  money(b.revenue),
                  money(b.gaming),
                  money(b.food),
                  String(b.bookings),
                  String(b.foodOrders),
                  money(b.avgBookingValue),
                  `${b.gamingHours} h`,
                  `${b.utilization}%`,
                  String(b.visits),
                ])}
              />
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}

function Bars({
  rows,
  empty,
}: {
  rows: { label: string; value: number; display: string }[];
  empty: string;
}) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`} className="grid grid-cols-[minmax(96px,34%)_1fr_auto] items-center gap-3">
          <span className="truncate text-xs text-muted-foreground">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted/50">
            <span
              className="block h-full rounded-full bg-linear-to-r from-primary via-cyan to-violet"
              style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-xs font-bold">{r.display}</span>
        </li>
      ))}
    </ul>
  );
}
