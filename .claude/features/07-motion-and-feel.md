# Feature: Motion & Feel
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/07-motion-and-feel.md`
**Roadmap phase**: Phase 5.5 (`IMPLEMENTATION.md`) — cross-cutting, inserted between Phases 5 and 6
**Status**: ✅ Built, statically verified — on-device pass deferred to the end of Phase 7
**Last Updated**: 2026-09-02

---

## Context

Everything through Phase 5 is correct and almost entirely still. The app tells the truth about
pace, logs in one tap, and survives a cold start — and it feels like a spreadsheet. This phase
adds the layer that makes using it *feel* like something, without adding a single millisecond to
the interaction that matters.

**Why now, and why its own phase.** Motion touches every surface built in Phases 1–5, so
retrofitting it after Phase 6 would mean editing goal detail twice. Doing it here means Phase 6
inherits the system and every phase after it gets the feel for free. It's numbered 5.5 rather
than renumbering the roadmap, because it is genuinely a half-phase: no new screens, no new data,
no new dependency.

**The reference is Duolingo, calibrated down.** What's worth borrowing is that every tap feels
*received* — snappy spring feedback, immediate acknowledgement, a small flourish when something
completes. What isn't worth borrowing is the volume: constant ambient movement, mascots,
celebrations that interrupt. Garra is a tool someone opens for ten seconds a day. The user's
brief was explicit: *"minor smooth animation really brings life to the application"* and *"do
not overkill it."* Every animation in this phase is under 420ms and most are under 260ms.

**Designed screens**: none. The canvas specifies motion only in `01-design-system.md` §6 (a
six-line section before this phase) and the checkpoint pulse in §4.8. This phase turns that into
a real system and records it there.

### The library decision

**`react-native-reanimated` 4.1.1 — already installed, no new dependency.** It was worth
checking properly rather than assuming:

- It runs animations on the **UI thread**, which is the whole ballgame. A JS-thread animation
  library would stutter exactly when the app is busiest — during a log, which is the one moment
  that must never feel slow.
- Reanimated 4 ships **layout-animation presets** (`FadeIn`, `FadeInDown`, `SlideInDown`,
  `LinearTransition`) that cover every entrance and exit this phase needs, so none had to be
  hand-built.
- It ships **`ReduceMotion.System`** as an animation-config option, which honors the OS
  accessibility setting on the UI thread. This is strictly better than the
  `AccessibilityInfo.isReduceMotionEnabled()` check the Phase 2 charts were doing — that's async,
  so it races the first frame, and it scattered the decision across components.
- `01-design-system.md` §6 already mandated `withSpring`, and `06-conventions.md` §6 is explicit
  that adding a dependency is a decision, not a convenience. There was nothing to add.

`react-native-gesture-handler`'s `ReanimatedSwipeable` (already used by the Today row) shares the
same worklet runtime, so gestures and animations don't fight.

---

## Thesis Check

- **Fits the finite/pace model?** Motion here is *about* the data: the ring springs because the
  number changed, the row pulses because a commitment got met. The one ambient animation in the
  app (the checkpoint pulse) marks where you are in a sequence, which is also data.
- **Derived, not stored?** Nothing is stored. Motion state lives in Reanimated shared values on
  the UI thread and dies with the component.
- **Works offline?** Motion has no I/O at all.

---

## Phase Overview

```
Phase 5.5 — one pass, no sub-phases
  theme/motion.ts (the token layer) → PressableScale (press feedback everywhere) →
  entrances and the completion pulse → charts that seek new values → screen transitions →
  rules/01 §6 rewritten as a real spec.
