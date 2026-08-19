/** Two-tone chime used for admin notifications, with an optional repeat loop. */
let ctx: AudioContext | null = null;
let loopTimer: number | null = null;

/** Plays the chime once. */
export function playChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = ctx ?? new Ctor();
    void ctx.resume();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.3);
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
 * Repeats the chime until it is stopped, so an unattended booking keeps
 * ringing. Calling it again while running does nothing — only one loop plays.
 */
export function startChimeLoop(intervalMs = 4000) {
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
