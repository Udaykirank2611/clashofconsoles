import type { TransactionsPayload, TransactionRow } from "@/lib/transactions/types";
import { formatDuration, inr, printReport, section, download } from "@/lib/reporting/format";

const HEADERS = [
  "S.No",
  "Date",
  "Booking ID",
  "Customer Name",
  "Phone Number",
  "Branch",
  "Service",
  "Console / Machine",
  "Check-In",
  "Check-Out",
  "Duration",
  "Players",
  "Customer Level",
  "Gaming Amount",
  "Food Amount",
  "Membership Discount",
  "Last-Min Discount",
  "Coupon Discount",
  "Coupon Code",
  "Student Discount",
  "Total Discount",
  "Final Amount",
  "Payment Mode",
  "UPI Provider",
  "Cash Received",
  "UPI Received",
  "Transaction Status",
  "Booking Type",
  "Admin Notes",
] as const;

const PROVIDER: Record<string, string> = {
  phonepe: "PhonePe",
  google_pay: "Google Pay",
  paytm: "Paytm",
  other: "Other",
};
const SOURCE: Record<string, string> = {
  website: "Website",
  walk_in: "Walk-in",
  membership: "Membership",
  coupon: "Coupon",
};

const cells = (r: TransactionRow, i: number): (string | number)[] => [
  i + 1,
  r.date,
  r.reference,
  r.customer,
  r.phone,
  r.branch,
  r.service,
  r.consoleName,
  r.checkIn?.slice(0, 5) ?? "—",
  r.checkOut?.slice(0, 5) ?? "—",
  formatDuration(r.durationMinutes),
  r.players,
  r.visitNumber ? `Visit ${r.visitNumber}` : "—",
  r.gamingAmount,
  r.foodAmount,
  r.membershipDiscount,
  r.lastMinuteDiscount,
  r.couponDiscount,
  r.couponCode || "—",
  r.studentDiscount,
  r.totalDiscount,
  r.finalAmount,
  r.paymentMode ? r.paymentMode.toUpperCase() : "—",
  r.upiProvider ? (PROVIDER[r.upiProvider] ?? r.upiProvider) : "—",
  r.cashAmount,
  r.upiAmount,
  r.status.charAt(0).toUpperCase() + r.status.slice(1),
  SOURCE[r.source] ?? r.source,
  r.notes,
];

function summaryPairs(p: TransactionsPayload): [string, string][] {
  const t = p.totals;
  const c = p.cashBank;
  return [
    ["Gaming revenue", inr(t.gamingRevenue)],
    ["Food revenue", inr(t.foodRevenue)],
    ["Total discounts given", inr(t.totalDiscounts)],
    ["Total revenue", inr(t.totalRevenue)],
    ["Cash collection", inr(t.cashCollection)],
    ["UPI collection", inr(t.upiCollection)],
    ["Total bookings", String(t.totalBookings)],
    ["Total gaming hours", `${t.totalGamingHours} hrs`],
    ["Total expenses", inr(p.totalExpenses)],
    ["Total deposits", inr(p.totalDeposits)],
    ["Opening cash balance", inr(c.openingCash)],
    ["Opening bank balance", inr(c.openingBank)],
    ["Deposits to cash", inr(c.depositsCash)],
    ["Deposits to bank", inr(c.depositsBank)],
    ["Expenses paid in cash", inr(c.expensesCash)],
    ["Expenses paid by bank", inr(c.expensesBank)],
    ["Closing cash balance", inr(c.closingCash)],
    ["Closing bank balance", inr(c.closingBank)],
  ];
}

const fileBase = (p: TransactionsPayload) =>
  `transactions-${p.from}${p.from === p.to ? "" : `-to-${p.to}`}`;

