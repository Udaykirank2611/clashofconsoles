import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "coc-sound-on";

/**
 * Floating glass sound toggle. Opt-in UI click sounds synthesised via WebAudio
 * (no audio assets). Honours reduced-motion + persisted preference.
 */
export function SoundToggle() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOn(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  // Lightweight click synth on hover of interactive elements.
  useEffect(() => {
    if (!on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const blip = () => {
      try {
        const ctx =
          ctxRef.current ??
          (ctxRef.current = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext)());
        if (ctx.state === "suspended") void ctx.resume();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = 660;
        g.gain.setValueAtTime(0.05, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.08);
      } catch {
        /* no-op */
      }
    };

    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("a, button, [role='button']")) blip();
    };
    document.addEventListener("mouseover", handler, { passive: true });
    return () => document.removeEventListener("mouseover", handler);
  }, [on]);

  const toggle = () => {
    setOn((v) => {
      const next = !v;
      if (typeof window !== "undefined")
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn sound effects off" : "Turn sound effects on"}
      title={on ? "Sound on" : "Sound off"}
      className={cn(
        "press fixed bottom-5 right-5 z-50 grid size-12 place-items-center rounded-full border border-border text-foreground backdrop-blur-md transition-colors duration-500",
        "bg-surface/70 hover:border-cyan/60 hover:text-cyan motion-reduce:hidden",
        on && "border-cyan/50 text-cyan",
      )}
      style={on ? { animation: "coc-sound-pulse 2.4s ease-out infinite" } : undefined}
    >
      {on ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
    </button>
  );
}
