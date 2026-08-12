import { useDeferredValue, useMemo, useState } from "react";
import { Search, Gamepad2 } from "lucide-react";
import { Reveal } from "@/components/site/primitives";
import { TiltCard } from "@/components/site/TiltCard";

import codImg from "@/assets/game-cod.jpg";
import wweImg from "@/assets/game-wwe.jpg";
import asphaltImg from "@/assets/game-asphalt.jpg";
import fcImg from "@/assets/game-fc.jpg";
import mkImg from "@/assets/game-mk.jpg";
import brImg from "@/assets/game-battle-royale.jpg";
import stadiumImg from "@/assets/game-cricket.jpg";
import driftImg from "@/assets/game-drift.jpg";
import questImg from "@/assets/game-arcade-quest.jpg";

type Game = { name: string; tag: string; img: string };

const GAMES: Game[] = [
  { name: "Call of Duty", tag: "Shooter", img: codImg },
  { name: "WWE 2K", tag: "Fighting", img: wweImg },
  { name: "Asphalt", tag: "Racing", img: asphaltImg },
  { name: "EA Sports FC", tag: "Sports", img: fcImg },
  { name: "Mortal Kombat", tag: "Fighting", img: mkImg },
  { name: "Warzone Nights", tag: "Shooter", img: brImg },
  { name: "Stadium Legends", tag: "Sports", img: stadiumImg },
  { name: "Neon Drift", tag: "Racing", img: driftImg },
  { name: "Arcade Quest", tag: "Arcade", img: questImg },
];

const GENRES = ["All", "Shooter", "Fighting", "Racing", "Sports", "Arcade"] as const;

export function GameLibrary() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("All");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return GAMES.filter(
      (g) =>
        (genre === "All" || g.tag === genre) &&
        (q === "" || g.name.toLowerCase().includes(q)),
    );
  }, [deferredQuery, genre]);

  return (
    <div className="mt-14">
      {/* Controls */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <label className="group relative block w-full lg:max-w-sm">
          <span className="sr-only">Search games</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-cyan"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles..."
            className="w-full rounded-full border border-border bg-surface/70 py-3 pl-11 pr-4 text-sm text-foreground backdrop-blur-xl outline-none transition-all duration-500 placeholder:text-muted-foreground focus:border-primary/60 focus:shadow-[0_0_36px_-10px_var(--primary)]"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by genre">
          {GENRES.map((g) => {
            const active = genre === g;
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                onClick={() => setGenre(g)}
                className={`press rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-500 ${
                  active
                    ? "gradient-ring border-transparent text-foreground shadow-[0_0_34px_-10px_var(--primary)]"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
        {results.length} {results.length === 1 ? "title" : "titles"}
      </p>

      {/* Grid */}
      {results.length > 0 ? (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((g, i) => (
            <Reveal as="li" key={g.name} delay={Math.min(i, 5) * 60}>
              <TiltCard max={10} glow contentClassName="group/tilt h-full">
                <article className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface transition-[border-color,box-shadow] duration-500 group-hover/tilt:border-primary/50">
                  <div className="overflow-hidden">
                    <img
                      src={g.img}
                      alt={`${g.name} cover art`}
                      width={768}
                      height={1024}
                      loading="lazy"
                      className="aspect-3/4 w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/tilt:scale-110 motion-reduce:transition-none"
                    />
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/25 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5 [transform:translateZ(40px)]">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-cyan">
                      {g.tag}
                    </p>
                    <h3 className="mt-1.5 text-lg font-bold">{g.name}</h3>
                    <span className="mt-3 inline-flex rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-500 group-hover/tilt:border-primary/60 group-hover/tilt:text-foreground group-hover/tilt:shadow-[0_0_28px_-6px_var(--primary)]">
                      Play Now
                    </span>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-surface/60 px-6 py-20 text-center backdrop-blur-xl">
          <Gamepad2 aria-hidden="true" className="size-8 text-muted-foreground" />
          <p className="text-lg font-bold">No titles match</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try another genre or clear your search — our library rotates every month.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setGenre("All");
            }}
            className="press mt-1 rounded-full border border-border px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition-all duration-500 hover:border-primary/60 hover:shadow-[0_0_28px_-6px_var(--primary)]"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
