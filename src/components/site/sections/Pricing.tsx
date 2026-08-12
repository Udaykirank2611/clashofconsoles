import { Check } from "lucide-react";
import { MagneticButton, Reveal, SectionHeading } from "../primitives";
import { TiltCard } from "../TiltCard";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string;
  unit: string;
  blurb: string;
  perks: string[];
  featured?: boolean;
  cta: string;
};

const PLANS: Plan[] = [
  {
    name: "Hourly",
    price: "₹99",
    unit: "/ hour",
    blurb: "Drop in, plug in and play by the hour.",
    perks: [
      "Per-hour console access",
      "DualSense controller included",
      "Free first drink",
      "All game titles available",
    ],
    cta: "Reserve a Bay",
  },
  {
    name: "Day Pass",
    price: "₹449",
    unit: "/ day",
    blurb: "Unlimited play for the whole day.",
    perks: [
      "Unlimited same-day play",
      "Priority console selection",
      "Combo snack + drink",
      "Loyalty visit logged",
      "Reserve any bay",
    ],
    featured: true,
    cta: "Claim Day Pass",
  },
  {
    name: "Group Bundle",
    price: "₹1,499",
    unit: "/ 4 players",
    blurb: "Squad up — the best value for your crew.",
    perks: [
      "Dedicated squad bay",
      "4 player slots",
      "Snack platter included",
      "3 hours of play",
      "Custom game setup",
    ],
    cta: "Book Squad Bay",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Rates & Packages"
          title={
            <>
              Choose Your <span className="text-gradient">Play Plan</span>
            </>
          }
          lead="Transparent pricing. No hidden charges. Just pick how you want to clash."
        />
        <ul className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal as="li" key={plan.name} delay={i * 90} className="h-full">
              <TiltCard
                max={10}
                glow={plan.featured ?? false}
                className="h-full"
                contentClassName="group/tilt h-full"
              >
                <article
                  className={cn(
                    "group relative flex h-full flex-col rounded-4xl border bg-surface/50 p-8 transition-[box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    plan.featured
                      ? "border-primary/50 shadow-[0_30px_80px_-40px_var(--primary)] lg:-translate-y-4"
                      : "border-border hover:border-primary/40",
                  )}
                >
                {plan.featured ? (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-primary to-violet px-5 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.24em] text-primary-foreground shadow-[0_0_30px_-6px_var(--violet)]">
                    Most Popular
                  </span>
                ) : null}

                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {plan.name}
                </h3>
                <div className="mt-5 flex items-end gap-1.5">
                  <span className="text-5xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="mb-1.5 text-sm text-muted-foreground">
                    {plan.unit}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {plan.blurb}
                </p>

                <ul className="mt-7 space-y-3.5">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-3 text-sm">
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                          plan.featured
                            ? "bg-primary/20 text-cyan"
                            : "bg-surface-2 text-cyan",
                        )}
                      >
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className="text-muted-foreground">{perk}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <MagneticButton
                    href="#contact"
                    variant={plan.featured ? "primary" : "ghost"}
                    className="w-full"
                    ariaLabel={`${plan.cta} — ${plan.name} plan`}
                  >
                    {plan.cta}
                  </MagneticButton>
                </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </ul>
        <Reveal delay={200}>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            All packages include air-conditioned seating, premium controllers
            and on-call snack service.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
