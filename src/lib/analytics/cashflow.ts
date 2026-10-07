import type { CashflowAnalytics } from "./types";

export interface CashflowEntry {
  branchId: string;
  date: string;
  amount: number;
  account: string;
}

/** Deposits are funding, not sales revenue; expenses remain separate from sales. */
export function computeCashflow(
  deposits: CashflowEntry[],
  expenses: CashflowEntry[],
  branches: { id: string; name: string }[],
  range: { from: string; to: string },
): CashflowAnalytics {
  const allowed = new Set(branches.map((branch) => branch.id));
  const inScope = (row: CashflowEntry) => allowed.has(row.branchId) && row.date >= range.from && row.date <= range.to;
  const depositRows = deposits.filter(inScope);
  const expenseRows = expenses.filter(inScope);
  const totals = (rows: CashflowEntry[]) => rows.reduce((sum, row) => sum + row.amount, 0);
  const days = Math.max(1, Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86400000) + 1);
  const byDay = new Map<string, { date: string; deposits: number; expenses: number }>();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(Date.parse(`${range.from}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10);
    byDay.set(date, { date, deposits: 0, expenses: 0 });
  }
  for (const row of depositRows) {
    const point = byDay.get(row.date);
    if (point) point.deposits += row.amount;
  }
  for (const row of expenseRows) {
    const point = byDay.get(row.date);
    if (point) point.expenses += row.amount;
  }
  return {
    totalDeposits: totals(depositRows),
    totalExpenses: totals(expenseRows),
    depositCount: depositRows.length,
    expenseCount: expenseRows.length,
    avgDailyExpenses: totals(expenseRows) / days,
    series: [...byDay.values()],
    accounts: ["cash", "bank"].map((account) => ({
      account: account === "bank" ? "Bank" : "Cash",
      deposits: totals(depositRows.filter((row) => (row.account === "bank" ? "bank" : "cash") === account)),
      expenses: totals(expenseRows.filter((row) => (row.account === "bank" ? "bank" : "cash") === account)),
    })),
    branches: branches.map((branch) => ({
      branch: branch.name,
      deposits: totals(depositRows.filter((row) => row.branchId === branch.id)),
      expenses: totals(expenseRows.filter((row) => row.branchId === branch.id)),
    })),
  };
}

export function groupCashflowSeries(series: CashflowAnalytics["series"], mode: "daily" | "weekly" | "monthly") {
  const buckets = new Map<string, { label: string; deposits: number; expenses: number }>();
  for (const point of series) {
    const date = new Date(`${point.date}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key = mode === "monthly" ? point.date.slice(0, 7) : mode === "weekly" ? date.toISOString().slice(0, 10) : point.date;
    const bucket = buckets.get(key) ?? { label: mode === "daily" ? key.slice(5) : key, deposits: 0, expenses: 0 };
    bucket.deposits += point.deposits;
    bucket.expenses += point.expenses;
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}