export function exportTransactionsCsv(p: TransactionsPayload) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const lines: string[] = [
    esc("Clash of Consoles — Transaction Report"),
    esc(`${p.branchName} · ${p.from}${p.from === p.to ? "" : ` to ${p.to}`}`),
    "",
    esc("TRANSACTIONS"),
    HEADERS.map(esc).join(","),
    ...p.rows.map((r, i) => cells(r, i).map(esc).join(",")),
    "",
    esc("DAILY TOTALS"),
    ...summaryPairs(p).map(([k, v]) => `${esc(k)},${esc(v)}`),
    "",
    esc("EXPENSES"),
    ["Date", "Time", "Expense", "Amount", "Paid from", "Description"].map(esc).join(","),
    ...p.expenses.map((e) =>
      [e.date, e.time, e.name, e.amount, e.paidFrom === "cash" ? "Cash" : "Bank", e.description]
        .map(esc)
        .join(","),
    ),
    "",
    esc("DEPOSITS"),
    ["Date", "Time", "Deposit", "Amount", "Deposited to", "Description"].map(esc).join(","),
    ...p.deposits.map((d) =>
      [d.date, d.time, d.name, d.amount, d.depositTo === "cash" ? "Cash" : "Bank", d.description]
        .map(esc)
        .join(","),
    ),
  ];
  download(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${fileBase(p)}.csv`);
}

export async function exportTransactionsXlsx(p: TransactionsPayload) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const bold = { fontWeight: "bold" as const };
  const rows: unknown[][] = [
    [{ value: "Clash of Consoles — Transaction Report", ...bold, fontSize: 14 }],
    [{ value: `${p.branchName} · ${p.from}${p.from === p.to ? "" : ` to ${p.to}`}` }],
    [],
    [{ value: "TRANSACTIONS", ...bold }],
    HEADERS.map((h) => ({ value: h, ...bold })),
    ...p.rows.map((r, i) =>
      cells(r, i).map((v) =>
        typeof v === "number" ? { type: Number, value: v } : { type: String, value: String(v) },
      ),
    ),
    [],
    [{ value: "DAILY TOTALS", ...bold }],
    ...summaryPairs(p).map(([k, v]) => [{ value: k }, { value: v }]),
    [],
    [{ value: "EXPENSES", ...bold }],
    ["Date", "Time", "Expense", "Amount", "Paid from", "Description"].map((h) => ({ value: h, ...bold })),
    ...p.expenses.map((e) => [
      { value: e.date },
      { value: e.time },
      { value: e.name },
      { type: Number, value: e.amount },
      { value: e.paidFrom === "cash" ? "Cash" : "Bank" },
      { value: e.description },
    ]),
    [],
    [{ value: "DEPOSITS", ...bold }],
    ["Date", "Time", "Deposit", "Amount", "Deposited to", "Description"].map((h) => ({ value: h, ...bold })),
    ...p.deposits.map((d) => [
      { value: d.date },
      { value: d.time },
      { value: d.name },
      { type: Number, value: d.amount },
      { value: d.depositTo === "cash" ? "Cash" : "Bank" },
      { value: d.description },
    ]),
  ];
  await writeXlsxFile(rows as never, { fontFamily: "Arial", fontSize: 11 }).toFile(`${fileBase(p)}.xlsx`);
}

export function exportTransactionsPdf(p: TransactionsPayload) {
  const table = `<table class="grid"><thead><tr>${HEADERS.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${p.rows
    .map((r, i) => `<tr>${cells(r, i).map((v) => `<td>${String(v)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;

  const expenses = p.expenses.length
    ? `<table class="grid"><thead><tr><th>Date</th><th>Time</th><th>Expense</th><th>Amount</th><th>Paid from</th><th>Description</th></tr></thead>
<tbody>${p.expenses
        .map(
          (e) =>
            `<tr><td>${e.date}</td><td>${e.time}</td><td>${e.name}</td><td>${inr(e.amount)}</td><td>${
              e.paidFrom === "cash" ? "Cash" : "Bank"
            }</td><td>${e.description}</td></tr>`,
        )
        .join("")}</tbody></table>`
    : `<p class="muted">No expenses recorded.</p>`;

  const deposits = p.deposits.length
    ? `<table class="grid"><thead><tr><th>Date</th><th>Time</th><th>Deposit</th><th>Amount</th><th>Deposited to</th><th>Description</th></tr></thead>
<tbody>${p.deposits
        .map(
          (d) =>
            `<tr><td>${d.date}</td><td>${d.time}</td><td>${d.name}</td><td>${inr(d.amount)}</td><td>${
              d.depositTo === "cash" ? "Cash" : "Bank"
            }</td><td>${d.description}</td></tr>`,
        )
        .join("")}</tbody></table>`
    : `<p class="muted">No deposits recorded.</p>`;

  printReport({
    title: "Transaction Report",
    subtitle: `${p.branchName} · ${p.from}${p.from === p.to ? "" : ` to ${p.to}`}`,
    landscape: true,
    body: [
      section("Transactions", table),
      section("Daily totals", pairsTable(summaryPairs(p))),
      section("Expenses", expenses),
      section("Deposits", deposits),
    ].join(""),
  });
}

function pairsTable(pairs: [string, string][]) {
  return `<table class="pairs">${pairs
    .map(([k, v]) => `<tr><td>${k}</td><td class="right">${v}</td></tr>`)
    .join("")}</table>`;
}
