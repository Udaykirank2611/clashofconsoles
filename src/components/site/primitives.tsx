import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

/** Scroll-reveal wrapper with optional stagger delay (ms). */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", shown && "reveal-in", className)}
    >
      {children}
    </Tag>
  );
}

/** Section heading eyebrow + title + optional lead paragraph. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
  id,
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  align?: "center" | "left";
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
      )}
    >
      <Reveal>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-cyan" aria-hidden="true" />
          {eyebrow}
        </span>
      </Reveal>
      <Reveal delay={80}>
        <Tag
          id={id}
          className="mt-6 text-balance text-3xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl"
        >
          {title}
        </Tag>
      </Reveal>

      {lead ? (
        <Reveal delay={140}>
          <p
            className={cn(
              "mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg",
              align === "center" && "mx-auto max-w-2xl",
            )}
          >
            {lead}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

/** Magnetic, glowing call-to-action button. */
export function MagneticButton({
  children,
  href = "#contact",
  variant = "primary",
  className,
  ariaLabel,
  external = false,
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
  ariaLabel?: string;
  external?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / 6;
    const y = (e.clientY - r.top - r.height / 2) / 6;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };

  return (
    <a
      ref={ref}
      href={href}
      aria-label={ariaLabel}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onBlur={reset}
      className={cn(
        "gradient-ring group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold tracking-wide transition-[transform,box-shadow,background-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.965]",
        variant === "primary"
          ? "bg-[linear-gradient(120deg,var(--pink),var(--primary)_55%,var(--violet))] text-primary-foreground shadow-none hover:shadow-[0_22px_70px_-14px_var(--pink)]"
          : "glass text-foreground hover:text-cyan",
        className,
      )}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant === "primary" ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
      ) : null}
    </a>
  );
}

/** Number that counts up when scrolled into view. */
export function Counter({
  to,
  suffix = "",
  duration = 1600,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const { ref, shown } = useReveal<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!shown) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}
