import { useRef, useState } from "react";
import { Check, Gamepad2, LibraryBig } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime, inr } from "@/lib/booking/pricing";
import type { Station, StationGame } from "@/lib/booking/types";
import { GamesModal } from "./GamesModal";

/** Status of a console for the currently chosen slot. */
type Availability = "available" | "occupied" | "maintenance";

function StatusBadge({ status }: { status: Availability }) {
  const map = {
    available: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
    occupied: "border-rose-400/35 bg-rose-400/10 text-rose-300",
    maintenance: "border-amber-400/35 bg-amber-400/10 text-amber-300",
  } as const;
  const label = status === "available" ? "Available" : status === "occupied" ? "Occupied" : "Maintenance";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.16em]",
        map[status],
      )}
    >
      {label}
    </span>
  );
}

/** Small pill button used inside a console card. */
export function CardAction({
  children,
  onClick,
  disabled,
  primary,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] transition-all duration-300",
        primary
          ? "border-transparent bg-linear-to-r from-primary to-violet text-primary-foreground hover:brightness-110"
          : "border-border bg-background/50 text-muted-foreground hover:border-cyan/40 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** One premium console card: Select + View Games, no in-page expansion. */
function ConsoleCard({
  station,
  status,
  games,
  selected,
  onSelect,
}: {
  station: Station;
  status: Availability;
  games: StationGame[];
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = status !== "available";
  const gameCount = games.length;
  const [showGames, setShowGames] = useState(false);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border bg-surface/60 p-5 text-left backdrop-blur-xl",
        "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        !disabled &&
          "hover:-translate-y-1.5 hover:border-cyan/40 hover:shadow-[0_28px_70px_-30px_var(--cyan)]",
        selected &&
          "border-transparent shadow-[0_0_0_2px_var(--cyan),0_30px_80px_-32px_var(--cyan)]",
        disabled && "opacity-45",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500",
          "bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--cyan)_22%,transparent),transparent_65%)]",
          !disabled && "group-hover:opacity-100",
          selected && "opacity-100",
        )}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-2xl border border-border bg-background/60 transition-colors duration-500",
              selected && "border-cyan/50 text-cyan",
            )}
          >
            <Gamepad2 className="size-6" />
          </span>
          <StatusBadge status={status} />
        </div>
        <p className="mt-4 truncate text-base font-extrabold">{station.name}</p>
        <p className="mt-1 text-[0.68rem] text-muted-foreground">
          {status === "available"
            ? `${gameCount} ${gameCount === 1 ? "game" : "games"} installed`
            : status === "occupied"
              ? "Unavailable for this slot"
              : "Under maintenance"}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <CardAction
            primary
            disabled={disabled}
            onClick={onSelect}
            aria-pressed={selected}
            className={cn(selected && "from-cyan to-cyan")}
          >
            {selected ? <Check className="size-3.5" /> : null}
            {selected ? "Selected" : "Select"}
          </CardAction>
          {gameCount ? (
            <CardAction onClick={() => setShowGames(true)}>
              <LibraryBig className="size-3.5" /> View games
            </CardAction>
          ) : null}
        </div>
      </div>

      <GamesModal
        open={showGames}
        title={station.name}
        games={games}
        onClose={() => setShowGames(false)}
      />
    </div>
  );
}


/**
 * Console gaming block: a toggle card (matching the other experiences).
 * When switched on it first shows the console grid, and only after a console
 * is picked does the timing / duration / players panel appear.
 */
