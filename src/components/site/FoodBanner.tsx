import fallback from "@/assets/food-banner.jpg";
import { useSiteMedia } from "@/lib/site-media";
import { cn } from "@/lib/utils";

/** Wide food banner — admin editable under Home page → Site images & video. */
export function FoodBanner({ className, caption }: { className?: string; caption?: string }) {
  const { media } = useSiteMedia();
  const row = media["food_banner"];
  const isVideo = row?.media_type === "video" && Boolean(row?.url);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-border bg-surface/50",
        className,
      )}
    >
      {isVideo ? (
        <video
          src={row!.url!}
          autoPlay
          muted
          loop
          playsInline
          className="h-40 w-full object-cover sm:h-56"
        />
      ) : (
        <img
          src={row?.url || fallback}
          alt="A spread of snacks, shakes and mocktails served at Clash of Consoles"
          width={1920}
          height={640}
          loading="lazy"
          className="h-40 w-full object-cover sm:h-56"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent"
      />
      {caption ? (
        <p className="absolute bottom-4 left-5 text-xs font-bold uppercase tracking-[0.28em] text-foreground">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
