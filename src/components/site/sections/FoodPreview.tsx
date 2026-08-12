import { Link } from "@tanstack/react-router";
import { Reveal, SectionHeading } from "../primitives";
import { TiltCard } from "../TiltCard";
import { inr, type MenuCategory, type SiteMenuItem } from "@/lib/site-content";
import { categoryCover, MENU_CATEGORY_FOR_SLUG } from "@/lib/menu-categories";

/** Home page food teaser — category cards only, never individual dishes. */
export function FoodPreview({
  categories,
  menu,
}: {
  categories: MenuCategory[];
  menu: SiteMenuItem[];
}) {
  if (!categories.length) return null;

  const startingFor = (cat: MenuCategory) => {
    const label = MENU_CATEGORY_FOR_SLUG[cat.slug] ?? cat.title;
    const prices = menu.filter((m) => m.category === label).map((m) => Number(m.price));
    return prices.length ? Math.min(...prices) : Number(cat.starting_price);
  };

  return (
    <section id="food" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Food & Drinks"
          title={
            <>
              Fuel Between <span className="text-gradient">Rounds</span>
            </>
          }
          lead="Kitchen-fresh food and cold drinks, delivered straight to your bay."
        />

        <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <Reveal as="li" key={cat.id} delay={i * 70}>
              <TiltCard max={9} glare contentClassName="group/tilt h-full">
                <article className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface transition-colors duration-500 group-hover/tilt:border-primary/50">
                  <img
                    src={categoryCover(cat.slug, cat.image_url)}
                    alt={cat.title}
                    width={1024}
                    height={768}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/tilt:scale-108"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent"
                  />
                  <div className="relative flex flex-1 flex-col gap-3 px-6 pb-6 pt-5 [transform:translateZ(30px)]">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-black tracking-tight">{cat.title}</h3>
                      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-cyan">
                        From {inr(startingFor(cat))}
                      </span>
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{cat.description}</p>
                    <Link
                      to="/menu"
                      hash={cat.slug}
                      className="inline-flex w-fit items-center rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors duration-300 hover:border-cyan/50 hover:text-cyan"
                    >
                      View menu
                    </Link>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={120}>
          <div className="mt-12 flex justify-center">
            <Link
              to="/menu"
              className="glass inline-flex items-center rounded-full px-7 py-3.5 text-sm font-semibold tracking-wide transition-colors duration-300 hover:text-cyan"
            >
              View Full Menu
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
