import { Gamepad2, Glasses, Car, Sparkles } from "lucide-react";
import { Reveal, SectionHeading, MagneticButton } from "../primitives";
import { TiltCard } from "../TiltCard";
import { inr, type SiteOffer } from "@/lib/site-content";

const ART = [
  { img: "/experiences/ps5.jpg", Icon: Gamepad2 },
  { img: "/experiences/vr.jpg", Icon: Glasses },
  { img: "/experiences/cockpit.jpg", Icon: Car },
];

export function ComboOffer({ offer }: { offer: SiteOffer | null }) {
  if (!offer || !offer.is_visible) return null;

  return (
    <section id="combo" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Combo Offer"
          title={
            <>
              Three Arenas. <span className="text-gradient">One Price.</span>
            </>
          }
          lead="1 hour each of PS5 Console, VR Arena and Cockpit Racing — use all three today."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <ul className="grid gap-5 sm:grid-cols-3">
            {offer.features.map((feature, i) => {
              const art = ART[i % ART.length]!;
              const Icon = art.Icon;
              return (
                <Reveal as="li" key={feature} delay={i * 90} className="h-full">
                  <TiltCard max={10} glare glow contentClassName="group/tilt h-full">
                    <article className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-surface/60 backdrop-blur-2xl transition-colors duration-500 group-hover/tilt:border-cyan/50">
                      <div className="relative overflow-hidden">
                        <img
                          src={art.img}
                          alt={feature}
                          width={900}
                          height={700}
                          loading="lazy"
                          className="aspect-4/3 w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/tilt:scale-110"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-linear-to-t from-background via-background/45 to-transparent"
                        />
                        <span className="absolute left-4 top-4 grid size-10 place-items-center rounded-xl border border-cyan/40 bg-background/70 backdrop-blur-xl">
                          <Icon className="size-4.5 text-cyan" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="relative p-6 [transform:translateZ(35px)]">
                        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.28em] text-cyan">
                          Included
                        </p>
                        <h3 className="mt-2 text-lg font-black leading-tight">{feature}</h3>
                      </div>
                    </article>
                  </TiltCard>
                </Reveal>
              );
            })}
          </ul>

          <Reveal delay={140} className="h-full">
            <TiltCard max={7} glow contentClassName="group/tilt h-full">
              <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-[1.75rem] border border-primary/45 bg-surface/70 p-8 text-center backdrop-blur-2xl">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-violet/30 blur-[90px]"
                />
                <div className="relative [transform:translateZ(45px)]">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-cyan">
                    <Sparkles className="size-3.5" aria-hidden="true" /> {offer.title}
                  </span>
                  <p className="mt-7 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Total Price
                  </p>
                  <p className="text-gradient mt-2 text-6xl font-black tracking-tight sm:text-7xl">
                    {inr(offer.price)}
                  </p>
                  <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
                    {offer.offer_text}
                  </p>
                  {offer.validity && offer.validity !== offer.offer_text ? (
                    <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-cyan">
                      {offer.validity}
                    </p>
                  ) : null}
                  <div className="mt-8">
                    <MagneticButton href="/book" className="w-full">
                      Book Combo
                    </MagneticButton>
                  </div>
                </div>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
