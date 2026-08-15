import type { AdminBooking, AdminBookingItem } from "@/lib/admin/useBranchData";
import { formatTime } from "@/lib/booking/pricing";
import { inr, printReport, section } from "@/lib/reporting/format";

const esc = (v: unknown) =>
  String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const durationText = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "";
  const m = mins(end) - mins(start);
  if (m <= 0) return "";
  return [Math.floor(m / 60) ? `${Math.floor(m / 60)} hr` : "", m % 60 ? `${m % 60} min` : ""]
    .filter(Boolean)
    .join(" ");
};

/**
 * The window a booking actually occupies — falls back to the earliest/latest
 * timed add-on line when the guest booked an experience instead of a console.
 */
export function bookingWindow(b: AdminBooking): { start: string | null; end: string | null } {
  if (b.start_time && b.end_time) return { start: b.start_time, end: b.end_time };
  const timed = b.booking_items.filter((i) => i.start_time && i.end_time);
  if (!timed.length) return { start: null, end: null };
  const start = timed.reduce((a, i) => (mins(i.start_time!) < mins(a) ? i.start_time! : a), timed[0]!.start_time!);
  const end = timed.reduce((a, i) => (mins(i.end_time!) > mins(a) ? i.end_time! : a), timed[0]!.end_time!);
  return { start, end };
}

/** Short one-line description of what was booked, for list rows. */
export function bookingSummaryLine(b: AdminBooking, stationName: string): string {
  const { start, end } = bookingWindow(b);
  const experiences = b.booking_items.filter((i) => i.kind === "addon" && i.station_id);
  const what = b.station_id && stationName !== "—"
    ? stationName
    : experiences.length
      ? experiences.map((i) => i.label).join(", ")
      : b.booking_items.some((i) => i.kind === "food")
        ? "Food only"
        : "Passes only";
  const time = start && end ? `${formatTime(start)} – ${formatTime(end)} · ${durationText(start, end)}` : null;
  return [time, `${b.players}P`, what, b.game_title || null].filter(Boolean).join(" · ");
}

const itemRows = (items: AdminBookingItem[]) =>
  items
    .map(
      (i) => `<tr><td>${esc(i.label)}${
        i.start_time && i.end_time
          ? `<br/><span style="color:#64748b;font-size:10px">${formatTime(i.start_time)} – ${formatTime(
              i.end_time,
            )} · ${durationText(i.start_time, i.end_time)}${
              Number(i.extra_hours) ? ` · +${Number(i.extra_hours)} extra hr` : ""
            }</span>`
          : ""
      }</td><td>${i.quantity}</td><td class="right">${inr(Number(i.unit_price))}</td><td class="right">${inr(
        Number(i.line_total),
      )}</td></tr>`,
    )
    .join("");

const table = (items: AdminBookingItem[]) =>
  `<table class="grid"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemRows(
    items,
  )}</tbody></table>`;

const pairs = (rows: [string, string][]) =>
  `<table class="pairs">${rows
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td class="right">${esc(v)}</td></tr>`)
    .join("")}</table>`;

/** Opens a branded, print-ready invoice for one booking. */
export function printBookingReceipt(
  b: AdminBooking,
  stationName: string,
  branchName?: string,
  /** menu item id -> category, used to group the food lines. */
  categories?: Map<string, string>,
) {
  const { start, end } = bookingWindow(b);
  const experiences = b.booking_items.filter((i) => i.kind === "addon" && i.station_id);
  const passLines = b.booking_items.filter((i) => i.kind === "addon" && !i.station_id);
  const food = b.booking_items.filter((i) => i.kind === "food");

  const foodByCategory = new Map<string, AdminBookingItem[]>();
  for (const i of food) {
    const cat = (i.menu_item_id ? categories?.get(i.menu_item_id) : null) ?? "Food & drinks";
    foodByCategory.set(cat, [...(foodByCategory.get(cat) ?? []), i]);
  }

  const details = pairs([
    ["Booking ID", b.reference],
    ["Guest", b.customer_name],
    ["Phone", b.customer_phone],
    ["Date", new Date(`${b.booking_date}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })],
    ["Time", start && end ? `${formatTime(start)} – ${formatTime(end)} (${durationText(start, end)})` : "—"],
    ["Station / experience", b.station_id && stationName !== "—" ? stationName : experiences.map((i) => i.label).join(", ") || "—"],
    ["Game", b.game_title || "—"],
    ["Players", String(b.players)],
    ["Status", b.status.replaceAll("_", " ")],
  ]);

  const passes = b.membership_passes?.length
    ? `<table class="grid"><thead><tr><th>Pass ID</th><th>Plan</th><th>Valid till</th><th>Balance</th></tr></thead><tbody>${b.membership_passes
        .map(
          (p) =>
            `<tr><td><strong>${esc(p.code)}</strong></td><td>${esc(p.plan_name)}</td><td>${new Date(
              `${p.expires_on}T00:00:00`,
            ).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td><td>${
              p.remaining_minutes !== null
                ? `${Math.round((p.remaining_minutes / 60) * 10) / 10} h left`
                : p.remaining_uses !== null
                  ? `${p.remaining_uses} use${p.remaining_uses === 1 ? "" : "s"} left`
                  : "—"
            }</td></tr>`,
        )
        .join("")}</tbody></table>`
    : "";

  const foodHtml = food.length
    ? [...foodByCategory.entries()]
        .map(
          ([cat, items]) =>
            `<p style="margin:10px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#0e7490">${esc(
              cat,
            )}</p>${table(items)}`,
        )
        .join("")
    : "";

  const charges = pairs(
    [
      ["Session charge", inr(b.session_amount)] as [string, string],
      ["Add-ons & passes", inr(b.addons_amount)] as [string, string],
      ["Food & drinks", inr(b.food_amount)] as [string, string],
      ...(Number(b.student_discount_amount)
        ? ([["Student discount", `− ${inr(b.student_discount_amount)}`]] as [string, string][])
        : []),
      ...(b.coupon_code ? ([["Coupon", b.coupon_code]] as [string, string][]) : []),
      ["Total discount", `− ${inr(b.discount_amount)}`] as [string, string],
      ["Tax", inr(b.tax_amount)] as [string, string],
      ["Total payable", inr(b.total_amount)] as [string, string],
      [
        "Payment mode",
        b.payment_mode === "upi" ? "UPI" : b.payment_mode === "cash" ? "Cash" : "Not recorded",
      ] as [string, string],
      ...(b.payment_utr ? ([["UTR / Txn ref", b.payment_utr]] as [string, string][]) : []),
    ],
  );

  printReport({
    title: "Booking Receipt",
    subtitle: `${branchName ? `${branchName} · ` : ""}${b.reference}`,
    body: [
      section("Booking details", details),
      experiences.length ? section("Gaming & experiences", table(experiences)) : "",
      passLines.length ? section("Passes & offers purchased", table(passLines)) : "",
      passes ? section("Gaming pass IDs", passes) : "",
      foodHtml ? section("Food & drinks", foodHtml) : "",
      section("Charges", charges),
      b.special_instructions
        ? section("Notes", `<p class="muted">${esc(b.special_instructions)}</p>`)
        : "",
    ]
      .filter(Boolean)
      .join(""),
  });
}
