import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { AdminButton, money } from "../primitives";
import { updateBookingDetails } from "@/lib/booking-admin.functions";
import { STATUS_CLASS, STATUS_LABEL, paymentStatus, type CalStatus } from "./status";
import { hhmm, prettyTime, type CalBooking, type CalStation } from "./types";
import { cn } from "@/lib/utils";
import { ModalPortal } from "../ModalPortal";

const STATUS_OPTIONS: CalStatus[] = [
  "awaiting_payment",
  "payment_pending",
  "confirmed",
  "completed",
  "cancelled",
  "expired",
];

const field =
  "w-full rounded-2xl border border-border bg-surface/70 px-3 py-2 text-sm outline-none focus:border-cyan/50";

/** Side panel for editing one booking. Every change is validated server-side. */
export function BookingEditPanel({
  booking,
  stations,
  onClose,
  onSaved,
}: {
  booking: CalBooking;
  stations: CalStation[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(booking.booking_date);
  const [start, setStart] = useState(hhmm(booking.start_time));
  const [end, setEnd] = useState(hhmm(booking.end_time));
  const [stationId, setStationId] = useState(booking.station_id ?? "");
  const [notes, setNotes] = useState(booking.special_instructions ?? "");
  const [status, setStatus] = useState<CalStatus>(booking.status as CalStatus);
  const [payMode, setPayMode] = useState(booking.payment_mode ?? "none");
  const [saving, setSaving] = useState(false);
  const save = useServerFn(updateBookingDetails);

  useEffect(() => {
    setDate(booking.booking_date);
    setStart(hhmm(booking.start_time));
    setEnd(hhmm(booking.end_time));
    setStationId(booking.station_id ?? "");
    setNotes(booking.special_instructions ?? "");
    setStatus(booking.status as CalStatus);
    setPayMode(booking.payment_mode ?? "none");
  }, [booking]);

  const submit = async () => {
    setSaving(true);
    const res = await save({
      data: {
        bookingId: booking.id,
        stationId: stationId || null,
        date,
        startTime: start || null,
        endTime: end || null,
        notes,
        status,
        paymentMode: payMode as "upi" | "cash" | "none",
      },
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.message ?? "Could not save this booking.");
      return;
    }
    toast.success("Booking updated.");
    onSaved();
  };

  return (
    <ModalPortal onClose={onClose}>
    <section className="mx-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-cyan">Edit booking</p>
          <h3 className="mt-1 text-lg font-black tracking-tight">{booking.customer_name}</h3>
          <p className="text-xs text-muted-foreground">
            {booking.reference} · {booking.customer_phone}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-border p-2">
          <X className="size-4" />
        </button>
      </header>

      <div className="mt-4 flex flex-wrap gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.16em]">
        <span className={cn("rounded-full border px-2.5 py-1", STATUS_CLASS[booking.status as CalStatus])}>
          {STATUS_LABEL[booking.status as CalStatus]}
        </span>
        <span className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-muted-foreground">
          {paymentStatus(booking)}
        </span>
        <span className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-muted-foreground">
          {booking.booking_type === "group" ? "Group pass" : "Single pass"}
        </span>
        <span className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-muted-foreground">
          {money(Number(booking.total_amount))}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Currently {prettyTime(booking.start_time)} – {prettyTime(booking.end_time)} on{" "}
        {booking.gaming_stations?.name ?? "no console"}
      </p>

      <div className="mt-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Start</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">End</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Console / service
          </span>
          <select value={stationId} onChange={(e) => setStationId(e.target.value)} className={field}>
            <option value="">No console</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status === "available" ? "" : ` (${s.status})`}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Booking status
          </span>
          <select value={status} onChange={(e) => setStatus(e.target.value as CalStatus)} className={field}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Payment status
          </span>
          <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className={field}>
            <option value="none">Not recorded</option>
            <option value="upi">Paid · UPI</option>
            <option value="cash">Paid · Cash</option>
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Notes</span>
          <textarea
            value={notes}
            rows={3}
            onChange={(e) => setNotes(e.target.value)}
            className={cn(field, "resize-none")}
          />
        </label>
      </div>

      <div className="mt-6 flex gap-2">
        <AdminButton onClick={onClose}>Cancel</AdminButton>
        <AdminButton variant="primary" disabled={saving} onClick={() => void submit()}>
          {saving ? "Saving…" : "Save changes"}
        </AdminButton>
      </div>
    </section>
    </ModalPortal>
  );
}
