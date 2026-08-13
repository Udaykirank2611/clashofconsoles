import {
  Gamepad2,
  Users,
  Sofa,
  Snowflake,
  Pizza,
  Timer,
  HeartHandshake,
  Sparkles,
  Star,
  MapPin,
  Phone,
  Mail,
  Navigation,
} from "lucide-react";
import {
  PRIMARY_PHONE,
  SECONDARY_PHONE,
  CONTACT_EMAIL,
  MAPS_VANASTHALIPURAM,
  MAPS_SHERIGUDA,
  prettyPhone,
  telHref,
  mailHref,
} from "@/lib/contact";
import { ConsoleShowcase } from "./ConsoleShowcase";

import { TiltCard } from "./TiltCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import aboutImg from "@/assets/about.jpg";
import { GameLibrary } from "@/components/site/GameLibrary";
import burgerImg from "@/assets/food-burger.jpg";
import pizzaImg from "@/assets/food-pizza.jpg";
import friesImg from "@/assets/food-fries.jpg";
import drinkImg from "@/assets/food-drink.jpg";
import popcornImg from "@/assets/food-popcorn.jpg";
import shakeImg from "@/assets/food-shake.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import { Counter, MagneticButton, Reveal, SectionHeading } from "./primitives";

/* ---------------------------------- About --------------------------------- */

