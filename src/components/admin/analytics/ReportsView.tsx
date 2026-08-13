import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileSpreadsheet, Search } from "lucide-react";
import { getAnalytics, getReport } from "@/lib/analytics.functions";
import type { ReportType } from "@/lib/analytics/types";
import { AdminButton, Panel, StatCard, money } from "../primitives";
import { ScopeBar } from "./ScopeBar";
import { useAnalyticsScope } from "./scope";
import { ScrollTable } from "./TodayPanel";
import { exportCsv, exportXlsx } from "./exports";
import { cn } from "@/lib/utils";

type QuickReport =
  | "gaming"
  | "food"
  | "combined"
  | "bookings"
  | "visits"
  | "coupons"
  | "loyalty"
  | "student"
  | "branches";

const QUICK: { id: QuickReport; label: string; type: ReportType }[] = [
  { id: "combined", label: "Combined revenue", type: "combined" },
  { id: "gaming", label: "Gaming report", type: "gaming" },
  { id: "food", label: "Food report", type: "food" },
  { id: "bookings", label: "Bookings report", type: "combined" },
  { id: "visits", label: "Customer visits", type: "gaming" },
  { id: "coupons", label: "Coupon report", type: "combined" },
  { id: "loyalty", label: "Loyalty rewards", type: "gaming" },
  { id: "student", label: "Student discount", type: "gaming" },
  { id: "branches", label: "Branch comparison", type: "combined" },
];

export function ReportsView({
  branches,
  isOwner,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  isOwner: boolean;
  defaultBranchId: string | null;
}) {
  const scope = useAnalyticsScope(isOwner ? null : defaultBranchId);
  const [quick, setQuick] = useState<QuickReport>("combined");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const type = QUICK.find((q) => q.id === quick)?.type ?? "combined";

  const fetchReport = useServerFn(getReport);
  const fetchAnalytics = useServerFn(getAnalytics);

  const { data: rows = [], isFetching } = useQuery({
    queryKey: ["report", scope.branchId, scope.range.from, scope.range.to, type],
    queryFn: () => fetchReport({ data: { branchId: scope.branchId, ...scope.range, type } }),
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics", scope.branchId, scope.range.from, scope.range.to],
    queryFn: () => fetchAnalytics({ data: { branchId: scope.branchId, ...scope.range } }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (status === "all" ? true : r.status === status))
      .filter((r) =>
        q
          ? [r.reference, r.customer, r.phone, r.service, r.branch].some((v) => v.toLowerCase().includes(q))
          : true,
      );
  }, [rows, status, search]);

  const filename = `coc-${quick}-${scope.branchId ? (branches.find((b) => b.id === scope.branchId)?.name ?? "branch") : "all-branches"}-${scope.range.from}-to-${scope.range.to}`
    .toLowerCase()
    .replaceAll(" ", "-");

  const totals = filtered.reduce(
    (acc, r) => ({
      amount: acc.amount + r.amount,
      discount: acc.discount + r.discount,
      final: acc.final + r.finalAmount,
    }),
    { amount: 0, discount: 0, final: 0 },
  );

  return (
    <div className="space-y-6">
      <ScopeBar scope={scope} branches={branches} allowAllBranches={isOwner}>
        <AdminButton onClick={() => exportCsv(filtered, filename)} disabled={!filtered.length}>
          <Download className="size-3.5" /> CSV
        </AdminButton>
        <AdminButton onClick={() => void exportXlsx(filtered, filename)} disabled={!filtered.length}>
          <FileSpreadsheet className="size-3.5" /> Excel
        </AdminButton>
      </ScopeBar>

      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setQuick(q.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition-colors",
              quick === q.id
                ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {q.label}
          </button>
        ))}
      </div>

      {quick === "visits" && analytics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Unique customers" value={analytics.customers.unique} />
          <StatCard label="Completed visits" value={analytics.customers.completedVisits} />
          <StatCard label="New" value={analytics.customers.newCustomers} />
          <StatCard label="Returning" value={analytics.customers.returning} />
        </div>
      ) : null}

      {quick === "loyalty" && analytics ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Rewards earned" value={analytics.loyalty.earned} />
          <StatCard label="Redeemed" value={analytics.loyalty.redeemed} tone="good" />
          <StatCard label="Available" value={analytics.loyalty.available} tone="warn" />
        </div>
      ) : null}

      {quick === "coupons" && analytics ? (
        <Panel title="Coupon usage">
          <ScrollTable
            head={["Code", "Applies to", "Uses", "Discount"]}
            empty="No coupon redemptions in this range."
            rows={analytics.coupons.top.map((c) => [c.code, c.category.replace("_", " "), String(c.uses), money(c.discount)])}
          />
        </Panel>
      ) : null}

      {quick === "student" && analytics ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Student discounts used" value={analytics.student.uses} />
          <StatCard label="Total discount" value={money(analytics.student.amount)} />
          <StatCard label="Gaming revenue after" value={money(analytics.student.gamingRevenueAfter)} />
        </div>
      ) : null}

      {quick === "branches" && analytics ? (
        <Panel title="Branch comparison">
          <ScrollTable
            head={["Branch", "Revenue", "Gaming", "Food", "Bookings", "Food orders", "Avg value", "Gaming hours", "Utilisation", "Visits"]}
            empty="No branch data."
            rows={analytics.branchComparison.map((b) => [
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

      <Panel
        title={`${QUICK.find((q) => q.id === quick)?.label ?? "Report"} · ${filtered.length} records`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, name, phone"
                className="w-40 bg-transparent text-xs outline-none"
              />
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] outline-none"
            >
              {["all", "completed", "confirmed", "pending", "payment_pending", "awaiting_payment", "cancelled", "expired"].map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {isFetching ? <p className="pb-3 text-xs text-muted-foreground">Updating…</p> : null}
        <ScrollTable
          head={["Date", "Branch", "Ref", "Customer", "Phone", "Type", "Service / items", "Amount", "Discount", "Final", "Status", "Payment"]}
          empty="No records for these filters."
          rows={filtered.map((r) => [
            r.date,
            r.branch,
            r.reference.replace("COC-", ""),
            r.customer,
            r.phone,
            r.kind,
            r.service,
            money(r.amount),
            money(r.discount),
            money(r.finalAmount),
            r.status.replace("_", " "),
            r.paymentStatus,
          ])}
        />
        {filtered.length ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Totals · amount {money(totals.amount)} · discount {money(totals.discount)} · final {money(totals.final)}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
