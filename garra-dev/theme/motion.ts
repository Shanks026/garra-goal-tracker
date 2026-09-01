import { ReduceMotion } from 'react-native-reanimated';

// The motion system. Same rule as theme/tokens.ts: **no component invents its own duration,
// stiffness, or delay** — if a value isn't here, it needs adding here first.
//
// Two principles, both from rules/01-design-system.md §6:
//
// 1. **Spring physics, never linear easing.** A spring's overshoot is what reads as "physical";
//    a linear tween reads as "a computer moved a rectangle". Timing curves appear here only for
//    opacity, where there's no physicality to model.
// 2. **Motion serves the data.** The governing law ("chrome is neutral, data is loud") applies
//    to movement too: a goal's ring filling is worth animating because the number changed; a
//    card sliding in because it exists is decoration. Duolingo is the reference for *feel* —
//    snappy, tactile, immediate — not for volume. Every animation here is under 400ms.
//
// `reduceMotion: ReduceMotion.System` is set on every preset, so the OS accessibility setting
// disables animation on the UI thread without any component checking anything. That's strictly
// better than an async AccessibilityInfo lookup, which races the first frame.

/** Springs. `dampingRatio` below 1 is what produces overshoot — the tactile part. */
export const spring = {
  /**
   * The default for state changes the user caused: a checkbox filling, a ring re-filling to a
   * new value. Slight overshoot, settles fast.
   */
  snappy: {
    duration: 260,
    dampingRatio: 0.65,
    reduceMotion: ReduceMotion.System,
  },
  /**
   * Press feedback — must settle before the finger lifts, so it's the quickest thing here and
   * barely overshoots. Any slower and taps feel laggy, which is the opposite of the point.
   */
  press: {
    duration: 140,
    dampingRatio: 0.9,
    reduceMotion: ReduceMotion.System,
  },
  /**
   * Larger travel: sheets, layout reflow when a row leaves a list. More damping, because a big
   * element bouncing looks unserious.
   */
  gentle: {
    duration: 380,
    dampingRatio: 0.85,
    reduceMotion: ReduceMotion.System,
  },
  /**
   * The one celebratory spring: a goal completing, a checkpoint landing. Loose enough to read as
   * a small flourish. Used sparingly — if this is on screen twice at once, something is wrong.
   */
  bouncy: {
    duration: 420,
    dampingRatio: 0.5,
    reduceMotion: ReduceMotion.System,
  },
} as const;

/** Timings, for opacity only — fades have no physicality to model with a spring. */
export const timing = {
  fast: { duration: 140, reduceMotion: ReduceMotion.System },
  base: { duration: 220, reduceMotion: ReduceMotion.System },
  /** Chart draw-on. Matches the 600ms the Phase 2 charts already used. */
  chart: { duration: 600, reduceMotion: ReduceMotion.System },
} as const;

/** Transform amounts, so "how far does a row slide in" is one decision, not twelve. */
export const motion = {
  /** Scale a pressable settles to while held. Deliberately subtle — 3% reads, 10% is a toy. */
  pressScale: 0.97,
  /** A completed row's brief acknowledging pulse. */
  pulseScale: 1.06,
  /** Vertical travel for an entering list row, in px. */
  enterOffset: 10,
  /**
   * Per-item delay in a staggered list, in ms, and the cap. Beyond ~5 items a stagger stops
   * reading as choreography and starts reading as lag, so it's clamped rather than unbounded.
   */
  staggerStep: 45,
  staggerMaxItems: 5,
} as const;

/**
 * Entrance delay for the nth item in a staggered list. Clamped, so a 40-goal arc doesn't make
 * the last row appear two seconds late.
 */
export function staggerDelay(index: number): number {
  return Math.min(index, motion.staggerMaxItems) * motion.staggerStep;
}
