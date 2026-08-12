const DUST = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 5.7 + 3) % 98}%`,
  top: `${(i * 13) % 90}%`,
  size: i % 4 === 0 ? 3 : 2,
  delay: `${(i % 9) * 2.2}s`,
  duration: `${18 + (i % 6) * 4}s`,
  opacity: i % 3 === 0 ? 0.55 : 0.3,
}));

/**
 * Fixed, layered ambient backdrop: drifting gradient orbs, soft grid texture,
 * slow light beams and floating dust. Purely decorative and GPU-light.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden bg-background"
    >
      <div className="grid-texture absolute inset-0 opacity-60" />

      <div
        className="absolute -left-[15%] top-[-10%] size-[60vmax] rounded-full opacity-25 blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 70%, transparent), transparent 65%)",
          animation: "coc-orb 28s cubic-bezier(0.22,1,0.36,1) infinite",
        }}
      />
      <div
        className="absolute -right-[18%] top-[35%] size-[55vmax] rounded-full opacity-20 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--violet) 70%, transparent), transparent 65%)",
          animation: "coc-orb 34s cubic-bezier(0.22,1,0.36,1) 4s infinite reverse",
        }}
      />
      <div
        className="absolute bottom-[-15%] left-[30%] size-[45vmax] rounded-full opacity-15 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--cyan) 60%, transparent), transparent 65%)",
          animation: "coc-orb 40s cubic-bezier(0.22,1,0.36,1) 8s infinite",
        }}
      />

      {/* light beams */}
      <div
        className="absolute -top-1/3 left-[12%] h-[160vh] w-40 opacity-0 blur-3xl"
        style={{
          background:
            "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--cyan) 30%, transparent), transparent)",
          animation: "coc-beam 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -top-1/3 right-[22%] h-[160vh] w-28 opacity-0 blur-3xl"
        style={{
          background:
            "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--violet) 26%, transparent), transparent)",
          animation: "coc-beam 22s ease-in-out 6s infinite",
        }}
      />

      {DUST.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-cyan"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            ["--dust-o" as string]: d.opacity,
            animation: `coc-dust ${d.duration} linear ${d.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
