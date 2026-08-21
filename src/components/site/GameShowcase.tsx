import { Reveal } from "@/components/site/primitives";
import { TiltCard } from "@/components/site/TiltCard";
import { ACCENT_GLOW, ACCENT_TEXT, useGameShowcase } from "@/lib/game-showcase";
import { cn } from "@/lib/utils";

/**
 * Admin-curated rows ("Top 10", "Party favourites"…) shown above the full
 * searchable library on the public games page.
 */
export function GameShowcase() {
  const { sections, loading } = useGameShowcase();
  if (loading || !sections.length) return null;

  return (
    <div className="mt-14 space-y-14">
      {sections.map((section) => (
        <section key={section.id} aria-label={section.title}>
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                  <span className={cn(ACCENT_TEXT[section.accent] ?? "text-pink")}>
                    {section.title}
                  </span>
                </h2>
                {section.subtitle ? (
                  <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{section.subtitle}</p>
                ) : null}
              </div>
              <span className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-muted-foreground">
                {section.items.length} titles
              </span>
            </div>
          </Reveal>

          <ul className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {section.items.map((item, i) => (
              <Reveal
                as="li"
                key={item.id}
                delay={Math.min(i, 6) * 45}
                className="w-40 shrink-0 snap-start sm:w-48"
              >
                <TiltCard max={10} glow contentClassName="group/tilt h-full">
                  <article
                    className={cn(
                      "relative h-full overflow-hidden rounded-3xl border border-border bg-surface transition-[border-color,box-shadow] duration-500",
                      ACCENT_GLOW[section.accent] ?? ACCENT_GLOW.pink,
                    )}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={`${item.name} cover art`}
                        loading="lazy"
                        className="aspect-3/4 w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/tilt:scale-110 motion-reduce:transition-none"
                      />
                    ) : (
                      <div className="grid aspect-3/4 w-full place-items-center bg-linear-to-br from-surface-2 via-surface to-background text-2xl font-black tracking-[0.2em] text-muted-foreground/70">
                        {item.name.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/25 to-transparent"
                    />
                    {item.badge ? (
                      <span
                        className={cn(
                          "absolute left-3 top-3 rounded-full border border-current/40 bg-background/70 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.16em] backdrop-blur-md",
                          ACCENT_TEXT[section.accent] ?? "text-pink",
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 [transform:translateZ(40px)]">
                      <h3 className="text-sm font-bold leading-tight sm:text-base">{item.name}</h3>
                      {item.platform ? (
                        <p className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
                          {item.platform}
                        </p>
                      ) : null}
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
