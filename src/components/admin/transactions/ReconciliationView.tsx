import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { getReconciliation } from "@/lib/transactions.functions";
import type { ReconciliationIssueKind, ReconciliationPayload } from "@/lib/transactions/types";
import { inr } from "@/lib/reporting/format";
import { AdminButton, Panel, StatCard } from "../primitives";
import { cn } from "@/lib/utils";

const field =
  "rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs outline-none focus:border-cyan/50";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const KIND_LABEL: Record<ReconciliationIssueKind, string> = {
  missing_ledger: "Missing ledger entry",
  amount_mismatch: "Amount mismatch",
  unrecorded_payment: "Payment not recorded",
  mode_mismatch: "Payment mode mismatch",
  status_mismatch: "Status mismatch",
};

export function ReconciliationView({
  branches,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  defaultBranchId: string | null;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  useEffect(() => setBranchId(defaultBranchId ?? branches[0]?.id ?? ""), [defaultBranchId, branches]);
  const [from, setFrom] = useState(() => iso(new Date()));
  const [to, setTo] = useState(() => iso(new Date()));
  const [kind, setKind] = useState<"all" | ReconciliationIssueKind>("all");
  const [data, setData] = useState<ReconciliationPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useServerFn(getReconciliation);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchData({
      data: { branchId: branchId === "all" ? null : branchId, from, to },
    });
    setData(res);
    setLoading(false);
  }, [branchId, from, to, fetchData]);

  useEffect(() => {
    void load();
  }, [load]);

  const issues = useMemo(
    () => (data?.issues ?? []).filter((i) => kind === "all" || i.kind === kind),
    [data, kind],
  );

  const t = data?.totals;
  const c = data?.cash;
  const balanced = !!t && t.issueCount === 0 && Math.abs(t.variance) < 1;

  return (
    <div className="space-y-6">
      <Panel title="Reconciliation">
        <div className="flex flex-wrap items-center gap-2">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={field}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value="all">All branches</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className={field}
          >
            <option value="all">All issues</option>
            {(Object.keys(KIND_LABEL) as ReconciliationIssueKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <AdminButton onClick={() => void load()}>
            <RefreshCw className="size-3.5" /> Refresh
          </AdminButton>
        </div>
      </Panel>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Reconciling…</p>
      ) : !t || !c ? null : (
        <>
          <div
            className={cn(
              "flex items-center gap-3 rounded-3xl border px-5 py-4 text-sm",
              balanced
                ? "border-emerald-400/40 bg-emerald-400/5 text-emerald-300"
                : "border-amber-400/40 bg-amber-400/5 text-amber-300",
            )}
          >
            {balanced ? (
              <ShieldCheck className="size-5 shrink-0" />
            ) : (
              <TriangleAlert className="size-5 shrink-0" />
            )}
            <span>
              {balanced
                ? `All ${t.bookingsCount} confirmed bookings match the ledger for ${data.branchName}.`
                : `${t.issueCount} of ${t.bookingsCount} confirmed bookings need attention · variance ${inr(t.variance)}.`}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Confirmed bookings" value={t.bookingsCount} hint={`${t.matchedCount} reconciled`} />
            <StatCard label="Bookings total" value={inr(t.bookingsTotal)} />
            <StatCard label="Ledger recorded" value={inr(t.ledgerTotal)} />
            <StatCard
              label="Variance"
              value={inr(t.variance)}
              tone={Math.abs(t.variance) < 1 ? "good" : "bad"}
              hint={`${t.missingLedgerCount} missing ledger entries`}
            />
          </div>

          <Panel title="Cash & bank check">
            <div className="grid gap-4 sm:grid-cols-2">
              <Ledger
                title="Cash"
                rows={[
                  ["Opening cash", c.openingCash],
                  ["Cash collected (ledger)", c.cashReceived],
                  ["Cash expenses", -c.expensesCash],
                ]}
                total={["Expected closing cash", c.expectedClosingCash]}
              />
              <Ledger
                title="Bank / UPI"
                rows={[
                  ["Opening bank", c.openingBank],
                  ["UPI collected (ledger)", c.upiReceived],
                  ["Bank expenses", -c.expensesBank],
                ]}
                total={["Expected closing bank", c.expectedClosingBank]}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Ledger collections ({inr(t.ledgerCash + t.ledgerUpi)}) vs confirmed bookings ({inr(t.bookingsTotal)})
              — difference {inr(t.variance)}.
            </p>
          </Panel>

          <Panel title={`Discrepancies (${issues.length})`}>
            {!issues.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nothing to reconcile in this window.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Booking</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Branch</th>
                      <th className="px-3 py-2">Issue</th>
                      <th className="px-3 py-2 text-right">Booking</th>
                      <th className="px-3 py-2 text-right">Ledger</th>
                      <th className="px-3 py-2 text-right">Difference</th>
                      <th className="px-3 py-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((i) => (
                      <tr key={`${i.bookingId}-${i.kind}`} className="border-t border-border/60">
                        <td className="px-3 py-2 whitespace-nowrap">{i.date}</td>
                        <td className="px-3 py-2 font-semibold">{i.reference}</td>
                        <td className="px-3 py-2">{i.customer}</td>
                        <td className="px-3 py-2">{i.branch}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-amber-300">
                            {KIND_LABEL[i.kind]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{inr(i.bookingAmount)}</td>
                        <td className="px-3 py-2 text-right">{inr(i.ledgerAmount)}</td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right font-bold",
                            Math.abs(i.difference) >= 1 ? "text-rose-300" : "text-muted-foreground",
                          )}
                        >
                          {inr(i.difference)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{i.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Ledger({
  title,
  rows,
  total,
}: {
  title: string;
  rows: [string, number][];
  total: [string, number];
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-muted-foreground">{title}</p>
      <ul className="mt-3 space-y-2 text-xs">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{inr(value)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm font-bold">
        <span>{total[0]}</span>
        <span>{inr(total[1])}</span>
      </div>
    </div>
  );
}