```

Small enough not to split, and splitting would mean shipping half a motion language — which
looks worse than none, because inconsistent motion reads as broken rather than plain.

---

## 5.5.1 Design

No canvas screens. `01-design-system.md` §6 is rewritten from six lines into the full spec:
the governing law applied to movement, the four springs, what animates, **what does not
animate**, the reduced-motion contract, and the haptics position.

The one deliberate refinement to an existing rule is recorded there: the old §6 said chart fills
"animate once per session on mount, not on every re-render." Taken literally, that means logging
a value leaves the ring frozen at its old position — the exact moment the user most deserves
feedback. What the rule was really guarding against is re-animating on *unrelated* renders, so
the fix is to drive the animation from the **value** rather than from mount: an unrelated render
animates nothing, and a real change springs.

## 5.5.2 Data Model

No schema changes.

## 5.5.3 Derivation

`theme/motion.ts` is configuration, not derivation, but it carries one pure function worth
testing:

```ts
export function staggerDelay(index: number): number;  // clamped at motion.staggerMaxItems
```

**Test cases** (`theme/motion.test.ts`) — these assert the *design constraints*, which is the
unusual and useful part: a test that fails when someone makes an animation too slow.

- `staggerDelay` steps by one interval per item, and clamps (a 40-goal arc's last row must not
  appear two seconds late)
- Every animation stays under 400ms except the one flourish (420ms) and the chart draw-on (600ms)
- Press feedback settles faster than any state change, so taps can't feel laggy
- Every preset opts into `ReduceMotion.System`
- Every spring has `dampingRatio < 1` — overshoot is what reads as physical
- The press scale is subtle enough to read as feedback rather than as a toy

## 5.5.4 Data Layer

No new hooks. The completion pulse keys off `TodayItem.isDone`, which the existing optimistic
patch already flips before the write resolves — so the pulse fires in the same frame as the tap,
not after a round-trip.

## 5.5.5 Components

```
theme/motion.ts                      — the token layer: 4 springs, 3 timings, transform amounts
theme/motion.test.ts                 — design constraints as assertions
components/ui/PressableScale.tsx     — press feedback, one implementation for the whole app
```

Changed: `Button`, `Chip`, `GoalTypeCard`, `GoalRow` (press feedback) · `TodayRow` (staggered
entrance + completion pulse) · `Checkbox` (uses the shared `snappy` preset instead of a local
config) · `Toast` (springs up, fades out) · `PaceRing` (springs to new p/t values; dropped the
async reduce-motion check) · `ArcSweep` (same, minus the value-seeking it doesn't need) ·
`app/(onboarding)/_layout.tsx`, `app/arc-builder/_layout.tsx` (slide) · `app/(tabs)/_layout.tsx`
(cross-fade).

## 5.5.6 Navigation / Integration

Screen transitions are set in the three layouts, not per-screen: sequences slide from the right,
tabs cross-fade. Tabs are siblings with no order between them, so sliding would imply a
relationship that doesn't exist.

## 5.5.7 Impact on Existing Features

| Item | Note |
|---|---|
| `Button` / `Chip` props | Their `style` prop narrows from `PressableProps['style']` to `ViewStyle`, because `PressableScale` composes an animated style onto it. Both already only ever received a plain object. |
| `PaceRing` / `ArcSweep` | No longer call `AccessibilityInfo` — reduced motion is handled by the presets. Behavior on a reduce-motion device is unchanged (animation off, final state shown). |
| The 10-second log path | Press feedback is on the UI thread and the pulse keys off the optimistic patch, so neither waits on JS. **This is the thing to watch in the Phase 7 device pass.** |

## 5.5.8 What This Phase Does NOT Include

- **Broader haptics** — held by explicit user decision until the motion layer has been felt on a
  device. The existing one-per-path haptics (Checkbox, the log mutations) stay as they are.
- **Number tickers.** Rejected, not deferred: a ticker makes the user wait to read their own
  data. A 260ms pulse says "this changed" without costing them a moment.
- **Celebration moments** for completing a goal or finishing an arc. The Finale (Phase 10) is
  where a real celebration belongs, with a screen to hold it.
- **Skia-level chart animation** beyond value-seeking (morphing between burn-up curves, animated
  mosaic fills) — Phase 7 renders those for real, and animating them before they're on a screen
  would be guessing.
- **Any new dependency.**

## 5.5.9 Checklist

- [x] `theme/motion.ts` is the only place a duration, stiffness, or delay is defined
- [x] `staggerDelay` and the design-constraint tests pass
- [x] Press feedback is applied through one component, on every tappable surface
- [x] `PaceRing` springs to a new value when p/t change, and no longer polls `AccessibilityInfo`
- [x] Every preset sets `ReduceMotion.System`; no hand-rolled reduce-motion check remains
- [x] Screen transitions distinguish sequences (slide) from siblings (fade)
- [x] No new dependency added
- [x] `01-design-system.md` §6 records the system, including what does *not* animate
- [x] `tsc --noEmit`, `eslint .`, and `jest` clean (152 tests, 16 suites)
- [ ] **Every animation runs on the UI thread with no dropped frames while logging** —
      **on-device, pending** (the item that actually matters; see `00-index.md` §6)
- [ ] Reduce Motion genuinely disables entrances/scales/pulses while leaving state changes
      intact — **on-device, pending**
- [ ] Both themes, and a low-end Android device if one is available — **on-device, pending**

**Built and statically verified — 2026-09-02. The on-device pass runs with everything else after
Phase 7.**

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `staggerDelay()` | list index | delay in ms | steps per item, clamps at the cap |

---

## Entitlement Gates

None. Motion is not a feature to gate — a paywalled animation would be the most cynical thing in
the app.

---

## Out of Scope (All Phases)

- Broader haptics — on hold by user decision.
- Number tickers — rejected outright (see 5.5.8).
- Arc-completion and goal-completion celebrations — Phase 10 (The Finale).
- Chart-specific animation for the Arc tab's mosaic and momentum curve — Phase 7, once they
  render against real data.
- Any second animation library.
