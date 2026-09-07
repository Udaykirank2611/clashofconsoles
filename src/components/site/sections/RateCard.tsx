import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal, SectionHeading } from "../primitives";
import { cn } from "@/lib/utils";
import { inr, type Experience, type ExperienceRate, type SiteBranch } from "@/lib/site-content";

export function RateCard({
  experiences,
  rates,
  branches = [],
}: {
  experiences: Experience[];
  rates: ExperienceRate[];
  branches?: SiteBranch[];
}) {
  const [branchId, setBranchId] = useState<string | null>(null);
  const activeBranch = branches.find((b) => b.id === branchId) ?? branches[0] ?? null;

  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches, branchId]);

  const branchRates = useMemo(
    () => (activeBranch ? rates.filter((r) => r.branch_id === activeBranch.id) : rates),
    [rates, activeBranch],
  );

  const tabs = useMemo(
    () => experiences.filter((e) => branchRates.some((r) => r.experience_slug === e.slug)),
    [experiences, branchRates],
  );
  const [active, setActive] = useState<string | null>(null);
  /** Auto-rotation stops for good once the guest takes control. */
  const [manual, setManual] = useState(false);
  const current = tabs.find((t) => t.slug === active) ?? tabs[0];

  const step = (dir: 1 | -1, byUser = true) => {
    if (byUser) setManual(true);
    setActive((prev) => {
      const list = tabs.map((t) => t.slug);
      const i = Math.max(0, list.indexOf(prev ?? list[0]!));
      return list[(i + dir + list.length) % list.length]!;
    });
  };

  useEffect(() => {
    if (manual || tabs.length < 2) return;
    const id = window.setInterval(() => step(1, false), 5000);
    return () => window.clearInterval(id);
  }, [manual, tabs, active]);

  if (!tabs.length || !current) return null;

  const rows = branchRates
    .filter((r) => r.experience_slug === current.slug)
    .sort((a, b) => a.sort_order - b.sort_order);

  const groups = Array.from(new Set(rows.map((r) => r.group_label)));

  /**
   * When every group (e.g. "1 Player", "2 Players") shares the same duration
   * labels, the rates read far better as a compact grid than as long lists.
   */
  const matrix = (() => {
    const columns = Array.from(new Set(rows.map((r) => r.label)));
    if (groups.length < 2 || columns.length < 2 || groups.some((g) => !g)) return null;
    if (rows.length !== groups.length * columns.length) return null;
    const built = groups.map((group) => {
      const prices: Record<string, number> = {};
      for (const r of rows.filter((r) => r.group_label === group)) prices[r.label] = r.price;
      return { group, prices };
    });
    if (built.some((b) => columns.some((c) => b.prices[c] === undefined))) return null;
    return { columns, rows: built };
  })();

  return (
    <section id="rates" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Rate Card"
          title={
            <>
              Transparent <span className="text-gradient">Pricing</span>
            </>
          }
          lead="Every arena, every duration — no hidden charges, updated live by the team."
        />

        <Reveal>
          <div className="mt-6 flex justify-center">
            <a
              href="https://www.instagram.com/clashofconsoles/?hl=en"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-pink/50 bg-[linear-gradient(120deg,color-mix(in_oklab,var(--pink)_22%,transparent),color-mix(in_oklab,var(--primary)_18%,transparent))] px-5 py-2.5 text-center text-[0.7rem] font-black uppercase tracking-[0.18em] text-foreground shadow-[0_18px_50px_-26px_var(--pink)] transition-transform duration-300 hover:-translate-y-0.5 sm:text-xs"
            >
              Follow us on Instagram &amp; DM us to get free gaming!
            </a>
          </div>
        </Reveal>

        {branches.length > 1 && activeBranch ? (
          <Reveal>
            <div className="mt-8 flex justify-center">
              <div className="relative inline-flex items-center">
                <select
                  aria-label="Choose a branch to see its pricing"
                  value={activeBranch.id}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setActive(null);
                  }}
                  className="appearance-none rounded-full border border-cyan/40 bg-surface/70 py-3 pl-6 pr-12 text-xs font-semibold uppercase tracking-[0.18em] text-foreground backdrop-blur-xl transition-colors hover:border-cyan focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-background text-foreground">
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-5 size-4 text-cyan" />
              </div>
            </div>
          </Reveal>
        ) : null}

        <Reveal>
          <div className="relative mt-14">
            <button
              type="button"
              aria-label="Previous experience"
              onClick={() => step(-1)}
              className="absolute -left-3 top-1/2 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-pink/45 bg-surface/85 text-pink shadow-[0_18px_50px_-24px_var(--pink)] backdrop-blur-xl transition-all hover:scale-110 hover:border-pink hover:bg-pink/15 sm:size-16 lg:-left-8"
            >
              <ChevronLeft className="size-6 sm:size-8" />
            </button>
            <button
              type="button"
              aria-label="Next experience"
              onClick={() => step(1)}
              className="absolute -right-3 top-1/2 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-pink/45 bg-surface/85 text-pink shadow-[0_18px_50px_-24px_var(--pink)] backdrop-blur-xl transition-all hover:scale-110 hover:border-pink hover:bg-pink/15 sm:size-16 lg:-right-8"
            >
              <ChevronRight className="size-6 sm:size-8" />
            </button>

            <div className="overflow-hidden rounded-[2rem] border border-border bg-surface/60 backdrop-blur-2xl">
              <div className="flex gap-2 overflow-x-auto border-b border-border p-4 px-12 sm:px-16">
                {tabs.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => {
                      setManual(true);
                      setActive(t.slug);
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] transition-all duration-400",
                      t.slug === current.slug
                        ? "border-transparent bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground shadow-[0_16px_40px_-22px_var(--primary)]"
                        : "border-border text-muted-foreground hover:-translate-y-0.5 hover:border-cyan/50 hover:text-foreground",
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="relative overflow-hidden rounded-[1.5rem] border border-border">
                  <img
                    src={current.image_url ?? "/experiences/ps5.jpg"}
                    alt={current.name}
                    width={900}
                    height={700}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent"
                  />
                  <div className="absolute inset-x-5 bottom-5">
                    <h3 className="text-xl font-black leading-tight">{current.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{current.description}</p>
                  </div>
                </div>

                <div
                  key={current.slug}
                  className="animate-[step-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both] space-y-6"
                >
                  {matrix ? (
                    <div className="overflow-hidden rounded-2xl border border-border">
                      <div
                        className="grid border-b border-border bg-background/60"
                        style={{ gridTemplateColumns: `1.1fr repeat(${matrix.columns.length}, 1fr)` }}
                      >
                        <span className="px-4 py-3 text-[0.55rem] font-black uppercase tracking-[0.24em] text-muted-foreground">
                          Players
                        </span>
                        {matrix.columns.map((c) => (
                          <span
                            key={c}
                            className="px-4 py-3 text-center text-[0.55rem] font-black uppercase tracking-[0.24em] text-cyan"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      {matrix.rows.map((r) => (
                        <div
                          key={r.group}
                          className="grid border-b border-border/70 transition-colors last:border-b-0 hover:bg-pink/5"
                          style={{ gridTemplateColumns: `1.1fr repeat(${matrix.columns.length}, 1fr)` }}
                        >
                          <span className="px-4 py-4 text-sm font-bold">{r.group}</span>
                          {matrix.columns.map((c) => (
                            <span
                              key={c}
                              className="px-4 py-4 text-center text-lg font-black tracking-tight"
                            >
                              {r.prices[c] !== undefined ? inr(r.prices[c]!) : "—"}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group || "default"}>
                        {group ? (
                          <p className="mb-3 text-[0.58rem] font-semibold uppercase tracking-[0.3em] text-cyan">
                            {group}
                          </p>
                        ) : null}
                        <ul className="space-y-2">
                          {rows
                            .filter((r) => r.group_label === group)
                            .map((r) => (
                              <li
                                key={r.id}
                                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/45 px-5 py-3.5 transition-all duration-400 hover:-translate-y-0.5 hover:border-cyan/50"
                              >
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold">{r.label}</span>
                                  {r.note ? (
                                    <span className="block text-xs text-muted-foreground">{r.note}</span>
                                  ) : null}
                                </span>
                                <span className="shrink-0 text-lg font-black tracking-tight">
                                  {inr(r.price)}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
