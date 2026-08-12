import {
  Armchair,
  CalendarCheck,
  Circle,
  Film,
  Gamepad2,
  Glasses,
  Sparkles,
  Joystick,
  UtensilsCrossed,
} from "lucide-react";
import { Reveal, SectionHeading } from "../primitives";

const ITEMS = [
  { icon: Gamepad2, title: "Next Generation Consoles", copy: "PS5 bays with DualSense controllers and 4K displays." },
  { icon: Joystick, title: "Professional Racing Setup", copy: "Force-feedback wheel, pedals and a full cockpit rig." },
  { icon: Glasses, title: "VR Gaming", copy: "Room-scale virtual reality with premium headsets." },
  { icon: Armchair, title: "Private Lounge", copy: "A private room with giant display, AC and comfort seating." },
  { icon: Film, title: "Private Theatre", copy: "Big-screen movie nights, birthdays and watch parties." },
  { icon: Circle, title: "Snooker", copy: "Tournament-grade table for casual or competitive frames." },
  { icon: UtensilsCrossed, title: "Food & Drinks", copy: "Kitchen-fresh snacks and cold drinks at your seat." },
  { icon: CalendarCheck, title: "Fast Booking", copy: "Pick a slot in under a minute — confirmed by our team." },
  { icon: Sparkles, title: "Premium Environment", copy: "Neon-lit, spotless interiors built for long sessions." },
];

export function WhyUs() {
  return (
    <section id="why" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Why Choose Us"
          title={
            <>
              Built To Be <span className="text-gradient">Unforgettable</span>
            </>
          }
          lead="Every detail engineered so your session feels like an event, not an errand."
        />

        <ul className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal as="li" key={item.title} delay={i * 55}>
              <article className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface/60 p-7 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-cyan/40 hover:shadow-[0_34px_90px_-50px_var(--primary)]">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <span className="grid size-12 place-items-center rounded-2xl border border-border bg-background/60 transition-transform duration-500 group-hover:rotate-6 group-hover:border-cyan/40">
                  <item.icon className="size-5 text-cyan" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-bold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
