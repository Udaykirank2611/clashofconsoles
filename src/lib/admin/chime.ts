/** Classic telephone bell ("tringgg") used for admin notifications, with an optional repeat loop. */
let ctx: AudioContext | null = null;
let loopTimer: number | null = null;

/** Loud old-school twin-gong telephone ring, ~1.6s long. */
export function playChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = ctx ?? new Ctor();
    void ctx.resume();
    const audio = ctx;
    const now = audio.currentTime;

    /** Master bus — high volume, soft-clipped so it stays loud without tearing. */
    const master = audio.createGain();
    master.gain.value = 0.95;
    const shaper = audio.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    shaper.curve = curve;
    master.connect(shaper).connect(audio.destination);

    const RING = 1.6; // total ring length
    const HAMMER = 20; // clapper strikes per second

    // Two slightly detuned gongs, struck alternately by the clapper.
    [1046, 1385].forEach((freq, idx) => {
      const osc = audio.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const partial = audio.createOscillator();
      partial.type = "sine";
      partial.frequency.value = freq * 2.76; // metallic bell partial

      const bellGain = audio.createGain();
      bellGain.gain.value = 0.55;
      const partialGain = audio.createGain();
      partialGain.gain.value = 0.18;

      // Clapper trill: rapid amplitude chopping alternating between the gongs.
      const trill = audio.createGain();
      trill.gain.setValueAtTime(0.0001, now);
      const steps = Math.round(RING * HAMMER);
      for (let i = 0; i < steps; i += 1) {
        const t = now + i / HAMMER;
        const hit = i % 2 === idx ? 1 : 0.22;
        const decay = 1 - i / steps / 1.6; // gentle fade toward the end
        trill.gain.setValueAtTime(Math.max(hit * decay, 0.0001), t);
        trill.gain.exponentialRampToValueAtTime(
          Math.max(hit * decay * 0.28, 0.0001),
          t + 1 / HAMMER,
        );
      }
      trill.gain.exponentialRampToValueAtTime(0.0001, now + RING + 0.15);

      osc.connect(bellGain).connect(trill);
      partial.connect(partialGain).connect(trill);
      trill.connect(master);

      osc.start(now);
      partial.start(now);
      osc.stop(now + RING + 0.2);
      partial.stop(now + RING + 0.2);
    });
  } catch {
    /* audio unavailable */
  }
}

/** True while the repeating alert is running. */
export function isChimeLooping() {
  return loopTimer !== null;
}

/**
 * Repeats the ring until it is stopped, so an unattended booking keeps
 * ringing. Calling it again while running does nothing — only one loop plays.
 */
export function startChimeLoop(intervalMs = 3000) {
  if (typeof window === "undefined" || loopTimer !== null) return;
  playChime();
  loopTimer = window.setInterval(playChime, intervalMs);
}

/** Stops the repeating alert once the admin has acknowledged the notification. */
export function stopChimeLoop() {
  if (loopTimer === null) return;
  window.clearInterval(loopTimer);
  loopTimer = null;
}
