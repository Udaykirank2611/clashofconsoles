# Clash of Consoles — Premium Experience Add-Ons

Goal: add business-driving sections and Awwwards-level delight touches to impress your first client, without touching existing sections.

## New sections (real business value)

### 1. Pricing & Packages section — `src/components/site/sections/Pricing.tsx`
- Three premium comparison cards: **Hourly**, **Day Pass (Featured)**, **Group Bundle**.
- Featured card uses a glowing gradient-ring border + "Most Popular" badge, lifts on hover.
- Each card: price in ₹, perk list with checkmark icons, MagneticButton "Reserve".
- Currency ₹, Hyderabad-friendly pricing. Staggered Reveal on scroll.
- Inserts between `Games` and `Food` in index, with a `glow` divider.

### 2. Party & Group Bookings section — `src/components/site/sections/Parties.tsx`
- Split layout: left = party image (ParallaxImage, generated), right = offer.
- Two packages: **Birthday Bash** and **Corporate Night** — each with inclusions list (dedicated bays, snacks, cake setup, custom playlist).
- A highlighted "Host your event" MagneticButton → WhatsApp deep link (`wa.me`) prefilled with a booking template.
- Alternating layout from pricing (image-left / text-right) to avoid repetition.
- Inserts between `Reviews` and `Location`, with an `angled` divider.

## Polish & delight (the "wow")

### 3. Scroll progress bar — `src/components/site/ScrollProgress.tsx`
- Thin 3px glowing gradient bar (electric-blue → cyan → neon-purple) fixed at top, above navbar.
- Width tracks `scrollY / (scrollHeight - innerHeight)`. Respects reduced-motion (hides if `prefers-reduced-motion`).
- Mounted once in index above `<main>`.

### 4. Magnetic 3D console showcase — `src/components/site/ConsoleShowcase.tsx`
- Replaces static "High Performance" feature card with an interactive PS5 tilt card.
- Mouse-tracked 3D rotateX/rotateY (CSS transform, perspective) + reactive glare overlay; resets on leave.
- Optional rotation glow that intensifies with tilt angle.
- Mobile: static elegant tilt, no pointer tracking.

### 5. Konami code easter egg — `src/components/site/Konami.tsx`
- Global key-sequence listener (↑↑↓↓←→←→ B A) on `document`.
- On success: a "CHEAT CODE ACCEPTED" retro overlay — CRT scanlines, glitch text, "Level ×∞ unlocked" message + auto-dismiss after 4s.
- Desktop + keyboard friendly; harmless, fun surprise.

### 6. Sound design toggle — `src/components/site/SoundToggle.tsx`
- Floating glass toggle button (bottom-right, above footer) with mute/unmute icon.
- On hover over interactive elements (buttons, cards) plays a subtle UI click synthesized via WebAudio (no asset files — keeps it light & performant).
- Default OFF, opt-in only, persisted in localStorage, `prefers-reduced-motion` disables.

## Integration
- `src/routes/index.tsx`: import + mount ScrollProgress, Pricing, Parties; insert with appropriate dividers.
- `src/components/site/Sections.tsx`: wire ConsoleShowcase into the Features grid.
- `__root.tsx`: mount Konami + SoundToggle globally (they apply site-wide).
- Add nav links for Pricing (#pricing) and Parties (#parties) to `Navbar.tsx`.

## Design system additions (`src/styles.css`)
- New utilities/keyframes only: `tilt-card`, `glare`, `crt-scanlines`, `glitch`, `sound-pulse`.
- Reuse existing tokens (primary, cyan, purple, surface, glass) — no new hardcoded colors.

## Verification
- `bunx tsgo` typecheck after changes.
- Playwright screenshots: Pricing card hover lift, Party WhatsApp link, 3D tilt card glare, scroll bar fill, Konami overlay.
- Mobile + desktop responsive checks.

## Out of scope
- No backend, no database, no real booking server — WhatsApp/email links only (client has no booking system yet).
- No membership tiers, tournaments, or reserve-a-console flow (not selected).
