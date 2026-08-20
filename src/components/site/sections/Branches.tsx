import { Clock, MapPin, Phone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Reveal, SectionHeading } from "../primitives";
import { TiltCard } from "../TiltCard";
import { prettyTime, type Experience, type SiteBranch } from "@/lib/site-content";

export function Branches({
  branches,
  experiences,
}: {
  branches: SiteBranch[];
  experiences: Experience[];
}) {
  if (!branches.length) return null;

  return (
    <section id="branches" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Branches"
          title={
            <>
              Two Arenas. <span className="text-gradient">One Standard.</span>
            </>
          }
          lead="Find the arena closest to you and walk into a full entertainment floor."
        />

        <ul className="mt-16 grid gap-6 lg:grid-cols-2">
          {branches.map((b, i) => {
            const available = experiences.filter((e) => e.branch_ids.includes(b.id));
            const maps =
              b.map_url ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${b.name} ${b.address}`,
              )}`;
            return (
              <Reveal as="li" key={b.id} delay={i * 90}>
                <TiltCard max={7} glow contentClassName="group/tilt h-full">
                  <article className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-surface/70 backdrop-blur-2xl transition-colors duration-500 group-hover/tilt:border-cyan/40">
                    <div className="relative overflow-hidden">
                      <img
                        src={b.image_url ?? "/branches/vanasthalipuram.jpg"}
                        alt={`${b.name} branch of Clash of Consoles`}
                        width={1200}
                        height={800}
                        loading="lazy"
                        className="aspect-16/9 w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/tilt:scale-107"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent"
                      />
                      <span className="absolute left-6 top-5 rounded-full border border-cyan/40 bg-background/70 px-3 py-1.5 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-cyan backdrop-blur-xl">
                        {i === 0 ? "1st Branch" : i === 1 ? "2nd Branch" : `Branch ${i + 1}`}
                      </span>
                      <h3 className="absolute bottom-5 left-6 text-2xl font-black tracking-tight">
                        {b.name}
                      </h3>
                    </div>

                    <div className="flex flex-1 flex-col gap-5 p-6 [transform:translateZ(35px)]">
                      <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" />
                        {b.address}
                      </p>
                      {b.phone ? (
                        <a
                          href={`tel:+91${b.phone.replace(/[^\d]/g, "").slice(-10)}`}
                          className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-cyan"
                        >
                          <Phone className="size-4 shrink-0 text-cyan" aria-hidden="true" />
                          {b.phone}
                        </a>
                      ) : null}
                      <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Clock className="size-4 shrink-0 text-cyan" aria-hidden="true" />
                        Open daily {prettyTime(b.opens_at)} – {prettyTime(b.closes_at)}
                      </p>

                      <div>
                        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Available experiences
                        </p>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {available.map((e) => (
                            <li
                              key={e.id}
                              className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-foreground/80"
                            >
                              {e.name}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-3 border-t border-border pt-5">
                        <a
                          href={maps}
                          target="_blank"
                          rel="noreferrer"
                          className="glass inline-flex items-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-300 hover:text-cyan"
                        >
                          View Location
                        </a>
                        <Link
                          to="/book"
                          className="gradient-ring inline-flex items-center rounded-full bg-[linear-gradient(120deg,var(--pink),var(--primary)_55%,var(--violet))] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all duration-500 hover:shadow-[0_20px_60px_-16px_var(--pink)] active:scale-[0.96]"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
