import type { ReportRow } from "@/lib/analytics/types";

const HEADERS = [
  "Date",
  "Branch",
  "Reference",
  "Customer",
  "Phone",
  "Type",
  "Service / Items",
  "Amount",
  "Discount",
  "Final amount",
  "Booking status",
  "Payment status",
  "Payment mode",
] as const;

const values = (r: ReportRow) => [
  r.date,
  r.branch,
  r.reference,
  r.customer,
  r.phone,
  r.kind,
  r.service,
  r.amount,
  r.discount,
  r.finalAmount,
  r.status,
  r.paymentStatus,
  r.paymentMode,
];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(rows: ReportRow[], filename: string) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const csv = [HEADERS.map(esc).join(","), ...rows.map((r) => values(r).map(esc).join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export async function exportXlsx(rows: ReportRow[], filename: string) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const data = [
    HEADERS.map((h) => ({ value: h, fontWeight: "bold" as const })),
    ...rows.map((r) =>
      values(r).map((v) =>
        typeof v === "number"
          ? { type: Number, value: v }
          : { type: String, value: String(v) },
      ),
    ),
  ];
  await writeXlsxFile(data as never, { fontFamily: "Arial", fontSize: 11 }).toFile(`${filename}.xlsx`);
}
