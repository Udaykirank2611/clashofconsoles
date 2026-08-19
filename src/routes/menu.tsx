import { useMemo, useState } from "react";
import { FoodBanner } from "@/components/site/FoodBanner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { SectionHeading } from "@/components/site/primitives";
import { inr, useSiteContent, type SiteMenuItem } from "@/lib/site-content";
import { ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuItemIcon } from "@/lib/menu-icons";

const TITLE = "Food & Drinks Menu — Clash of Consoles Hyderabad";
const DESC =
  "The full Clash of Consoles menu — loaded fries, wings, momos, milkshakes and mocktails served straight to your gaming bay in Hyderabad.";

export const Route = createFileRoute("/menu")({
  component: MenuPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/menu" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/menu" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Menu",
          name: "Clash of Consoles Food & Drinks Menu",
          description: DESC,
          inLanguage: "en-IN",
          provider: {
            "@type": "LocalBusiness",
            name: "Clash of Consoles",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Hyderabad",
              addressRegion: "Telangana",
              addressCountry: "IN",
            },
          },
        }),
      },
    ],
  }),
});


const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function MenuPage() {
  const { menu, loading } = useSiteContent();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const { categories, groups } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = menu.filter(
      (m) => (!q || m.name.toLowerCase().includes(q)) && (!active || m.category === active),
    );
    const groups = filtered.reduce<Record<string, SiteMenuItem[]>>((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {});
    return { categories: Object.keys(groups), groups };
  }, [menu, query, active]);

  const allCategories = useMemo(() => [...new Set(menu.map((m) => m.category))], [menu]);

  return (
    <div className="relative">
      <AmbientBackground />
      <Navbar />
      <main className="pt-32 pb-24 sm:pt-40">
        <div className="mx-auto max-w-5xl px-6">
          <Link
            to="/"
            className="glass mb-10 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-cyan"
          >
            <ArrowLeft className="size-3.5" /> Back to home
          </Link>

          <SectionHeading
            as="h1"
            eyebrow="Food & Drinks"

            title={
              <>
                The Full <span className="text-gradient">Menu</span>
              </>
            }
            lead="Kitchen-fresh food and cold drinks, served right at your station."
          />

          <FoodBanner className="mt-10" caption="Fresh from our kitchen" />

          {/* Search + filters */}
          <div className="mt-14 space-y-4">
            <label className="glass flex items-center gap-3 rounded-full px-5 py-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the menu…"
                aria-label="Search the menu"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All" active={active === null} onClick={() => setActive(null)} />
              {allCategories.map((c) => (
                <FilterChip
                  key={c}
                  label={c}
                  active={active === c}
                  onClick={() => setActive(active === c ? null : c)}
                />
              ))}
            </div>
          </div>

          <div className="mt-14 gap-12 lg:grid lg:grid-cols-[180px_minmax(0,1fr)]">
            {/* Sticky category nav — desktop only */}
            <nav className="hidden lg:block">
              <div className="sticky top-28 space-y-2">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em] text-muted-foreground">
                  Categories
                </p>
                {categories.map((c) => (
                  <a
                    key={c}
                    href={`#${slugify(c)}`}
                    className="block text-sm text-muted-foreground transition-colors duration-300 hover:text-cyan"
                  >
                    {c === "VEG-SNACKS" ? "Veg-Snacks" : c === "NON-VEG SNACKS" ? "Non-Veg Snacks" : c}
                  </a>
                ))}
              </div>
            </nav>

            <div className="min-w-0">
              {loading ? (
                <p className="text-center text-sm text-muted-foreground">Loading the menu…</p>
              ) : !categories.length ? (
                <p className="text-center text-sm text-muted-foreground">
                  Nothing matches that search.
                </p>
              ) : (
                <div className="space-y-14">
                  {categories.map((cat) => (
                    <section key={cat} id={slugify(cat)} className="scroll-mt-32">
                      <h2 className="text-xs font-bold uppercase tracking-[0.32em] text-cyan">{cat}</h2>
                      <div
                        aria-hidden="true"
                        className="mt-3 h-px w-full bg-linear-to-r from-cyan/50 via-border to-transparent"
                      />
                      <ul className="mt-6 space-y-3.5">
                        {(groups[cat] ?? []).map((item) => {
                          const ItemIcon = menuItemIcon(item.name, item.category);
                          return (
                            <li key={item.id} className="flex items-baseline gap-3">
                              <span className="flex shrink-0 items-baseline gap-2 text-[0.95rem] font-medium tracking-tight">
                                <ItemIcon
                                  aria-hidden="true"
                                  className="size-4 shrink-0 translate-y-[0.15rem] text-primary/80"
                                  strokeWidth={1.75}
                                />
                                {item.name}
                              </span>
                              <span
                                aria-hidden="true"
                                className="min-w-6 flex-1 translate-y-[-0.25rem] border-b border-dotted border-border"
                              />
                              <span className="shrink-0 text-sm font-black text-cyan">{inr(item.price)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-20 flex justify-center">
            <Link
              to="/book"
              className="glass inline-flex items-center rounded-full px-7 py-3.5 text-sm font-semibold tracking-wide transition-colors duration-300 hover:text-cyan"
            >
              Book & Order
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-300",
        active
          ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground"
          : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
