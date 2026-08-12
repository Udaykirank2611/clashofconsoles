import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { formatTime, inr } from "@/lib/booking/pricing";
import { ImagePlaceholder } from "./ui";
import type { GameOption } from "@/lib/booking/config";

/** Small section label used down the left configuration column. */
export function SectionLabel({ index, title, hint }: { index: number; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-cyan/30 bg-cyan/10 text-[0.65rem] font-bold text-cyan">
        {index}
      </span>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-extrabold uppercase tracking-[0.18em]">{title}</h2>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

/** Rounded selectable chip. */
export function Chip({
  selected,
  disabled,
  onClick,
  children,
  tone = "default",
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: "default" | "slot";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "border-border bg-surface/60 backdrop-blur-xl",
        !disabled && "hover:-translate-y-0.5 hover:border-cyan/40 hover:text-foreground",
        selected &&
          "border-transparent bg-linear-to-r from-primary/25 via-cyan/20 to-violet/25 text-foreground shadow-[0_0_0_1px_var(--cyan),0_16px_40px_-22px_var(--primary)]",
        disabled && "cursor-not-allowed border-rose-400/20 bg-rose-400/5 text-rose-300/60 line-through",
        tone === "slot" && !disabled && !selected && "text-emerald-200/90",
      )}
    >
      {children}
    </button>
  );
}

/** Game cover thumbnail (placeholder art). */
export function GameTile({
  game,
  selected,
  onClick,
}: {
  game: GameOption;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group w-24 shrink-0 text-left transition-transform duration-300 hover:-translate-y-1",
      )}
    >
      <span
        className={cn(
          "relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-xl border bg-linear-to-br from-surface-2 via-surface to-background",
          selected ? "border-cyan shadow-[0_0_0_1px_var(--cyan),0_18px_40px_-24px_var(--primary)]" : "border-border",
        )}
      >
        <span className="grid-texture absolute inset-0 opacity-40" aria-hidden="true" />
        <span className="relative text-xs font-black tracking-[0.2em] text-muted-foreground/80">
          {game.cover}
        </span>
        {selected ? (
          <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground animate-[scale-in_0.25s_ease-out]">
            <Check className="size-3" strokeWidth={3} />
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "mt-2 block truncate text-[0.7rem] font-semibold",
          selected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {game.title}
      </span>
    </button>
  );
}

/** Duration card with price preview. */
export function DurationCard({
  label,
  tag,
  price,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  tag?: string;
  price: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-3.5 text-left backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        !disabled && "hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_22px_50px_-30px_var(--primary)]",
        selected && "border-transparent shadow-[0_0_0_1px_var(--cyan),0_24px_60px_-30px_var(--primary)]",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span className="block text-sm font-extrabold">{label}</span>
      {tag ? (
        <span className="mt-0.5 block text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {tag}
        </span>
      ) : null}
      <span className={cn("mt-2 block text-base font-black", selected ? "text-cyan" : "text-foreground/90")}>
        {inr(price)}
      </span>
    </button>
  );
}

/** Time slot grid for a single station. */
export function SlotGrid({
  slots,
  value,
  isDisabled,
  onSelect,
}: {
  slots: string[];
  value: string | null;
  isDisabled: (slot: string) => boolean;
  onSelect: (slot: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const disabled = isDisabled(slot);
        const selected = value === slot;
        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot)}
            aria-pressed={selected}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition-all duration-300",
              !disabled &&
                !selected &&
                "border-emerald-400/25 bg-emerald-400/5 text-emerald-200 hover:-translate-y-0.5 hover:border-emerald-300/50",
              selected &&
                "border-transparent bg-linear-to-r from-primary/30 to-cyan/25 text-foreground shadow-[0_0_0_1px_var(--cyan),0_0_26px_-6px_var(--primary)]",
              disabled && "cursor-not-allowed border-rose-400/25 bg-rose-400/5 text-rose-300/70",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                disabled ? "bg-rose-400" : selected ? "bg-cyan" : "bg-emerald-400",
              )}
            />
            {formatTime(slot)}
          </button>
        );
      })}
    </div>
  );
}

export { ImagePlaceholder };
