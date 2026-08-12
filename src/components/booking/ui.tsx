import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/** Slim animated step rail shown above every booking step. */
export function StepProgress({
  labels,
  current,
  onJump,
}: {
  labels: string[];
  current: number;
  onJump?: (i: number) => void;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 sm:gap-2">
        {labels.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <button
              key={label}
              type="button"
              disabled={i > current}
              onClick={() => onJump?.(i)}
              className="group/step flex-1 text-left"
              aria-current={active ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${label}`}
            >
              <span
                className={cn(
                  "block h-1 rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  done && "bg-cyan/70",
                  active && "bg-linear-to-r from-primary via-cyan to-violet shadow-[0_0_18px_-2px_var(--primary)]",
                  !done && !active && "bg-border",
                )}
              />
              <span
                className={cn(
                  "mt-2 hidden text-[0.62rem] font-semibold uppercase tracking-[0.18em] transition-colors sm:block",
                  active ? "text-foreground" : "text-muted-foreground/60",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Consistent premium heading + animated body for each step. */
export function StepShell({
  eyebrow,
  title,
  lead,
  children,
  stepKey,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
  stepKey: string | number;
}) {
  return (
    <div key={stepKey} className="animate-[step-in_0.6s_cubic-bezier(0.22,1,0.36,1)_both]">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-2xl font-extrabold leading-tight sm:text-4xl">{title}</h2>
      {lead ? <p className="mt-2.5 max-w-xl text-sm text-muted-foreground sm:text-base">{lead}</p> : null}
      <div className="mt-8">{children}</div>
    </div>
  );
}

/** Selectable premium card with lift + gradient ring on selection. */
export function OptionCard({
  selected,
  disabled,
  onClick,
  className,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl border border-border bg-surface/70 p-5 text-left backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        !disabled && "hover:-translate-y-1.5 hover:border-cyan/40 hover:shadow-[0_28px_70px_-30px_var(--primary)]",
        selected && "border-transparent shadow-[0_28px_80px_-28px_var(--primary)]",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      {selected ? (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl p-px [background:linear-gradient(130deg,var(--primary),var(--cyan),var(--violet))] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude]"
          />
          <span className="absolute right-4 top-4 z-10 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground animate-[scale-in_0.25s_ease-out]">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        </>
      ) : null}
      <span className="relative block">{children}</span>
    </button>
  );
}

/** Availability dot + label. */
export function StatusTag({ tone, label }: { tone: "available" | "booked" | "maintenance"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
        tone === "available" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        tone === "booked" && "border-rose-400/30 bg-rose-400/10 text-rose-300",
        tone === "maintenance" && "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "available" && "bg-emerald-400",
          tone === "booked" && "bg-rose-400",
          tone === "maintenance" && "bg-muted-foreground",
        )}
      />
      {label}
    </span>
  );
}

/** Image placeholder — swap for real branding/photography later. */
export function ImagePlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-2xl border border-border bg-linear-to-br from-surface-2 via-surface to-background",
        className,
      )}
    >
      <div className="grid-texture absolute inset-0 opacity-40" aria-hidden="true" />
      <span className="relative text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

/** Modern floating-label field. */
export function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  textarea,
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  textarea?: boolean;
  required?: boolean;
  autoComplete?: string;
}) {
  const shared =
    "peer w-full rounded-2xl border border-border bg-surface/60 px-4 pb-2.5 pt-6 text-sm text-foreground outline-none backdrop-blur-xl transition-all duration-300 placeholder-transparent focus:border-cyan/50 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_16%,transparent)]";
  return (
    <label className="block">
      <span className="relative block">
        {textarea ? (
          <textarea
            value={value}
            rows={3}
            placeholder={label}
            onChange={(e) => onChange(e.target.value)}
            className={cn(shared, "resize-none")}
          />
        ) : (
          <input
            type={type}
            value={value}
            placeholder={label}
            required={required}
            autoComplete={autoComplete ?? "off"}
            onChange={(e) => onChange(e.target.value)}
            className={shared}
          />
        )}
        <span className="pointer-events-none absolute left-4 top-2 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 peer-placeholder-shown:top-4.5 peer-placeholder-shown:text-xs peer-placeholder-shown:tracking-normal peer-placeholder-shown:normal-case peer-focus:top-2 peer-focus:text-[0.62rem] peer-focus:uppercase peer-focus:tracking-[0.2em] peer-focus:text-cyan">
          {label}
        </span>
      </span>
      {error ? <span className="mt-1.5 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}
