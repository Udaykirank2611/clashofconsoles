import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint } from "@/lib/analytics/types";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 } as const;

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  fontSize: 12,
  color: "var(--foreground)",
} as const;

export function RevenueChart({ data }: { data: { label: string; gaming: number; food: number; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gGaming" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gFood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={64} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" name="Gaming" dataKey="gaming" stroke="var(--primary)" fill="url(#gGaming)" strokeWidth={2} />
        <Area type="monotone" name="Food" dataKey="food" stroke="var(--cyan)" fill="url(#gFood)" strokeWidth={2} />
        <Area type="monotone" name="Total" dataKey="total" stroke="var(--violet)" fill="transparent" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BookingTrendChart({ data }: { data: { label: string; completed: number; cancelled: number; pending: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.25 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar name="Completed" dataKey="completed" stackId="s" fill="var(--primary)" radius={[0, 0, 0, 0]} />
        <Bar name="Pending" dataKey="pending" stackId="s" fill="var(--cyan)" />
        <Bar name="Cancelled" dataKey="cancelled" stackId="s" fill="var(--violet)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SplitPie({ gaming, food }: { gaming: number; food: number }) {
  const data = [
    { name: "Gaming", value: Math.max(0, gaming) },
    { name: "Food", value: Math.max(0, food) },
  ];
  const colors = ["var(--primary)", "var(--cyan)"];
  if (!data.some((d) => d.value > 0)) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No revenue in this range yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Groups daily points into the requested granularity for the revenue chart. */
export function groupSeries(series: DayPoint[], mode: "daily" | "weekly" | "monthly") {
  if (mode === "daily") {
    return series.map((p) => ({ ...p, label: p.date.slice(5) }));
  }
  const buckets = new Map<string, DayPoint & { label: string }>();
  for (const p of series) {
    const d = new Date(`${p.date}T00:00:00`);
    let key: string;
    if (mode === "monthly") key = p.date.slice(0, 7);
    else {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      key = monday.toISOString().slice(0, 10);
    }
    const row = buckets.get(key) ?? { ...p, label: key, gaming: 0, food: 0, total: 0, bookings: 0, completed: 0, cancelled: 0, expired: 0, pending: 0 };
    row.gaming += p.gaming;
    row.food += p.food;
    row.total += p.total;
    row.bookings += p.bookings;
    row.completed += p.completed;
    row.cancelled += p.cancelled;
    row.expired += p.expired;
    row.pending += p.pending;
    buckets.set(key, row);
  }
  return [...buckets.values()];
}

/** UPI vs Cash revenue for the selected branch + date range. */
export function PaymentModeChart({
  upi,
  cash,
  unrecorded,
}: {
  upi: number;
  cash: number;
  unrecorded: number;
}) {
  const data = [
    { label: "UPI", revenue: upi },
    { label: "Cash", revenue: cash },
    { label: "Not recorded", revenue: unrecorded },
  ];
  if (!data.some((d) => d.revenue > 0)) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No approved payments in this range yet.</p>;
  }
  const colors = ["var(--primary)", "var(--cyan)", "var(--violet)"];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={64} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} cursor={{ fill: "var(--muted)", opacity: 0.25 }} />
        <Bar name="Revenue" dataKey="revenue" radius={[8, 8, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CashflowChart({ data }: { data: { label: string; deposits: number; expenses: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={64} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar name="Deposits" dataKey="deposits" fill="var(--cyan)" radius={[6, 6, 0, 0]} />
        <Bar name="Expenses" dataKey="expenses" fill="var(--pink)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SplitBars({ data }: { data: { name: string; deposits: number; expenses: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={axis} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={96} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar name="Deposits" dataKey="deposits" fill="var(--cyan)" radius={[0, 6, 6, 0]} />
        <Bar name="Expenses" dataKey="expenses" fill="var(--pink)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
