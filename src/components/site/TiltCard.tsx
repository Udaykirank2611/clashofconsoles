import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pointer-tracked 3D tilt wrapper. Children lift toward the cursor with
 * optional reactive glare and an inner glow that intensifies with tilt angle.
 * Desktop pointer-driven; mobile / reduced-motion fall back to a static state.
 */
export function TiltCard({
  children,
  max = 12,
  glare = true,
  glow = false,
  className,
  contentClassName,
  style,
}: {
  children: ReactNode;
  /** max tilt angle in degrees */
  max?: number;
  /** show a radial glare that follows the cursor */
  glare?: boolean;
  /** show an inner glow that intensifies with tilt */
  glow?: boolean;
  /** wrapper (perspective) class */
  className?: string;
  /** inner tilt surface class */
  contentClassName?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const rotY = px * max;
    const rotX = -py * max;
    el.style.setProperty("--rx", `${rotX}deg`);
    el.style.setProperty("--ry", `${rotY}deg`);
    el.style.setProperty("--gx", `${px * 100 + 50}%`);
    el.style.setProperty("--gy", `${py * 100 + 50}%`);
    el.style.setProperty("--tilt", `${Math.min(Math.hypot(px, py) / 0.5, 1)}`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--tilt", "0");
  };

  return (
    <div className={cn("[perspective:1100px]", className)}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={
          {
            ["--tilt" as string]: "0",
            transform:
              "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
            transformStyle: "preserve-3d",
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "relative transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
          contentClassName,
        )}
      >
        {children}
        {glare ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 [transform:translateZ(1px)] group-hover/tilt:opacity-100"
            style={{
              background:
                "radial-gradient(circle at var(--gx,50%) var(--gy,50%), color-mix(in oklab, var(--cyan) 30%, transparent), transparent 60%)",
              borderRadius: "inherit",
            }}
          />
        ) : null}
        {glow ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-[box-shadow] duration-300 [transform:translateZ(1px)]"
            style={{
              borderRadius: "inherit",
              boxShadow:
                "0 0 50px -8px color-mix(in oklab, var(--primary) calc(var(--tilt,0) * 65%), transparent)",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
