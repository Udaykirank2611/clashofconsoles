import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gamepad2, Loader2, Search } from "lucide-react";
import { getCatalogue } from "@/lib/booking.functions";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/primitives";
import { TiltCard } from "@/components/site/TiltCard";
import { cn } from "@/lib/utils";

const TITLE = "Games Library — Clash of Consoles Hyderabad";
const DESC =
  "Browse every PS5, VR, racing simulator and lounge title playable at Clash of Consoles in Hyderabad. Search the library and see which setup each game runs on.";

export const Route = createFileRoute("/games")({
  component: GamesPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/games" }],
  }),
});

/** Friendly label for each kind of setup a game can run on. */
const PLATFORM_LABELS: Record<string, string> = {
  console: "PS5",
  vr: "VR",
  driving_simulator: "Racing",
  private_theatre: "Theatre",
  private_lounge: "Lounge",
  snooker: "Snooker",
};

interface GalleryGame {
  name: string;
  image: string | null;
  platforms: string[];
}

function GamesPage() {
  const catalogue = useServerFn(getCatalogue);
  const { data, isLoading } = useQuery({
    queryKey: ["catalogue", "games"],
    queryFn: () => catalogue(),
    staleTime: 60_000,
  });

  const [query, setQuery] = useState("");
  // Cover art that failed to load falls back to the initials tile.
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [platform, setPlatform] = useState("All");

  const games = useMemo<GalleryGame[]>(() => {
    if (!data) return [];
    const typeByStation = new Map(data.stations.map((s) => [s.id, s.station_type as string]));
    const merged = new Map<string, GalleryGame>();
    for (const g of data.stationGames) {
      const key = g.name.trim().toLowerCase();
      const label = PLATFORM_LABELS[typeByStation.get(g.station_id) ?? ""] ?? null;
      const entry = merged.get(key) ?? { name: g.name.trim(), image: null, platforms: [] };
      if (!entry.image && g.image_url) entry.image = g.image_url;
      if (label && !entry.platforms.includes(label)) entry.platforms.push(label);
      merged.set(key, entry);
    }
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const platforms = useMemo(
    () => ["All", ...[...new Set(games.flatMap((g) => g.platforms))].sort()],
    [games],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter(
      (g) =>
        (platform === "All" || g.platforms.includes(platform)) &&
        (q === "" || g.name.toLowerCase().includes(q)),
    );
  }, [games, query, platform]);

  return (
    <div className="theme-neon-pink relative min-h-screen bg-background text-foreground">
      <AmbientBackground />
      <Navbar />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-32 sm:px-6">
        <Reveal>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-primary">
            Games library
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] sm:text-6xl">
            Every title on the floor,{" "}
            <span className="bg-linear-to-r from-primary via-primary to-cyan bg-clip-text text-transparent">
              ready to play
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Our library is updated live from the arena. Search a title, filter by setup, and book
            the station it runs on.
          </p>
        </Reveal>

        <div className="mt-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="group relative block w-full lg:max-w-sm">
            <span className="sr-only">Search games</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles..."
              className="w-full rounded-full border border-border bg-surface/70 py-3 pl-11 pr-4 text-sm text-foreground backdrop-blur-xl outline-none transition-all duration-500 placeholder:text-muted-foreground focus:border-primary/60 focus:shadow-[0_0_36px_-10px_var(--primary)]"
            />
          </label>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by setup">
            {platforms.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={platform === p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "press rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-500",
                  platform === p
                    ? "gradient-ring border-transparent text-foreground shadow-[0_0_34px_-10px_var(--primary)]"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
          {isLoading ? "Loading library" : `${results.length} ${results.length === 1 ? "title" : "titles"}`}
        </p>

        {isLoading ? (
          <div className="mt-10 flex items-center justify-center gap-3 rounded-3xl border border-border bg-surface/60 py-24 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Fetching the latest titles…
          </div>
        ) : results.length > 0 ? (
          <ul className="mt-6 grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((g, i) => (
              <Reveal as="li" key={g.name} delay={Math.min(i, 6) * 50}>
                <TiltCard max={10} glow contentClassName="group/tilt h-full">
                  <article className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface transition-[border-color,box-shadow] duration-500 group-hover/tilt:border-primary/50">
                    <div className="overflow-hidden">
                      {g.image && !broken[g.name] ? (
                        <img
                          src={g.image}
                          alt={`${g.name} cover art`}
                          loading="lazy"
                          onError={() => setBroken((b) => ({ ...b, [g.name]: true }))}
                          className="aspect-3/4 w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/tilt:scale-110 motion-reduce:transition-none"
                        />
                      ) : (
                        <div className="grid aspect-3/4 w-full place-items-center bg-linear-to-br from-surface-2 via-surface to-background text-2xl font-black tracking-[0.2em] text-muted-foreground/70">
                          {g.name.slice(0, 3).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/25 to-transparent"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 [transform:translateZ(40px)]">
                      <h2 className="text-base font-bold leading-tight sm:text-lg">{g.name}</h2>
                      {g.platforms.length ? (
                        <p className="mt-2 flex flex-wrap gap-1.5">
                          <span className="sr-only">Available on</span>
                          {g.platforms.map((p) => (
                            <span
                              key={p}
                              className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.16em] text-primary"
                            >
                              {p}
                            </span>
                          ))}
                        </p>
                      ) : null}
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
              Try another setup or clear your search — our library grows every month.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPlatform("All");
              }}
              className="press mt-1 rounded-full border border-border px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition-all duration-500 hover:border-primary/60 hover:shadow-[0_0_28px_-6px_var(--primary)]"
            >
              Reset filters
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
