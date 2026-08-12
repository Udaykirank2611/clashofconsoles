# Plan: Spread Real 3D Animations Across the Site

## Current state
Only **one** 3D effect exists: `ConsoleShowcase` (the PS5 tilt card in Features), which uses `perspective` + `rotateX/rotateY` + `preserve-3d`. Everything else (Hero spotlight, parallax, cursor, drifting orbs) is 2D transforms. The user wants real 3D elsewhere too.

No Three.js/WebGL — we'll use pure CSS 3D transforms (perspective + rotateX/Y + translateZ) which are GPU-accelerated, work on the existing stack, and stay performant.

## Add a reusable 3D-tilt primitive
Create `src/components/site/TiltCard.tsx` — a generic pointer-tracked 3D tilt wrapper (extract the pattern already proven in `ConsoleShowcase`). Props: `max` (deg), optional `glare`, `glow`. Respects `prefers-reduced-motion` and falls back gracefully on touch devices. This keeps every 3D spot consistent and DRY.

## Where to add 3D (in priority order)

1. **Hero — 3D layered depth** (`Hero.tsx`)
   - Add `perspective` to the section and translate the heading/image in Z so the hero title "floats" above the background image, with a subtle pointer-driven parallax-tilt on the whole content stack. Adds cinematic depth to the first impression.

2. **Games & Food cards — 3D tilt on hover** (`GameLibrary.tsx`, `Food()` in `Sections.tsx`)
   - Wrap each game and food card in `TiltCard` so cards lift toward the cursor with a soft glare sweep. Replaces the flat `lift-card` hover with real depth.

3. **Pricing & Parties cards — 3D tilt + inner glow** (`sections/Pricing.tsx`, `sections/Parties.tsx`)
   - Tilt the plan/party cards with a stronger max angle and an inner glow that intensifies with tilt — feels premium and interactive.

4. **Gallery — 3D tilt on each tile** (`Gallery()` in `Sections.tsx`)
   - Subtle tilt on the masonry tiles so the gallery reads as a wall of depth rather than flat thumbs.

5. **Reviews / WhyChooseUs counters — optional subtle tilt** (nice-to-have if time allows)
   - Very slight tilt on review cards and stat tiles for cohesion.

## Guardrails
- No new heavy dependencies (no Three.js / WebGL). Pure CSS 3D transforms only.
- All 3D respects `prefers-reduced-motion` (disable tilt → static).
- Touch/mobile falls back to the existing static elegant state (no jitter).
- Keep existing premium polish (gradient-ring, glare, glow) intact.
- No changes to business logic, data, or content — presentation only.

## Verification
- Build/typecheck passes.
- Playwright screenshots on desktop (pointer tilt visible) and mobile (static, no jitter).
- Confirm reduced-motion users see no movement.
