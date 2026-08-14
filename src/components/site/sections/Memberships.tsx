import type { CSSProperties } from "react";
import { Check, Crown, Clock3, CalendarDays, Shield, Gem, Sparkles } from "lucide-react";
import { Reveal, SectionHeading, MagneticButton } from "../primitives";
import { TiltCard } from "../TiltCard";
import { cn } from "@/lib/utils";
import { inr, type MembershipPlan } from "@/lib/site-content";

type TierKey = "bronze" | "silver" | "gold" | "neon";

const TIERS: Record<
  TierKey,
  { label: string; perk: string; icon: typeof Shield; c1: string; c2: string }
> = {
  bronze: {
    label: "Bronze Tier",
    perk: "Starter Boost · priority queue on weekdays",
    icon: Shield,
    c1: "var(--tier-bronze)",
    c2: "var(--tier-bronze-2)",
  },
  silver: {
    label: "Silver Tier",
    perk: "Chrome Edge · faster station swaps + free controller upgrade",
    icon: Gem,
    c1: "var(--tier-silver)",
    c2: "var(--tier-silver-2)",
  },
  gold: {
    label: "Gold Tier",
    perk: "Legend Status · first pick of prime-time slots",
    icon: Crown,
    c1: "var(--tier-gold)",
    c2: "var(--tier-gold-2)",
  },
  neon: {
    label: "Arena Pass",
    perk: "Neon Access · flexible arena-wide play",
    icon: Sparkles,
    c1: "var(--violet)",
    c2: "var(--primary)",
  },
};

function tierOf(name: string): TierKey {
  const n = name.toLowerCase();
  if (n.includes("bronze")) return "bronze";
  if (n.includes("silver")) return "silver";
  if (n.includes("gold")) return "gold";
  return "neon";
}

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
            const tier = TIERS[tierOf(plan.name)];
            const TierIcon = tier.icon;
            const style = { "--t1": tier.c1, "--t2": tier.c2 } as CSSProperties;

            return (
              <Reveal as="li" key={plan.id} delay={i * 90} className="h-full">
                <TiltCard max={8} glare glow={featured} className="h-full" contentClassName="group/tilt h-full">
                  <article
                    style={style}
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-surface/60 p-7 backdrop-blur-2xl transition-[border-color,box-shadow] duration-500",
                      "border-[color-mix(in_oklab,var(--t1)_28%,transparent)] hover:border-[color-mix(in_oklab,var(--t1)_55%,transparent)]",
                      featured
                        ? "shadow-[0_40px_120px_-55px_var(--t1)] lg:-translate-y-3"
                        : "shadow-[0_30px_90px_-70px_var(--t1)]",
                    )}
                  >
                    {/* tier sheen */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px [background:linear-gradient(90deg,transparent,var(--t1),transparent)]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-[1.75rem] [background:conic-gradient(from_var(--a,0deg),transparent_0_55%,color-mix(in_oklab,var(--t1)_70%,transparent)_75%,transparent_85%)] opacity-0 [animation:coc-spin_6s_linear_infinite] transition-opacity duration-500 group-hover/tilt:opacity-40"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-40 blur-[80px] transition-opacity duration-700 group-hover/tilt:opacity-80 [background:radial-gradient(circle,color-mix(in_oklab,var(--t1)_60%,transparent),transparent_70%)]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full opacity-30 blur-[90px] [background:radial-gradient(circle,color-mix(in_oklab,var(--t2)_60%,transparent),transparent_70%)]"
                    />

                    {plan.badge ? (
                      <span className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--t1)_45%,transparent)] bg-[color-mix(in_oklab,var(--t1)_14%,transparent)] px-3 py-1.5 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--t1)_88%,white)]">
                        <Crown className="size-3" aria-hidden="true" /> {plan.badge}
                      </span>
                    ) : null}

                    <div className="relative [transform:translateZ(40px)]">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--t1)_35%,transparent)] bg-[color-mix(in_oklab,var(--t1)_10%,transparent)] px-3 py-1.5">
                        <TierIcon
                          className="size-3.5 text-[color-mix(in_oklab,var(--t1)_90%,white)]"
                          aria-hidden="true"
                        />
                        <span className="text-[0.55rem] font-bold uppercase tracking-[0.28em] text-[color-mix(in_oklab,var(--t1)_90%,white)]">
                          {tier.label}
                        </span>
                      </span>

                      <p className="mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                        {plan.name}
                      </p>

                      <p className="mt-3 text-5xl font-black tracking-tight sm:text-6xl [background:linear-gradient(100deg,color-mix(in_oklab,var(--t1)_85%,white),white_45%,color-mix(in_oklab,var(--t2)_85%,white))] bg-clip-text text-transparent">
                        {inr(plan.price)}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <Clock3
                            className="size-3.5 text-[color-mix(in_oklab,var(--t1)_85%,white)]"
                            aria-hidden="true"
                          />
                          {Number(plan.hours_included)} Hours
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <CalendarDays
                            className="size-3.5 text-[color-mix(in_oklab,var(--t1)_85%,white)]"
                            aria-hidden="true"
                          />
                          {plan.validity}
                        </span>
                      </div>

                      <p className="mt-5 rounded-2xl border border-[color-mix(in_oklab,var(--t1)_22%,transparent)] bg-[color-mix(in_oklab,var(--t1)_8%,transparent)] px-4 py-3 text-xs font-medium text-[color-mix(in_oklab,var(--t1)_78%,white)]">
                        {tier.perk}
                      </p>

                      <ul className="mt-6 space-y-3">
                        {plan.perks.map((perk) => (
                          <li key={perk} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <Check
                              className="mt-0.5 size-4 shrink-0 text-[color-mix(in_oklab,var(--t1)_85%,white)]"
                              aria-hidden="true"
                            />
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
