import { Instagram, Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import logoAsset from "@/assets/coc-logo.png.asset.json";
import {
  PRIMARY_PHONE,
  SECONDARY_PHONE,
  CONTACT_EMAIL,
  MAPS_VANASTHALIPURAM,
  MAPS_SHERIGUDA,
  prettyPhone,
  telHref,
  waHref,
  mailHref,
} from "@/lib/contact";

const SOCIALS = [
  { Icon: Instagram, label: "Instagram", href: "https://www.instagram.com/clashofconsoles/?hl=en" },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={logoAsset.url}
            alt="Clash of Consoles logo"
            width={48}
            height={48}
            className="size-11 shrink-0 object-contain drop-shadow-[0_0_18px_rgba(0,200,255,0.3)]"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold uppercase tracking-[0.18em]">
              Clash of Consoles
            </span>
            <span className="block text-xs text-muted-foreground">
              Premium console gaming · Hyderabad · @clashofconsoles
            </span>
          </span>
        </div>

        <ul className="flex items-center gap-2">
          {SOCIALS.map(({ Icon, label, href }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                aria-label={label}
                className="grid size-11 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-400 hover:-translate-y-0.5 hover:border-cyan/60 hover:text-cyan"
              >
                <Icon className="size-4.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center gap-3 px-6">
        <a
          href={waHref("Hi Clash of Consoles! I'd like to know more.")}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-4 py-2 text-xs font-semibold tracking-[0.06em] text-cyan transition-all duration-400 hover:-translate-y-0.5 hover:border-cyan"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          WhatsApp {prettyPhone(PRIMARY_PHONE)}
        </a>
        <a
          href={telHref(SECONDARY_PHONE)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground transition-all duration-400 hover:-translate-y-0.5 hover:border-cyan/60 hover:text-foreground"
        >
          <Phone className="size-4" aria-hidden="true" />
          {prettyPhone(SECONDARY_PHONE)}
        </a>
        <a
          href={mailHref()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground transition-all duration-400 hover:-translate-y-0.5 hover:border-cyan/60 hover:text-foreground"
        >
          <Mail className="size-4" aria-hidden="true" />
          {CONTACT_EMAIL}
        </a>
        <a
          href={MAPS_VANASTHALIPURAM}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground transition-all duration-400 hover:-translate-y-0.5 hover:border-cyan/60 hover:text-foreground"
        >
          <MapPin className="size-4" aria-hidden="true" />
          Vanasthalipuram
        </a>
        <a
          href={MAPS_SHERIGUDA}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground transition-all duration-400 hover:-translate-y-0.5 hover:border-cyan/60 hover:text-foreground"
        >
          <MapPin className="size-4" aria-hidden="true" />
          Sheriguda
        </a>
      </div>

      <div className="mx-auto mt-10 max-w-7xl px-6 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Clash of Consoles. All rights reserved.</p>
        <p className="mt-2">
          Developed by{" "}
          <a
            href="mailto:udaykirank2611@gmail.com"
            className="transition-colors hover:text-cyan"
          >
            udaykirank2611@gmail.com
          </a>
        </p>
      </div>
    </footer>
  );
}
