import { Gift, Smartphone } from "lucide-react";
import { Reveal } from "../primitives";

/** Compact loyalty banner: 5 completed gaming sessions earn 30 free minutes. */
export function LoyaltyOffer() {
  return (
    <section id="loyalty" className="relative py-12">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-cyan/35 bg-surface/60 p-6 backdrop-blur-2xl sm:p-8">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-cyan/20 blur-[90px]"
            />
            <div className="relative flex flex-wrap items-center gap-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-primary to-violet">
                <Gift className="size-6 text-primary-foreground" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-cyan">
                  Loyalty Reward
                </p>
                <h2 className="mt-2 text-balance text-2xl font-black leading-tight sm:text-3xl">
                  Play more, <span className="text-gradient">play free.</span>
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    { visit: "5th Completed Visit", reward: "30 Minutes FREE" },
                    { visit: "10th Completed Visit", reward: "1 Hour FREE" },
                  ].map((m) => (
                    <li
                      key={m.visit}
                      className="rounded-2xl border border-border bg-background/40 px-4 py-3"
                    >
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {m.visit}
                      </p>
                      <p className="mt-1 text-sm font-black text-gradient">→ {m.reward}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Smartphone className="size-3.5 shrink-0 text-cyan" aria-hidden="true" />
                  Progress is automatically tracked using your phone number.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
