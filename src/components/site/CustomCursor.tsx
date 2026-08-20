import { useEffect, useRef, useState } from "react";
import { Gamepad2 } from "lucide-react";

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
      if (ring.current) ring.current.dataset["active"] = interactive ? "true" : "false";
      if (dot.current) dot.current.dataset["active"] = interactive ? "true" : "false";
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
        className="absolute -left-6 -top-6 grid size-12 place-items-center text-cyan/45 blur-[1.5px] transition-[color,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[active=true]:scale-125 data-[active=true]:text-violet/70"
        style={{ filter: "drop-shadow(0 0 14px color-mix(in oklab, currentColor 70%, transparent))" }}
      >
        <Gamepad2 className="size-10" strokeWidth={1.25} />
      </div>
      <div
        ref={dot}
        data-active="false"
        className="absolute -left-3 -top-3 grid size-6 place-items-center text-cyan transition-colors duration-200 data-[active=true]:text-violet"
        style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, currentColor 75%, transparent))" }}
      >
        <Gamepad2 className="size-5" strokeWidth={2} />
      </div>
    </div>
  );
}
