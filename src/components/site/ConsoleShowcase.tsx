import { useRef } from "react";
import ps5Img from "@/assets/console-ps5.jpg";

/**
 * Interactive 3D tilt card showcasing the PS5 setup, with a reactive glare
 * overlay and a glow that intensifies with tilt angle. Desktop pointer-driven;
 * mobile falls back to a static elegant tilt.
 */
export function ConsoleShowcase() {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const rotY = px * 16;
    const rotX = -py * 16;
    el.style.setProperty("--rx", `${rotX}deg`);
    el.style.setProperty("--ry", `${rotY}deg`);
    el.style.setProperty("--gx", `${px * 100 + 50}%`);
    el.style.setProperty("--gy", `${py * 100 + 50}%`);
    el.style.setProperty("--glow", `${Math.min(Math.hypot(px, py) / 0.5, 1)}`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--glow", "0");
  };

  return (
    <div className="group/showcase [perspective:1200px]">
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        className="gradient-ring relative overflow-hidden rounded-4xl border border-border bg-surface/60 p-1 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transform-style:preserve-3d]"
        style={{ ["--glow" as string]: "0" }}
      >
        <div className="relative overflow-hidden rounded-3xl">
          <img
            src={ps5Img}
            alt="PlayStation 5 DualSense controller in dramatic blue lighting"
            width={1024}
            height={1024}
            loading="lazy"
            className="aspect-square w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/showcase:scale-105"
          />
          {/* reactive glare */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/showcase:opacity-100"
            style={{
              background:
                "radial-gradient(circle at var(--gx,50%) var(--gy,50%), color-mix(in oklab, var(--cyan) 35%, transparent), transparent 55%)",
            }}
          />
          {/* tilt glow ring */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-cyan/0 transition-[box-shadow] duration-300"
            style={{
              boxShadow:
                "0 0 60px -6px color-mix(in oklab, var(--cyan) calc(var(--glow,0) * 70%), transparent)",
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex translate-y-2 items-center justify-center opacity-0 transition-all duration-500 group-hover/showcase:translate-y-0 group-hover/showcase:opacity-100">
          <span className="glass rounded-full px-4 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan">
            Tilt to explore
          </span>
        </div>
      </div>
    </div>
  );
}
