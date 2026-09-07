import { useEffect, useRef } from "react";
import { Gamepad2 } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import logoAsset from "@/assets/coc-logo.png.asset.json";
import { MagneticButton } from "./primitives";
import { useSiteMedia } from "@/lib/site-media";


const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7.3 + 5) % 96}%`,
  delay: `${(i % 7) * 1.1}s`,
  duration: `${9 + (i % 5) * 2}s`,
  size: i % 3 === 0 ? 3 : 2,
}));

export function Hero() {
  const spotRef = useRef<HTMLDivElement | null>(null);
  const { media } = useSiteMedia();
  const backdrop = media["hero_background"];
  const isVideo = backdrop?.media_type === "video" && Boolean(backdrop?.url);

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
      {isVideo ? (
        <video
          src={backdrop!.url!}
          autoPlay
          muted
          loop
          playsInline
          poster={heroImg}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
      ) : (
        <img
          src={backdrop?.url || heroImg}
          alt="Interior of the Clash of Consoles gaming lounge in Hyderabad"
          width={1920}
          height={1088}
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
      )}
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

      <div className="mx-auto w-full max-w-7xl px-6 pb-20 [perspective:1400px]">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img
            src={logoAsset.url}
            alt="Clash of Consoles"
            width={520}
            height={520}
            fetchPriority="high"
            className="w-[min(60vw,20rem)] object-contain drop-shadow-[0_0_60px_rgba(0,200,255,0.35)] sm:w-[min(52vw,22rem)]"
            style={{ animation: "coc-rise 1s .15s both" }}
          />
          <a
            href="#rates"
            className="press mt-9 inline-flex items-center gap-2 rounded-full border border-pink/50 bg-[linear-gradient(120deg,color-mix(in_oklab,var(--pink)_20%,transparent),color-mix(in_oklab,var(--primary)_18%,transparent))] px-6 py-2.5 text-[0.68rem] font-black uppercase tracking-[0.28em] text-foreground shadow-[0_18px_50px_-26px_var(--pink)] transition-transform duration-300 hover:-translate-y-0.5"
            style={{ animation: "coc-rise 1s .35s both" }}
          >
            Rate Card
          </a>
          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-3"
            style={{ animation: "coc-rise 1s .45s both" }}
          >
            <MagneticButton href="/book" className="w-full text-center sm:w-64">
              Book Now
            </MagneticButton>
            <MagneticButton href="#experiences" variant="ghost" className="w-full text-center sm:w-64">
              Explore Experiences
            </MagneticButton>
          </div>
        </div>
      </div>



      <a
        href="#about"
        aria-label="Scroll to about section"
        className="absolute inset-x-0 bottom-8 mx-auto flex w-fit flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.34em]">
          Scroll
        </span>
        <span className="flex h-9 w-6 items-start justify-center rounded-full border border-foreground/25 p-1.5">
          <span className="size-1.5 rounded-full bg-foreground/70 [animation:coc-float_1.8s_ease-in-out_infinite]" />
        </span>
      </a>

    </section>
  );
}
