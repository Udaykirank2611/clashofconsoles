import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalPortal } from "../ModalPortal";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Download, FileSpreadsheet, FileText, History, RefreshCw } from "lucide-react";
import { closeBusinessDay, getDailyClosing, listClosingReports } from "@/lib/closing.functions";
import type { ClosingReportRow, DailyClosingSummary } from "@/lib/closing/types";
import { AdminButton, Panel, StatCard, money } from "../primitives";
import { closingRows, exportClosingCsv, exportClosingPdf, exportClosingXlsx } from "./exports";
import { cn } from "@/lib/utils";

const field =
  "rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs outline-none focus:border-cyan/50";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Mode = "today" | "history";

export function DailyClosingView({
  branches,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  defaultBranchId: string | null;
}) {
  const [mode, setMode] = useState<Mode>("today");
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  const [date, setDate] = useState(() => iso(new Date()));

  // Follow the admin console's main branch selector.
  useEffect(() => {
    if (defaultBranchId) setBranchId(defaultBranchId);
  }, [defaultBranchId]);
  const [summary, setSummary] = useState<DailyClosingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState(false);

  const fetchSummary = useServerFn(getDailyClosing);
  const doClose = useServerFn(closeBusinessDay);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const res = await fetchSummary({ data: { branchId, date } });
    setSummary(res);
    setNotes(res?.closed?.notes ?? "");
    setLoading(false);
  }, [branchId, date, fetchSummary]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitClose = async () => {
    setClosing(true);
    const res = await doClose({ data: { branchId, date, notes } });
    setClosing(false);
    if (!res.ok) {
      toast.error(res.message ?? "Could not close the day.");
      return;
    }
    toast.success("Business day closed. The report is saved in Daily Closing History.");
    setConfirming(false);
    void load();
  };

  const t = summary?.totals;

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(
              [
                ["today", "Daily closing", CalendarCheck],
                ["history", "Closing history", History],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] transition-colors",
                  mode === id
                    ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground"
                    : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>

          {mode === "today" ? (
            <div className="flex flex-wrap items-center gap-2">
              {branches.length > 1 ? (
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={field}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              <AdminButton onClick={() => void load()}>
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
              </AdminButton>
            </div>
          ) : null}
        </div>
      </Panel>

      {mode === "history" ? (
        <ClosingHistory branches={branches} defaultBranchId={branchId} />
      ) : loading ? (
        <Panel>
          <p className="py-10 text-center text-sm text-muted-foreground">Building the day's summary…</p>
        </Panel>
      ) : !summary || !t ? (
        <Panel>
          <p className="py-10 text-center text-sm text-muted-foreground">
            You do not have access to this branch's closing report.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="Summary">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total bookings" value={t.totalBookings} />
              <StatCard label="Completed" value={t.completedBookings} tone="good" />
              <StatCard label="Cancelled" value={t.cancelledBookings} tone="bad" />
              <StatCard label="Pending" value={t.pendingBookings} tone="warn" />
              <StatCard label="Total customers" value={t.totalCustomers} />
              <StatCard label="Walk-in customers" value={t.walkInCustomers} />
              <StatCard label="Website bookings" value={t.websiteBookings} />
              <StatCard label="Gaming revenue" value={money(t.gamingRevenue)} />
              <StatCard label="Food revenue" value={money(t.foodRevenue)} />
              <StatCard label="Membership revenue" value={money(t.membershipRevenue)} />
              <StatCard label="Coupon discounts" value={money(t.couponDiscounts)} tone="warn" />
              <StatCard label="Student discounts" value={money(t.studentDiscounts)} tone="warn" />
              <StatCard label="Cash revenue" value={money(t.cashRevenue)} />
              <StatCard label="UPI revenue" value={money(t.upiRevenue)} />
              <StatCard label="Total revenue" value={money(t.totalRevenue)} tone="good" />
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Popular services">
              <dl className="space-y-2 text-sm">
                <Line label="Most booked console" value={summary.popular.console} />
                <Line label="Most played game" value={summary.popular.game} />
                <Line label="Most ordered food" value={summary.popular.food} />
                <Line label="Most used coupon" value={summary.popular.coupon} />
                <Line label="Most popular membership" value={summary.popular.membership} />
              </dl>
            </Panel>
            <Panel title="Business insights">
              <dl className="space-y-2 text-sm">
                <Line label="Peak booking hour" value={summary.insights.peakHour} />
                <Line label="Average booking duration" value={`${summary.insights.avgDurationMinutes} min`} />
                <Line label="Average customer spend" value={money(summary.insights.avgCustomerSpend)} />
                <Line label="Most active branch" value={summary.insights.mostActiveBranch} />
                <Line label="Console utilisation" value={`${summary.insights.consoleUtilization}%`} />
              </dl>
            </Panel>
          </div>

          <Panel title="Export & close">
            <div className="flex flex-wrap items-center gap-2">
              <AdminButton onClick={() => exportClosingPdf(summary)}>
                <FileText className="size-3.5" /> PDF
              </AdminButton>
              <AdminButton onClick={() => void exportClosingXlsx(summary)}>
                <FileSpreadsheet className="size-3.5" /> Excel
              </AdminButton>
              <AdminButton onClick={() => exportClosingCsv(summary)}>
                <Download className="size-3.5" /> CSV
              </AdminButton>
              <span className="grow" />
              <AdminButton variant="primary" onClick={() => setConfirming(true)}>
                Close business day
              </AdminButton>
            </div>
            {summary.closed ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Already closed on {new Date(summary.closed.closedAt).toLocaleString("en-IN")}
                {summary.closed.closedBy ? ` by ${summary.closed.closedBy}` : ""}. Closing again refreshes the saved
                report.
              </p>
            ) : null}
          </Panel>

          {confirming ? (
            <ModalPortal onClose={() => setConfirming(false)}>
              <Panel className="mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto">
                <h3 className="text-sm font-black tracking-tight">Close business day?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.branchName} · {summary.date} · {t.totalBookings} bookings ·{" "}
                  {money(t.totalRevenue)} revenue
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Notes for this day (optional)"
                  className="mt-4 w-full rounded-2xl border border-border bg-surface/70 px-3 py-2 text-xs outline-none focus:border-cyan/50"
                />
                <div className="mt-4 flex gap-2">
                  <AdminButton onClick={() => setConfirming(false)}>Cancel</AdminButton>
                  <AdminButton variant="primary" disabled={closing} onClick={() => void submitClose()}>
                    {closing ? "Saving…" : "Confirm & close"}
                  </AdminButton>
                </div>
              </Panel>
            </ModalPortal>
          ) : null}
        </>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/50 px-3 py-2">
      <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

type Period = "date" | "week" | "month" | "quarter" | "year";

function periodRange(period: Period, day: string) {
  const d = new Date(`${day}T00:00:00`);
  if (period === "date") return { from: day, to: day };
  if (period === "week") {
    const s = new Date(d);
    s.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return { from: iso(s), to: iso(e) };
  }
  if (period === "month")
    return {
      from: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
      to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    };
  if (period === "quarter") {
    const q = Math.floor(d.getMonth() / 3) * 3;
    return { from: iso(new Date(d.getFullYear(), q, 1)), to: iso(new Date(d.getFullYear(), q + 3, 0)) };
  }
  return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` };
}

function ClosingHistory({
  branches,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  defaultBranchId: string;
}) {
  const [branchId, setBranchId] = useState<string>(defaultBranchId);

  useEffect(() => {
    setBranchId(defaultBranchId);
  }, [defaultBranchId]);
  const [period, setPeriod] = useState<Period>("month");
  const [day, setDay] = useState(() => iso(new Date()));
  const [rows, setRows] = useState<ClosingReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<ClosingReportRow | null>(null);
  const fetchRows = useServerFn(listClosingReports);

  const range = useMemo(() => periodRange(period, day), [period, day]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchRows({
      data: { branchId: branchId === "all" ? null : branchId, from: range.from, to: range.to },
    }).then((res) => {
      if (!alive) return;
      setRows(res);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [branchId, range.from, range.to, fetchRows]);

  return (
    <Panel title="Daily closing history">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={field}>
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={field}>
          <option value="date">By date</option>
          <option value="week">By week</option>
          <option value="month">By month</option>
          <option value="quarter">By quarter</option>
          <option value="year">By year</option>
        </select>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={field} />
        <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          {range.from} → {range.to}
        </span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading reports…</p>
      ) : !rows.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No closing reports for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="py-2">Date</th>
                <th>Branch</th>
                <th>Bookings</th>
                <th>Revenue</th>
                <th>Closed at</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2 font-semibold">{r.reportDate}</td>
                  <td>{r.branchName}</td>
                  <td>{r.totalBookings}</td>
                  <td className="font-semibold">{money(r.totalRevenue)}</td>
                  <td className="text-muted-foreground">
                    {new Date(r.closedAt).toLocaleString("en-IN")}
                    {r.closedByEmail ? ` · ${r.closedByEmail}` : ""}
                  </td>
                  <td className="text-right">
                    <AdminButton onClick={() => setOpen(r)}>Open</AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <ModalPortal onClose={() => setOpen(null)}>
          <Panel className="mx-auto max-h-[88dvh] w-full max-w-lg overflow-y-auto">
            <h3 className="text-sm font-black tracking-tight">
              {open.branchName} · {open.reportDate}
            </h3>
            {open.notes ? <p className="mt-1 text-xs text-muted-foreground">{open.notes}</p> : null}
            <dl className="mt-4 space-y-1.5 text-xs">
              {open.summary
                ? closingRows(open.summary).map(([k, v]) => (
                    <Line key={k} label={k} value={String(v)} />
                  ))
                : (
                    [
                      ["Total bookings", open.totalBookings],
                      ["Total revenue", money(open.totalRevenue)],
                    ] as [string, string | number][]
                  ).map(([k, v]) => <Line key={k} label={k} value={String(v)} />)}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {open.summary ? (
                <>
                  <AdminButton onClick={() => open.summary && exportClosingPdf(open.summary)}>
                    <FileText className="size-3.5" /> PDF
                  </AdminButton>
                  <AdminButton onClick={() => open.summary && void exportClosingXlsx(open.summary)}>
                    <FileSpreadsheet className="size-3.5" /> Excel
                  </AdminButton>
                  <AdminButton onClick={() => open.summary && exportClosingCsv(open.summary)}>
                    <Download className="size-3.5" /> CSV
                  </AdminButton>
                </>
              ) : null}
              <span className="grow" />
              <AdminButton onClick={() => setOpen(null)}>Close</AdminButton>
            </div>
          </Panel>
        </ModalPortal>
      ) : null}
    </Panel>
  );
}
