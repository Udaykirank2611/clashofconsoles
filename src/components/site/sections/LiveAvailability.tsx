import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Armchair,
  CircleDot,
  Clapperboard,
  Gamepad2,
  Glasses,
  Car,
  ArrowRight,
  MapPin,

} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Reveal, SectionHeading } from "../primitives";
import { supabase } from "@/integrations/supabase/client";
import { prettyTime } from "@/lib/site-content";
import { MAPS_SHERIGUDA, MAPS_VANASTHALIPURAM } from "@/lib/contact";

import {
  getLiveAvailability,
  type LiveBranchAvailability,
} from "@/lib/availability.functions";

const ICONS: Record<string, typeof Gamepad2> = {
  console: Gamepad2,
  driving_simulator: Car,
  vr: Glasses,
  snooker: CircleDot,
  private_theatre: Clapperboard,
  private_lounge: Armchair,
};

const STATUS: Record<
  LiveBranchAvailability["status"],
  { label: string; dot: string; ring: string; text: string }
> = {
  open: {
    label: "Open Now",
    dot: "bg-emerald-400",
    ring: "border-emerald-400/40 bg-emerald-400/10",
    text: "text-emerald-300",
  },
  few: {
    label: "Few Slots Left",
    dot: "bg-amber-400",
    ring: "border-amber-400/40 bg-amber-400/10",
    text: "text-amber-300",
  },
  full: {
    label: "Fully Booked",
    dot: "bg-rose-500",
    ring: "border-rose-500/40 bg-rose-500/10",
    text: "text-rose-300",
  },
  closed: {
    label: "Closed Now",
    dot: "bg-rose-500",
    ring: "border-rose-500/40 bg-rose-500/10",
    text: "text-rose-300",
  },
};

/** Google Maps link for a branch — known branches use their exact pin. */
function mapsFor(b: LiveBranchAvailability) {
  const key = `${b.slug} ${b.name}`.toLowerCase();
  if (key.includes("vanasthalipuram")) return MAPS_VANASTHALIPURAM;
  if (key.includes("sheriguda")) return MAPS_SHERIGUDA;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `Clash of Consoles ${b.name} ${b.city}`,
  )}`;
}

/**
 * Live, self-updating availability board.
 * Units come from the admin station catalogue (maintenance excluded) and
 * occupancy from live bookings + holds, so nothing here is ever edited by hand.
 */
export function LiveAvailability() {
  const fetchLive = useServerFn(getLiveAvailability);
  const [branches, setBranches] = useState<LiveBranchAvailability[]>([]);

  const load = useCallback(async () => {
    try {
      setBranches(await fetchLive());
    } catch {
      /* keep the last known board on a transient failure */
    }
  }, [fetchLive]);

  useEffect(() => {
    void load();
    // Bookings are private, so the board refreshes on a short timer and
    // instantly whenever the admin changes a station's status.
    const timer = setInterval(() => void load(), 30_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const channel = supabase
      .channel("live-availability")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gaming_stations" },
        () => void load(),
      )
      .subscribe();
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  if (!branches.length) return null;

  return (
    <section id="live-availability" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Live Availability"
          title={
            <>
              Real-Time <span className="text-gradient">Arena Status</span>
            </>
          }
          lead="Updated automatically from the floor — see what's free right now before you head out."
        />

        <ul className="mt-14 grid gap-6 lg:grid-cols-2">
          {branches.map((b, i) => {
            const s = STATUS[b.status];
            return (
              <Reveal as="li" key={b.id} delay={i * 90}>
                <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-border bg-surface/60 p-6 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_30px_80px_-40px_var(--cyan)] sm:p-8">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--cyan)_22%,transparent),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />

                  <header className="relative flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-black leading-tight tracking-tight break-words sm:text-2xl">
                        {b.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.city} · {prettyTime(b.opens_at)} – {prettyTime(b.closes_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] ${s.ring} ${s.text}`}
                    >
                      <span className="relative flex h-2 w-2">
                        <span
                          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${s.dot}`}
                        />
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
                      </span>
                      {s.label}
                    </span>
                  </header>

                  {b.status === "closed" ? (
                    <div className="relative mt-6 rounded-2xl border border-border bg-background/50 p-5">
                      <p className="text-sm font-bold text-rose-300">Closed Now</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Opens tomorrow at {prettyTime(b.opens_at)}
                      </p>
                    </div>
                  ) : (
                    <ul className="relative mt-6 grid gap-3 sm:grid-cols-2">
                      {b.services.map((svc) => {
                        const Icon = ICONS[svc.station_type] ?? Gamepad2;
                        const full = svc.available === 0;
                        return (
                          <li
                            key={svc.station_type}
                            className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3 transition-colors duration-300 hover:border-cyan/30"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface/70 text-cyan">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {svc.label}
                              </span>
                              <span
                                className={`block text-xs ${full ? "text-rose-300" : "text-muted-foreground"}`}
                              >
                                {full
                                  ? "Fully Booked"
                                  : svc.total > 1
                                    ? `${svc.available} / ${svc.total} Available`
                                    : "Available"}
                              </span>
                              {full && svc.next_available ? (
                                <span className="mt-0.5 block text-[0.65rem] uppercase tracking-[0.14em] text-cyan">
                                  Next: {prettyTime(svc.next_available)}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
                    <Link
                      to="/book"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan/40 bg-cyan/10 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-cyan transition-all duration-300 hover:bg-cyan/20 hover:shadow-[0_20px_60px_-30px_var(--cyan)]"
                    >
                      Book Now
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <a
                      href={mapsFor(b)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background/40 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-foreground/80 transition-all duration-300 hover:border-cyan/40 hover:text-cyan"
                    >
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      Get Directions
                    </a>
                  </div>

                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
