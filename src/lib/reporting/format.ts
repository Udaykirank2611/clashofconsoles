/** Shared formatting + branded print helpers for admin report exports. */

export const inr = (n: number) =>
  `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export function formatDuration(totalMinutes: number) {
  const m = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!h) return `${rest} min`;
  if (!rest) return `${h} hr`;
  return `${h} hr ${rest} min`;
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function section(title: string, html: string) {
  return `<section><h2>${title}</h2>${html}</section>`;
}

/** Opens a branded, print-ready report window (Print → Save as PDF). */
export function printReport({
  title,
  subtitle,
  body,
  landscape = false,
}: {
  title: string;
  subtitle: string;
  body: string;
  landscape?: boolean;
}) {
  const generated = new Date().toLocaleString("en-IN");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title} — ${subtitle}</title>
<style>
  @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
  header.brand { display:flex; align-items:flex-end; justify-content:space-between; gap:16px;
    border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 18px; }
  .brand h1 { font-size: 22px; margin: 0; letter-spacing: -0.02em; }
  .brand .tag { font-size: 11px; text-transform: uppercase; letter-spacing: .18em; color:#0e7490; margin:0 0 4px; }
  .brand .meta { font-size: 11px; color:#555; text-align:right; line-height:1.6; }
  section { margin-bottom: 22px; break-inside: avoid; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .16em; color:#0f172a;
    background:#f1f5f9; padding:6px 10px; border-radius:4px; margin:0 0 8px; }
  table { width:100%; border-collapse: collapse; font-size: 11px; }
  table.grid th { background:#0f172a; color:#fff; text-align:left; padding:6px 8px; font-size:10px; }
  table.grid td { padding:5px 8px; border-bottom:1px solid #e2e8f0; }
  table.grid tr:nth-child(even) td { background:#f8fafc; }
  table.pairs td { padding:6px 10px; border-bottom:1px solid #e2e8f0; font-size:12px; }
  table.pairs tr td:first-child { color:#475569; }
  .right { text-align:right; font-weight:700; }
  .muted { color:#64748b; font-size:12px; }
  footer { margin-top: 18px; border-top:1px solid #e2e8f0; padding-top:8px; font-size:10px; color:#64748b; }
</style></head>
<body>
<header class="brand">
  <div>
    <p class="tag">Clash of Consoles · Gaming Café</p>
    <h1>${title}</h1>
    <p class="muted" style="margin:6px 0 0">${subtitle}</p>
  </div>
  <div class="meta">Generated<br/>${generated}</div>
</header>
${body}
<footer>Clash of Consoles — generated automatically from live booking data.</footer>
</body></html>`;

  const win = window.open("", "_blank", "width=1100,height=1000");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
