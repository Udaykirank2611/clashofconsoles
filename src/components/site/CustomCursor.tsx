import { useEffect, useRef, useState } from "react";

/** Elegant glowing cursor. Desktop / fine-pointer only. */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement | null>(null);
  const ring = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!mq.matches || reduce) return;
    setEnabled(true);
    document.documentElement.classList.add("coc-cursor-on");

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const t = e.target as HTMLElement | null;
      const interactive = !!t?.closest("a, button, [role='button'], input, summary");
      if (ring.current) {
        ring.current.dataset["active"] = interactive ? "true" : "false";
      }
    };

    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("coc-cursor-on");
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-200">
      <div
        ref={ring}
        data-active="false"
        className="absolute -left-5 -top-5 size-10 rounded-full border border-cyan/50 transition-[width,height,opacity,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[active=true]:border-violet/70 data-[active=true]:bg-violet/10 data-[active=true]:scale-125"
        style={{ boxShadow: "0 0 24px -6px var(--cyan)" }}
      />
      <div
        ref={dot}
        className="absolute -left-0.75 -top-0.75 size-1.5 rounded-full bg-cyan"
        style={{ boxShadow: "0 0 12px 2px color-mix(in oklab, var(--cyan) 60%, transparent)" }}
      />
    </div>
  );
}
