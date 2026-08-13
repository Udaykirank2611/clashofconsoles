import { createFileRoute, Link } from "@tanstack/react-router";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { ArrowLeft, Ticket } from "lucide-react";

const TITLE = "Book a Session — Clash of Consoles Hyderabad";
const DESC =
  "Reserve your PlayStation 5, Xbox or driving simulator bay at Clash of Consoles Hyderabad in under a minute. Pick a branch, date, time and station.";

export const Route = createFileRoute("/book")({
  component: BookPage,
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

function BookPage() {
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-8 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 rounded-2xl border border-border bg-surface/60 px-5 py-3 text-sm font-extrabold uppercase tracking-[0.2em] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-cyan/50 hover:text-cyan sm:text-base"
        >
          <ArrowLeft className="size-5" /> Home
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/status"
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/10 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan transition-all hover:-translate-y-0.5"
          >
            <Ticket className="size-3.5" aria-hidden="true" /> Already booked? Know your status
          </Link>
          <span className="hidden text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan sm:inline">
            Clash of Consoles
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <h1 className="sr-only">Book a gaming session at Clash of Consoles</h1>
        <BookingFlow />
      </main>
    </div>
  );
}
