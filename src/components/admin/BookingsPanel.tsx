import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, Panel, Pill, money } from "./primitives";
import type { AdminBooking, AdminBookingItem, AdminMenuItem, AdminStation } from "@/lib/admin/useBranchData";
import { formatTime } from "@/lib/booking/pricing";
import { ChevronDown, Clock, Copy, MessageCircle, Phone, Printer, RefreshCw, Trash2, UtensilsCrossed } from "lucide-react";
import { ModalPortal } from "./ModalPortal";
import { useServerFn } from "@tanstack/react-start";
import { listCustomers, updateBookingExtraHours } from "@/lib/admin.functions";
import { hoursLabel } from "@/lib/passes";
import { approveBookingPayment, completeBookingWithSplit, extendBookingSession, quoteExtension } from "@/lib/booking-admin.functions";
import { AddFoodDialog } from "./AddFoodDialog";
import { bookingSummaryLine, bookingWindow, printBookingReceipt } from "./receipt";
import { cn } from "@/lib/utils";
import { renderTemplate, useMessageTemplates, type TemplateKey } from "@/lib/message-templates";
import { useQuery } from "@tanstack/react-query";

const FILTERS = ["payment_pending", "awaiting_payment", "confirmed", "cancelled", "all"] as const;
type Filter = (typeof FILTERS)[number];

const LABEL: Record<Filter, string> = {
  payment_pending: "Verify payment",
  awaiting_payment: "Awaiting payment",
  confirmed: "Confirmed",
  cancelled: "Rejected",
  all: "All",
};

/** Legacy "pending" rows are grouped with payment verification. */
const matchesFilter = (status: AdminBooking["status"], filter: Filter) =>
  filter === "all"
    ? status !== "cancelled"
    : filter === "payment_pending"
      ? status === "payment_pending" || status === "pending"
      : status === filter;

/** "2h 30m" between two HH:MM:SS strings. */
const durationLabel = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "";
  const m =
    Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5)) -
    (Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)));
  if (m <= 0) return "";
  return [Math.floor(m / 60) ? `${Math.floor(m / 60)}h` : "", m % 60 ? `${m % 60}m` : ""]
    .filter(Boolean)
    .join(" ");
};

