import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton, Panel, Pill, money } from "./primitives";
import type { AdminBooking, AdminBookingItem, AdminStation } from "@/lib/admin/useBranchData";
import { formatTime } from "@/lib/booking/pricing";
import { ChevronDown, Copy, MessageCircle, Phone, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { updateBookingExtraHours } from "@/lib/admin.functions";
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

const confirmationText = (b: AdminBooking, stationName: string) => {
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
    `Hi ${b.customer_name}! Your booking at Clash of Consoles is CONFIRMED ✅`,
    `Booking ID: ${b.reference}`,
    `Date: ${new Date(`${b.booking_date}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })}`,
    b.start_time && b.end_time
      ? `Time: ${formatTime(b.start_time)} – ${formatTime(b.end_time)} (${durationLabel(b.start_time, b.end_time)})`
      : "Passes only",
    `Console: ${stationName}`,
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
    b.payment_utr ? `UTR: ${b.payment_utr}` : "",
    b.special_instructions ? `Notes: ${b.special_instructions}` : "",
    "Please arrive 10 minutes early. See you at the arena!",
  ]
    .filter(Boolean)
    .join("\n");
};


export function BookingsPanel({
  bookings,
  stations,
  onChanged,
  focusReference,
}: {
  bookings: AdminBooking[];
  stations: AdminStation[];
  onChanged: () => void;
  /** Booking reference to open automatically (e.g. from a notification). */
  focusReference?: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("payment_pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** Booking awaiting the "how did they pay?" confirmation dialog. */
  const [approving, setApproving] = useState<AdminBooking | null>(null);
  const [payMode, setPayMode] = useState<"upi" | "cash">("upi");
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
          : "Booking rejected — slot released.",
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
            const hasSlot = Boolean(b.start_time && b.end_time);
            const duration = hasSlot
              ? Math.max(
                  30,
                  (Number(b.end_time!.slice(0, 2)) * 60 + Number(b.end_time!.slice(3, 5))) -
                    (Number(b.start_time!.slice(0, 2)) * 60 + Number(b.start_time!.slice(3, 5))),
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
                      {hasSlot
                        ? ` · ${formatTime(b.start_time!)} · ${duration} min · ${b.players}P · ${stationName}`
                        : " · Passes only"}
                      {cockpit.length ? " + Add-ons" : ""}
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
                      href={`https://wa.me/${b.customer_phone.replace(/[^\d]/g, "").replace(/^0/, "91")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      <MessageCircle className="size-3" /> WhatsApp
                    </a>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    {b.status === "payment_pending" || b.status === "pending" ? (
                      <>
                        <AdminButton
                          variant="success"
                          disabled={busy === b.id}
                          onClick={() => {
                            setPayMode("upi");
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
                          Decline
                        </AdminButton>
                      </>
                    ) : b.status === "confirmed" ? (
                      <>
                        <AdminButton onClick={() => void copyConfirmation(b, stationName)}>
                          <Copy className="size-3.5" /> Copy confirmation
                        </AdminButton>
                        <AdminButton
                          variant="success"
                          disabled={busy === b.id}
                          onClick={() => void setStatus(b, "completed")}
                        >
                          Mark completed
                        </AdminButton>
                        <AdminButton variant="danger" disabled={busy === b.id} onClick={() => void setStatus(b, "cancelled")}>
                          Reject
                        </AdminButton>
                      </>
                    ) : b.status === "awaiting_payment" ? (
                      <AdminButton variant="danger" disabled={busy === b.id} onClick={() => void setStatus(b, "cancelled")}>
                        Cancel
                      </AdminButton>
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
                        <Detail label="Station" value={stationName} />
                        <Detail label="Players" value={`${b.players} ${b.players === 1 ? "player" : "players"}`} />
                        <Detail
                          label="Slot"
                          value={
                            hasSlot
                              ? `${formatTime(b.start_time!)} – ${formatTime(b.end_time!)} (${durationLabel(b.start_time, b.end_time)})`
                              : "Passes only"
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
            <h3 className="text-sm font-black uppercase tracking-[0.18em]">Confirm Payment</h3>
            <p className="mt-2 text-xs text-muted-foreground">Select how the customer paid.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {approving.reference} · {approving.customer_name} · {money(approving.total_amount)}
            </p>

            <div className="mt-4 space-y-2">
              {(["upi", "cash"] as const).map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
                    payMode === m ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-border bg-surface/60",
                  )}
                >
                  <input
                    type="radio"
                    name="payment-mode"
                    value={m}
                    checked={payMode === m}
                    onChange={() => setPayMode(m)}
                    className="accent-cyan"
                  />
                  {m === "upi" ? "UPI" : "Cash"}
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <AdminButton onClick={() => setApproving(null)}>Cancel</AdminButton>
              <AdminButton
                variant="success"
                disabled={busy === approving.id}
                onClick={() => {
                  const booking = approving;
                  setApproving(null);
                  void setStatus(booking, "confirmed", payMode);
                }}
              >
                Approve Payment
              </AdminButton>
            </div>
          </div>
        </div>
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

