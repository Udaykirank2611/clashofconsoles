import { GraduationCap, BadgeCheck, Info } from "lucide-react";
import { Reveal, MagneticButton } from "../primitives";
import { TiltCard } from "../TiltCard";
import { inr, type SiteOffer } from "@/lib/site-content";

export function StudentOffer({ offer }: { offer: SiteOffer | null }) {
  if (!offer || !offer.is_visible) return null;

  return (
    <section id="student" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <TiltCard max={5} glare contentClassName="group/tilt">
            <div className="relative overflow-hidden rounded-[2rem] border border-violet/40 bg-surface/70 p-8 backdrop-blur-2xl sm:p-12">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-24 -bottom-24 size-72 rounded-full bg-violet/25 blur-[100px]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-cyan/20 blur-[100px]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-cyan/70 to-transparent"
              />

              <div className="relative grid items-center gap-10 sm:grid-cols-[1.15fr_0.85fr] [transform:translateZ(35px)]">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet/40 bg-violet/10 px-4 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-violet">
                    <GraduationCap className="size-3.5" aria-hidden="true" /> Student Offer
                  </span>

                  <h2 className="mt-6 text-balance text-5xl font-black leading-[0.98] sm:text-7xl">
                    {Math.round(Number(offer.discount_percent))}%{" "}
                    <span className="text-gradient">Discount</span>
                  </h2>

                  <p className="mt-5 text-lg font-semibold text-foreground">
                    On a minimum {inr(offer.min_bill)} bill
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan">
                    <BadgeCheck className="size-4" aria-hidden="true" /> Student ID required
                  </p>

                  <p className="mt-5 max-w-lg text-base text-muted-foreground">{offer.offer_text}</p>

                  <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-violet" aria-hidden="true" />
                    {offer.subtitle}
                  </p>

                  <div className="mt-8">
                    <MagneticButton href="/book" variant="ghost">
                      Claim The Discount
                    </MagneticButton>
                  </div>
                </div>

                {/* Neon student pass illustration */}
                <div className="relative mx-auto w-full max-w-[19rem] rotate-[-4deg] rounded-2xl border border-cyan/40 bg-background/80 p-5 shadow-[0_40px_90px_-45px_var(--violet)] transition-transform duration-700 group-hover/tilt:rotate-0">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-primary to-violet">
                      <GraduationCap className="size-5 text-primary-foreground" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.28em] text-cyan">
                        Student Pass
                      </p>
                      <p className="text-xs font-bold">Clash of Consoles</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-4">
                    <div className="size-16 rounded-xl bg-linear-to-br from-muted to-surface" aria-hidden="true" />
                    <div className="flex-1 space-y-2" aria-hidden="true">
                      <div className="h-2.5 w-3/4 rounded-full bg-muted" />
                      <div className="h-2.5 w-1/2 rounded-full bg-muted/70" />
                      <div className="h-2.5 w-2/3 rounded-full bg-muted/50" />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-[0.55rem] uppercase tracking-[0.24em] text-muted-foreground">
                      {Math.round(Number(offer.discount_percent))}% OFF
                    </span>
                    <span className="text-[0.55rem] uppercase tracking-[0.24em] text-cyan">
                      Min {inr(offer.min_bill)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
