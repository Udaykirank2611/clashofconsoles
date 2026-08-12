import { useEffect, useState } from "react";

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/** Konami-code easter egg: a retro CRT "cheat accepted" overlay. */
export function Konami() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let idx = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === SEQUENCE[idx]) {
        idx += 1;
        if (idx === SEQUENCE.length) {
          idx = 0;
          setActive(true);
          timer = setTimeout(() => setActive(false), 4200);
        }
      } else {
        idx = key === SEQUENCE[0] ? 1 : 0;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/92 px-6 text-center backdrop-blur-md"
      onClick={() => setActive(false)}
      style={{ animation: "coc-rise 0.4s ease-out" }}
    >
      <div className="crt-overlay relative max-w-lg rounded-4xl border border-cyan/40 bg-surface/80 px-8 py-12 shadow-[0_0_80px_-20px_var(--cyan)]">
        <p className="glitch-text text-[0.7rem] font-bold uppercase tracking-[0.4em] text-cyan">
          Cheat Code Accepted
        </p>
        <p className="mt-7 text-6xl font-extrabold tracking-tight text-gradient sm:text-7xl">
          LEVEL ∞
        </p>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Unlimited lives unlocked. All bays are yours, champion. The arena
          bends to your skill — now go make some highlights.
        </p>
        <p className="mt-8 text-[0.62rem] uppercase tracking-[0.3em] text-muted-foreground">
          Tap anywhere to respawn
        </p>
      </div>
    </div>
  );
}
