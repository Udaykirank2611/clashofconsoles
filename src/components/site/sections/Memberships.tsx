import { Check, Crown, Clock3, CalendarDays } from "lucide-react";
import { Reveal, SectionHeading, MagneticButton } from "../primitives";
import { TiltCard } from "../TiltCard";
import { cn } from "@/lib/utils";
import { inr, type MembershipPlan } from "@/lib/site-content";

const TIERS = ["from-[color-mix(in_oklab,var(--cyan)_60%,transparent)]", "", ""];

export function Memberships({ plans }: { plans: MembershipPlan[] }) {
  if (!plans.length) return null;

  return (
    <section id="membership" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Membership Plans"
          title={
            <>
              Play More. <span className="text-gradient">Save More.</span>
            </>
          }
          lead="Bank your hours upfront and walk in like a regular — every plan is managed live by the arena."
        />

        <ul className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const featured = plan.is_popular || Boolean(plan.badge);
            return (
              <Reveal as="li" key={plan.id} delay={i * 90} className="h-full">
                <TiltCard max={8} glare glow={featured} className="h-full" contentClassName="group/tilt h-full">
                  <article
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-surface/60 p-7 backdrop-blur-2xl transition-[border-color,box-shadow] duration-500",
                      featured
                        ? "border-primary/50 shadow-[0_40px_120px_-55px_var(--primary)] lg:-translate-y-3"
                        : "border-border group-hover/tilt:border-cyan/40",
                      TIERS[i] ?? "",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-[1.75rem] [background:conic-gradient(from_var(--a,0deg),transparent_0_55%,color-mix(in_oklab,var(--cyan)_60%,transparent)_75%,transparent_85%)] opacity-0 [animation:coc-spin_6s_linear_infinite] transition-opacity duration-500 group-hover/tilt:opacity-40"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute -right-16 -top-20 size-56 rounded-full blur-[80px] transition-opacity duration-700",
                        featured ? "bg-violet/30" : "bg-primary/15 opacity-0 group-hover/tilt:opacity-100",
                      )}
                    />

                    {plan.badge ? (
                      <span className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full border border-violet/40 bg-violet/10 px-3 py-1.5 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-violet">
                        <Crown className="size-3" aria-hidden="true" /> {plan.badge}
                      </span>
                    ) : null}

                    <div className="relative [transform:translateZ(40px)]">
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-cyan">
                        {plan.name}
                      </p>

                      <p className="mt-5 text-5xl font-black tracking-tight sm:text-6xl">{inr(plan.price)}</p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <Clock3 className="size-3.5 text-cyan" aria-hidden="true" />
                          {Number(plan.hours_included)} Hours
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <CalendarDays className="size-3.5 text-cyan" aria-hidden="true" />
                          {plan.validity}
                        </span>
                      </div>

                      <ul className="mt-7 space-y-3">
                        {plan.perks.map((perk) => (
                          <li key={perk} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <Check className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="relative mt-auto pt-8 [transform:translateZ(30px)]">
                      <MagneticButton href="/book" variant={featured ? "primary" : "ghost"} className="w-full">
                        Get {plan.name}
                      </MagneticButton>
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