export function About() {
  return (
    <section id="about" className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          <div className="relative overflow-hidden rounded-4xl border border-border">
            <img
              src={aboutImg}
              alt="Friends enjoying a multiplayer session at Clash of Consoles"
              width={1280}
              height={1280}
              loading="lazy"
              className="aspect-4/3 w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-linear-to-tr from-background/60 via-transparent to-transparent"
            />
          </div>
          <div className="glass absolute -bottom-8 left-6 hidden rounded-3xl px-6 py-5 sm:block">
            <p className="text-3xl font-extrabold text-cyan">
              <Counter to={12} suffix="+" />
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Gaming Stations
            </p>
          </div>
        </Reveal>

        <div>
          <SectionHeading
            align="left"
            eyebrow="About the Arena"
            title={
              <>
                Where Every Match <span className="text-gradient">Becomes a Memory</span>
              </>
            }
            lead="Clash of Consoles is Hyderabad's destination for premium console gaming — engineered for players who want more than a screen and a seat."
          />
          <Reveal delay={180}>
            <p className="mt-6 max-w-xl leading-relaxed text-muted-foreground">
              Every bay is built around next-gen consoles, large high-refresh displays and
              lounge seating designed for long sessions. Add an energetic, air-conditioned
              atmosphere, fast service and a kitchen that keeps the snacks coming, and you
              have a space made for rivalries, rematches and celebrations.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              {[
                { k: "Next-Gen", v: "Consoles" },
                { k: "Squad", v: "Ready Bays" },
                { k: "All Day", v: "Open Play" },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-border bg-surface/60 p-4">
                  <p className="text-sm font-bold">{s.k}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {s.v}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Features -------------------------------- */

const FEATURES = [
  { icon: Gamepad2, title: "PlayStation 5 Gaming", copy: "Latest-gen consoles with premium DualSense controllers." },
  { icon: Users, title: "Multiplayer Gaming", copy: "Split-screen and squad bays built for rivalries." },
  { icon: Sofa, title: "Comfortable Seating", copy: "Lounge seating engineered for marathon sessions." },
  { icon: Snowflake, title: "Air Conditioned Lounge", copy: "A cool, calm arena no matter the Hyderabad heat." },
  { icon: Pizza, title: "Food & Snacks", copy: "Burgers, shakes and munchies delivered to your bay." },
  { icon: Timer, title: "Fast Service", copy: "Quick turnarounds so your session starts on time." },
  { icon: HeartHandshake, title: "Friendly Environment", copy: "A welcoming crew and a community that plays fair." },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="The Setup"
          title={<>Built For Players Who Expect More</>}
          lead="Every detail of the lounge is tuned for performance, comfort and atmosphere."
        />
        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <ConsoleShowcase />
          </Reveal>
          <ul className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal as="li" key={f.title} delay={i * 60}>
                <article className="lift-card group h-full rounded-3xl border border-border bg-surface/50 p-6">
                  <span className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-primary/25 to-violet/25 text-cyan transition-colors duration-500 group-hover:from-primary/40 group-hover:to-violet/40">
                    <f.icon className="size-5.5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-base font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.copy}</p>
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Offer ---------------------------------- */

export function Offer() {
  return (
    <section id="offer" className="relative overflow-hidden py-24 sm:py-32">
      <div className="aurora opacity-25" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="relative rounded-4xl p-px">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-4xl bg-linear-to-r from-primary via-violet to-cyan opacity-70 blur-[2px] [background-size:200%_auto] [animation:coc-sweep_6s_linear_infinite_alternate]"
            />
            <div className="glass relative overflow-hidden rounded-4xl bg-background/85 px-8 py-14 text-center sm:px-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary to-violet px-5 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground shadow-[0_0_44px_-8px_var(--violet)]">
                <Sparkles className="size-4" aria-hidden="true" />
                Members Offer
              </span>
              <h2 className="mt-8 text-balance text-3xl font-extrabold leading-tight sm:text-5xl">
                Play 5 Times
                <span className="text-gradient block">Get 1 Session FREE</span>
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
                Track your visits on your player card. Every fifth clash unlocks a free
                hour in the arena — on the house.
              </p>
              <MagneticButton href="#contact" className="mt-9">
                Claim Offer
              </MagneticButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------- Games ---------------------------------- */

export function Games() {
  return (
    <section id="games" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Popular Titles"
          title={<>Pick Your Battlefield</>}
          lead="A rotating library of the titles Hyderabad actually wants to play."
        />
        <GameLibrary />
      </div>
    </section>
  );
}

/* ---------------------------------- Food ---------------------------------- */

const FOOD = [
  { name: "Burgers", img: burgerImg },
  { name: "Pizza", img: pizzaImg },
  { name: "French Fries", img: friesImg },
  { name: "Cold Drinks", img: drinkImg },
  { name: "Popcorn", img: popcornImg },
  { name: "Milkshakes", img: shakeImg },
];

export function Food() {
  return (
    <section id="food" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Fuel"
          title={<>Snacks Worth Pausing For</>}
          lead="Kitchen-fresh food and cold drinks, served straight to your gaming bay."
        />
        <ul className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FOOD.map((f, i) => (
            <Reveal as="li" key={f.name} delay={i * 60}>
              <TiltCard max={10} glare contentClassName="group/tilt h-full">
                <article className="group relative overflow-hidden rounded-3xl border border-border bg-surface transition-[border-color] duration-500 group-hover/tilt:border-primary/50">
                  <img
                    src={f.img}
                    alt={f.name}
                    width={800}
                    height={800}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/tilt:scale-108"
                  />
                  <div className="flex items-center justify-between gap-3 px-6 py-5 [transform:translateZ(30px)]">
                    <h3 className="min-w-0 truncate text-base font-bold">{f.name}</h3>
                    <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover/tilt:text-cyan">
                      Order
                    </span>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------- Gallery -------------------------------- */

const GALLERY = [
  { img: g1, alt: "Player holding a controller under blue light", span: "sm:row-span-2" },
  { img: g2, alt: "Row of gaming stations with violet lighting", span: "" },
  { img: g3, alt: "Friends celebrating a win in the lounge", span: "" },
  { img: g4, alt: "Lounge seating with ambient lighting", span: "sm:row-span-2" },
  { img: g5, alt: "Macro shot of a controller", span: "sm:col-span-2" },
];

export function Gallery() {
  return (
    <section id="gallery" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Inside The Arena"
          title={<>A Look Around The Lounge</>}
          lead="Cinematic lighting, focused bays and a room that hums with competition."
        />
        <div className="mt-16 grid auto-rows-[200px] grid-cols-1 gap-4 sm:grid-cols-3 sm:auto-rows-[220px]">
          {GALLERY.map((item, i) => (
            <Reveal
              key={item.alt}
              delay={i * 70}
              className={`group/tilt relative h-full ${item.span}`}
            >
              <TiltCard max={8} glare className="size-full">
                <div className="group relative size-full overflow-hidden rounded-3xl border border-border transition-[border-color] duration-500 group-hover/tilt:border-primary/50">
                  <img
                    src={item.img}
                    alt={item.alt}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100"
                  />
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Why Choose ------------------------------- */

const STATS = [
  { to: 500, suffix: "+", label: "Sessions Played Monthly", sub: "Gaming Community" },
  { to: 12, suffix: "+", label: "Next-Gen Consoles", sub: "Modern Setup" },
  { to: 98, suffix: "%", label: "Player Satisfaction", sub: "Premium Experience" },
  { to: 7, suffix: "", label: "Days Open Every Week", sub: "Comfortable Environment" },
];

export function WhyChooseUs() {
  return (
    <section id="why" className="relative overflow-hidden py-24 sm:py-32">
      <div className="aurora opacity-20" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Why Choose Us"
          title={<>Numbers From The Arena Floor</>}
        />
        <dl className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="lift-card h-full rounded-3xl border border-border bg-surface/50 p-8 text-center">
                <dd className="text-4xl font-extrabold text-gradient sm:text-5xl">
                  <Counter to={s.to} suffix={s.suffix} />
                </dd>
                <dt className="mt-3 text-sm font-semibold">{s.label}</dt>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {s.sub}
                </p>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* -------------------------------- Reviews --------------------------------- */

const REVIEWS = [
  { name: "Aarav M.", role: "Weekend Regular", text: "The setup genuinely feels like an esports arena. Zero lag, great screens and the seating is unreal for long sessions." },
  { name: "Sana K.", role: "Squad Captain", text: "We booked the multiplayer bay for a birthday clash — staff were quick, the snacks were hot and everyone left grinning." },
  { name: "Rohit V.", role: "FC Player", text: "Easily the cleanest, coolest gaming lounge I've been to in Hyderabad. The loyalty offer keeps pulling us back." },
];

export function Reviews() {
  return (
    <section id="reviews" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Player Feedback"
          title={<>Voices From The Community</>}
        />
        <ul className="mt-16 grid gap-5 lg:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <Reveal as="li" key={r.name} delay={i * 90}>
              <figure className="lift-card flex h-full flex-col rounded-3xl border border-border bg-surface/50 p-8">
                <div className="flex gap-1 text-cyan" aria-label="Rated 5 out of 5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="size-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-5 flex-1 leading-relaxed text-muted-foreground">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-violet text-sm font-bold text-primary-foreground">
                    {r.name.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">{r.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------- Location -------------------------------- */

export function Location() {
  return (
    <section id="contact" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div>

          <SectionHeading
            align="left"
            eyebrow="Find Us"
            title={<>Enter The Arena In Hyderabad</>}
            lead="Walk in for open play or reserve a bay for your squad — we'll have the console warmed up."
          />
          <Reveal delay={160}>
            <address className="mt-8 space-y-4 not-italic">
              <p className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden="true" />
                Clash of Consoles — Vanasthalipuram &amp; Sheriguda, Hyderabad, Telangana
              </p>
              <p className="flex items-start gap-3 text-muted-foreground">
                <Phone className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden="true" />
                <span>
                  <a href={telHref(PRIMARY_PHONE)} className="transition-colors hover:text-cyan">
                    {prettyPhone(PRIMARY_PHONE)}
                  </a>{" "}
                  ·{" "}
                  <a href={telHref(SECONDARY_PHONE)} className="transition-colors hover:text-cyan">
                    {prettyPhone(SECONDARY_PHONE)}
                  </a>
                </span>
              </p>
              <p className="flex items-start gap-3 text-muted-foreground">
                <Mail className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden="true" />
                <a href={mailHref()} className="break-all transition-colors hover:text-cyan">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </address>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-8 flex flex-wrap gap-3">
              <MagneticButton href={telHref(PRIMARY_PHONE)}>
                <Phone className="size-4" aria-hidden="true" /> Contact Us
              </MagneticButton>
              <MagneticButton href={MAPS_VANASTHALIPURAM} variant="ghost" external>
                <Navigation className="size-4" aria-hidden="true" /> Vanasthalipuram Directions
              </MagneticButton>
              <MagneticButton href={MAPS_SHERIGUDA} variant="ghost" external>
                <Navigation className="size-4" aria-hidden="true" /> Sheriguda Directions
              </MagneticButton>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="relative overflow-hidden rounded-4xl border border-border bg-surface">
            <iframe
              title="Map showing Clash of Consoles in Hyderabad"
              src="https://www.google.com/maps?q=Hyderabad&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[420px] w-full grayscale-[0.6] contrast-125 transition-[filter] duration-700 hover:grayscale-0"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------- FAQ ---------------------------------- */

export const FAQS = [
  { q: "What consoles are available?", a: "We run next-gen PlayStation 5 setups with premium controllers, paired with large high-refresh displays in every bay." },
  { q: "Can I book in advance?", a: "Yes. Reserve a bay by phone or through our booking request and we'll hold your slot with the game already loaded." },
  { q: "Do you provide snacks?", a: "Absolutely — burgers, pizza, fries, popcorn, milkshakes and cold drinks are served straight to your station." },
  { q: "Is multiplayer available?", a: "Every bay supports local multiplayer, and our squad bays are built for split-screen tournaments and group clashes." },
  { q: "Can I celebrate birthdays?", a: "Yes. We host birthday clashes and group events with reserved bays, snacks and a custom session plan." },
];

export function Faq() {
  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading eyebrow="FAQ" title={<>Everything You Asked</>} />
        <Reveal delay={120}>
          <Accordion type="single" collapsible className="mt-14 w-full">
            {FAQS.map((f) => (
              <AccordionItem
                key={f.q}
                value={f.q}
                className="mb-3 overflow-hidden rounded-2xl border border-border bg-surface/50 px-6"
              >
                <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------- Final CTA ------------------------------- */

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-40">
      <div className="aurora" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <h2 className="text-balance text-4xl font-extrabold leading-[1.03] sm:text-6xl lg:text-7xl">
            Ready To Enter <span className="text-gradient">The Arena?</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-6 max-w-xl text-muted-foreground sm:text-lg">
            Grab your squad, claim a bay and turn an ordinary evening into a highlight
            reel.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <MagneticButton href="/book">Book Now</MagneticButton>
            <MagneticButton href="#contact" variant="ghost">
              Visit Today
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
