import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/primitives";

export type LegalSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  items?: string[];
  extra?: { label: string; items: string[] };
};

/** Shared premium layout for the Privacy / Terms / Refund pages. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      sections.filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          (s.items ?? []).some((i) => i.toLowerCase().includes(q)) ||
          (s.extra?.items ?? []).some((i) => i.toLowerCase().includes(q)),
      ),
    [sections, q],
  );

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-pink" aria-hidden="true" />
            {eyebrow}
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="text-gradient mt-6 text-balance text-4xl font-extrabold leading-[1.05] sm:text-5xl">
            {title}
          </h1>
        </Reveal>
        <Reveal delay={140}>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{intro}</p>
          <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Last updated · {updated}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="relative mx-auto mt-8 max-w-md">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in this policy..."
              aria-label="Search in this policy"
              className="w-full rounded-full border border-border bg-surface/70 py-3 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-pink/50"
            />
          </div>
        </Reveal>
      </div>

      {/* Floating table of contents — chips on mobile, sticky rail on desktop */}
      <nav aria-label="Table of contents" className="mt-10 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                jump(s.id);
              }}
              className="shrink-0 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-pink/50 hover:text-foreground"
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-4">
          {visible.length ? (
            visible.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.id} delay={Math.min(i * 40, 200)}>
                  <article
                    id={s.id}
                    className="glass scroll-mt-28 rounded-3xl border border-border p-6 sm:p-8"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-pink/40 bg-pink/10 text-pink">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">{s.title}</h2>
                    </div>
                    {s.items?.length ? (
                      <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                        {s.items.map((item, j) => (
                          <li key={j} className="flex gap-2.5">
                            <span
                              className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-cyan"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {s.extra ? (
                      <div className="mt-4 rounded-2xl border border-border bg-surface/60 p-4">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-foreground">
                          {s.extra.label}
                        </p>
                        <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                          {s.extra.items.map((item, j) => (
                            <li key={j} className="flex gap-2.5">
                              <span
                                className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-pink"
                                aria-hidden="true"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                </Reveal>
              );
            })
          ) : (
            <p className="glass rounded-3xl border border-border py-14 text-center text-sm text-muted-foreground">
              No sections match &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="glass sticky top-24 rounded-3xl border border-border p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              On this page
            </p>
            <ul className="mt-3 space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      jump(s.id);
                    }}
                    className={cn(
                      "block rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors",
                      "hover:bg-surface-2/60 hover:text-foreground",
                    )}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
