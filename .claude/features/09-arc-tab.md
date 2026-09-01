# Feature: The Arc Tab
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/09-arc-tab.md`
**Roadmap phase**: Phase 7 (`IMPLEMENTATION.md`)
**Status**: ✅ Built, statically verified — on-device pass deferred to the batched session (`00-index.md` §6)
**Last Updated**: 2026-09-02

---

## Context

Home is today. Goal detail is one commitment. This is **the whole run at a glance** — the screen
that answers "how has this arc actually gone?" and the one most likely to get screenshotted, which
`garra-index.md` §8.3 treats as a distribution channel rather than a vanity metric.

It's the last phase before the batched on-device pass, and it closes out the chart set: `Mosaic`
at arc scale, `Momentum`, and `LoadDonut` all get their first real data here, which means every
one of the nine Phase 2 charts will have been rendered against something true.

**Designed screen**: `15` Arc tab. It specifies three sections — the 122-cell mosaic, momentum
with its headline %, and the weekly load donut with per-goal rows. `IMPLEMENTATION.md` and
`garra-index.md` §7.8 both ask for two more that the canvas doesn't draw: an **all-goal pace
summary** and **streak stats**. Those extend patterns that already exist (Home's Arc rows, and a
plain stat pair) rather than inventing anything.

### The approved chart change: a fifth mosaic cell state

Phase 3 flagged that the canvas's four states (`future` / `hit` / `partial` / `miss`) can't say
"nothing was asked of you today", and said to raise it once a real screen made it visible. Phase 6
made it visible; **this** phase makes it the hero. Raised, and answered by the user: **add a quiet
`'rest'` state.**

```
hit      ██  solid accent
partial  ▓▓  accent @ 42%
rest     ▒▒  flat neutral fill, NO stroke     ← new
future   ░░  faintest neutral fill, no stroke
miss     ⬚⬚  transparent, 1px inset stroke
```

`rest` and `future` are both quiet and unstroked, but `rest` sits one step more present — a rest
day is *accounted for*, a future day merely hasn't happened. Deliberately **neutral, not a faint
accent tint**: a rest day is not partial credit, and tinting it would make "the schedule said
rest" look like "you did a little." That's the governing law (`§0`) applied to a single cell.

This is a real change to an approved spec, so it lands in `01-design-system.md` §4.3 in the same
change as the code, and `mosaic.ts`'s long-standing documented gap finally closes.

### What "planned vs actual" means here

The canvas's donut shows **planned** load only, but `IMPLEMENTATION.md`'s done-condition is
*"planned-vs-actual reads truthfully against logged entries"* — so actual has to appear somewhere.

**Resolution, no new chart**: the donut keeps showing planned share (that's what its segments
are), the centre shows **actual hours with planned beneath it**, and each per-goal row reads
`actual / planned`. Two numbers side by side is the honest comparison; a second donut would be
decoration, and a diverging bar chart would be a tenth chart type for one screen.

Actual hours are `est_minutes × completions`, which is an estimate of an estimate — so the copy
says "logged" rather than implying a stopwatch ran.

---

## Thesis Check

- **Fits the finite/pace model?** This is the run's shape over time, which only exists because the
  arc is finite. An infinite tracker has no "whole run" to show.
- **Derived, not stored?** Every number is computed from `entries` at read time — the mosaic, the
  rolling momentum %, actual hours, every streak. Nothing new is written at all: this phase is
  **read-only**, the first one that is.
- **Works offline?** Entirely — no writes, no network, one SQLite read.

---

## Phase Overview

```
Phase 7.1 — The rest state + the derivations
  The fifth mosaic cell state, arc-level mosaic cells, rolling momentum, and actual load.
  Pure and tested. No screens.

Phase 7.2 — The screen
  app/(tabs)/arc.tsx: screen 15's three sections plus the pace summary and streak stats
  the roadmap asks for.
