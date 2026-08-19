import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, Panel, Pill, money } from "./primitives";
import type { AdminBooking, AdminBookingItem, AdminMenuItem, AdminStation } from "@/lib/admin/useBranchData";
import { formatTime } from "@/lib/booking/pricing";
import { ChevronDown, Copy, MessageCircle, Phone, Printer, RefreshCw, Trash2, UtensilsCrossed } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { updateBookingExtraHours } from "@/lib/admin.functions";
import { approveBookingPayment, completeBookingWithSplit } from "@/lib/booking-admin.functions";
import { AddFoodDialog } from "./AddFoodDialog";
import { bookingSummaryLine, bookingWindow, printBookingReceipt } from "./receipt";
import { cn } from "@/lib/utils";

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
    ? true
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

/** Normalise an Indian mobile number to wa.me E.164 digits. */
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? `91${digits}` : digits;
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
  onChanged,
  focusReference,
}: {
  bookings: AdminBooking[];
  stations: AdminStation[];
  /** Branch menu, used by the "Add food" flow on confirmed bookings. */
  menu?: AdminMenuItem[];
  onChanged: () => void;
  /** Booking reference to open automatically (e.g. from a notification). */
  focusReference?: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("payment_pending");
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
  const approvePayment = useServerFn(approveBookingPayment);
  const completeWithSplit = useServerFn(completeBookingWithSplit);
  const editHours = useServerFn(updateBookingExtraHours);


  useEffect(() => {
    if (!focusReference) return;
    const match = bookings.find((b) => b.reference === focusReference);
    if (!match) return;
    setFilter("all");
    setOpenId(match.id);
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

  const rows = bookings.filter((b) => matchesFilter(b.status, filter));

  const copyConfirmation = async (b: AdminBooking, stationName: string) => {
    try {
      await navigator.clipboard.writeText(confirmationText(b, stationName));
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
  const settleBooking = async (booking: AdminBooking, cash: number, upi: number) => {
    setBusy(booking.id);
    const res = await completeWithSplit({ data: { bookingId: booking.id, cash, upi } });
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
        <div className="space-y-3">
          {rows.map((b) => {
            const open = openId === b.id;
            const cockpit = b.booking_items.filter((i) => i.kind === "addon");
            const food = b.booking_items.filter((i) => i.kind === "food");
            const stationName = b.gaming_stations?.name ?? stations.find((s) => s.id === b.station_id)?.name ?? "—";
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
            return (
              <article
                key={b.id}
                className="overflow-hidden rounded-3xl border border-border bg-surface/50 transition-colors hover:border-cyan/30"
              >
                <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
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
                      {` · ${bookingSummaryLine(b, stationName)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black">{money(b.total_amount)}</p>
                    <a
                      href={`tel:${b.customer_phone}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan"
                    >
                      <Phone className="size-3" /> {b.customer_phone}
                    </a>
                    <a
                      href={`https://wa.me/${waNumber(b.customer_phone)}?text=${encodeURIComponent(confirmationText(b, stationName))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      <MessageCircle className="size-3" /> WhatsApp
                    </a>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
                        <AdminButton onClick={() => void copyConfirmation(b, stationName)}>
                          <Copy className="size-3.5" /> Copy confirmation
                        </AdminButton>
                        <AdminButton disabled={busy === b.id} onClick={() => setAddingFood(b)}>
                          <UtensilsCrossed className="size-3.5" /> Add food
                        </AdminButton>
                        <AdminButton
                          variant="success"
                          disabled={busy === b.id}
                          onClick={() => {
                            setSplitCash("");
                            setSplitUpi("");
                            setSettling(b);
                          }}
                        >
                          Mark completed
                        </AdminButton>

                        <AdminButton onClick={() => printReceipt(b, stationName)}>
                          <Printer className="size-3.5" /> Receipt
                        </AdminButton>
                        <AdminButton variant="danger" disabled={busy === b.id} onClick={() => void removeBooking(b)}>
                          <Trash2 className="size-3.5" /> Remove
                        </AdminButton>
                      </>
                    ) : b.status === "completed" ? (
                      <>
                        <AdminButton onClick={() => printReceipt(b, stationName)}>
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
                          <Detail label="UTR / Txn" value={b.payment_utr ?? "Not submitted"} />
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
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setApproving(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl"
          >
            <h3 className="text-sm font-black uppercase tracking-[0.18em]">Verify Payment</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Confirm this booking. You will record how it was paid when you mark it completed.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {approving.reference} · {approving.customer_name} · {money(approving.total_amount)}
            </p>

            <label className="mt-4 block space-y-1.5">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Last-minute discount (₹)
              </span>
              <input
                type="number"
                min={0}
                max={approving.total_amount}
                value={extraDiscount}
                onChange={(e) => setExtraDiscount(e.target.value)}
                placeholder="0"
                className="w-full rounded-2xl border border-border bg-surface/70 px-3 py-2 text-sm outline-none focus:border-cyan/50"
              />
              <span className="block text-[0.65rem] text-muted-foreground">
                Payable after discount:{" "}
                <span className="font-semibold text-foreground">
                  {money(Math.max(0, approving.total_amount - (Number(extraDiscount) || 0)))}
                </span>
              </span>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <AdminButton onClick={() => setApproving(null)}>Cancel</AdminButton>
              <AdminButton
                variant="success"
                disabled={busy === approving.id}
                onClick={() => {
                  const booking = approving;
                  setApproving(null);
                  void approveWithDiscount(booking, Number(extraDiscount) || 0);
                }}
              >
                Approve Payment
              </AdminButton>
            </div>
          </div>
        </div>
      ) : null}

      {settling ? (
        <SettleDialog
          booking={settling}
          cash={splitCash}
          upi={splitUpi}
          busy={busy === settling.id}
          onCash={setSplitCash}
          onUpi={setSplitUpi}
          onClose={() => setSettling(null)}
          onConfirm={(cash, upi) => {
            const booking = settling;
            setSettling(null);
            void settleBooking(booking, cash, upi);
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
  busy,
  onCash,
  onUpi,
  onClose,
  onConfirm,
}: {
  booking: AdminBooking;
  cash: string;
  upi: string;
  busy: boolean;
  onCash: (v: string) => void;
  onUpi: (v: string) => void;
  onClose: () => void;
  onConfirm: (cash: number, upi: number) => void;
}) {
  const total = Math.round(Number(booking.total_amount) || 0);
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl"
      >
        <h3 className="text-sm font-black uppercase tracking-[0.18em]">Collect payment</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {booking.reference} · {booking.customer_name}
        </p>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-background/40 px-4 py-3">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Total bill
          </span>
          <span className="text-lg font-black tabular-nums">{money(total)}</span>
        </div>

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
            onClick={() => onConfirm(cashValue, upiValue)}
          >
            Complete booking
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
