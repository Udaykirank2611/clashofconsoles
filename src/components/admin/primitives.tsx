import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-3xl border border-border bg-surface/60 p-4 backdrop-blur-2xl sm:p-6",
        className,
      )}
    >
      {title ? (
        <header className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="min-w-0 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-cyan sm:tracking-[0.32em]">{title}</h2>
          {action ? (
            <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
              {action}
            </div>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  labelClassName,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
  labelClassName?: string;
}) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/70 p-3 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-[0_20px_50px_-40px_var(--primary)] sm:p-3.5">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          tone === "good" && "bg-linear-to-r from-transparent via-emerald-400/70 to-transparent",
          tone === "warn" && "bg-linear-to-r from-transparent via-amber-400/70 to-transparent",
          tone === "bad" && "bg-linear-to-r from-transparent via-rose-400/70 to-transparent",
          tone === "default" && "bg-linear-to-r from-transparent via-primary/70 to-transparent",
        )}
      />
      <p className={cn("text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground", labelClassName)}>{label}</p>
      <p className="mt-1.5 break-words text-base font-black tracking-tight sm:text-xl">{value}</p>
      {hint ? <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{hint}</p> : null}
    </div>

  );
}

export function Pill({
  tone,
  children,
}: {
  tone: "good" | "warn" | "bad" | "muted";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em]",
        tone === "good" && "border-emerald-500/40 bg-emerald-400/25 text-emerald-950",
        tone === "warn" && "border-amber-500/40 bg-amber-400/25 text-amber-950",
        tone === "bad" && "border-rose-500/40 bg-rose-400/25 text-rose-950",
        tone === "muted" && "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function AdminButton({
  children,
  onClick,
  variant = "ghost",
  disabled,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "success";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" &&
          "bg-linear-to-r from-primary via-cyan to-violet text-primary-foreground shadow-[0_16px_40px_-18px_var(--primary)] hover:brightness-110 active:scale-[0.97]",
        variant === "ghost" && "border border-border bg-surface/70 text-foreground hover:border-cyan/40",
        variant === "success" &&
          "border border-emerald-500/45 bg-emerald-400/25 text-emerald-950 hover:bg-emerald-400/40",
        variant === "danger" && "border border-rose-500/45 bg-rose-400/25 text-rose-950 hover:bg-rose-400/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AdminInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="mb-1.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-300 focus:border-cyan/50 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_16%,transparent)]"
      />
    </label>
  );
}

export const money = (n: number) => `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;
