import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Gamepad2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StationGame } from "@/lib/booking/types";

/** Single game tile — cover art plus title. */
function GameTile({ game }: { game: StationGame }) {
  return (
    <div className="group/game min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-linear-to-br from-surface-2 via-surface to-background transition-transform duration-300 group-hover/game:-translate-y-0.5 group-hover/game:border-cyan/40">
        {game.image_url ? (
          <img
            src={game.image_url}
            alt={game.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover/game:scale-105"
          />
        ) : (
          <span className="grid size-full place-items-center text-[0.7rem] font-black tracking-[0.2em] text-muted-foreground/80">
            {game.name.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-[0.68rem] font-semibold text-muted-foreground">{game.name}</p>
    </div>
  );
}

/**
 * Games library popup for a console/station.
 * Scrolls internally, closes on X, backdrop click and Escape, and locks the
 * page behind it so the booking flow never grows or scrolls.
 */
export function GamesModal({
  open,
  title,
  games,
  onClose,
}: {
  open: boolean;
  title: string;
  games: StationGame[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 grid place-items-center p-4 animate-[step-in_0.25s_ease-out_both]"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} games`}
      onClick={onClose}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl",
          "border border-border bg-surface/95 shadow-[0_40px_120px_-40px_var(--cyan)] backdrop-blur-xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-base font-extrabold">
              <Gamepad2 className="size-4 shrink-0 text-cyan" />
              {title}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cyan">
              {games.length} {games.length === 1 ? "game installed" : "games installed"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close games list"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground transition-colors duration-300 hover:border-cyan/40 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="coc-thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {games.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {games.map((g) => (
                <GameTile key={g.id} game={g} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No games listed yet.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
