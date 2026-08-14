import type { DailyClosingSummary } from "@/lib/closing/types";
import { download, formatDuration, inr, printReport, section } from "@/lib/reporting/format";

type Row = [string, string | number];

/** Ordered sections of the Daily Closing report, with display-ready values. */
export function closingSections(s: DailyClosingSummary): { title: string; rows: Row[] }[] {
  const t = s.totals;
  return [
    {
      title: "Booking summary",
      rows: [
        ["Total bookings", t.totalBookings],
        ["Completed bookings", t.completedBookings],
        ["Cancelled bookings", t.cancelledBookings],
        ["Pending bookings", t.pendingBookings],
        ["Total customers", t.totalCustomers],
        ["Walk-in customers", t.walkInCustomers],
        ["Website bookings", t.websiteBookings],
      ],
    },
    {
      title: "Revenue",
      rows: [
        ["Gaming revenue", inr(t.gamingRevenue)],
        ["Food revenue", inr(t.foodRevenue)],
        ["Membership revenue", inr(t.membershipRevenue)],
        ["Cash revenue", inr(t.cashRevenue)],
        ["UPI revenue", inr(t.upiRevenue)],
        ["Total revenue", inr(t.totalRevenue)],
      ],
    },
    {
      title: "Discounts",
      rows: [
        ["Coupon discounts", inr(t.couponDiscounts)],
        ["Student discounts", inr(t.studentDiscounts)],
      ],
    },
    {
      title: "Popular services",
      rows: [
        ["Most booked console", s.popular.console],
        ["Most played game", s.popular.game],
        ["Most ordered food", s.popular.food],
        ["Most used coupon", s.popular.coupon],
        ["Most popular membership", s.popular.membership],
      ],
    },
    {
      title: "Business insights",
      rows: [
        ["Peak booking hour", s.insights.peakHour],
        ["Average booking duration", formatDuration(s.insights.avgDurationMinutes)],
        ["Average customer spend", inr(s.insights.avgCustomerSpend)],
        ["Most active branch", s.insights.mostActiveBranch],
        ["Console utilisation", `${s.insights.consoleUtilization}%`],
      ],
    },
  ];
}

/** Flat label/value pairs — kept for the on-screen history dialog. */
export function closingRows(s: DailyClosingSummary): Row[] {
  return closingSections(s).flatMap((sec) => sec.rows);
}

const fileBase = (s: DailyClosingSummary) => `daily-closing-${s.date}`;

export function exportClosingCsv(s: DailyClosingSummary) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const lines: string[] = [
    esc("Clash of Consoles — Daily Closing Report"),
    esc(`${s.branchName} · ${s.date}`),
    esc(`Generated ${new Date().toLocaleString("en-IN")}`),
  ];
  for (const sec of closingSections(s)) {
    lines.push("", esc(sec.title.toUpperCase()), `${esc("Statistic")},${esc("Value")}`);
    for (const [k, v] of sec.rows) lines.push(`${esc(k)},${esc(v)}`);
  }
  download(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${fileBase(s)}.csv`);
}

export async function exportClosingXlsx(s: DailyClosingSummary) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const bold = { fontWeight: "bold" as const };
  const data: unknown[][] = [
    [{ value: "Clash of Consoles — Daily Closing Report", ...bold, fontSize: 14 }],
    [{ value: `${s.branchName} · ${s.date}` }],
    [{ value: `Generated ${new Date().toLocaleString("en-IN")}` }],
  ];
  for (const sec of closingSections(s)) {
    data.push([]);
    data.push([{ value: sec.title.toUpperCase(), ...bold }]);
    data.push([
      { value: "Statistic", ...bold },
      { value: "Value", ...bold },
    ]);
    for (const [k, v] of sec.rows) {
      data.push([
        { type: String, value: String(k) },
        typeof v === "number" ? { type: Number, value: v } : { type: String, value: String(v) },
      ]);
    }
  }
  await writeXlsxFile(data as never, { fontFamily: "Arial", fontSize: 11 }).toFile(`${fileBase(s)}.xlsx`);
}

/** Branded, print-to-PDF version of the Daily Closing report. */
export function exportClosingPdf(s: DailyClosingSummary) {
  const body = closingSections(s)
    .map((sec) =>
      section(
        sec.title,
        `<table class="pairs">${sec.rows
          .map(([k, v]) => `<tr><td>${k}</td><td class="right">${v}</td></tr>`)
          .join("")}</table>`,
      ),
    )
    .join("");
  printReport({ title: "Daily Closing Report", subtitle: `${s.branchName} · ${s.date}`, body });
}