```

Two sub-phases, not five — this phase writes nothing and adds no new interaction, so the risk is
concentrated entirely in the maths.

**After each phase: stop and wait for approval before proceeding.**

---

## Phase 7.1 — The rest state + the derivations

### Goal
Every number screen 15 needs exists as tested, pure data, and the mosaic can finally distinguish a
rest day from a missed one.

### Before Starting — Confirm With Codebase
- `Mosaic` takes `{ cells, accent, columns, width }`; the arc variant is **14 columns**, gap 4–5,
  radius 5 (`01-design-system.md` §4.3). Goal detail's is 20 — Phase 6 uses the right one.
- `Momentum` takes `{ points: [number, number][] }` in a 342×96 viewBox and hard-codes
  `system.arc` (it's always the arc's own curve, never a goal's).
- `LoadDonut` takes `{ segments: { color, hours }[], totalLabel }`.
- `lib/derive/load.ts`'s `loadCheck()` already computes **planned** weekly minutes per goal via
  the 84-day reference window (standing rule #16). Actual is new and must not disturb it.
- `MosaicCellState` lives in `lib/derive/mosaic.ts` since Phase 5.0, re-exported by the chart.

### 7.1.1 Design
The mosaic's fifth state, specified above and recorded in `01-design-system.md` §4.3. Everything
else here is invisible.

### 7.1.2 Data Model
No schema changes. **This phase writes nothing.**

### 7.1.3 Derivation

**`MosaicCellState` gains `'rest'`**, and `mosaic.ts` uses it where it previously guessed:
- a non-due day under `daily`/`specific_days`/`every_n_days` → `'rest'` (was `'miss'`)
- an `n_per_week` day that isn't a short week's marker → `'rest'` (was `'future'`, which was the
  least-bad of four options and is no longer necessary)
- a goal with no cadence at all → an unlogged past day stays `'miss'`; an Accumulate goal was
  always available to log, so nothing rested

```
lib/derive/arcMosaic.ts
```

```ts
/** One cell per arc day, across every goal — the arc-level mosaic (screen 15). */
export function arcMosaicCells(input: {
  goals: { id: string; cadence: CadenceConfig | null }[];
  entriesByGoal: Map<string, ProgressEntry[]>;
  startKey: string;
  totalDays: number;
  todayKey: string;
}): MosaicCellState[];
```

An arc-level cell answers a different question from a goal-level one: **what share of what the day
asked for got done?**

- no goal due, nothing logged → `'rest'`
- every due goal logged → `'hit'`
- some logged → `'partial'`
- none logged, something was due → `'miss'`
- day in the future → `'future'`

`n_per_week` goals count as "due" every day until their week's target is met, matching the rule
Home already uses (`useHomeData`'s `isOnTodayList`) — one definition of "due today", not two.

```
lib/derive/momentum.ts
```

```ts
/** Rolling 7-day completion ratio (0–1) per elapsed day, and today's headline. */
export function momentumSeries(input: {
  goals: { id: string; cadence: CadenceConfig | null }[];
  entriesByGoal: Map<string, ProgressEntry[]>;
  startKey: string;
  todayKey: string;
}): { series: number[]; headline: number };
```

Completion for a day is `logged / due`. The rolling window is the trailing 7 days **clamped to the
arc's start**, so day 3 averages 3 days rather than reading artificially low against 4 days that
predate the arc — the bug that would make every arc look like it began badly.

```
lib/derive/load.ts — extended
```

```ts
/** Actual weekly minutes per goal, from real completions over the trailing 7 days. */
export function actualLoad(input: {
  goals: { id: string; estMinutes: number }[];
  entriesByGoal: Map<string, ProgressEntry[]>;
  fromKey: string;
  toKey: string;
}): { weeklyMinutesTotal: number; perGoal: { id: string; weeklyMinutes: number }[] };
```

**Required test cases**

`lib/derive/arcMosaic.test.ts`:
- A day where no goal was due and nothing was logged is `'rest'`, not `'miss'`
- A day where all due goals were logged is `'hit'`; some → `'partial'`; none → `'miss'`
- A future day is `'future'` regardless of what was due
- A day before a goal existed doesn't count that goal as due
- An arc with zero goals produces all-`'rest'`/`'future'` cells and never divides by zero
- Cell count always equals `totalDays`

`lib/derive/momentum.test.ts`:
- A perfect week is 1.0; a completely missed week is 0
- The window clamps at the arc's start — day 2 of a perfect arc reads 1.0, not 2/7
- A day with nothing due doesn't drag the average down (it's excluded, not counted as a zero)
- `headline` equals the last value of `series`
- An arc with no elapsed days yields an empty series and a `0` headline, not `NaN`

`lib/derive/load.test.ts` (additions):
- `actualLoad` counts only real completions, ignoring skipped days
- A goal logged every day for a week reports `estMinutes × 7`
- Actual can exceed planned (a 3×/week goal logged 5 times), and isn't clamped — the truth is the
  point
- A goal with no `estMinutes` contributes 0 rather than `NaN`

### 7.1.4 Data Layer
`hooks/useArcTab()` — one read-only hook composing all of the above plus `goalStreak`/`arcStreak`
from Phase 3 (`streaks.ts`, which has never had a real caller) and `pace()` per goal for the
summary rows. Returns `null` while loading.

### 7.1.5 Components
`Mosaic` renders the new `'rest'` state; `theme/tokens.ts` gains `mosaicRest`. `Momentum` and
`LoadDonut` get `accessibilityLabel`s, finishing the chart-a11y work Phases 5.5 and 6 began.

### 7.1.6 Navigation / Integration
None.

### 7.1.7 Impact on Existing Features
| Item | Note |
|---|---|
| `mosaic.ts` + its tests | The documented "4-state gap" note comes out, replaced by the real behaviour. Two existing tests assert non-due days are `'miss'` — they were written to make the gap *provable*, so they now flip to `'rest'` and their comments explain the change rather than being silently edited. |
| Goal detail (Phase 6) | Inherits the fix for free: a Mon/Wed/Fri goal's Tuesday stops looking like a failure. |
| `01-design-system.md` §4.3 | Gains the fifth state — a real amendment to an approved spec, made once and recorded. |

### 7.1.8 What This Phase Does NOT Include
- Any write. Freeze earning still belongs to Phase 9 even though `streaks.ts` computes it here.
- Scrubbing a chart to reveal values (`§4.4` mentions it for burn-up; no phase has claimed it).

### 7.1.9 Checklist
- [ ] `'rest'` renders distinctly from both `'future'` and `'miss'`, in both themes — **on-device, pending** (distinct tokens are in place: .09 vs .05 alpha vs a stroke)
- [x] `arcMosaicCells` and `momentumSeries` test cases pass, including the window clamp
- [x] `actualLoad` is honest when actual exceeds planned
- [x] `mosaic.ts`'s gap note is gone and its flipped tests explain why
- [x] `01-design-system.md` §4.3 documents the fifth state
- [x] `tsc --noEmit`, `eslint .`, `jest` clean

**✅ Complete — 2026-09-02.**

---

## Phase 7.2 — The screen

### Goal
The Arc tab stops being a placeholder: the whole run, honestly, in one scroll.

### Before Starting — Confirm 7.1 is Approved
- Re-read screen 15 for the exact stack and type sizes: title 28/600/−.03em, the date/day line
  15/400, then `MOMENTUM` (11/600/+.16em) over `78%` (34/600/−.035em) beside "7-day completion"
  (14/400), then `WEEKLY LOAD` with the 148×148 donut and its rows.
- **Render the 122-cell mosaic as ONE Skia canvas** (`01-design-system.md` §4.3, `06-conventions.md`
  §7). `Mosaic` already does; the thing to avoid is wrapping cells in `View`s for gestures the way
  goal detail needed to.

### 7.2.1 Design
Screen `15` exactly for its three sections. Two additions the roadmap asks for and the canvas
doesn't draw:

- **All-goal pace summary** — reuses Home's `GoalRow` verbatim (pace ring, name, value, status).
  It's the same information answering the same question, so a second design would be a mistake.
- **Streak stats** — a plain stat pair in the style of screen 14's `PRACTICE` / `NEXT NODE`
  columns: the arc streak's current and longest.

### 7.2.2 Data Model
No schema changes.

### 7.2.3 Derivation
None new — consumes 7.1.

### 7.2.4 Data Layer
Consumes `useArcTab()`.

### 7.2.5 Components
```
app/(tabs)/arc.tsx                    — replaces the Phase 5 placeholder
components/arc/ArcMosaicSection.tsx   — 14-col mosaic + the date/day line
components/arc/MomentumSection.tsx    — headline % + curve
components/arc/LoadSection.tsx        — donut, actual-over-planned centre, per-goal rows
components/arc/StreakStats.tsx        — current / longest pair
```

### 7.2.6 Navigation / Integration
The tab already exists and is already reachable; only its content changes. Pace-summary rows push
to goal detail, exactly as Home's do.

### 7.2.7 Impact on Existing Features
| Item | Note |
|---|---|
| `app/(tabs)/arc.tsx` | The placeholder's honest "lands in Phase 7" copy is replaced by the real screen. |
| `components/goal/GoalRow.tsx` | Second consumer. Its `index` prop already supports the staggered entrance, so the summary list animates like Home's without changes. |

### 7.2.8 What This Phase Does NOT Include
- Sunday Reset (Phase 9), the Finale (Phase 10), Settings (Phase 12).
- Tapping a mosaic cell to see that day — a real idea, but it needs a day-detail surface that
  doesn't exist and isn't designed.
- Comparing arcs. There's only ever one active arc, and history is `arcs.history` (Phase 11's gate).

### 7.2.9 Checklist
- [x] The mosaic is one Skia canvas, 14 columns, and its cell count equals the arc's length (asserted by test; visual check on-device)
- [x] The momentum headline equals the curve's last point
- [ ] Planned vs actual reads truthfully against logged entries — **the phase's done-condition; on-device, pending** (unit-tested, incl. actual exceeding planned)
- [x] The pace summary matches Home's rows exactly for the same goals
- [ ] Rest days are visibly distinct from misses on a real 122-day arc — **on-device, pending**
- [x] `tsc`/`eslint`/`jest` clean (both-theme rendering pending on-device)

**Phase 7 built and statically verified — 2026-09-02. Every phase through 7 is now code-complete; the batched on-device pass is next (`00-index.md` §6).**

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `arcMosaicCells()` | goals, entries, window | `MosaicCellState[]` | rest vs miss, hit/partial/miss shares, future, pre-existence, zero goals |
| `momentumSeries()` | goals, entries, window | `{ series, headline }` | perfect/missed weeks, start clamp, nothing-due days excluded, empty arc |
| `actualLoad()` | goals, entries, range | weekly minutes | skipped ignored, actual > planned allowed, missing estMinutes |

---

## Entitlement Gates

None. `IMPLEMENTATION.md`'s Design Delta #3 is explicit that the mosaic stays free — it's the
signature screenshot, so free users posting it is marketing, not lost revenue. `charts.deep`
(Phase 11) may gate *additional* stats later; it must never gate this screen.

---

## Out of Scope (All Phases Here)

- Any write, including freeze earning (Phase 9).
- Chart scrubbing to reveal values.
- A day-detail surface behind a mosaic cell.
- Cross-arc comparison — post-v1 (`garra-index.md` §13's "lifetime stats").

---

## Implementation Notes

Built 7.1 and 7.2 in one pass. **209 tests across 20 suites**, `tsc --noEmit` and `eslint .`
clean. 28 of those tests are new; all passed on first run except the two deliberate flips
described below.

### The fifth mosaic state

Implemented as approved. Three places changed:

- `MosaicCellState` gains `'rest'`; `theme/tokens.ts` gains `mosaicRest` in both palettes
  (`.09` alpha, against `fill`'s `.05` for future and a stroke for miss).
- `mosaic.ts` now asks `isDueOn()` before calling a day a miss, and `n_per_week`'s non-marker days
  return `'rest'` instead of borrowing `'future'`.
- `01-design-system.md` §4.3 records the amendment and *why* rest is neutral rather than tinted.

**Two existing tests flipped, and that's the point.** Both were written in Phase 3 specifically to
make the four-state gap *provable* rather than accidental — one asserted a non-due day renders
`'miss'`, the other that an `n_per_week` rest day renders `'future'`. Their assertions now expect
`'rest'`, and their comments say they were flipped and by which phase, so nobody reads the change
as someone quietly "fixing" a deliberate call. That's exactly the outcome those tests were for.

Goal detail (Phase 6) inherits the fix for free.

### Deviations from the plan

**`dayCompletion()` is shared between the arc mosaic and the momentum curve.** Both ask the
identical question — how many of a day's goals were due, and how many got logged — so they call
one function. Two implementations of "due today" would have drifted, and the app already has a
third definition to stay consistent with (`useHomeData`'s `isOnTodayList`), which this matches.

**`LoadDonut` gained a `subLabel` prop** rather than hard-coding `PER WEEK`. The Arc tab needs the
centre to read actual-over-planned; defaulting the prop keeps every existing caller unchanged.

**`momentumSeries` reports 1, not 0, for a window where nothing was ever due.** Zero would mean
"you completed none of what was asked", which is false when nothing was asked. Nothing owed,
nothing missed.

**A `useMemo` that lint caught.** `entryRows` was a bare conditional (`goalIds.length === 0 ? [] :
…`), which allocates a fresh array every render and would have made the screen's big memo
recompute on every `useNow` tick — defeating the memo entirely on the one screen that does the
most work per render. Now memoised.

### Decisions worth re-reading

- **Momentum's window clamps to the arc's start.** On day 3 it averages 3 days, not 3-out-of-7.
  Without that, every arc would open by telling the user they were 43% at best — false, and the
  worst possible first impression on a screen whose job is showing progress.
- **A rest day is excluded from momentum, not counted as a zero.** A week with two scheduled rest
  days would otherwise cap at 5/7 no matter how perfectly it went.
- **Actual load is never clamped to planned.** A 3×/week goal logged five times reports 300
  minutes against a 180-minute plan, because that's what happened — and a load screen that capped
  actual would hide exactly the overcommitment it exists to reveal.
- **The donut's segments stay planned**, because a share-of-a-ring means a share of the plan.
  Actual lives in the centre and the rows. A second donut would have been decoration.
- **The pace summary reuses Home's `GoalRow` verbatim.** Same question, same answer, same
  component — and it inherits the staggered entrance from Phase 5.5 for free.

### Still open after this phase

- **The whole batched on-device pass** (`00-index.md` §6) — every phase from 0 to 7 is now
  code-complete and none of it has run on hardware. Phase 5's five-goal 10-second measurement and
  Phase 6's rescope state machine are the two items that are done-conditions rather than checks.
- Sunday Reset (Phase 9) is the next natural build, and `streaks.ts`'s freeze earning is still
  computed-but-never-written.
- Tapping a mosaic cell to see that day — wants a day-detail surface that doesn't exist.
