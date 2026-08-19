import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Home,
  Sparkles,
  Gamepad2,
  Crown,
  MapPin,
  UtensilsCrossed,
  PhoneCall,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MagneticButton } from "./primitives";
import logoAsset from "@/assets/coc-logo.png.asset.json";

const LINKS = [
  { label: "Home", href: "/#home", icon: Home },
  { label: "Experiences", href: "/#experiences", icon: Sparkles },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Membership and Combo offers", href: "/#membership", icon: Crown },
  { label: "Branches", href: "/#branches", icon: MapPin },
  { label: "Food Menu", href: "/#food", icon: UtensilsCrossed },
  { label: "Contact", href: "/#contact", icon: PhoneCall },
];

/** The in-page section a nav link points at, or null for a real page link. */
const hashOf = (href: string) => (href.includes("#") ? `#${href.split("#")[1]}` : null);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("/#home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      setActive(window.location.pathname);
      return;
    }
    const sections = LINKS.map((l) => {
      const hash = hashOf(l.href);
      return hash ? document.querySelector(hash) : null;
    }).filter(Boolean) as HTMLElement[];
    if (!sections.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(`/#${visible.target.id}`);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);


  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        scrolled ? "py-3" : "py-5",
      )}
    >
      <nav
        aria-label="Primary"
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full px-5 py-3 transition-all duration-500 sm:px-6",
          scrolled
            ? "glass mx-4 shadow-[0_18px_50px_-30px_black] lg:mx-auto"
            : "mx-4 border border-transparent lg:mx-auto",
        )}
      >
        <a href="/#home" className="group flex min-w-0 items-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="Clash of Consoles logo"
            width={44}
            height={44}
            className="size-10 shrink-0 object-contain drop-shadow-[0_0_18px_rgba(0,200,255,0.35)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
          />
          <span className="truncate text-sm font-extrabold uppercase tracking-[0.18em]">
            Clash <span className="text-muted-foreground">of</span> Consoles
          </span>
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const isActive = active === l.href;
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-3.5 bottom-1 h-px origin-left bg-linear-to-r from-cyan via-primary to-violet transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <MagneticButton href="/book" className="hidden px-6 py-2.5 sm:inline-flex">
            Book Now
          </MagneticButton>


          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="press grid size-11 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-cyan/60 lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <div
        className={cn(
          "grid overflow-hidden px-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="glass rounded-3xl p-4">
            <ul className="flex flex-col">
              {LINKS.map((l, i) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all duration-500 hover:bg-surface-2 hover:text-foreground",
                      open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                    )}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <MagneticButton href="/book" className="mt-2 w-full">
              Book Now
            </MagneticButton>

          </div>
        </div>
      </div>
    </header>
  );
}
