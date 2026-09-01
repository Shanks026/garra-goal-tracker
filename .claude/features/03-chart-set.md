# Feature: The Chart Set
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/03-chart-set.md`
**Roadmap phase**: Phase 2 (`IMPLEMENTATION.md`)
**Status**: Planned
**Last Updated**: September 2026

---

## Context

Every screen from Phase 4 onward leans on these nine charts. Building them now, against fixture
data, on their own dev-only route, means the highest-risk visual work (and the thesis of the
whole product — pace rendered as geometry) is proven before any real screen depends on it.

**Designed screens**: no dedicated screen — the charts appear across screens `10`–`17`, but this
phase builds them in isolation on a kitchen-sink dev route, not wired into product screens yet.

**Source of the math**: `design-system/garra-design-system-sixteenscreens/Garra UI Kit.dc.html`,
the `DCLogic` class (`class Component extends DCLogic`, near the end of the file). Read
verbatim below — every formula in this doc's geometry sections is copied character-for-character
from that class, not re-derived.

### A critical distinction found while reading `DCLogic` — read this before building anything

The canvas's `mosaic()`, `burnup()`, and `momentum()` functions each mix **two different
things**: real positioning/shape geometry, and a **seeded pseudo-random fake-data generator**
that exists purely so the design mockup has a plausible-looking curve to preview
(`rnd(i) = frac(sin(i*127.1+311.7) * 43758.5453)`, then jitter applied on top of it). That
randomness is a canvas-only concern — the real app derives these values from actual `entries`
rows (`lib/derive/mosaic.ts` in Phase 3, or a rolling completion calculation for momentum), never
from a seeded PRNG. **Port the geometry, not the randomness**:

| Function | Real geometry (port verbatim) | Demo-only fake data (do NOT port) |
|---|---|---|
| `mosaic()` | The four cell-state visuals (future/hit/partial/miss) and their exact styling | The `rnd(i)` threshold rolls that decide which state each fixture cell gets |
| `burnup()` | `smooth()` (Catmull-Rom), the required-line formula, the deficit-area path | The `daily*(0.35+rnd()*1.3)` random walk that fabricates a plausible daily curve |
| `momentum()` | `smooth()`, the 342×96 viewBox, the fill-to-baseline-96 closing | The `sin(i/4.1)*20 + rnd(i+7)*13` fake wave |

This phase's charts take **already-computed points/states as props** either way (rules/02-ui-
components.md §2), so this distinction mainly matters for **fixture data** in this phase's
kitchen-sink route: it's fine to reuse the canvas's `rnd()`-based generators there (same as the
canvas does, for a visually convincing dev-only preview), but they must never end up inside a
chart component or — worse — inside `lib/derive/` later. Flagging this now so Phase 3 doesn't
accidentally inherit a demo-data generator as if it were real logic.

---

## Thesis Check

- **Fits the finite/pace model?** This *is* the pace model, rendered. `PaceRing` is singled out
  in `01-design-system.md` §4.2 as "the thesis as geometry" — the amber gap between fill and
  tick is the product's central idea made visible.
- **Derived, not stored?** All nine charts are pure rendering — they receive already-computed
  numbers and draw them. No chart component reads a database or stores anything.
- **Works offline?** Trivially yes — no chart in this phase touches the network, and this phase
  doesn't touch real data at all (fixtures only).

---

## Phase Overview

```
Phase 2.1 — Chart geometry utilities, PaceRing, ArcSweep
  The shared testable math (arc, ring, Catmull-Rom smoother, dash/offset helpers) plus the two
  "thesis" charts built first, per the design rule's own instruction.

Phase 2.2 — Mosaic, WeekBars, WindowTicks
  The cell/bar family — grid and rect-based, single-canvas requirement for Mosaic.

Phase 2.3 — BurnUp, Momentum
  The smoothed-curve family, sharing the Catmull-Rom utility from 2.1.

Phase 2.4 — LoadDonut, CheckpointSpine
  The remaining two: proportional arc segments, and the pulsing node spine.

Phase 2.5 — UI primitives
  Button, Chip, ListGroup, ListRow, StatusPill, Checkbox, SectionLabel, NumPad, Sheet shell —
  needed by the kitchen-sink route's chrome and by every real screen from Phase 4 on.

Phase 2.6 — Kitchen-sink route & on-device verification
  Wires all nine charts + UI primitives into one dev-only route, both themes, confirms the
  122-cell mosaic holds 60fps on-device.
