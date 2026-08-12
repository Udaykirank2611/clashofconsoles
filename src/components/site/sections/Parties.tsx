import { PartyPopper, Building2, Check } from "lucide-react";
import { MagneticButton, Reveal, SectionHeading } from "../primitives";
import { ParallaxImage } from "../ParallaxImage";
import { TiltCard } from "../TiltCard";
import { waHref } from "@/lib/contact";
import partyImg from "@/assets/party.jpg";

const WHATSAPP = waHref(
  "Hi Clash of Consoles! I'd like to host an event. Please share availability.",
);

const PACKAGES = [
  {
    icon: PartyPopper,
    name: "Birthday Bash",
    price: "from ₹2,499",
    blurb: "Make their birthday the one everyone talks about.",
    perks: [
      "Dedicated 3-bay arena",
      "Up to 8 players",
      "Gaming-themed cake setup",
      "Snack & drink combos",
      "Custom playlist & lighting",
    ],
  },
  {
    icon: Building2,
    name: "Corporate Night",
    price: "from ₹6,999",
    blurb: "Team bonding that actually feels like a power-up.",
    perks: [
      "Full lounge buyout",
      "Up to 20 players",
      "Tournament hosting",
      "Catered dinner & bar",
      "Branded scoreboard screen",
    ],
  },
];

export function Parties() {
  return (
    <section id="parties" className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          <ParallaxImage
            src={partyImg}
            alt="Gaming birthday celebration at Clash of Consoles with neon lighting"
            width={1024}
            height={1024}
            className="aspect-4/5 sm:aspect-4/3"
          />
          <div className="glass absolute -bottom-8 -right-4 hidden rounded-3xl px-6 py-5 sm:block">
            <p className="text-3xl font-extrabold text-cyan">Party Ready</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Birthday & Group Events
            </p>
          </div>
        </Reveal>

        <div>
          <SectionHeading
            align="left"
            eyebrow="Host Your Event"
            title={
              <>
                Own The Night. <span className="text-gradient">Bring The Squad.</span>
              </>
            }
            lead="Birthdays, team nights, college clashes — we turn gatherings into the kind of stories you replay for years."
          />

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {PACKAGES.map((pkg, i) => (
              <Reveal key={pkg.name} delay={i * 110}>
                <TiltCard max={12} glare glow contentClassName="group/tilt h-full">
                  <article className="group flex h-full flex-col rounded-3xl border border-border bg-surface/50 p-6 transition-[border-color,box-shadow] duration-500 group-hover/tilt:border-primary/50">
                    <span className="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-primary/25 to-violet/25 text-cyan [transform:translateZ(30px)]">
                      <pkg.icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-base font-bold [transform:translateZ(20px)]">{pkg.name}</h3>
                    <p className="mt-1 text-sm text-cyan [transform:translateZ(20px)]">{pkg.price}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground [transform:translateZ(15px)]">
                      {pkg.blurb}
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {pkg.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2.5 text-xs">
                          <Check
                            className="mt-0.5 size-3.5 shrink-0 text-cyan"
                            aria-hidden="true"
                          />
                          <span className="text-muted-foreground">{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap gap-3">
              <MagneticButton href={WHATSAPP}>
                Host Your Event
              </MagneticButton>
              <MagneticButton href="#contact" variant="ghost">
                Talk To Us
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
