import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search, Ticket } from "lucide-react";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import {
  PRIMARY_PHONE,
  SECONDARY_PHONE,
  CONTACT_EMAIL,
  prettyPhone,
  telHref,
  waHref,
  mailHref,
} from "@/lib/contact";

const TITLE = "Check Booking Status — Clash of Consoles";
const DESC =
  "Already booked at Clash of Consoles Hyderabad? Enter your booking token to view your session summary, payment status and invoice.";

export const Route = createFileRoute("/status")({
  component: StatusPage,
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
    ],
  }),
});

function StatusPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const reference = code.trim().toUpperCase();
    if (reference.length < 4) {
      setError("Enter the booking token from your confirmation (e.g. COC-XXXXXXXXXXXX).");
      return;
    }
    setError("");
    void navigate({ to: "/booking/$reference", params: { reference }, search: { new: false } });
  };

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-2xl items-center justify-between px-4 pt-8 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-cyan"
        >
          <ArrowLeft className="size-3.5" /> Home
        </Link>
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan">
          Clash of Consoles
        </span>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-20 pt-12 sm:px-6">
        <div className="glass rounded-4xl p-6 sm:p-9">
          <div className="grid size-14 place-items-center rounded-2xl border border-cyan/30 bg-cyan/10">
            <Ticket className="size-6 text-cyan" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-balance text-3xl font-extrabold sm:text-4xl">Know your booking status</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter the booking token we sent you after checkout to see your full session summary.
          </p>

          <form onSubmit={submit} className="mt-8">
            <label
              htmlFor="reference"
              className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
            >
              Booking token
            </label>
            <input
              id="reference"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={40}
              autoComplete="off"
              placeholder="COC-XXXXXXXXXXXX"
              className="mt-2 w-full rounded-2xl border border-border bg-background/50 px-4 py-3.5 text-sm font-semibold tracking-widest uppercase outline-none transition-colors placeholder:tracking-normal placeholder:font-normal placeholder:text-muted-foreground focus:border-cyan/60"
            />
            {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
            <button
              type="submit"
              className="gradient-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_22px_70px_-14px_var(--primary)]"
            >
              <Search className="size-4" /> Show my booking
            </button>
          </form>
        </div>

        <div className="glass mt-6 rounded-4xl p-6 sm:p-8">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.2em]">Any issues? Contact us</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Lost your token or need to change a booking? Our team is a message away.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={waHref("Hi Clash of Consoles! I need help with my booking.")}
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
      </main>
    </div>
  );
}
