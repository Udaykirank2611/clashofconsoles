import { useEffect, useRef } from "react";
import { ChevronDown, Gamepad2 } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import logoAsset from "@/assets/coc-logo.png.asset.json";
import { MagneticButton } from "./primitives";


const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7.3 + 5) % 96}%`,
  delay: `${(i % 7) * 1.1}s`,
  duration: `${9 + (i % 5) * 2}s`,
  size: i % 3 === 0 ? 3 : 2,
}));

export function Hero() {
  const spotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = spotRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="home"
      ref={spotRef}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-28"
    >
      <img
        src={heroImg}
        alt="Interior of the Clash of Consoles gaming lounge in Hyderabad"
        width={1920}
        height={1088}
        fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-b from-background/85 via-background/70 to-background"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-70 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(420px circle at var(--mx,50%) var(--my,40%), color-mix(in oklab, var(--cyan) 22%, transparent), transparent 70%)",
        }}
      />

      {/* floating particles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-24 rounded-full bg-cyan/70"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animation: `coc-particle ${p.duration} linear ${p.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* controller silhouettes */}
      <Gamepad2
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 top-1/3 -z-10 size-40 text-foreground/5 [animation:coc-float_9s_ease-in-out_infinite] sm:size-64"
      />
      <Gamepad2
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 bottom-24 -z-10 size-48 rotate-12 text-foreground/5 [animation:coc-float_11s_ease-in-out_1s_infinite] sm:size-72"
      />

      <div className="mx-auto w-full max-w-7xl px-6 pb-28 [perspective:1400px]">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img
            src={logoAsset.url}
            alt="Clash of Consoles"
            width={520}
            height={520}
            fetchPriority="high"
            className="w-[min(78vw,30rem)] object-contain drop-shadow-[0_0_60px_rgba(0,200,255,0.35)]"
            style={{ animation: "coc-rise 1s .15s both" }}
          />
          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            style={{ animation: "coc-rise 1s .45s both" }}
          >
            <MagneticButton href="/book">Book Your Session</MagneticButton>
            <MagneticButton href="#experiences" variant="ghost">
              Explore Experiences
            </MagneticButton>
          </div>
        </div>
      </div>


      <a
        href="#about"
        aria-label="Scroll to about section"
        className="absolute inset-x-0 bottom-8 mx-auto flex w-fit flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-cyan"
      >
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.34em]">
          Scroll
        </span>
        <span className="grid h-9 w-5.5 place-items-start justify-center rounded-full border border-border pt-1.5">
          <span className="size-1 rounded-full bg-cyan [animation:coc-scroll-dot_1.8s_ease-in-out_infinite]" />
        </span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </a>
    </section>
  );
}