export function ConsoleSelect({
  label,
  description,
  consoles,
  gamesFor,
  slots,
  durations,
  priceFor,
  players,
  playerOptions,
  playerPrice,
  onPlayers,
  startTime,
  onStartTime,
  durationMinutes,
  onDuration,
  stationId,
  onStation,
  enabled,
  onToggle,
  slotBlocked,
  timeBlocked,
  extraMinutes,
}: {

  label: string;
  description?: string | undefined;
  consoles: Station[];
  gamesFor: (stationId: string) => StationGame[];
  slots: string[];
  durations: { minutes: number; label: string }[];
  priceFor: (minutes: number) => number;
  players: number;
  playerOptions: readonly number[];
  playerPrice: (p: number) => number;
  onPlayers: (p: number) => void;
  startTime: string | null;
  onStartTime: (slot: string) => void;
  durationMinutes: number | null;
  onDuration: (minutes: number) => void;
  stationId: string | null;
  onStation: (id: string | null) => void;
  /** Is the console-gaming block switched on? */
  enabled: boolean;
  onToggle: () => void;
  /** Is this station busy for the chosen slot + length? */
  slotBlocked: (stationId: string, slot: string, minutes: number) => boolean;
  /** Is this start time impossible for every console (past / after closing)? */
  timeBlocked: (slot: string, minutes: number) => boolean;
  /** Extra free minutes (loyalty reward) that must also fit after the paid slot. */
  extraMinutes?: number;
}) {
  const minutes = durationMinutes ?? durations[0]?.minutes ?? 60;
  const needed = minutes + (extraMinutes ?? 0);
  const bookable = consoles.filter((s) => s.status === "available");

  const statusOf = (s: Station): Availability => {
    if (s.status !== "available") return "maintenance";
    if (startTime && slotBlocked(s.id, startTime, needed)) return "occupied";
    return "available";
  };

  const nextRef = useRef<HTMLDivElement | null>(null);
  const select = (id: string) => {
    const next = stationId === id ? null : id;
    onStation(next);
    if (!next) return;
    window.setTimeout(
      () => nextRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      120,
    );
  };



  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-border bg-surface/60 p-5 backdrop-blur-xl transition-all duration-500",
        enabled && "border-transparent shadow-[0_0_0_1px_var(--cyan)]",
        !bookable.length && "opacity-50",
      )}
    >
      <div
        onClick={() => {
          if (bookable.length) onToggle();
        }}
        className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">
            {label}
            <span className="ml-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cyan">
              {consoles.length} available
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {bookable.length
              ? `${description ?? ""} From ${inr(playerPrice(players))}/hr`.trim()
              : "Currently unavailable"}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={enabled}
          disabled={!bookable.length}
          aria-label={`${enabled ? "Hide" : "Show"} ${label} options`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] transition-all duration-300 disabled:cursor-not-allowed",
            enabled
              ? "border-transparent bg-linear-to-r from-primary to-violet text-primary-foreground"
              : "border-border bg-surface/60 hover:border-cyan/50",
          )}
        >
          {enabled ? "Selected" : "Select"}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform duration-300", enabled && "rotate-180")}
          />
        </button>
      </div>

      {enabled ? (
        <div className="mt-6 space-y-7 animate-[step-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both]">
          <div>
            <Label>{label}</Label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {consoles.map((s) => (
                <ConsoleCard
                  key={s.id}
                  station={s}
                  status={statusOf(s)}
                  games={gamesFor(s.id)}
                  selected={stationId === s.id}
                  onSelect={() => select(s.id)}
                />
              ))}
            </div>
          </div>

          {stationId ? (
            <div
              ref={nextRef}
              className="scroll-mt-24 space-y-7 animate-[step-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
            >
              <div>
                <Label>
                  Start time
                  {extraMinutes ? (
                    <span className="ml-2 normal-case tracking-normal text-emerald-300">
                      only slots that fit your free {extraMinutes} min extension
                    </span>
                  ) : null}
                </Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {slots.map((slot) => {
                    const blocked =
                      timeBlocked(slot, needed) || slotBlocked(stationId, slot, needed);

                    const on = startTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={blocked}
                        aria-pressed={on}
                        onClick={() => onStartTime(slot)}
                        className={cn(
                          "rounded-xl border border-border bg-surface/60 px-2 py-2 text-xs font-bold backdrop-blur-xl transition-all duration-300",
                          !blocked && "hover:-translate-y-0.5 hover:border-cyan/40",
                          on &&
                            "border-transparent bg-cyan/15 shadow-[0_0_0_1px_var(--cyan)] text-cyan",
                          blocked && "cursor-not-allowed opacity-35",
                        )}
                      >
                        {formatTime(slot)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label>Duration</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {durations.map((d) => (
                      <button
                        key={d.minutes}
                        type="button"
                        aria-pressed={durationMinutes === d.minutes}
                        onClick={() => onDuration(d.minutes)}
                        className={cn(
                          "rounded-2xl border border-border bg-surface/60 px-3 py-2.5 text-left backdrop-blur-xl transition-all duration-300",
                          "hover:-translate-y-0.5 hover:border-cyan/40",
                          durationMinutes === d.minutes &&
                            "border-transparent shadow-[0_0_0_1px_var(--cyan)]",
                        )}
                      >
                        <span className="block text-xs font-extrabold">{d.label}</span>
                        <span className="mt-0.5 block text-sm font-black text-cyan">
                          {inr(priceFor(d.minutes))}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Players</Label>
                  <div className="flex flex-wrap gap-2">
                    {playerOptions.map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={players === p}
                        onClick={() => onPlayers(p)}
                        className={cn(
                          "rounded-xl border border-border bg-surface/60 px-3.5 py-2 text-sm font-semibold backdrop-blur-xl transition-all duration-300",
                          "hover:-translate-y-0.5 hover:border-cyan/40",
                          players === p &&
                            "border-transparent shadow-[0_0_0_1px_var(--cyan)] text-cyan",
                        )}
                      >
                        {p} {p === 1 ? "Player" : "Players"}
                        <span className="ml-2 text-[0.65rem] font-bold text-muted-foreground">
                          {inr(playerPrice(p))}/hr
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a console above to choose your time, duration and players.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.24em] text-cyan">{children}</p>
  );
}
