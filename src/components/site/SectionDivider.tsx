import { cn } from "@/lib/utils";

/** Premium glowing divider between sections. */
export function SectionDivider({
  variant = "glow",
  className,
}: {
  variant?: "glow" | "angled" | "beam";
  className?: string;
}) {
  if (variant === "angled") {
    return (
      <div aria-hidden="true" className={cn("relative h-24 overflow-hidden", className)}>
        <div
          className="absolute inset-x-0 top-0 h-full -skew-y-2 border-t border-border/70"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in oklab, var(--surface) 55%, transparent), transparent)",
          }}
        />
        <div className="absolute inset-x-[10%] top-0 h-px -skew-y-2 bg-linear-to-r from-transparent via-violet/60 to-transparent" />
      </div>
    );
  }

  if (variant === "beam") {
    return (
      <div aria-hidden="true" className={cn("relative h-20 overflow-hidden", className)}>
        <div
          className="absolute left-1/2 top-1/2 h-40 w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, color-mix(in oklab, var(--primary) 45%, transparent), transparent 70%)",
          }}
        />
        <div className="absolute inset-x-0 top-1/2 h-px bg-linear-to-r from-transparent via-cyan/70 to-transparent" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn("relative h-16", className)}>
      <div className="absolute inset-x-[8%] top-1/2 h-px bg-linear-to-r from-transparent via-border to-transparent" />
      <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cyan/80 shadow-[0_0_18px_2px_color-mix(in_oklab,var(--cyan)_60%,transparent)]" />
    </div>
  );
}
