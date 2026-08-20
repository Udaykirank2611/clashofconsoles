import { Link } from "@tanstack/react-router";
import { Info, Sparkles } from "lucide-react";
import { Reveal, SectionHeading } from "../primitives";
import { TiltCard } from "../TiltCard";
import { inr, type Experience, type SiteBranch } from "@/lib/site-content";

function availability(exp: Experience, branches: SiteBranch[]) {
  if (!branches.length) return "All Branches";
  const mine = branches.filter((b) => exp.branch_ids.includes(b.id));
  if (!mine.length) return "Coming soon";
  if (mine.length === branches.length) return "All Branches";
  return `${mine.map((b) => b.name).join(" · ")} Only`;
}

export function Experiences({
  experiences,
  branches,
}: {
  experiences: Experience[];
  branches: SiteBranch[];
}) {
  if (!experiences.length) return null;

  return (
    <section id="experiences" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Our Gaming Experiences"
          title={
            <>
              Choose Your <span className="text-gradient">Experience</span>
            </>
          }
          lead="More than gaming. Experience the next level of entertainment."
        />

        <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((exp, i) => (
            <Reveal as="li" key={exp.id} delay={i * 70}>
              <TiltCard max={9} glare glow contentClassName="group/tilt h-full">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-surface/70 backdrop-blur-2xl transition-[border-color,box-shadow] duration-500 group-hover/tilt:border-primary/50">
                  <div className="relative overflow-hidden">
                    <img
                      src={exp.image_url ?? "/experiences/ps5.jpg"}
                      alt={exp.name}
                      width={1200}
                      height={800}
                      loading="lazy"
                      className="aspect-4/3 w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/tilt:scale-110"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-linear-to-t from-background via-background/50 to-transparent"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-6 bottom-0 h-px bg-linear-to-r from-transparent via-cyan/70 to-transparent opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100"
                    />
                    {exp.is_exclusive ? (
                      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-violet/40 bg-background/70 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-violet backdrop-blur-xl">
                        <Sparkles className="size-3" aria-hidden="true" /> Exclusive Branch
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-6 [transform:translateZ(40px)]">
                    <div>
                      <h3 className="text-xl font-black tracking-tight">{exp.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {exp.description}
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {availability(exp, branches)}
                    </span>

                    <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-5">
                      <div>
                        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Starting from
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-2xl font-black tracking-tight text-cyan">
                          {inr(exp.starting_price)}
                          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {exp.price_unit}
                          </span>
                          {exp.name.toLowerCase().includes("ps5") ? (
                            <span className="group/info relative inline-flex items-center">
                              <button
                                type="button"
                                aria-label="Why this price?"
                                className="inline-flex items-center rounded-full p-0.5 text-muted-foreground/70 transition-colors hover:text-cyan focus:outline-none focus-visible:text-cyan"
                              >
                                <Info className="size-3.5" aria-hidden="true" />
                              </button>
                              <span
                                role="tooltip"
                                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-2xl border border-border bg-surface/95 px-3 py-2 text-[0.68rem] font-medium normal-case leading-relaxed tracking-normal text-muted-foreground opacity-0 shadow-[0_20px_50px_-24px_var(--primary)] backdrop-blur-xl transition-opacity duration-300 group-hover/info:opacity-100 group-focus-within/info:opacity-100 group-active/info:opacity-100"
                              >
                                Applicable when purchased with a membership plan.
                              </span>
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <Link
                        to="/book"
                        className="coc-cta inline-flex items-center px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-500 hover:brightness-110 active:scale-[0.96]"
                      >
                        Book Now
                      </Link>

                    </div>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
