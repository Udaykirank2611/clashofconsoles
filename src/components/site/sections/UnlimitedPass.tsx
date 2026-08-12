import { Infinity as InfinityIcon, Check } from "lucide-react";
import { Reveal, MagneticButton } from "../primitives";
import { TiltCard } from "../TiltCard";
import { inr, type SiteOffer } from "@/lib/site-content";

export function UnlimitedPass({ offer }: { offer: SiteOffer | null }) {
  if (!offer || !offer.is_visible) return null;

  return (
    <section id="unlimited" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <TiltCard max={6} glare glow contentClassName="group/tilt">
            <div className="relative overflow-hidden rounded-[2.25rem] border border-primary/40 bg-surface/70 p-8 backdrop-blur-2xl sm:p-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/25 blur-[90px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-16 size-80 rounded-full bg-violet/25 blur-[110px]"
              />

              <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] [transform:translateZ(40px)]">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-cyan">
                    <InfinityIcon className="size-3.5" aria-hidden="true" /> Unlimited Pass
                  </span>
                  <h2 className="mt-6 text-balance text-4xl font-black leading-[1.05] sm:text-6xl">
                    {offer.title}
                  </h2>
                  <p className="mt-4 max-w-md text-base text-muted-foreground">{offer.subtitle}</p>

                  <div className="mt-8 flex flex-wrap items-end gap-4">
                    <span className="text-gradient text-6xl font-black tracking-tight sm:text-7xl">
                      {inr(offer.price)}
                    </span>
                    <span className="pb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {offer.validity}
                    </span>
                  </div>

                  <div className="mt-9">
                    <MagneticButton href="/book">Get Pass</MagneticButton>
                  </div>
                </div>

                <ul className="grid gap-3">
                  {offer.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background/50 px-5 py-4 text-sm font-medium backdrop-blur-xl transition-colors duration-300 hover:border-cyan/40"
                    >
                      <Check className="size-4 shrink-0 text-cyan" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
