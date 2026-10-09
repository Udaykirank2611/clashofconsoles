import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Lightbulb } from "lucide-react";
import { getLostRevenue } from "@/lib/analytics.functions";
import { Panel, StatCard, money } from "../primitives";
import { Bars } from "./AnalyticsView";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 } as const;
const tip = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 12, color: "var(--foreground)" } as const;

export function LostRevenuePanel({ branchId }: { branchId: string | null }) {
  const fetchLost = useServerFn(getLostRevenue);
  const { data, isLoading } = useQuery({
    queryKey: ["lost-revenue", branchId],
    queryFn: () => fetchLost({ data: { branchId } }),
  });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-black tracking-tight">Lost Revenue</h2>
        <p className="text-xs text-muted-foreground">
          Estimated from the last 30 days of bookings. Idle time is measured against a 60% occupancy target.
        </p>
      </div>
      {isLoading || !data ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{isLoading ? "Calculating lost revenue…" : "No data"}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Today's lost revenue" value={money(data.today)} tone="bad" />
            <StatCard label="Weekly lost revenue" value={money(data.week)} tone="bad" hint="Last 7 days" />
            <StatCard label="Monthly lost revenue" value={money(data.month)} tone="bad" hint="Last 30 days" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Reasons">
              <ul className="space-y-2">
                {data.reasons.map((r) => (
                  <li key={r.reason} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{r.reason}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{r.tracked ? `${r.percent}% of loss` : "Not tracked yet — no check-in times recorded"}</p>
                    </div>
                    <p className="shrink-0 font-black">{r.tracked ? money(r.amount) : "—"}</p>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Lost revenue trend">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.trend} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={64} />
                  <Tooltip contentStyle={tip} formatter={(v: number) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area stackId="1" name="Idle / empty" dataKey="idle" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.3} />
                  <Area stackId="1" name="Cancelled / no-show" dataKey="cancelled" stroke="var(--pink)" fill="var(--pink)" fillOpacity={0.35} />
                  <Area stackId="1" name="Maintenance" dataKey="other" stroke="var(--violet)" fill="var(--violet)" fillOpacity={0.35} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Revenue lost by branch">
              <Bars rows={data.byBranch.map((r) => ({ label: r.name, value: r.value, display: money(r.value) }))} empty="No losses" />
            </Panel>
            <Panel title="Revenue lost by experience">
              <Bars rows={data.byExperience.map((r) => ({ label: r.name, value: r.value, display: money(r.value) }))} empty="No losses" />
            </Panel>
            <Panel title="Revenue lost by hour">
              <Bars rows={data.byHour.map((r) => ({ label: r.label, value: r.value, display: money(r.value) }))} empty="No losses" />
            </Panel>
          </div>

          <Panel title="Recommendations">
            <ul className="space-y-2">
              {data.recommendations.map((r) => (
                <li key={r} className="flex gap-2 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </section>
  );
}
