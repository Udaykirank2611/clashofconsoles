import { useEffect, useState } from "react";
import logoAsset from "@/assets/coc-logo.png.asset.json";

/** Cinematic loading screen with an animated controller outline. */
export function Loader() {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setDone(true), 1900);
    const t2 = setTimeout(() => setGone(true), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-100 flex flex-col items-center justify-center bg-background transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ opacity: done ? 0 : 1 }}
    >
      <div className="aurora opacity-30" />
      <img
        src={logoAsset.url}
        alt=""
        className="relative w-44 object-contain drop-shadow-[0_0_40px_rgba(0,200,255,0.35)] sm:w-56"
        style={{ animation: "coc-rise .9s cubic-bezier(0.22,1,0.36,1) both" }}
      />
      <p className="relative mt-8 text-xs font-semibold uppercase tracking-[0.42em] text-muted-foreground">
        Loading Next Level...
      </p>
      <div className="relative mt-5 h-px w-40 overflow-hidden bg-border">
        <span className="block h-full w-1/3 bg-linear-to-r from-transparent via-cyan to-transparent [animation:coc-sweep_1.2s_linear_infinite]" />
      </div>
    </div>
  );
}