```

**After each phase: stop and wait for approval before proceeding.**

---

## Phase 2.1 — Chart geometry utilities, PaceRing, ArcSweep

### Goal
The shared geometry helpers exist and are unit-tested, and the two charts that matter most —
`PaceRing` (the thesis) and `ArcSweep` (the hero, and the primitive every other arc-based chart
reuses) — render correctly against fixture props, in both themes, on the native dev client.

### Before Starting — Confirm With Codebase
- No `components/charts/` or `lib/charts/` directory exists yet — this phase creates both.
- Re-confirm `theme/tokens.ts` field names (`system.arc`, `system.slipping`, ACCENTS) before
  using them as fixture colors.
- **Skia API confirmed this session** (installed `@shopify/react-native-skia@2.2.12`):
  `Skia.Path.MakeFromSVGString(str)` parses an SVG path string directly — the canvas's path
  strings can be fed to it with no reformatting. `<DashPathEffect intervals={[on, off]}
  phase={n} />` (as a child of `<Path>`) applies a dash pattern; there is no `strokeDasharray`
  prop on `<Path>` itself.
- The native dev client (Android emulator) is the only way to see these render — Expo Go cannot
  load `@shopify/react-native-skia` (`01-project-initialization.md` §0.2.4 / `00-index.md`
  standing rule #7). **This is the phase where that stops being a future concern.**

### 2.1.1 Design
`01-design-system.md` §4.1 (ArcSweep) and §4.2 (PaceRing) — both already transcribed accurately
from the canvas (cross-checked against `DCLogic.arc()` and `DCLogic.ring()` directly this
session; no corrections needed).

### 2.1.2 Data Model
None.

### 2.1.3 Derivation — chart geometry (not `lib/derive/`; these don't touch `entries`)

```
components/charts/geometry.ts
```

Pure functions, ported verbatim from `DCLogic`:

```ts
export function arcSweepGeometry(p: number, cx: number, cy: number, r: number) {
  const L = Math.PI * r;
  const ph = Math.PI * (1 - p);
  return {
    path: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`,
    dashIntervals: [L * p, L + 4] as [number, number],
    dot: { x: cx + r * Math.cos(ph), y: cy - r * Math.sin(ph) },
  };
}

export function paceRingGeometry(
  p: number, t: number, r: number, sw: number, cx: number, cy: number,
) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  p = clamp(p); t = clamp(t);
  const C = 2 * Math.PI * r;
  const angle = ((t * 360 - 90) * Math.PI) / 180;
  const o = sw / 2 + 3.5;
  return {
    C,
    fillIntervals: [C * p, C + 4] as [number, number],
    gapIntervals: [C * Math.max(0, t - p), C + 4] as [number, number],
    gapOffset: -(C * p),
    tick: {
      x1: cx + (r - o) * Math.cos(angle), y1: cy + (r - o) * Math.sin(angle),
      x2: cx + (r + o) * Math.cos(angle), y2: cy + (r + o) * Math.sin(angle),
    },
    behind: p < t,
  };
}
```

**Required test cases** (`geometry.test.ts`), matching `02-ui-components.md` §2's call-out that
this exact math is "most likely to break silently":

- `arcSweepGeometry`: `p=0` (dash is `[0, L+4]`, dot at the left end), `p=1` (dash covers the
  full arc, dot at the right end), `p=0.5` (dot at the top), a value `p>1` doesn't get called
  (callers must clamp — assert the function does *not* silently clamp, since `ring` does but
  `arc` doesn't in the canvas source; document this asymmetry, don't "fix" it invisibly)
- `paceRingGeometry`: `p=t` (gap is `[0, C+4]`, i.e. invisible), `p>t` ("locked in" — gap must
  still resolve to `Math.max(0, t-p)` = 0, not negative), `p<t` (gap is visible and its length
  equals `C*(t-p)`), `p>1` and `t>1` both clamp to 1 (ring overflow protection — this one *is*
  clamped in the canvas, unlike arc), tick position at `t=0` and `t=1` (sanity — should land at
  the -90° and +270°/-90°+360° positions respectively)

### 2.1.4 Data Layer
None — no hooks, pure rendering components.

### 2.1.5 Components

```
components/charts/
  geometry.ts
  geometry.test.ts
  PaceRing.tsx
  ArcSweep.tsx
```

**`PaceRing`** — props: `{ p: number; t: number; accent: string; size?: 'default' | 'row' }`.
Four Skia layers in order, per `01-design-system.md` §4.2:
1. Track circle, stroke `track` token, full circle (no dash)
2. Gap circle, rotated -90°, `<DashPathEffect intervals={gapIntervals} phase={gapOffset}>`,
   stroke `system.slipping` (transparent when `behind` is false)
3. Fill circle, rotated -90°, `<DashPathEffect intervals={fillIntervals}>`, stroke `accent`,
   round caps
4. Tick line from `tick.{x1,y1}` to `tick.{x2,y2}`, stroke `textPrimary` (dark) /
   `bg` (`#0A0A0B`, light — per §4.2's "Tick is textPrimary on dark, #0A0A0B on light"), width 2,
   round cap

Default size `r:58, sw:14` (goal detail hero, per the canvas's `heroRing`); `size="row"` gives
`r:13, sw:6` in a 32×32 box (Home row rings, per the canvas's `cycRing`/`gr()` helper).

**`ArcSweep`** — props: `{ p: number; size?: 'home' | 'onboarding' | 'builder' }`. Track +
progress strokes per `01-design-system.md` §4.1's table (`home`: cx171 cy146 r140 sw14;
`onboarding`: cx171 cy180 r150 sw14; `builder`: cx155 cy150 r132 sw14), round caps, dot as two
stacked circles (`r:11` in `bg`, `r:7` in `system.arc`) at `dot.x/dot.y`.

### 2.1.6 Navigation / Integration
None — these render only in Phase 2.6's kitchen-sink route, not wired into any real screen yet.

### 2.1.7 Impact on Existing Features
None. Fully additive.

### 2.1.8 What This Phase Does NOT Include
- The other seven charts.
- Any real data — both charts take fixture `p`/`t` values passed as literals in this phase;
  wiring to `lib/derive/pace.ts` output is Phase 3+Phase 6/7.
- `useAppTheme()` is available (Phase 1.2) but these charts take `accent` as an explicit prop
  per `02-ui-components.md` §2 ("Accept `accent` as a prop. Never look up a color from a goal
  inside a chart") — they don't call the hook themselves for accent; they may for `track`/
  `textPrimary`-class tokens that aren't accent-specific.

### 2.1.9 Checklist
- [ ] `arcSweepGeometry` and `paceRingGeometry` match `DCLogic.arc()`/`DCLogic.ring()` exactly —
  diffed line-by-line against the canvas, not retyped from memory
- [ ] All required test cases pass
- [ ] `PaceRing` renders on-device (native dev client) matching the canvas visually: amber gap
  visible when behind, invisible when locked in/on track
- [ ] `ArcSweep` renders correctly at all three size variants
- [ ] Both charts render correctly in dark and light mode
- [ ] Animation: fills animate once on mount via a Reanimated shared value, not on every re-render
- [ ] `tsc --noEmit` clean
- [ ] No hex literal outside `theme/tokens.ts` (charts take `accent`/token colors as props)

**→ Stop here. Show the result and wait for approval.**

---

## Phase 2.2 — Mosaic, WeekBars, WindowTicks

### Goal
The three cell/bar-based charts render correctly, and the Mosaic specifically is proven to hold
frame rate — this is the chart most likely to be a real performance risk (122 cells, later
scrolled inside the Arc tab).

### Before Starting — Confirm Phase 2.1 is Approved
- Reuse `components/charts/geometry.ts` if any shared helper is needed; don't duplicate.
- Re-read `06-conventions.md` §7: **the 122-cell mosaic is one Skia `<Canvas>`, not 122 `View`s
  or 122 separate Skia nodes drawn via 122 React elements** — batch the draw calls.

### 2.2.1 Design
`01-design-system.md` §4.3 (Mosaic), §4.5 (WeekBars), §4.9 (WindowTicks) — all cross-checked
against `DCLogic.mosaic()` and the `weekBars`/`windowTicks` fixture-mapping code this session;
accurate as written, with the demo-randomness caveat from this doc's Context section.

### 2.2.2 Data Model
None.

### 2.2.3 Derivation
No new pure functions beyond what 2.1 already established — cell/bar state is passed in as
already-computed arrays (see Components below for the exact shape).

### 2.2.4 Data Layer
None.

### 2.2.5 Components

```
components/charts/
  Mosaic.tsx
  WeekBars.tsx
  WindowTicks.tsx
```

**`Mosaic`** — props: `{ cells: MosaicCellState[]; accent: string; columns: 14 | 20 | 7 }`,
where `MosaicCellState = 'future' | 'hit' | 'partial' | 'miss'`. Styling per
`01-design-system.md` §4.3's table (future: `fill` token, no stroke; hit: `accent`; partial:
`accent` @ 42% alpha; miss: transparent + inset 1px `mosaicMiss` stroke). Gap/radius per
context (`01-design-system.md` §4.3's table: Arc tab/Finale `gap 4-5, radius 5`; goal detail
`gap 4, radius 4`; Sunday Reset `gap 8, radius 8, inset 1.5px`). **Single `<Canvas>`** — iterate
`cells` and draw each as a `Skia.Path` rounded rect (or `<RoundedRect>` primitive) inside one
canvas, not one `<Canvas>` per cell.

**`WeekBars`** — props: `{ bars: { height: number; state: 'done' | 'missed' | 'none' }[];
accent: string }`. viewBox 342×86, baseline `y=80`, `x = 17.4 + i*48.86`, bar width 14, `rx 7`.
`done`: filled `accent`. `missed`: `fill: transparent, stroke: barMiss, sw: 2` (the hollow
stub). `none`: renders nothing (height 0). Day letters (`M T W T F S S`) below at 11px/600/
`+.1em`/`textQuaternary`, passed as a fixed prop or hardcoded — not derived here.

**`WindowTicks`** — props: `{ totalDays: number }` (122 for a full arc). Per index `i`: month
boundary (`i` in `[0, 30, 61, 91]`) → height 44, `system.arc`; every 7th day → height 26,
`system.arc @ 55%`; else height 15, `system.arc @ 28%`. 122 bars, `gap 1`, `borderRadius 2`,
aligned to a 44px baseline. Single canvas, same reasoning as Mosaic.

### 2.2.6 Navigation / Integration
None yet.

### 2.2.7 Impact on Existing Features
None.

### 2.2.8 What This Phase Does NOT Include
- Real cell-state derivation from `entries` — Phase 3 (`lib/derive/mosaic.ts`).
- The Mosaic's long-press-to-backfill interaction — Phase 5.

### 2.2.9 Checklist
- [ ] All three charts render correctly against fixture data, matching the canvas visually
- [ ] Mosaic is confirmed as a **single** `<Canvas>` (check the component source, not just the
  visual result — two implementations can look identical and differ hugely in frame cost)
- [ ] Mosaic scrolls (inside a plain `ScrollView` test harness) at a visually smooth frame rate
  on-device — full 60fps profiling is Phase 2.6's job with the real kitchen-sink layout, but a
  basic sanity check happens here since this is the highest-risk chart
- [ ] WeekBars' missed-day stub is visibly hollow (stroke only), not just a different fill color
- [ ] All three render correctly in dark and light mode
- [ ] `tsc --noEmit` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 2.3 — BurnUp, Momentum

### Goal
The two smoothed-curve charts render correctly, sharing a single, unit-tested Catmull-Rom
smoother.

### Before Starting — Confirm Phase 2.2 is Approved
- Re-read this doc's Context section on demo-randomness before touching `DCLogic.burnup()` or
  `DCLogic.momentum()` — the random walk in both must **not** be ported.

### 2.3.1 Design
`01-design-system.md` §4.4 (BurnUp) and §4.6 (Momentum) — cross-checked against
`DCLogic.smooth()` and `DCLogic.burnup()` this session; the "control points at ±1/6 of the
neighbour delta" description matches `smooth()`'s `(p2-p0)/6` / `(p3-p1)/6` exactly.

### 2.3.2 Data Model
None.

### 2.3.3 Derivation

```
components/charts/geometry.ts   (extended)
```

```ts
export function catmullRomSmooth(points: [number, number][]): string {
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
```

**Required test cases**:
- 2 points (degenerate — no interior curve, straight `C` segment still produced without a crash)
- 3 points (one interior segment)
- A straight line of collinear points — the smoothed curve's control points should still land
  on the line (no visible bulge from a degenerate case)
- Output is a valid path string parseable by `Skia.Path.MakeFromSVGString` — assert it doesn't
  return `null`

`burnUpGeometry(points, W, H, win, target, total)` — takes **already-computed cumulative points**
(one per day, real logged totals — not the canvas's random walk) and produces:
```ts
{
  linePath: string;        // catmullRomSmooth(points)
  fillPath: string;        // linePath + ' L lastX H L 0 H Z'
  requiredLinePath: string; // `M 0 ${H} L ${W} ${reqEndY}`, where reqEndY = H - usable, usable = H - H*0.08
  deficitAreaPath: string; // linePath + ' L lastX reqAtDay L 0 H Z', reqAtDay = H - (day/win)*usable
  dot: { x: number; y: number };
}
```

### 2.3.4 Data Layer
None.

### 2.3.5 Components

```
components/charts/
  BurnUp.tsx
  Momentum.tsx
```

**`BurnUp`** — props: `{ points: [number, number][]; W?: number; H?: number; win: number;
target: number; total: number; accent: string }` (defaults `W=342, H=112` per the canvas
viewBox). Layers per `01-design-system.md` §4.4: actual line (`sw 6`, round cap+join, `accent`),
fill (vertical gradient `accent@.38 → accent@0`), required line (`rgba(255,255,255,.3)`, `sw 2`,
`<DashPathEffect intervals={[2, 7]}>`, round cap), deficit area (`system.slippingArea` fill),
head dot (`r:10` in `bg` + `r:6` in `accent`). No gridlines, no axis labels, no legend — scrub-
to-reveal is a later phase's interaction, not built here.

**`Momentum`** — props: `{ points: [number, number][]; accent?: string }` (defaults to
`system.arc` per the canvas — momentum is always indigo, not goal-accent-colored). viewBox
342×96, `sw 6`, round, gradient fill `arc@.38 → 0`, fill closes to `L 342 96 L 0 96 Z`.

### 2.3.6 Navigation / Integration
None yet.

### 2.3.7 Impact on Existing Features
None.

### 2.3.8 What This Phase Does NOT Include
- Real cumulative-points derivation from `entries` — Phase 3/6/7.
- Scrub-to-reveal interaction on BurnUp — a later phase.

### 2.3.9 Checklist
- [ ] `catmullRomSmooth` passes all required test cases
- [ ] `BurnUp` and `Momentum` render correctly against fixture point arrays, matching the canvas
- [ ] BurnUp's deficit area only appears where the actual line falls behind the required line
  (verify with a fixture dataset that's deliberately behind pace, and one that's ahead)
- [ ] Both render correctly in dark and light mode
- [ ] `tsc --noEmit` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 2.4 — LoadDonut, CheckpointSpine

### Goal
The remaining two charts render correctly: proportional arc segments for weekly load, and the
pulsing checkpoint spine for Milestone goals.

### Before Starting — Confirm Phase 2.3 is Approved
- Reanimated's pulse animation (`scale(1)→scale(2.1)`, `opacity .55→0`, `2.4s ease-out infinite`)
  needs a `withRepeat`/`withTiming` loop — confirm the reduced-motion gate
  (`01-design-system.md` §6) is wired from the start, not bolted on later.

### 2.4.1 Design
`01-design-system.md` §4.7 (LoadDonut) and §4.8 (CheckpointSpine) — cross-checked against
`DCLogic`'s donut-segment mapping (`donutSegs`) and checkpoint-state mapping (`checkpoints...
map`) this session; both accurate as written.

### 2.4.2 Data Model
None.

### 2.4.3 Derivation

```ts
// components/charts/geometry.ts (extended)
export function loadDonutSegments(
  shares: { color: string; hours: number }[], innerRadius: number,
) {
  const total = shares.reduce((sum, s) => sum + s.hours, 0);
  const C = 2 * Math.PI * innerRadius;
  let cumulative = 0;
  return shares.map((s) => {
    const share = s.hours / total;
    const len = C * share - 7; // the -7 creates the visible gap between segments
    const seg = { color: s.color, dashIntervals: [len, C + 4] as [number, number], offset: -cumulative };
    cumulative += C * share;
    return seg;
  });
}
```

**Required test case**: shares that sum to the total produce segments whose `dashIntervals[0]`
values, plus `7 * shares.length` (the removed gaps), sum back to `C` — i.e. the -7 gap
subtraction is applied per-segment and doesn't silently accumulate error.

### 2.4.4 Data Layer
None.

### 2.4.5 Components

```
components/charts/
  LoadDonut.tsx
  CheckpointSpine.tsx
```

**`LoadDonut`** — props: `{ segments: { color: string; hours: number }[]; totalLabel: string }`.
viewBox 148×148: ghost ring (`r:64`, `rgba(255,255,255,.07)`, `sw 6`), inner track (`r:51`,
`rgba(255,255,255,.05)`, `sw 14`), segments via `loadDonutSegments` (`sw 14`, round caps).
Total sits in the hollow centre: 22px/600 value over 10px/600/`+.14em` label — rendered as RN
`<Text>` overlaid on the `<Canvas>`, not drawn in Skia (text-in-Skia is unnecessary complexity
here; the canvas mockup uses HTML text for exactly this reason).

**`CheckpointSpine`** — props: `{ checkpoints: { label: string; meta: string; status: 'done' |
'current' | 'future' }[]; accent: string }`. Node column 22px wide, node 18×18 circle
(`radius 10`). Per `01-design-system.md` §4.8's table: `done` → filled `accent`, spine below
`accent`; `current` → transparent + inset 2px `accent` ring + pulse, spine below
`rgba(255,255,255,.1)`; `future` → transparent + inset 2px `rgba(255,255,255,.18)`, spine below
`rgba(255,255,255,.1)`; last node's spine is always transparent regardless of status. Pulse:
`scale(1)→scale(2.1)`, `opacity .55→0`, `2.4s ease-out infinite`, gated by
`AccessibilityInfo.isReduceMotionEnabled()` per `01-design-system.md` §6 — drop the pulse
(render the static ring) when reduce-motion is on, keep everything else.

### 2.4.6 Navigation / Integration
None yet.

### 2.4.7 Impact on Existing Features
None.

### 2.4.8 What This Phase Does NOT Include
- Real per-goal load-hour derivation (`lib/derive/load.ts`) — Phase 3.
- Real checkpoint status derivation (which checkpoint is "current" — the first unhit one, in
  `position` order) — a small mapping function, built when Phase 6 (goal detail) first needs it,
  not invented here against fixture data.
- Tapping a checkpoint node to mark it hit — Phase 5/6 (the logging path).

### 2.4.9 Checklist
- [ ] `loadDonutSegments` passes its required test case
- [ ] `LoadDonut` renders correctly against a fixture 5-goal dataset, matching the canvas
- [ ] `CheckpointSpine` renders all three states correctly, including the pulse on `current`
- [ ] Pulse is confirmed to respect `AccessibilityInfo.isReduceMotionEnabled()` — verify by
  toggling the device's reduce-motion setting, not just reading the code
- [ ] Both render correctly in dark and light mode
- [ ] `tsc --noEmit` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 2.5 — UI primitives

### Goal
The non-chart building blocks every future screen needs exist: buttons, chips, list rows,
status pills, the checkbox, section labels, the custom numpad, and the sheet shell.

### Before Starting — Confirm Phase 2.4 is Approved
- Re-read `02-ui-components.md` §3 in full before building the Sheet shell —
  `useSheetBackHandler` is **mandatory**, no exceptions, and this is the first sheet built in
  the whole project, so getting the pattern right here is what every later sheet copies.
- Check whether `react-native-reusables` has a primitive for any of these before building from
  scratch (`02-ui-components.md` §7) — but this is genuinely the first real usage point for it
  in the project (deferred from Phase 0 for exactly this reason), so budget time to actually
  evaluate it rather than assuming.

### 2.5.1 Design
`01-design-system.md` §7 (Component patterns) has exact specs for every primitive except
`Sheet`, which comes from `02-ui-components.md` §3's pattern description (Provider + Context +
`forwardRef`/`useImperativeHandle`, `bg: surface`, top radius 28, scrim `rgba(0,0,0,.62)`).

### 2.5.2 Data Model
None.

### 2.5.3 Derivation
None.

### 2.5.4 Data Layer
None — `useSheetBackHandler` is a **UI** hook (`04-hooks.md` §1: "Platform/RN plumbing... may
NOT contain any data access"), not a data hook.

```ts
// hooks/useSheetBackHandler.ts
export function useSheetBackHandler(modalRef: RefObject<BottomSheetModal>) {
  // Wires BackHandler to modalRef's onChange/dismiss, matching the exact pattern proven
  // working in app/smoke.tsx's Phase 0.2 check 5 (now deleted, but the logic is identical —
  // this hook is that logic, extracted and made reusable).
}
```

### 2.5.5 Components

```
components/ui/
  Button.tsx        # primary (bg:textPrimary/color:bg), secondary (bg:fillMed), outline (1px borderControl)
  Chip.tsx           # h38 r19 filter chip; h42 r21 intent chip variant
  ListGroup.tsx       # inset grouped list container: bg:border, gap:1, children bg:surface
  ListRow.tsx
  StatusPill.tsx      # h30 r15; slipping -> slippingBg/slipping, else fillMed/rgba(255,255,255,.7)
  Checkbox.tsx        # 24px round; unchecked 1.5px rgba(255,255,255,.22); checked filled accent + bg-colored check
  SectionLabel.tsx     # uppercase, 11px/600/+.14em (or +.16em on Home/detail per context prop)
  NumPad.tsx          # 3-col grid, 12 keys, h50 r12, bg:fill, 24px/500
sheets/
  Sheet.tsx           # shell: Provider + Context, forwardRef/useImperativeHandle
hooks/
  useSheetBackHandler.ts
```

Every primitive takes token values from `theme/tokens.ts` (via the `dark:`-suffix className
convention, `00-index.md` standing rule #8) — no hardcoded hex, no hardcoded pixel value outside
`layout`/`radii`/`controls`.

`Button` variants per `01-design-system.md` §7: primary is **never** accent-colored (governing
law — chrome is neutral); secondary `bg:fillMed`; outline `1px borderControl`, `color:
textSecondary`, weight 500. All three `h54 r28`, label `17/600/-.01em`.

### 2.5.6 Navigation / Integration
None of these mount anywhere real yet — Phase 2.6's kitchen-sink route exercises them directly.

### 2.5.7 Impact on Existing Features
None.

### 2.5.8 What This Phase Does NOT Include
- `RescopeSheet`, `LogSheet`, `GoalFormSheet` (the actual sheets) — only the reusable `Sheet`
  shell and `useSheetBackHandler`. Real sheets are built when the feature needing them arrives.
- Icon picker / `GoalIcon.tsx` — Phase 4, when goal creation needs it.
- `FlashList` usage — nothing in this phase has a list long enough to need it yet.

### 2.5.9 Checklist
- [ ] Every primitive matches its exact spec from `01-design-system.md` §7 (h/r/color/weight),
  diffed against the rule file, not approximated
- [ ] Primary button is never accent-colored — spot-check by grep, not just visual review
- [ ] `Sheet` shell opens/closes correctly; `useSheetBackHandler` verified with the Android
  hardware back button specifically (not just a close button) — this is the one thing
  `02-ui-components.md` calls out as having shipped broken in a sibling project
- [ ] `Checkbox` animates with slight overshoot (~250ms `withSpring`) and haptic fires on tap,
  not on animation end (`01-design-system.md` §6)
- [ ] Every tappable target ≥ 44×44 even where the visual is smaller (the 24px checkbox needs
  hit-slop)
- [ ] All primitives render correctly in dark and light mode
- [ ] `tsc --noEmit` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 2.6 — Kitchen-sink route & on-device verification

### Goal
One dev-only route renders all nine charts and every UI primitive against fixture data, proving
the whole set holds together visually and performs acceptably before any real screen is built
on top of it. This is Phase 2's actual done condition per `IMPLEMENTATION.md`.

### Before Starting — Confirm Phase 2.5 is Approved
- Re-read this doc's standing note on `00-index.md` rule #9: **any file under `app/` is eagerly
  bundled by Expo Router, whether navigated to or not.** This route already forces Skia into
  every build from this point on (unavoidable — the product needs Skia), so this isn't a new
  compatibility loss, but confirm the route is clearly named/marked as dev-only so it isn't
  mistaken for a real screen later.
- Confirm the native dev client (Android emulator, Phase 0.2) is still working before starting —
  this phase lives or dies on being able to actually see the result on-device.

### 2.6.1 Design
No single canvas screen — this route deliberately doesn't match any of the 18 designs; it's a
scrollable catalog, one section per chart/primitive, with a light/dark toggle at the top for
fast comparison (this toggle calls `useAppTheme().setColorScheme` directly — the one legitimate
use of manual theme override before Settings exists).

### 2.6.2 Data Model
None.

### 2.6.3 Derivation
None new — this phase only assembles fixture data for the nine charts, reusing the canvas's
`rnd()`-based generators **only as fixture generators**, per this doc's Context section (never
inside `lib/derive/` or a chart component).

```
components/charts/__fixtures__/chartFixtures.ts
```

### 2.6.4 Data Layer
None.

### 2.6.5 Components

```
app/
  _dev-charts.tsx    # kitchen-sink route; leading underscore signals "not a real screen"
```

One section per: `PaceRing` (a few `p`/`t` combinations — locked in, on track, slipping,
cooked-adjacent), `ArcSweep` (all three sizes), `Mosaic` (all three column counts), `WeekBars`,
`WindowTicks`, `BurnUp` (ahead-of-pace and behind-pace fixture datasets), `Momentum`,
`LoadDonut`, `CheckpointSpine` (all three states visible at once), then every `components/ui/`
primitive.

### 2.6.6 Navigation / Integration
`app/_dev-charts.tsx` is reachable via a temporary link from `app/index.tsx` (same pattern as
the now-deleted `smoke.tsx`/`db-check.tsx` — except this one is **not** deleted at the end of
the phase; it stays as a living reference for however long the design system keeps evolving,
per how `IMPLEMENTATION.md` describes it: "a dev-only kitchen-sink route," not a throwaway).

### 2.6.7 Impact on Existing Features
`app/index.tsx` gains a temporary link, same as prior phases.

### 2.6.8 What This Phase Does NOT Include
- Wiring any chart to real data — that starts in Phase 3 (pace engine) and lands in screens from
  Phase 4 onward.
- Removing the kitchen-sink route — it's intentionally kept as a living design reference.

### 2.6.9 Checklist
- [ ] All nine charts + every UI primitive visible on one route, on-device, via the native dev
  client (not Expo Go — confirm this explicitly, since it would be easy to accidentally verify
  against a stale Expo Go session showing an old cached screen)
- [ ] Full route confirmed in both dark and light mode using the in-route toggle
- [ ] The 122-cell Mosaic section scrolled on-device and confirmed smooth — this is the actual
  60fps checkpoint `IMPLEMENTATION.md` names as Phase 2's done condition, more rigorous than
  2.2's basic sanity check
- [ ] Every chart visually matches its corresponding canvas screen side by side (open the canvas
  screen and the dev-client screen together, compare directly — not from memory)
- [ ] All path-generator unit tests from 2.1–2.4 pass as a full suite (`npx jest`)
- [ ] `tsc --noEmit` clean
- [ ] `00-index.md` §5 Shared Infrastructure updated: all nine charts + UI primitives listed as
  built, in the same change

**→ Stop here. Phase 2 complete. Report to the user, then wait for Phase 3 go-ahead.**

---

## Data Model Summary (Final State After All Phases)

No schema changes in this phase — purely additive UI/chart code.

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `arcSweepGeometry(p, cx, cy, r)` | fraction complete + geometry params | path string, dash intervals, dot position | p=0, p=1, p=0.5, no auto-clamp above 1 |
| `paceRingGeometry(p, t, r, sw, cx, cy)` | actual/expected fractions + geometry params | fill/gap dash intervals, gap offset, tick line endpoints, `behind` flag | p=t, p>t, p<t, both clamp above 1, tick at t=0/t=1 |
| `catmullRomSmooth(points)` | array of `[x,y]` points | SVG path string | 2 points, 3 points, collinear points, valid-Skia-path assertion |
| `loadDonutSegments(shares, innerRadius)` | `{color, hours}[]` + radius | per-segment dash intervals + offset | segment lengths + gaps sum back to circumference |

None of these are `lib/derive/*` in the `03-state-and-data.md` §4 sense (they don't read
`entries`) — they live in `components/charts/geometry.ts` and are tested the same way
(`06-conventions.md` §3's "chart path generators" bullet), just organizationally separate from
the pace/streak/mosaic/load derivation layer that Phase 3 builds.

---

## Entitlement Gates

None applied in this phase. `charts.deep` (from `lib/entitlements.ts`, Phase 1.3) exists as a
flag but per `IMPLEMENTATION.md`'s Design Deltas §3 recommendation — adopted, not re-litigated
here — pace ring and burn-up stay free in the real product; gating happens (if anywhere) on
deeper historical stats in a later phase, never on these core chart primitives themselves.

---

## Out of Scope (All Phases Here)

- Wiring any chart to real `entries` data — Phase 3 (pace engine) is the derivation layer;
  Phases 4–7 are where charts first appear on real screens.
- `RescopeSheet`, `LogSheet`, `GoalFormSheet` and every other real sheet — only the `Sheet`
  shell and `useSheetBackHandler` are built here.
- `FlashList` — not needed until a list exceeds ~30 rows.
- Chart scrub-to-reveal interactions (BurnUp) — a later phase.
- Removing the demo-randomness-based fixture generators from the kitchen-sink route — they stay
  there permanently; the constraint is only that they never leave that file.