const bookingCountdown = (
  bookingDate: string,
  startTime: string | null,
  endTime: string | null,
  now: number,
) => {
  if (!startTime || !endTime) return null;
  const start = new Date(`${bookingDate}T${startTime}`).getTime();
  let end = new Date(`${bookingDate}T${endTime}`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (end <= start) end += 24 * 60 * 60 * 1_000;
  const seconds = now < start ? Math.round((end - start) / 1_000) : Math.max(0, Math.ceil((end - now) / 1_000));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  return `${String(minutesPart).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;
};

/** Normalise an Indian mobile number to wa.me E.164 digits. */
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? `91${digits}` : digits;
};

/** Customer-facing names used on the compact booking card. */
const bookingGameLabel = (booking: AdminBooking, serviceName: string) => {
  if (booking.booking_type === "group") return "Party Booking";
  const label = booking.game_title?.trim() || serviceName;
  return label
    .replace(/driving simulator/gi, "Cockpit Racing")
    .replace(/\s*[·|-]\s*\d+\s*(minutes?|mins?|hours?|hrs?)\b/gi, "")
    .trim();
};

/** The auto-generated breakdown block injected into templates via {details}. */
const bookingDetailsText = (b: AdminBooking, stationName: string) => {
  const experiences = b.booking_items.filter((i) => i.kind === "addon" && i.station_id);
  const passes = b.booking_items.filter((i) => i.kind === "addon" && !i.station_id);
  const food = b.booking_items.filter((i) => i.kind === "food");
  const list = (items: AdminBookingItem[]) =>
    items
      .map(
        (i) =>
          `  • ${i.quantity}× ${i.label}${
            i.start_time && i.end_time
              ? ` — ${formatTime(i.start_time)} – ${formatTime(i.end_time)} (${durationLabel(i.start_time, i.end_time)})`
              : ""
          }${Number(i.extra_hours) ? ` — +${Number(i.extra_hours)} extra hr` : ""} — ${money(Number(i.line_total))}`,
      )
      .join("\n");
  return [
    `Booking ID: ${b.reference}`,
    `Date: ${new Date(`${b.booking_date}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })}`,
    (() => {
      const w = bookingWindow(b);
      return w.start && w.end
        ? `Time: ${formatTime(w.start)} – ${formatTime(w.end)} (${durationLabel(w.start, w.end)})`
        : "No timed slot";
    })(),
    `Booked: ${bookingSummaryLine(b, stationName)}`,
    b.game_title ? `Game: ${b.game_title}` : "",
    `Players: ${b.players}`,
    `Session charge: ${money(b.session_amount)}`,
    experiences.length ? `Experiences:\n${list(experiences)}` : "",
    passes.length ? `Passes & offers:\n${list(passes)}` : "",
    food.length ? `Food & drinks:\n${list(food)}` : "",
    b.coupon_code ? `Coupon ${b.coupon_code}` : "",
    Number(b.student_discount_amount) ? `Student discount: − ${money(b.student_discount_amount)}` : "",
    Number(b.discount_amount) ? `Total discount: − ${money(b.discount_amount)}` : "",
    `Taxes: ${money(b.tax_amount)}`,
    `Amount paid: ${money(b.total_amount)}`,
    b.membership_passes?.length
      ? `Your Pass ID${b.membership_passes.length > 1 ? "s" : ""}:\n${b.membership_passes
          .map(
            (p) =>
              `  • ${p.plan_name} — ${p.code} (valid till ${new Date(
                `${p.expires_on}T00:00:00`,
              ).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}${
                p.remaining_minutes !== null
                  ? `, ${Math.round((p.remaining_minutes / 60) * 10) / 10} h left`
                  : p.remaining_uses !== null
                    ? `, ${p.remaining_uses} use${p.remaining_uses === 1 ? "" : "s"} left`
                    : ""
              })`,
          )
          .join("\n")}\nShow this Pass ID at the counter or enter it while booking.`
      : "",
    b.payment_utr ? `UTR: ${b.payment_utr}` : "",
    b.special_instructions ? `Notes: ${b.special_instructions}` : "",
    Number(b.reward_minutes)
      ? `🎁 Loyalty reward applied: ${Number(b.reward_minutes)} minutes of FREE play added to this session.`
      : "🎁 Loyalty: every game counts — your 5th visit comes with 30 Minutes FREE and your 10th visit with 1 Hour FREE (used on that visit itself).",
  ]
    .filter(Boolean)
    .join("\n");
};


export function BookingsPanel({
  bookings,
  stations,
  menu = [],
  branchId,
  branchName,
  onChanged,
  focusReference,
}: {
  bookings: AdminBooking[];
  stations: AdminStation[];
  /** Branch menu, used by the "Add food" flow on confirmed bookings. */
  menu?: AdminMenuItem[];
  branchId: string;
  branchName: string;
  onChanged: () => void;
  /** Booking reference to open automatically (e.g. from a notification). */
  focusReference?: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("payment_pending");
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** Booking awaiting the "verify payment" dialog. */
  const [approving, setApproving] = useState<AdminBooking | null>(null);
  /** Last-minute discount the admin can apply while approving. */
  const [extraDiscount, setExtraDiscount] = useState("");
  /** Booking being closed out — collects the exact cash / UPI split. */
  const [settling, setSettling] = useState<AdminBooking | null>(null);
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  /** Confirmed booking that is having food added to it. */
  const [addingFood, setAddingFood] = useState<AdminBooking | null>(null);
  /** Booking waiting for the admin to confirm the extra hour. */
  const [extendConfirm, setExtendConfirm] = useState<AdminBooking | null>(null);
  /** Console clash while extending — offers the free consoles for that hour. */
  const [extendChoice, setExtendChoice] = useState<{
    booking: AdminBooking;
    message: string;
    window: { start: string; end: string };
    alternatives: { id: string; name: string; price: number }[];
  } | null>(null);
  /** Next extension step (length + rate-card price) for the open dialog. */
  const [extendQuote, setExtendQuote] = useState<{
    price: number;
    label: string;
    newTotal: number;
    pass?: { code: string; before: number | null; after: number | null; enough: boolean } | undefined;
  } | null>(null);
  const extendSession = useServerFn(extendBookingSession);
  const getQuote = useServerFn(quoteExtension);
  const approvePayment = useServerFn(approveBookingPayment);
  const completeWithSplit = useServerFn(completeBookingWithSplit);
  const editHours = useServerFn(updateBookingExtraHours);
  const getCustomers = useServerFn(listCustomers);
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => getCustomers(),
    staleTime: 30_000,
  });
  const { template } = useMessageTemplates();

  useEffect(() => {
    const timer = window.setInterval(() => setCountdownNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const visitsByPhone = new Map(
    customers.map((customer) => [customer.phone.replace(/\D/g, "").slice(-10), customer.totalVisits] as const),
  );

  /** Opens the extend dialog with the next allowed step for this service. */
  const openExtend = async (b: AdminBooking) => {
    setExtendQuote(null);
    const q = await getQuote({ data: { bookingId: b.id, hours: 1 } });
    if (!q.available) {
      toast.error("This session is already at its maximum length.");
      return;
    }
    setExtendQuote({ price: q.price, label: q.label, newTotal: q.newTotal, pass: q.pass });
    setExtendConfirm(b);
  };

  /** Adds the next step to a confirmed booking, moving it to a free console if needed. */
  const extend = async (b: AdminBooking, stationId: string | null = null) => {
    setBusy(b.id);
    const res = await extendSession({ data: { bookingId: b.id, hours: 1, stationId } });
    setBusy(null);
    if (res.ok) {
      setExtendChoice(null);
      toast.success(res.message ?? "Session extended.");
      onChanged();
      return;
    }
    if (res.conflict) {
      setExtendChoice({
        booking: b,
        message: res.message ?? "That console is already booked for the next slot.",
        window: res.window ?? { start: "", end: "" },
        alternatives: res.alternatives ?? [],
      });
      return;
    }
    toast.error(res.message ?? "Could not extend this booking.");
  };

  /** Renders the admin-editable WhatsApp message for a booking. */
  const customerMessage = (b: AdminBooking, stationName: string, key?: TemplateKey) => {
    const which: TemplateKey =
      key ?? (b.status === "confirmed" || b.status === "completed" ? "booking_confirmed" : "booking_placed");
    const w = bookingWindow(b);
    return renderTemplate(template(branchId, which), {
      name: b.customer_name,
      branch: branchName,
      reference: b.reference,
      phone: b.customer_phone,
      total: money(b.total_amount),
      date: new Date(`${b.booking_date}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      time: w.start && w.end ? `${formatTime(w.start)} – ${formatTime(w.end)}` : "—",
      details: bookingDetailsText(b, stationName),
    });
  };


  /**
   * Jump to a booking when a notification asks for it — once per reference, so a
   * background refresh never yanks the admin back to another tab.
   */
  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusReference || handledRef.current === focusReference) return;
    handledRef.current = focusReference;
    const match = bookings.find((b) => b.reference === focusReference);
    if (!match) return;
    setFilter("all");
  }, [focusReference, bookings]);


  /** Staff can trim or extend the extra hours before accepting — freed hours unblock instantly. */
  const changeHours = async (booking: AdminBooking, item: AdminBookingItem, extraHours: number) => {
    setBusy(booking.id);
    const res = await editHours({ data: { bookingId: booking.id, itemId: item.id, extraHours } });
    setBusy(null);
    if (!res.ok) {
      toast.error(res.message ?? "Could not update this booking.");
      return;
    }
    toast.success(`Updated to ${extraHours} extra hour${extraHours === 1 ? "" : "s"} — slot times adjusted.`);
    onChanged();
  };

  // Newest first everywhere: latest booking date, then latest created.
  // On the "All" tab, only live sessions still awaiting completion float to the
  // top; completed, cancelled and expired ones keep their chronological place.
  const rows = bookings
    .filter((b) => matchesFilter(b.status, filter))
    .slice()
    .sort((a, b) => {
      if (filter === "all") {
        const pending = (s: AdminBooking["status"]) =>
          s === "awaiting_payment" || s === "payment_pending" || s === "pending" || s === "confirmed";
        const d = Number(pending(b.status)) - Number(pending(a.status));
        if (d !== 0) return d;
      }
      return (
        (b.booking_date ?? "").localeCompare(a.booking_date ?? "") ||
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
    });


  const copyConfirmation = async (b: AdminBooking, stationName: string) => {
    try {
      await navigator.clipboard.writeText(customerMessage(b, stationName));
      toast.success("Confirmation message copied.");
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  };


  /** Approve a payment, applying any last-minute discount server-side first. */
  const approveWithDiscount = async (booking: AdminBooking, discount: number) => {
    setBusy(booking.id);
    const res = await approvePayment({ data: { bookingId: booking.id, extraDiscount: discount } });
    setBusy(null);
    if (!res.ok) {
      toast.error(res.message ?? "Could not approve this booking.");
      return;
    }
    toast.success(discount > 0 ? `Booking confirmed with ${money(discount)} discount.` : "Booking confirmed.");
    onChanged();
  };

  /** Close out a booking with the exact cash / UPI split collected at the counter. */
  const settleBooking = async (booking: AdminBooking, cash: number, upi: number, extraDiscountValue = 0) => {
    setBusy(booking.id);
    const res = await completeWithSplit({
      data: { bookingId: booking.id, cash, upi, extraDiscount: extraDiscountValue },
    });
    setBusy(null);
    if (!res.ok) {
      toast.error(res.message ?? "Could not complete this booking.");
      return;
    }
    toast.success(
      `Completed — ${cash > 0 ? `${money(cash)} cash` : ""}${cash > 0 && upi > 0 ? " + " : ""}${upi > 0 ? `${money(upi)} UPI` : ""} recorded.`,
    );
    onChanged();
  };


  /** Menu id -> category, so receipts can group food lines. */
  const categories = new Map(menu.map((m) => [m.id, m.category] as const));

  const printReceipt = (b: AdminBooking, stationName: string) =>
    printBookingReceipt(b, stationName, undefined, categories);

  /**
   * Voids a booking: it stays visible under "Rejected" but the ledger entry is
   * cancelled, so its money drops out of reports, analytics and reconciliation.
   */
  const removeBooking = async (b: AdminBooking) => {
    if (!window.confirm(`Remove ${b.reference}? It will be marked cancelled and its money removed from all reports.`))
      return;
    await setStatus(b, "cancelled");
  };

  const setStatus = async (
    booking: AdminBooking,
    status: "confirmed" | "cancelled" | "completed",
    paymentMode?: "upi" | "cash",
  ) => {
    setBusy(booking.id);
    const { error } = await supabase
      .from("bookings")
      .update(paymentMode ? { status, payment_mode: paymentMode } : { status })
      .eq("id", booking.id);
    setBusy(null);
    if (error) {
      toast.error("Could not update this booking.");
      return;
    }
    toast.success(
      status === "confirmed"
        ? "Booking confirmed."
        : status === "completed"
          ? "Marked completed — loyalty visit counted."
          : "Removed — kept as cancelled and excluded from all reports.",
    );
    onChanged();
  };

  return (
    <Panel
      title="Booking requests"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (refreshing) return;
              setRefreshing(true);
              void Promise.resolve(onChanged()).finally(() => setRefreshing(false));
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] transition-colors",
                filter === f
                  ? "border-cyan/50 bg-cyan/10 text-cyan"
                  : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {LABEL[f]}
            </button>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No {LABEL[filter].toLowerCase()} bookings.</p>
      ) : (
        <div className="flex flex-wrap items-start justify-start gap-3">
          {rows.map((b) => {
            const open = openId === b.id;
            const cockpit = b.booking_items.filter((i) => i.kind === "addon");
            const food = b.booking_items.filter((i) => i.kind === "food");
            const stationName = b.gaming_stations?.name ?? stations.find((s) => s.id === b.station_id)?.name ?? "—";
            const serviceName =
              b.station_id && stationName !== "—"
                ? stationName
                : b.booking_items
                    .filter((i) => i.kind === "addon" && i.station_id)
                    .map((i) => i.label)
                    .join(", ") ||
                  (b.booking_items.some((i) => i.kind === "food") ? "Food only" : "Passes only");
            const visitLevel = visitsByPhone.get(b.customer_phone.replace(/\D/g, "").slice(-10)) ?? 0;
            const displayedLevel = visitLevel + 1;
            const gameLabel = bookingGameLabel(b, serviceName);
            // Pass-only bookings have no gaming slot at all.
            const slot = bookingWindow(b);
            const hasSlot = Boolean(slot.start && slot.end);
            const duration = hasSlot
              ? Math.max(
                  30,
                  (Number(slot.end!.slice(0, 2)) * 60 + Number(slot.end!.slice(3, 5))) -
                    (Number(slot.start!.slice(0, 2)) * 60 + Number(slot.start!.slice(3, 5))),
                )
              : 0;
            const countdown =
              hasSlot && !["completed", "cancelled", "expired"].includes(b.status)
                ? bookingCountdown(b.booking_date, slot.start, slot.end, countdownNow)
                : null;
            return (
              <article
                key={b.id}
                className="w-full flex-none overflow-hidden rounded-3xl border border-border bg-surface/50 transition-colors hover:border-cyan/30 sm:w-[375px] sm:min-w-[355px] sm:max-w-[385px]"
              >
                <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold">{b.customer_name}</h3>
                      <StatusPill status={b.status} />
                      <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {b.reference}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(`${b.booking_date}T00:00:00`).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      ·{" "}
                      {(() => {
                        const { start, end } = bookingWindow(b);
                        return (
                          <>
                            {start && end ? (
                              <>
                                <span className="font-bold text-foreground">
                                  {formatTime(start)} – {formatTime(end)}
                                </span>
                                {" · "}
                                <span className="font-bold text-foreground">
                                  {durationLabel(start, end)}
                                </span>
                                {" · "}
                              </>
                            ) : null}
                            {b.players}P
                          </>
                        );
                      })()}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                    <div className="w-fit min-w-28 rounded-xl border border-violet/50 bg-violet/20 px-3 py-2 text-center text-foreground shadow-sm">
                      <p className="max-w-40 text-xs font-black leading-tight">{gameLabel}</p>
                      <p className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.16em]">
                        Level {displayedLevel}
                      </p>
                    </div>
                    <p className="text-lg font-black">{money(b.total_amount)}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                      <a
                        href={`tel:${b.customer_phone}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan"
                      >
                        <Phone className="size-3" /> {b.customer_phone}
                      </a>
                      <a
                        href={`https://wa.me/${waNumber(b.customer_phone)}?text=${encodeURIComponent(customerMessage(b, stationName))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
                      >
                        <MessageCircle className="size-3" /> WhatsApp
                      </a>
                    </div>
                    {countdown ? (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-cyan/35 bg-cyan/10 px-2.5 py-1.5 text-cyan">
                        <Clock className="size-3.5" aria-hidden="true" />
                        <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em]">Time left</span>
                        <span className="min-w-[3.5rem] text-right font-mono text-sm font-black tabular-nums">{countdown}</span>
                      </div>
                    ) : null}
                  </div>


                  <div className="flex w-full flex-wrap items-center gap-2">
                    {b.status === "payment_pending" || b.status === "pending" || b.status === "awaiting_payment" ? (
                      <>
                        <AdminButton
                          variant="success"
                          disabled={busy === b.id}
                          onClick={() => {
                            setExtraDiscount("");
                            setApproving(b);
                          }}

                        >
                          Approve
                        </AdminButton>
                        <AdminButton
                          variant="danger"
                          disabled={busy === b.id}
                          onClick={() => void setStatus(b, "cancelled")}
                        >
                          {b.status === "awaiting_payment" ? "Cancel" : "Decline"}
                        </AdminButton>
                      </>

                    ) : b.status === "confirmed" ? (
                      <>
                        <AdminButton disabled={busy === b.id} onClick={() => setAddingFood(b)}>
                          <UtensilsCrossed className="size-3.5" /> Add food
                        </AdminButton>
                        {hasSlot ? (
                          <AdminButton
                            variant="primary"
                            disabled={busy === b.id}
                            onClick={() => void openExtend(b)}
                          >
                            <Clock className="size-3.5" /> Extend session
                          </AdminButton>
                        ) : null}
                        <AdminButton
                          variant="success"
                          disabled={busy === b.id}
                          onClick={() => {
                            setSplitCash("");
                            setSplitUpi("");
                            setExtraDiscount("");
                            setSettling(b);
                          }}
                        >
                          Mark completed
                        </AdminButton>

                        <AdminButton variant="download" onClick={() => printReceipt(b, stationName)}>
                          <Printer className="size-3.5" /> Receipt
                        </AdminButton>
                        <AdminButton variant="danger" disabled={busy === b.id} onClick={() => void removeBooking(b)}>
                          <Trash2 className="size-3.5" /> Remove
                        </AdminButton>
                      </>
                    ) : b.status === "completed" ? (
                      <>
                        <AdminButton variant="download" onClick={() => printReceipt(b, stationName)}>
                          <Printer className="size-3.5" /> Receipt
                        </AdminButton>
                        <AdminButton onClick={() => void copyConfirmation(b, stationName)}>
                          <Copy className="size-3.5" /> Copy summary
                        </AdminButton>
                        <AdminButton variant="danger" disabled={busy === b.id} onClick={() => void removeBooking(b)}>
                          <Trash2 className="size-3.5" /> Remove
                        </AdminButton>
                      </>
                    ) : null}

                    <AdminButton onClick={() => setOpenId(open ? null : b.id)}>
                      Details <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
                    </AdminButton>
                  </div>

                </div>

                <div
                  className={cn(
                    "grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-4 border-t border-border/70 p-4 text-sm sm:grid-cols-2 sm:p-5">
                      <div className="space-y-1.5">
                        <Detail label="Email" value={b.customer_email ?? "—"} />
                        <Detail
                          label="Station / experience"
                          value={
                            b.station_id && stationName !== "—"
                              ? stationName
                              : cockpit.filter((c) => c.station_id).map((c) => c.label).join(", ") || stationName
                          }
                        />
                        <Detail label="Players" value={`${b.players} ${b.players === 1 ? "player" : "players"}`} />
                        <Detail
                          label="Slot"
                          value={
                            hasSlot
                              ? `${formatTime(slot.start!)} – ${formatTime(slot.end!)} (${durationLabel(slot.start, slot.end)})${
                                  b.reward_minutes
                                    ? ` · incl. ${b.reward_minutes} min loyalty free`
                                    : ""
                                }`
                              : "No timed slot"
                          }
                        />

                        {b.game_title ? <Detail label="Game" value={b.game_title} /> : null}
                        <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                          <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cyan">
                            Payment
                          </p>
                          {b.payment_utr ? (
                            <div className="mb-2 rounded-xl border-2 border-pink-500/60 bg-pink-500/10 px-3 py-2">
                              <p className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-pink-600">
                                UTR / Txn reference
                              </p>
                              <p className="mt-1 font-mono text-base font-black tracking-wide break-all text-pink-700">
                                {b.payment_utr}
                              </p>
                            </div>
                          ) : (
                            <Detail label="UTR / Txn" value="Not submitted" />
                          )}

                          <Detail
                            label="Submitted"
                            value={
                              b.payment_submitted_at
                                ? new Date(b.payment_submitted_at).toLocaleString("en-IN")
                                : "—"
                            }
                          />
                          <Detail
                            label="Payment mode"
                            value={b.payment_mode === "upi" ? "UPI" : b.payment_mode === "cash" ? "Cash" : "Not recorded"}
                          />
                          {b.payment_note ? <Detail label="Guest note" value={b.payment_note} /> : null}
                        </div>

                        <ItemList
                          title="Experiences"
                          items={cockpit.filter((c) => c.station_id)}
                          empty="Not added"
                        />
                        <ItemList
                          title="Passes & offers"
                          items={cockpit.filter((c) => !c.station_id)}
                          empty="None"
                        />
                        <ItemList title="Food & drinks" items={food} empty="None" />

                        {cockpit.filter((c) => Number(c.extra_hour_price) > 0).length ? (
                          <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                            <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cyan">
                              Extra hours (editable)
                            </p>
                            <ul className="space-y-2">
                              {cockpit
                                .filter((c) => Number(c.extra_hour_price) > 0)
                                .map((c) => (
                                  <li key={c.id} className="flex items-center justify-between gap-3">
                                    <span className="min-w-0 text-xs">
                                      <span className="block truncate font-semibold">{c.label}</span>
                                      <span className="text-[0.65rem] text-muted-foreground">
                                        {c.start_time ? formatTime(c.start_time) : ""}
                                        {c.end_time ? ` – ${formatTime(c.end_time)}` : ""} ·{" "}
                                        {money(Number(c.extra_hour_price))}/extra hr
                                      </span>
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2">
                                      <AdminButton
                                        disabled={busy === b.id || Number(c.extra_hours) === 0}
                                        onClick={() => void changeHours(b, c, Number(c.extra_hours) - 1)}
                                      >
                                        −
                                      </AdminButton>
                                      <span className="w-5 text-center text-sm font-black">
                                        {Number(c.extra_hours)}
                                      </span>
                                      <AdminButton
                                        disabled={busy === b.id}
                                        onClick={() => void changeHours(b, c, Number(c.extra_hours) + 1)}
                                      >
                                        +
                                      </AdminButton>
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                        <Detail label="Coupon" value={b.coupon_code ?? "None"} />
                        <Detail label="Notes" value={b.special_instructions ?? "—"} />
                      </div>
                      <div className="space-y-1.5 rounded-2xl border border-border/70 bg-background/40 p-4">
                        <Detail
                          label={`Session${hasSlot ? ` (${duration} min · ${b.players}P)` : ""}`}
                          value={money(b.session_amount)}
                        />
                        <Detail label="Add-ons & passes" value={money(b.addons_amount)} />
                        <Detail label="Food" value={money(b.food_amount)} />
                        {b.student_discount ? (
                          <Detail label="Student discount (20%)" value={`- ${money(b.student_discount_amount)}`} />
                        ) : null}
                        <Detail label="Total discount" value={`- ${money(b.discount_amount)}`} />
                        <Detail label="Tax" value={money(b.tax_amount)} />

                        <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Total
                          </span>
                          <span className="text-lg font-black">{money(b.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {approving ? (
        <ModalPortal onClose={() => setApproving(null)}>
          <div className="mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-sm font-black uppercase tracking-[0.18em]">Verify Payment</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Confirm this booking. You will record how it was paid — and apply any last-minute discount — when you
              mark it completed.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {approving.reference} · {approving.customer_name} · {money(approving.total_amount)}
            </p>

            <div className="mt-4 rounded-2xl border-2 border-pink-500/60 bg-pink-500/10 px-4 py-3">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-pink-600">
                UTR / Txn reference
              </p>
              <p className="mt-1 font-mono text-lg font-black tracking-wide break-all text-pink-700">
                {approving.payment_utr ?? "Not submitted"}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <AdminButton onClick={() => setApproving(null)}>Cancel</AdminButton>
              <AdminButton
                variant="success"
                disabled={busy === approving.id}
                onClick={() => {
                  const booking = approving;
                  setApproving(null);
                  void approveWithDiscount(booking, 0);
                }}
              >
                Approve Payment
              </AdminButton>
            </div>

          </div>
        </ModalPortal>
      ) : null}

      {settling ? (
        <SettleDialog
          booking={settling}
          cash={splitCash}
          upi={splitUpi}
          discount={extraDiscount}
          busy={busy === settling.id}
          onCash={setSplitCash}
          onUpi={setSplitUpi}
          onDiscount={setExtraDiscount}
          onClose={() => setSettling(null)}
          onConfirm={(cash, upi, discount) => {
            const booking = settling;
            setSettling(null);
            void settleBooking(booking, cash, upi, discount);
          }}
        />
      ) : null}



      {addingFood ? (
        <AddFoodDialog
          booking={addingFood}
          menu={menu}
          onClose={() => setAddingFood(null)}
          onSaved={onChanged}
        />
      ) : null}

      {extendConfirm ? (
        <ModalPortal onClose={() => setExtendConfirm(null)}>
          <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-sm font-black uppercase tracking-[0.18em]">Extend this session?</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Extend this booking by {extendQuote?.label ?? "the next step"}?
            </p>
            <div className="mt-4 rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Players</span>
                <span className="font-bold">{extendConfirm.players ?? 1}</span>
              </p>
              {extendQuote?.pass ? (
                <>
                  <p className="mt-1.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Pass {extendQuote.pass.code}</span>
                    <span className="font-bold">Paid by pass</span>
                  </p>
                  <p className="mt-1.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Current balance</span>
                    <span className="font-black">{hoursLabel(extendQuote.pass.before)}</span>
                  </p>
                  <p className="mt-1.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Balance after extend</span>
                    <span className="font-black">{hoursLabel(extendQuote.pass.after)}</span>
                  </p>
                  {!extendQuote.pass.enough ? (
                    <p className="mt-3 rounded-xl border border-rose-400/50 bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-500">
                      Balance finished — please do a separate booking for the extra time.
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mt-1.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Extra {extendQuote?.label ?? "time"} charge</span>
                    <span className="font-black">
                      {extendQuote === null ? "Calculating…" : money(extendQuote.price)}
                    </span>
                  </p>
                  <p className="mt-1.5 flex items-center justify-between">
                    <span className="text-muted-foreground">New booking total</span>
                    <span className="font-black">
                      {extendQuote === null ? "…" : money(extendQuote.newTotal)}
                    </span>
                  </p>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <AdminButton onClick={() => setExtendConfirm(null)}>Cancel</AdminButton>
              <AdminButton
                variant="primary"
                disabled={busy === extendConfirm.id || extendQuote?.pass?.enough === false}
                onClick={() => {
                  const b = extendConfirm;
                  setExtendConfirm(null);
                  void extend(b);
                }}
              >
                Yes, extend {extendQuote?.label ?? ""}
              </AdminButton>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {extendChoice ? (
        <ModalPortal onClose={() => setExtendChoice(null)}>
          <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-sm font-black uppercase tracking-[0.18em]">Console not free</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Sorry — this console is already booked for{" "}
              {extendChoice.window.start
                ? `${formatTime(extendChoice.window.start)} – ${formatTime(extendChoice.window.end)}`
                : "the next hour"}
              . {extendChoice.message}
            </p>
            {extendChoice.alternatives.length ? (
              <>
                <p className="mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Free right now — switch and keep playing
                </p>
                <ul className="mt-2 space-y-2">
                  {extendChoice.alternatives.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/40 px-4 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{a.name}</span>
                        <span className="text-[0.65rem] text-muted-foreground">{money(a.price)} / hour</span>
                      </span>
                      <AdminButton
                        variant="primary"
                        disabled={busy === extendChoice.booking.id}
                        onClick={() => void extend(extendChoice.booking, a.id)}
                      >
                        Use this
                      </AdminButton>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                No other console is free for that hour either.
              </p>
            )}
            <div className="mt-5 flex justify-end">
              <AdminButton onClick={() => setExtendChoice(null)}>Close</AdminButton>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </Panel>

  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="text-right text-xs text-foreground">{value}</span>
    </div>
  );
}

/** Full itemised list — every line the guest saw in their summary, with times and price. */
function ItemList({ title, items, empty }: { title: string; items: AdminBookingItem[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
      <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cyan">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 text-xs">
              <span className="min-w-0">
                <span className="block font-semibold">
                  {i.quantity} × {i.label}
                </span>
                <span className="text-[0.65rem] text-muted-foreground">
                  {i.start_time && i.end_time
                    ? `${formatTime(i.start_time)} – ${formatTime(i.end_time)} · ${durationLabel(i.start_time, i.end_time)}`
                    : `${money(Number(i.unit_price))} each`}
                  {Number(i.extra_hours) ? ` · +${Number(i.extra_hours)} extra hr` : ""}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{money(Number(i.line_total))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export function StatusPill({ status }: { status: AdminBooking["status"] }) {
  if (status === "confirmed") return <Pill tone="good">Confirmed</Pill>;
  if (status === "completed") return <Pill tone="good">Completed</Pill>;
  if (status === "awaiting_payment") return <Pill tone="warn">Awaiting payment</Pill>;
  if (status === "payment_pending" || status === "pending")
    return <Pill tone="warn">Verify payment</Pill>;
  if (status === "cancelled") return <Pill tone="bad">Rejected</Pill>;
  if (status === "expired") return <Pill tone="muted">Expired</Pill>;
  return <Pill tone="muted">{status}</Pill>;
}


/**
 * Collects the exact cash / UPI split when a booking is closed out.
 * The bill can only be settled when the remaining amount reaches ₹0, so the
 * ledger, reports and reconciliation always add up to the booking total.
 */
function SettleDialog({
  booking,
  cash,
  upi,
  discount,
  busy,
  onCash,
  onUpi,
  onDiscount,
  onClose,
  onConfirm,
}: {
  booking: AdminBooking;
  cash: string;
  upi: string;
  discount: string;
  busy: boolean;
  onCash: (v: string) => void;
  onUpi: (v: string) => void;
  onDiscount: (v: string) => void;
  onClose: () => void;
  onConfirm: (cash: number, upi: number, discount: number) => void;
}) {
  const billed = Math.round(Number(booking.total_amount) || 0);
  const discountValue = Math.min(billed, Math.max(0, Math.round(Number(discount) || 0)));
  const total = Math.max(0, billed - discountValue);
  const cashValue = Math.max(0, Math.round(Number(cash) || 0));
  const upiValue = Math.max(0, Math.round(Number(upi) || 0));
  const remaining = total - cashValue - upiValue;


  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    fill: () => void,
  ) => (
    <label className="block space-y-1.5">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {label} (₹)
      </span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full rounded-2xl border border-border bg-surface/70 px-3 py-2 text-sm tabular-nums outline-none focus:border-cyan/50"
        />
        <button
          type="button"
          onClick={fill}
          className="shrink-0 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-cyan transition-colors hover:bg-cyan/20"
        >
          Full amount
        </button>
      </span>
    </label>
  );

  return (
    <ModalPortal onClose={onClose}>
      <div className="mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl">
        <h3 className="text-sm font-black uppercase tracking-[0.18em]">Collect payment</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {booking.reference} · {booking.customer_name}
        </p>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-background/40 px-4 py-3">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Total bill
          </span>
          <span className="text-right">
            {discountValue > 0 ? (
              <span className="mr-2 text-xs text-muted-foreground line-through tabular-nums">{money(billed)}</span>
            ) : null}
            <span className="text-lg font-black tabular-nums">{money(total)}</span>
          </span>
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Last-minute discount (₹)
          </span>
          <input
            type="number"
            min={0}
            max={billed}
            value={discount}
            onChange={(e) => {
              onDiscount(e.target.value);
              onCash("");
              onUpi("");
            }}
            placeholder="0"
            className="w-full rounded-2xl border border-border bg-surface/70 px-3 py-2 text-sm tabular-nums outline-none focus:border-cyan/50"
          />
        </label>

        <div className="mt-4 space-y-3">
          {field("Cash", cash, onCash, () => {
            onCash(String(total));
            onUpi("0");
          })}
          {field("UPI", upi, onUpi, () => {
            onUpi(String(total));
            onCash("0");
          })}
        </div>


        <div
          className={cn(
            "mt-4 flex items-center justify-between rounded-2xl border px-4 py-3",
            remaining === 0
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
              : "border-amber-500/40 bg-amber-500/10 text-amber-600",
          )}
        >
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em]">Remaining</span>
          <span className="text-base font-black tabular-nums">{money(remaining)}</span>
        </div>
        {remaining !== 0 ? (
          <p className="mt-2 text-[0.65rem] text-muted-foreground">
            {remaining > 0
              ? "Cash + UPI must add up to the total bill before you can complete this booking."
              : "The entered amounts exceed the total bill."}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            variant="success"
            disabled={busy || remaining !== 0}
            onClick={() => onConfirm(cashValue, upiValue, discountValue)}
          >
            Complete booking
          </AdminButton>
        </div>
      </div>
    </ModalPortal>
  );
}
