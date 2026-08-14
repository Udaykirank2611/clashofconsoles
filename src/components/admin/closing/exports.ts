import type { DailyClosingSummary } from "@/lib/closing/types";

/** Flat label/value pairs — every statistic shown on the Daily Closing page. */
export function closingRows(s: DailyClosingSummary): [string, string | number][] {
  const t = s.totals;
  return [
    ["Branch", s.branchName],
    ["Date", s.date],
    ["Total bookings", t.totalBookings],
    ["Completed bookings", t.completedBookings],
    ["Cancelled bookings", t.cancelledBookings],
    ["Pending bookings", t.pendingBookings],
    ["Total customers", t.totalCustomers],
    ["Walk-in customers", t.walkInCustomers],
    ["Website bookings", t.websiteBookings],
    ["Gaming revenue", t.gamingRevenue],
    ["Food revenue", t.foodRevenue],
    ["Membership revenue", t.membershipRevenue],
    ["Coupon discounts", t.couponDiscounts],
    ["Student discounts", t.studentDiscounts],
    ["Cash revenue", t.cashRevenue],
    ["UPI revenue", t.upiRevenue],
    ["Total revenue", t.totalRevenue],
    ["Most booked console", s.popular.console],
    ["Most played game", s.popular.game],
    ["Most ordered food", s.popular.food],
    ["Most used coupon", s.popular.coupon],
    ["Most popular membership", s.popular.membership],
    ["Peak booking hour", s.insights.peakHour],
    ["Average booking duration (min)", s.insights.avgDurationMinutes],
    ["Average customer spend", s.insights.avgCustomerSpend],
    ["Most active branch", s.insights.mostActiveBranch],
    ["Console utilisation %", s.insights.consoleUtilization],
  ];
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportClosingCsv(s: DailyClosingSummary) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const csv = ["Statistic,Value", ...closingRows(s).map(([k, v]) => `${esc(k)},${esc(v)}`)].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `daily-closing-${s.date}.csv`);
}

export async function exportClosingXlsx(s: DailyClosingSummary) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const data = [
    [
      { value: "Statistic", fontWeight: "bold" as const },
      { value: "Value", fontWeight: "bold" as const },
    ],
    ...closingRows(s).map(([k, v]) => [
      { type: String, value: String(k) },
      typeof v === "number" ? { type: Number, value: v } : { type: String, value: String(v) },
    ]),
  ];
  await writeXlsxFile(data as never, { fontFamily: "Arial", fontSize: 11 }).toFile(`daily-closing-${s.date}.xlsx`);
}

/** Print-to-PDF of the same statistics, using the browser's print dialog. */
export function exportClosingPdf(s: DailyClosingSummary) {
  const rows = closingRows(s)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #ddd">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right">${v}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Daily Closing ${s.date}</title></head>
<body style="font-family:Arial,sans-serif;padding:28px;color:#111">
<h1 style="font-size:20px;margin:0">Daily Closing Report</h1>
<p style="margin:4px 0 18px;color:#555">${s.branchName} · ${s.date}</p>
<table style="width:100%;border-collapse:collapse;font-size:13px">${rows}</table>
</body></html>`;
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
