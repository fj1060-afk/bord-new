// Script-side access to the motion tokens in globals.css, so animations run
// from script (folds, drawers, counters, indicators) share the CSS values.

export type MotionToken = "fast" | "menu" | "page" | "stagger" | "stagger-max" | "shift";

const FALLBACK: Record<MotionToken, number> = { fast: 260, menu: 480, page: 700, stagger: 90, "stagger-max": 600, shift: 20 };

/** A duration (ms) or distance (px) token as a number; falls back when read on the server. */
export function motion(token: MotionToken): number {
  if (typeof window === "undefined") return FALLBACK[token];
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--motion-${token}`);
  return parseMotionValue(raw, FALLBACK[token]);
}

/** "220ms" → 220, "0.3s" → 300, "10px" → 10. */
export function parseMotionValue(raw: string, fallback: number): number {
  const m = raw.trim().match(/^(-?[\d.]+)(ms|s|px)?$/);
  if (!m) return fallback;
  const n = Number(m[1]);
  return m[2] === "s" ? n * 1000 : n;
}

export const EASE_OUT = "cubic-bezier(0.33, 1, 0.68, 1)";
export const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";
export const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

/** Whether the viewer asked for less motion. */
export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a number from `from` to `to`, calling `step` each frame; returns a cancel function. */
export function tween(from: number, to: number, ms: number, step: (value: number) => void): () => void {
  if (reducedMotion() || ms <= 1 || from === to) {
    step(to);
    return () => {};
  }
  const start = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3); // close to --ease-out
    step(from + (to - from) * eased);
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
