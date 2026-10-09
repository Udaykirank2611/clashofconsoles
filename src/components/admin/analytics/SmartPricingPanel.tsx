import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getSmartPricing } from "@/lib/analytics.functions";
import { HOURS, TYPE_LABELS, WEEKDAYS, computeSmartPricing, hourName } from "@/lib/analytics/smart-pricing";
import { Panel, StatCard, money } from "../primitives";
import { Bars } from "./AnalyticsView";
import { cn } from "@/lib/utils";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 } as const;
const tip = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 12, color: "var(--foreground)" } as const;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const DEMAND_TONE = { high: "good", normal: "default", moderate: "warn", low: "bad" } as const;

export function SmartPricingPanel({ branchId }: { branchId: string | null }) {
  const fetchSmart = useServerFn(getSmartPricing);
  const { data, isLoading } = useQuery({
    queryKey: ["smart-pricing", branchId],
    queryFn: () => fetchSmart({ data: { branchId } }),
  });
  const [type, setType] = useState<string>("all");
  const [days, setDays] = useState(28);

  const result = useMemo(() => {
    if (!data) return null;
    const from = new Date(new Date(`${data.today}T00:00:00Z`).getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    return computeSmartPricing(data, { type, from, to: data.today });
  }, [data, type, days]);

  const types = data ? Object.keys(data.capacity) : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight">Smart Pricing Insights</h2>
          <p className="text-xs text-muted-foreground">Suggestions only — prices are never changed automatically.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
            <option value="all">All experiences</option>
            {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
          </select>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
            <option value={7}>Last 7 days</option>
            <option value={28}>Last 4 weeks</option>
            <option value={90}>Last 3 months</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {isLoading || !result ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{isLoading ? "Analysing demand…" : "No data"}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Today's occupancy" value={pct(result.kpis.occupancy)} />
            <StatCard label="Today's revenue" value={money(result.kpis.todayRevenue)} tone="good" />
            <StatCard label="Today's bookings" value={result.kpis.todayBookings} />
            <StatCard label="Predicted end of day" value={money(result.kpis.predictedEod)} />
            <StatCard label="Suggested offer" value={result.kpis.activeOffer} tone={result.promo ? "warn" : "default"} />
            <StatCard label="Extra revenue" value={money(result.kpis.extraRevenue)} tone="good" hint="If offer runs" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title={`Right now · ${result.slot.name}`}>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Current occupancy" value={pct(result.slot.current)} tone={DEMAND_TONE[result.slot.demand]} hint={`Demand: ${result.slot.demand}`} />
                <StatCard label="Usual occupancy" value={pct(result.slot.average)} hint="Same weekday & hour" />
                <StatCard label="Expected occupancy" value={pct(result.impact.expectedOcc)} />
                <StatCard label="Confidence" value={result.impact.confidence} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{result.reason}</p>
            </Panel>
            <Panel title="Occupancy & revenue trend">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={result.trend} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis yAxisId="l" tick={axis} tickLine={false} axisLine={false} width={40} unit="%" />
                  <YAxis yAxisId="r" orientation="right" tick={axis} tickLine={false} axisLine={false} width={56} />
                  <Tooltip contentStyle={tip} />
                  <Line yAxisId="l" name="Occupancy %" dataKey="occupancy" stroke="var(--cyan)" dot={false} strokeWidth={2} />
                  <Line yAxisId="r" name="Revenue ₹" dataKey="revenue" stroke="var(--pink)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <Panel title="Occupancy heatmap">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[0.65rem]">
                <thead>
                  <tr>
                    <th />
                    {HOURS.map((h) => <th key={h} className="font-semibold text-muted-foreground">{hourName(h)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAYS.map((d, w) => (
                    <tr key={d}>
                      <td className="pr-2 font-semibold text-muted-foreground">{d.slice(0, 3)}</td>
                      {HOURS.map((h, i) => {
                        const v = result.heat[w]?.[i] ?? 0;
                        return (
                          <td key={h} title={`${d} ${hourName(h)}: ${pct(v)}`} className="h-7 rounded-md text-center font-bold" style={{ background: `color-mix(in oklab, var(--pink) ${Math.round(v * 100)}%, var(--muted))` }}>
                            {Math.round(v * 100)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Bookings by hour">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.byHour} margin={{ left: -20, right: 4 }}>
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={1} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip contentStyle={tip} />
                  <Bar dataKey="bookings" fill="var(--cyan)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Bookings by weekday">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.byWeekday} margin={{ left: -20, right: 4 }}>
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip contentStyle={tip} />
                  <Bar dataKey="bookings" fill="var(--pink)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Revenue by experience">
              <Bars rows={result.revenueByExperience.map((r) => ({ label: r.name, value: r.value, display: money(r.value) }))} empty="No bookings" />
            </Panel>
          </div>

          <Panel title="Occupancy distribution">
            <div className={cn("grid gap-3 sm:grid-cols-4")}>
              {result.distribution.map((d) => (
                <StatCard key={d.name} label={d.name} value={`${d.value ?? 0} hrs`} />
              ))}
            </div>
          </Panel>
        </>
      )}
    </section>
  );
}
