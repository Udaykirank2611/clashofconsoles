import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  QrCode,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { getPaymentDetails, submitPaymentUtr } from "@/lib/booking.functions";
import { formatTime, inr } from "@/lib/booking/pricing";
import { cn } from "@/lib/utils";

const TITLE = "Complete Payment — Clash of Consoles";
const DESC =
  "Pay for your Clash of Consoles booking over UPI and submit your transaction reference for verification.";

export const Route = createFileRoute("/pay/$reference")({
  component: PaymentPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting Payment",
  payment_pending: "Payment Verification Pending",
  pending: "Payment Verification Pending",
  confirmed: "Confirmed",
  cancelled: "Rejected",
  expired: "Expired",
  completed: "Completed",
};

const STATUS_CLASS: Record<string, string> = {
  awaiting_payment: "border-orange-400/40 bg-orange-400/10 text-orange-300",
  payment_pending: "border-yellow-300/40 bg-yellow-300/10 text-yellow-200",
  pending: "border-yellow-300/40 bg-yellow-300/10 text-yellow-200",
  confirmed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  cancelled: "border-red-400/40 bg-red-400/10 text-red-300",
  expired: "border-white/15 bg-white/5 text-muted-foreground",
  completed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
};

function PaymentPage() {
  const { reference } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetails = useServerFn(getPaymentDetails);
  const submitFn = useServerFn(submitPaymentUtr);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment", reference],
    queryFn: () => fetchDetails({ data: { reference } }),
    refetchInterval: 20_000,
  });

  const [utr, setUtr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const booking = data?.booking;
  const settings = data?.settings;
  const status = booking?.status ?? "";
  const awaiting = status === "awaiting_payment";

  const remaining = useMemo(() => {
    if (!awaiting || !booking?.payment_expires_at) return null;
    return Math.max(0, Math.floor((new Date(booking.payment_expires_at).getTime() - now) / 1000));
  }, [awaiting, booking?.payment_expires_at, now]);

  useEffect(() => {
    if (remaining === 0) void refetch();
  }, [remaining, refetch]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  };

  const submit = async () => {
    if (utr.trim().length < 4) {
      toast.error("Enter the UTR / transaction number from your UPI app.");
      return;
    }
    setBusy(true);
    const res = await submitFn({ data: { reference, utr: utr.trim(), note: note.trim() } });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.message ?? "Could not submit your payment.");
      void refetch();
      return;
    }
    toast.success("Payment submitted — we're verifying it now.");
    void refetch();
  };

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-8 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-cyan"
        >
          <ArrowLeft className="size-3.5" /> Home
        </Link>
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan">
          Payment
        </span>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <h1 className="sr-only">Complete your payment</h1>

        {isLoading ? (
          <div className="grid min-h-[50vh] place-items-center">
            <Loader2 className="size-6 animate-spin text-cyan" />
          </div>
        ) : !booking || !settings ? (
          <div className="rounded-4xl border border-border bg-surface/70 p-10 text-center backdrop-blur-2xl">
            <h2 className="text-2xl font-extrabold">Booking not found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't find a booking with the reference {reference}.
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/book" })}
              className="mt-8 inline-flex rounded-2xl bg-linear-to-r from-primary via-cyan to-violet px-7 py-3.5 text-sm font-extrabold text-primary-foreground"
            >
              Start a new booking
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Booking header */}
            <section className="relative overflow-hidden rounded-4xl border border-border bg-surface/70 p-6 backdrop-blur-2xl sm:p-8">
              <div
                className="absolute -right-16 -top-16 size-52 rounded-full bg-violet/15 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan">
                    Booking ID
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-widest">{booking.reference}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.2em]",
                    STATUS_CLASS[status] ?? STATUS_CLASS["expired"],
                  )}
                >
                  {STATUS_LABEL[status] ?? status}
                </span>
              </div>

              <div className="relative mt-6 grid gap-4 rounded-3xl border border-border bg-background/40 p-5 sm:grid-cols-2">
                <Info label="Branch" value={booking.branch_name} />
                <Info label="Console" value={booking.station_name || "Passes only"} />
                <Info
                  label="Date"
                  value={new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                />
                <Info
                  label="Time"
                  value={
                    booking.start_time && booking.end_time
                      ? `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
                      : "—"
                  }
                  sub={
                    booking.reward_minutes
                      ? `Includes ${booking.reward_minutes} min loyalty free time`
                      : undefined
                  }
                />

                <Info label="Players" value={`${booking.players} ${booking.players === 1 ? "player" : "players"}`} />
                <Info label="Guest" value={booking.customer_name} sub={booking.customer_phone} />
              </div>

              {booking.items.length ? (
                <ul className="relative mt-5 space-y-2 border-t border-border pt-5 text-sm">
                  {booking.items.map((i, idx) => (
                    <li key={idx} className="flex items-start justify-between gap-4">
                      <span className="text-foreground/85">
                        {i.quantity} × {i.label}
                        {i.start_time && i.end_time ? (
                          <span className="block text-xs text-muted-foreground">
                            {formatTime(i.start_time)} – {formatTime(i.end_time)}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-semibold tabular-nums">{inr(i.line_total)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="relative mt-5 flex items-end justify-between border-t border-border pt-5">
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Amount payable
                </span>
                <span className="text-gradient text-3xl font-black">{inr(booking.total_amount)}</span>
              </div>

              {remaining !== null ? (
                <div className="relative mt-5 flex w-fit items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-xs font-bold text-orange-300">
                  <Timer className="size-3.5" />
                  {remaining > 0
                    ? `Slot reserved · ${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
                        remaining % 60,
                      ).padStart(2, "0")} left to pay`
                    : "Reservation expired"}
                </div>
              ) : null}
            </section>

            {status === "payment_pending" || status === "pending" ? (
              <StateCard
                tone="yellow"
                title="Payment submitted — verification pending"
                body="We've received your transaction details. Our team is verifying the payment and will confirm your booking shortly. You can close this page; your booking is safe."
                extra={booking.payment_utr ? `UTR · ${booking.payment_utr}` : undefined}
              />
            ) : null}

            {status === "confirmed" || status === "completed" ? (
              <StateCard
                tone="green"
                title="Payment verified — booking confirmed"
                body="See you at the arena! Please arrive 10 minutes before your slot."
                extra={booking.payment_utr ? `UTR · ${booking.payment_utr}` : undefined}
              />
            ) : null}

            {status === "cancelled" ? (
              <StateCard
                tone="red"
                title="Booking rejected"
                body="This booking was rejected and the slot has been released. Please contact us or make a new booking."
              />
            ) : null}

            {status === "expired" ? (
              <StateCard
                tone="gray"
                title="Booking expired"
                body="No payment was submitted in time, so the slot was released. Please make a new booking."
              />
            ) : null}

            {awaiting ? (
              <>
                {/* Instructions + QR */}
                <section className="rounded-4xl border border-border bg-surface/70 p-6 backdrop-blur-2xl sm:p-8">
                  <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-cyan">
                    Payment instructions
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">{settings.instructions}</p>

                  <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div className="mx-auto grid size-56 place-items-center overflow-hidden rounded-3xl border border-border bg-background/60">
                      {settings.qr_image_url ? (
                        <img
                          src={settings.qr_image_url}
                          alt={`UPI QR code for ${settings.account_name}`}
                          className="size-full object-contain p-2"
                        />
                      ) : (
                        <span className="grid place-items-center gap-2 text-muted-foreground">
                          <QrCode className="size-16" />
                          <span className="text-[0.6rem] uppercase tracking-[0.2em]">
                            QR code coming soon
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl border border-border bg-background/40 p-4">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          UPI ID
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="truncate text-base font-extrabold">{settings.upi_id}</p>
                          <button
                            type="button"
                            onClick={() => void copy(settings.upi_id, "UPI ID")}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] transition-colors hover:border-cyan/50 hover:text-cyan"
                          >
                            <Copy className="size-3.5" /> Copy UPI
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {settings.account_name}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border bg-background/40 p-4">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          Amount
                        </p>
                        <p className="mt-1 text-2xl font-black">{inr(booking.total_amount)}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* UTR form */}
                <section className="rounded-4xl border border-border bg-surface/70 p-6 backdrop-blur-2xl sm:p-8">
                  <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-cyan">
                    Confirm your payment
                  </h2>
                  <div className="mt-5 grid gap-4">
                    <label className="block">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Transaction / UTR number
                      </span>
                      <input
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="e.g. 412345678901"
                        className="mt-2 w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-colors focus:border-cyan/60"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Optional note
                      </span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Anything we should know?"
                        className="mt-2 w-full resize-none rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-colors focus:border-cyan/60"
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void submit()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-primary via-cyan to-violet px-6 py-3 text-xs font-extrabold uppercase tracking-[0.18em] text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.99] disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                      Submit payment
                    </button>
                    <Link
                      to="/book"
                      className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-3 text-xs font-extrabold uppercase tracking-[0.18em] transition-colors hover:border-cyan/40 hover:text-cyan"
                    >
                      <ArrowLeft className="size-3.5" /> Back
                    </Link>
                  </div>

                  <p className="mt-5 flex items-center gap-2 text-[0.68rem] text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-cyan" />
                    Your slot is reserved while you pay. We verify every payment manually before
                    confirming.
                  </p>
                </section>
              </>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  yellow: "border-yellow-300/30 bg-yellow-300/5 text-yellow-200",
  green: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
  red: "border-red-400/30 bg-red-400/5 text-red-300",
  gray: "border-white/12 bg-white/5 text-muted-foreground",
};

function StateCard({
  tone,
  title,
  body,
  extra,
}: {
  tone: keyof typeof TONES;
  title: string;
  body: string;
  extra?: string | undefined;
}) {
  return (
    <section className={cn("rounded-4xl border p-6 backdrop-blur-2xl sm:p-8", TONES[tone])}>
      <h2 className="flex items-center gap-2 text-lg font-black">
        <CheckCircle2 className="size-5" /> {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {extra ? (
        <p className="mt-3 text-[0.62rem] font-bold uppercase tracking-[0.2em]">{extra}</p>
      ) : null}
    </section>
  );
}
