import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Home, Loader2, PartyPopper } from "lucide-react";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { getBooking } from "@/lib/booking.functions";
import { formatTime, inr } from "@/lib/booking/pricing";
import type { BookingSummaryItem } from "@/lib/booking/types";
import {
  PRIMARY_PHONE,
  SECONDARY_PHONE,
  CONTACT_EMAIL,
  prettyPhone,
  telHref,
  waHref,
  mailHref,
} from "@/lib/contact";


const TITLE = "Booking Details — Clash of Consoles";
const DESC = "View your Clash of Consoles booking request, session details and invoice summary.";

export const Route = createFileRoute("/booking/$reference")({
  component: BookingDetails,
  validateSearch: (s: Record<string, unknown>) => ({ new: s["new"] === true || s["new"] === "true" }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function BookingDetails() {
  const { reference } = Route.useParams();
  const { new: isNew } = Route.useSearch();
  const navigate = useNavigate();
  const fetchBooking = useServerFn(getBooking);

  const { data, isLoading } = useQuery({
    queryKey: ["booking", reference],
    queryFn: () => fetchBooking({ data: { reference } }),
  });

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        {isLoading ? (
          <div className="grid min-h-[50vh] place-items-center">
            <Loader2 className="size-6 animate-spin text-cyan" />
          </div>
        ) : !data ? (
          <div className="glass rounded-4xl p-10 text-center">
            <h1 className="text-2xl font-extrabold">Booking not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Check your reference code — it looks like {reference} doesn't exist.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <>
            {isNew ? (
              <div className="mb-10 text-center animate-[step-in_0.7s_cubic-bezier(0.22,1,0.36,1)_both]">
                <div className="mx-auto grid size-20 place-items-center rounded-full bg-linear-to-br from-primary/30 to-violet/20 shadow-[0_0_60px_-10px_var(--primary)]">
                  <CheckCircle2 className="size-9 text-cyan" />
                </div>
                <h1 className="mt-6 text-balance text-3xl font-extrabold sm:text-4xl">
                  Your booking request has been received
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                  Our team will contact you shortly to confirm your booking and payment.
                </p>
              </div>
            ) : (
              <h1 className="mb-8 text-3xl font-extrabold">Booking details</h1>
            )}

            <div className="relative overflow-hidden rounded-4xl border border-border bg-surface/70 p-6 backdrop-blur-2xl sm:p-8">
              <div className="absolute -right-16 -top-16 size-52 rounded-full bg-violet/15 blur-3xl" aria-hidden="true" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan">Reference</p>
                    <p className="mt-2 text-2xl font-extrabold tracking-widest">{data.reference}</p>
                  </div>
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-amber-200">
                    {data.status === "pending" ? "Pending confirmation" : data.status}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 rounded-3xl border border-border bg-background/40 p-5 sm:grid-cols-2">
                  <Info label="Branch" value={data.branch_name} sub={data.branch_address} />
                  <Info label="Station" value={data.station_name} />
                  <Info
                    label="Date"
                    value={new Date(`${data.booking_date}T00:00:00`).toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  />
                  <Info
                    label="Time"
                    value={
                      data.start_time && data.end_time
                        ? `${formatTime(data.start_time)} – ${formatTime(data.end_time)}`
                        : "Passes only"
                    }
                    sub={durationLabel(data.start_time, data.end_time)}
                  />
                  <Info label="Players" value={`${data.players} ${data.players === 1 ? "player" : "players"}`} />
                  {data.game_title ? <Info label="Game" value={data.game_title} /> : null}
                  <Info label="Guest" value={data.customer_name} sub={data.customer_phone} />
                  {data.customer_email ? <Info label="Email" value={data.customer_email} /> : null}
                  {data.special_instructions ? (
                    <Info label="Notes" value={data.special_instructions} />
                  ) : null}
                </div>

                <div className="mt-6 space-y-2.5 text-sm">
                  <Row
                    label={`Session — ${data.station_name || "Passes only"}${
                      data.start_time && data.end_time
                        ? ` · ${formatTime(data.start_time)} – ${formatTime(data.end_time)} (${durationLabel(
                            data.start_time,
                            data.end_time,
                          )}) · ${data.players}P`
                        : ""
                    }`}
                    value={inr(data.session_amount)}
                  />
                  <Group
                    title="Experiences"
                    items={data.items.filter((i) => i.kind === "addon" && i.station_id)}
                  />
                  <Group
                    title="Passes & offers"
                    items={data.items.filter((i) => i.kind === "addon" && !i.station_id)}
                  />
                  <Group title="Food & drinks" items={data.items.filter((i) => i.kind === "food")} />
                  {data.discount_amount > 0 ? (
                    <Row
                      label={`Discount${data.coupon_code ? ` (${data.coupon_code})` : ""}`}
                      value={`− ${inr(data.discount_amount)}`}
                    />
                  ) : null}
                  {data.student_discount_amount ? (
                    <Row
                      label="Includes student discount (20%)"
                      value={`− ${inr(data.student_discount_amount)}`}
                    />
                  ) : null}
                  <Row label="Taxes & fees" value={inr(data.tax_amount)} />
                </div>


                <div className="mt-6 flex items-end justify-between border-t border-border pt-5">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Grand total
                  </span>
                  <span className="text-gradient text-3xl font-extrabold">{inr(data.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-semibold transition-all hover:border-cyan/50 hover:text-cyan"
              >
                <Home className="size-4" /> Back to home
              </Link>
              <button
                type="button"
                onClick={() => void navigate({ to: "/book" })}
                className="gradient-ring inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_22px_70px_-14px_var(--primary)]"
              >
                <PartyPopper className="size-4" /> Book another session
              </button>
            </div>

            <div className="glass mt-8 rounded-4xl p-6 text-center sm:p-8">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.2em]">Any issues? Contact us</h2>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <a
                  href={waHref(`Hi Clash of Consoles! I need help with booking ${data.reference}.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-4 py-2 text-xs font-semibold text-cyan transition-all hover:-translate-y-0.5"
                >
                  WhatsApp {prettyPhone(PRIMARY_PHONE)}
                </a>
                <a
                  href={telHref(SECONDARY_PHONE)}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground"
                >
                  Call {prettyPhone(SECONDARY_PHONE)}
                </a>
                <a
                  href={mailHref()}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}


/** "2h 30m" between two HH:MM:SS strings; empty when the booking has no slot. */
function durationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  const m =
    Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5)) -
    (Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)));
  if (m <= 0) return "";
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return [h ? `${h}h` : "", mins ? `${mins}m` : ""].filter(Boolean).join(" ");
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-foreground/85">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Itemised group — shows every line exactly as picked in the booking flow. */
function Group({ title, items }: { title: string; items: BookingSummaryItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/70 bg-background/30 p-3.5">
      <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-cyan">{title}</p>
      <div className="space-y-2">
        {items.map((i, idx) => (
          <div key={idx} className="flex items-start justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-foreground/90">
                {i.quantity} × {i.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {i.start_time && i.end_time
                  ? `${formatTime(i.start_time)} – ${formatTime(i.end_time)} · ${durationLabel(i.start_time, i.end_time)}`
                  : i.unit_price
                    ? `${inr(i.unit_price)} each`
                    : ""}
                {i.extra_hours ? ` · +${i.extra_hours} extra hr` : ""}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{inr(i.line_total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

