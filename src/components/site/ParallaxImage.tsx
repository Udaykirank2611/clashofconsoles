import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Large rounded media block with scroll parallax, hover zoom, fade-in load
 * and a premium placeholder when the image is missing.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  intensity = 14,
  width,
  height,
  priority = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  intensity?: number;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || failed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = wrap.current;
      const img = inner.current;
      if (!el || !img) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      img.style.setProperty("--py", `${(-p * intensity).toFixed(2)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [src, intensity, failed]);

  const showPlaceholder = !src || failed;

  return (
    <div ref={wrap} className={cn("media-frame group/media", className)}>
      {showPlaceholder ? (
        <div className="flex size-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl border border-border bg-surface-2/70">
            <ImageOff className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {alt}
          </p>
        </div>
      ) : (
        <img
          ref={inner}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{ transform: "translate3d(0, var(--py, 0px), 0) scale(1.06)" }}
          className={cn(
            "size-full object-cover transition-[opacity,transform,filter] duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/media:scale-[1.1]",
            loaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
            imgClassName,
          )}
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/70 via-transparent to-transparent opacity-80 transition-opacity duration-700 group-hover/media:opacity-50"
      />
    </div>
  );
}
