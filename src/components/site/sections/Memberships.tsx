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

/** Renders Bronze / Silver / Gold inside a plan name with its metallic signature. */
function TierWord({ name }: { name: string }) {
  const parts = name.split(/(bronze|silver|gold)/gi).filter(Boolean);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      {parts.map((part, i) => {
        const key = part.toLowerCase() as TierKey;
        const tier = key === "bronze" || key === "silver" || key === "gold" ? TIERS[key] : null;
        return tier ? (
          <span
            key={`${part}-${i}`}
            style={{ "--w1": tier.c1, "--w2": tier.c2 } as CSSProperties}
            className="rounded-lg border border-[color-mix(in_oklab,var(--w1)_50%,transparent)] px-2.5 py-1 [background:linear-gradient(120deg,color-mix(in_oklab,var(--w1)_88%,black),color-mix(in_oklab,var(--w2)_92%,white),color-mix(in_oklab,var(--w1)_88%,black))] bg-clip-text text-transparent shadow-[0_8px_26px_-16px_var(--w1)] drop-shadow-[0_0_10px_color-mix(in_oklab,var(--w1)_45%,transparent)]"
          >
            {part}
          </span>
        ) : (
          <span key={`${part}-${i}`} className="text-muted-foreground">
            {part.trim()}
          </span>
        );
      })}
    </span>
  );
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
                      className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-25 blur-[90px] transition-opacity duration-700 group-hover/tilt:opacity-45 [background:radial-gradient(circle,color-mix(in_oklab,var(--t1)_60%,transparent),transparent_70%)]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full opacity-20 blur-[100px] [background:radial-gradient(circle,color-mix(in_oklab,var(--t2)_60%,transparent),transparent_70%)]"
                    />

                    {plan.badge ? (
                      <span className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--t1)_55%,transparent)] px-3 py-1.5 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-foreground">
                        <Crown className="size-3" aria-hidden="true" /> {plan.badge}
                      </span>
                    ) : null}

                    <div className="relative [transform:translateZ(40px)]">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--t1)_45%,transparent)] px-3 py-1.5 [background:linear-gradient(120deg,color-mix(in_oklab,var(--t1)_22%,transparent),color-mix(in_oklab,var(--t2)_18%,transparent))] shadow-[0_10px_30px_-18px_var(--t1)]">
                        <TierIcon
                          className="size-4"
                          style={{ color: "var(--t1)" }}
                          aria-hidden="true"
                        />
                        <span className="text-[0.55rem] font-black uppercase tracking-[0.28em] text-foreground">
                          {tier.label}
                        </span>
                      </span>

                      <p className="mt-4 text-lg font-black uppercase tracking-[0.18em]">
                        <TierWord name={plan.name} />
                      </p>


                      <p className="mt-3 text-5xl font-black tracking-tight text-foreground sm:text-6xl">
                        {inr(plan.price)}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <Clock3 className="size-3.5 text-foreground/70" aria-hidden="true" />
                          {Number(plan.hours_included)} Hours
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <CalendarDays className="size-3.5 text-foreground/70" aria-hidden="true" />
                          {plan.validity}
                        </span>
                      </div>

                      <p className="mt-5 text-xs font-medium text-muted-foreground">{tier.perk}</p>


                      <ul className="mt-6 space-y-3">
                        {plan.perks.map((perk) => (
                          <li key={perk} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <Check
                              className="mt-0.5 size-4 shrink-0 text-foreground/60"
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
