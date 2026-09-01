# Feature: The Pace Engine
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/04-pace-engine.md`
**Roadmap phase**: Phase 3 (`IMPLEMENTATION.md`)
**Status**: Planned
**Last Updated**: September 2026

---

## Context

This is the product. Every chart built in Phase 2 — the amber gap in `PaceRing`, the deficit
shading in `BurnUp`, the hollow stubs in `WeekBars`, the freeze bank behind `CheckpointSpine`'s
sibling screens — exists to visualize numbers this phase computes. `IMPLEMENTATION.md` calls it
"the one phase where thoroughness beats speed," and `03-state-and-data.md` §4 already specifies
`pace()`'s exact signature — that signature is ported verbatim below, not re-derived.

No UI in this phase. Every function is pure: given plain data and a passed-in `now`, return
plain data. No React, no hooks, no `Date.now()`, no Supabase.

**Designed screens**: none — this phase has no UI. Its outputs feed `PaceRing` (§4.2),
`ArcSweep` (§4.1), `Mosaic` (§4.3), `BurnUp` (§4.4), `WeekBars` (§4.5), and `LoadDonut` (§4.7),
all already built in Phase 2 against fixture data — this phase is what makes their inputs real.

### Two spec gaps found while planning, resolved before writing any code

**`pace_basis: 'custom_weekly'`** is named in `garra-index.md` and `03-state-and-data.md` but
never defined anywhere, and unlike `specific_days` cadence (which has a `days_of_week` column),
there's no schema field to hold a per-weekday distribution. **Resolved with the user**:
`custom_weekly` falls back to `even` behavior for now, with a comment marking it as an
unimplemented spec gap. Revisit if/when a real design for per-weekday-weighted pacing exists.

**No tolerance band is specified between `locked_in` and `on_track`.** The status ladder
(`garra-index.md` §3, "Status ladder") reads as three clean zones — ahead / on pace / behind —
but "on pace" as *exact* equality between `fractionDone` and `fractionExpected` would almost
never occur for continuous real numbers, making `on_track` practically unreachable. This
session's judgment call, flagged here rather than silently baked in: **the on-track band is
±1 day's worth of average required pace** (`1 / totalDays` in fraction terms) — being ahead or
behind by less than roughly a day's pace reads as "on track," more than that tips to
`locked_in` or `slipping`. Lower-stakes than the `custom_weekly` gap since `locked_in` and
`on_track` render visually identical (`01-design-system.md` §0 — only `slipping` gets amber),
so this only affects the status *label*, not any color or chart shape. Easy to retune later.

---

## Thesis Check

- **Fits the finite/pace model?** This *is* the finite/pace model — the whole reason an Arc has
  a real end date is so this math is possible.
- **Derived, not stored?** Every function here is the canonical definition of "derived" —
  nothing in this phase writes to a database, ever.
- **Works offline?** Trivially — pure functions, no I/O of any kind.

---

## Phase Overview

```
Phase 3.1 — pace.ts
  The core function. Exact signature from 03-state-and-data.md §4, ported verbatim.

Phase 3.2 — schedule.ts
  Cadence expansion: is a goal due on a given day, and how many occurrences fall in a range.
  streaks.ts, mosaic.ts, and load.ts all depend on this — built first among the four.

Phase 3.3 — streaks.ts
  Arc streak (forgiving, app-level) and goal streaks (schedule-aware), freeze-consuming.

Phase 3.4 — mosaic.ts
  Day → cell state (future/hit/partial/miss), for the chart built in Phase 2.2.

Phase 3.5 — load.ts
  Weekly/daily hour totals across goals, with the honesty-band framing from garra-index.md §4.6.
```

**After each phase: stop and wait for approval before proceeding.**

---

## Phase 3.1 — pace.ts

### Goal
`pace()` exists exactly as specified in `03-state-and-data.md` §4, is unit-tested against every
required case listed there, and its `fractionDone`/`fractionExpected` output feeds `PaceRing`'s
`p`/`t` props with zero translation needed — the names were chosen to match exactly.

### Before Starting — Confirm With Codebase
- `components/charts/PaceRing.tsx` (Phase 2.1) takes `p`/`t` as plain numbers, 0–1+, and clamps
  internally — confirm `pace()` does **not** need to clamp `fractionDone`/`fractionExpected`
  itself; the chart already handles values over 1 (`03-state-and-data.md` §4's "target already
  exceeded" case is about the chart not overflowing, which Phase 2.1 already verified).
- Re-read `03-state-and-data.md` §4 in full — the signature and required test cases below are
  copied from there, not reinvented.

### 3.1.1 Design
No UI. Consumed by `PaceRing`/`ArcSweep`/`BurnUp` (Phase 2, already built against fixtures).

### 3.1.2 Data Model
None — this phase reads goal/entry data as plain function arguments, not from the database
directly (the data layer that queries SQLite and calls this function is Phase 4+).

### 3.1.3 Derivation

```
lib/derive/pace.ts
```

```ts
export type PaceBasis = 'even' | 'weekdays_only' | 'custom_weekly';
export type PaceStatus = 'locked_in' | 'on_track' | 'slipping' | 'cooked';

export function pace(input: {
  target: number;
  current: number;
  startDate: string;  // 'YYYY-MM-DD' — the arc's start, or the goal's own if it started later
  endDate: string;     // 'YYYY-MM-DD' — goal.ends_at ?? arc.ends_at (04-hooks.md's caller
                        // resolves this before calling; pace() just takes the final date)
  now: Date;
  basis: PaceBasis;
}): {
  expected: number;         // where you should be today
  deficit: number;          // current - expected, signed: negative = behind
  requiredRate: number;     // (target - current) / daysRemaining; Infinity-safe (see 3.1.9)
  fractionDone: number;     // p — current/target, NOT clamped (chart clamps on render)
  fractionExpected: number; // t — NOT clamped
  status: PaceStatus;
}
```

**`fractionExpected` by basis:**
- `even`: `daysElapsed / daysTotal` (both inclusive-day counts, via `date-fns` + `dayKey()`-
  consistent date handling — see 3.1.7)
- `weekdays_only`: `weekdaysElapsed / weekdaysTotal` — weekends contribute zero expected
  progress; a goal on this basis "pauses" over weekends
- `custom_weekly`: same as `even` (see Context — resolved as a deliberate fallback, not a bug)

**Status logic:**
```
daysRemaining = daysTotal - daysElapsed
onTrackBand = 1 / daysTotal   // ±1 day's worth of pace, in fraction terms — see Context

if daysRemaining <= 0 && fractionDone < 1: 'cooked'
else if fractionDone - fractionExpected > onTrackBand: 'locked_in'
else if fractionExpected - fractionDone > onTrackBand: 'slipping'
else: 'on_track'
```

Note this never returns `cooked` for a goal that's still within its window, no matter how far
behind — "mathematically unreachable" here specifically means *time has run out*, not merely
"a very high required rate." A required rate of 40km/day is legitimately alarming but not
literally impossible the way a passed deadline is; `requiredRate` itself carries that alarm
(a very large number), and a later phase (goal detail, Phase 6) is where a "this rate looks
unrealistic" *warning* could layer on top — not this phase's job to guess a plausibility ceiling
with no input to base it on.

**Required test cases**, from `03-state-and-data.md` §4 verbatim, each with an explicit case in
`pace.test.ts`:
- Day 1 (no elapsed time — no divide-by-zero in `fractionExpected` or `requiredRate`)
- The final day, and the day *after* the end date (this is the `cooked` boundary — test both a
  day-after with `fractionDone < 1` → cooked, and a day-after with `fractionDone >= 1` → not
  cooked, target was hit in time)
- A goal whose `ends_at` is before the arc's end (just means `endDate` is earlier — confirm the
  function has no implicit dependency on the *arc's* dates, only the ones passed in)
- A rescoped target mid-arc (confirm `target` is just a number — no special-casing needed, the
  caller passes the *current* target; the rescope's audit trail is a separate concern, Phase 6)
- Backfilled entries changing a past day (confirm `current` being different because of a
  backfill doesn't require anything special — `pace()` only sees the final summed value)
- `weekdays_only` basis: a window spanning at least one full weekend, confirming weekend days
  don't move `fractionExpected`
- `custom_weekly` basis: confirm it produces identical output to `even` given the same inputs
  (the documented fallback)
- A target already exceeded (`fractionDone > 1`) returns that raw value, uncapped
- Mathematically unreachable → `cooked`: `now` past `endDate`, `fractionDone < 1`
- `requiredRate` when `daysRemaining` is 0 or negative: must not divide by zero or return
  `NaN`/`Infinity` in a way that would crash a consumer — return `0` when the goal is already
  cooked or complete (there's no "required rate" once time's up or the target's hit)

### 3.1.4 Data Layer
None — no hooks yet. `useGoalPace()` (the hook wiring this to real SQLite data, per
`04-hooks.md` §2's exact example) is Phase 4+, when there's a real screen to consume it.

### 3.1.5 Components
None.

### 3.1.6 Navigation / Integration
None.

### 3.1.7 Impact on Existing Features
| Item | Note |
|---|---|
| Date handling | Uses `date-fns` + the same `@date-fns/tz` `TZDate` approach as `lib/date.ts` (Phase 1.3) for any timezone-sensitive day counting (`weekdays_only`) — never raw `Date` arithmetic, never `new Date()` inside the function. `startDate`/`endDate` are already-resolved day strings; only `now` needs timezone-aware day-counting logic. |

### 3.1.8 What This Phase Does NOT Include
- Any hook, any UI, any database read.
- A real per-weekday `custom_weekly` implementation (documented fallback to `even`).
- A "this required rate looks unrealistic" warning — not this function's job.

### 3.1.9 Checklist
- [ ] `pace()`'s signature matches `03-state-and-data.md` §4 exactly (field names, types)
- [ ] Every required test case above passes
- [ ] `requiredRate` never returns `NaN` or `Infinity` — explicit test for `daysRemaining <= 0`
- [ ] No `new Date()` inside `pace.ts` — `now` is always the passed-in parameter
- [ ] `tsc --noEmit` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 3.2 — schedule.ts

### Goal
A single source of truth for "is this goal due on day X" and "how many times does this goal's
cadence occur in a date range" — `streaks.ts`, `mosaic.ts`, and `load.ts` all build on this
rather than each re-interpreting `cadence_mode` independently.

### Before Starting — Confirm Phase 3.1 is Approved
- Re-read `05-database.md` §1's `goals` column list for the exact cadence fields:
  `cadence_mode` (`daily`/`n_per_week`/`specific_days`/`every_n_days`), `times_per_week`,
  `days_of_week` (`int[]` remotely, JSON `text` locally per `02-foundation.md`'s Phase 1.4
  notes), `interval_days`.
- **`n_per_week` is fundamentally different from the other three modes**: `daily`,
  `specific_days`, and `every_n_days` can answer "is X due on this exact day" deterministically;
  `n_per_week` cannot — the user picks freely which days to hit their weekly count, so only a
  *weekly* question ("how many were expected/hit this week") is well-defined for it. The API
  below is shaped around that split; don't try to force `n_per_week` into a per-day answer.

### 3.2.1 Design
No UI.

### 3.2.2 Data Model
None — reads `cadence_mode` etc. as plain arguments, matching the Drizzle/Postgres column
shapes already established (Phase 1.4/1.5), but doesn't touch the database directly.

### 3.2.3 Derivation

```
lib/derive/schedule.ts
```

```ts
export type CadenceMode = 'daily' | 'n_per_week' | 'specific_days' | 'every_n_days';

export type CadenceConfig = {
  mode: CadenceMode;
  timesPerWeek?: number;   // required if mode === 'n_per_week'
  daysOfWeek?: number[];   // required if mode === 'specific_days'; 0=Sunday..6=Saturday
  intervalDays?: number;   // required if mode === 'every_n_days'
  anchorDate: string;      // 'YYYY-MM-DD' — the goal's creation date; every_n_days counts from here
};

// Well-defined for daily/specific_days/every_n_days. Throws for n_per_week — callers must
// route n_per_week through weeklyTarget()/occurrencesInRange() instead, never this function;
// throwing (not silently returning a guess) makes a misuse of the API loud immediately.
export function isDueOn(config: CadenceConfig, dayKey: string): boolean;

// Well-defined only for n_per_week (the weekly count target). Returns null for the other three
// modes — they don't have a "times per week" concept distinct from counting due days directly.
export function weeklyTarget(config: CadenceConfig): number | null;

// Well-defined for ALL modes — the expected occurrence count over an inclusive day-key range.
// For daily/specific_days/every_n_days: counts actual due days via isDueOn. For n_per_week:
// prorates (timesPerWeek * rangeDays / 7) — a real number, not rounded, since callers (load.ts)
// need the precise average.
export function occurrencesInRange(config: CadenceConfig, startDayKey: string, endDayKey: string): number;
```

**Required test cases** (`schedule.test.ts`):
- `daily`: every day in a range is due
- `specific_days`: only the configured weekdays are due, across a range spanning multiple weeks
- `every_n_days`: due exactly every N days starting from `anchorDate`, including when the range
  doesn't start exactly on the anchor (offset correctly, not just "day 1, N+1, 2N+1 from range
  start")
- `every_n_days` with `anchorDate` *after* the queried `dayKey` (goal created mid-arc — must not
  crash or return a nonsensical negative-offset result)
- `isDueOn` called with `mode: 'n_per_week'` throws
- `weeklyTarget` returns `null` for `daily`/`specific_days`/`every_n_days`, and the configured
  number for `n_per_week`
- `occurrencesInRange` for `n_per_week` prorates correctly for a partial week (e.g. 3 days of a
  4x/week goal ≈ `4 * 3/7 ≈ 1.71`, not rounded)
- `occurrencesInRange` for `specific_days` matches the exact count `isDueOn` would give if called
  once per day in the range (cross-check between the two code paths)

### 3.2.4 Data Layer
None.

### 3.2.5 Components
None.

### 3.2.6 Navigation / Integration
None.

### 3.2.7 Impact on Existing Features
None — additive, and the first consumer (`streaks.ts`) is the very next sub-phase.

### 3.2.8 What This Phase Does NOT Include
- Reading `goals` rows from SQLite — callers assemble `CadenceConfig` from a row; this module
  only ever sees the plain shape above.
- Any UI for configuring cadence (goal forms) — Phase 4.

### 3.2.9 Checklist
- [ ] All required test cases pass
- [ ] `isDueOn` throws (not silently guesses) for `n_per_week`
- [ ] `occurrencesInRange`'s two code paths (day-counting vs. proration) agree with `isDueOn`
  where both apply
- [ ] `tsc --noEmit` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 3.3 — streaks.ts

### Goal
Both streak levels from `garra-index.md` §4.4 — the forgiving arc-level streak and the
schedule-aware, freeze-consuming goal-level streak — computed correctly, including freeze
auto-consumption on a missed scheduled day.

### Before Starting — Confirm Phase 3.2 is Approved
- Re-read `garra-index.md` §4.4 in full: "Schedule-aware... rest days are not misses,"
  "Freezes: earn 1 per fully-completed week, bank up to 3, auto-applies to a missed scheduled
  day." Both streak levels and the freeze mechanics come directly from there.
- `freezes` table (`05-database.md` §1): `earned_for_week`, `consumed_for_day_key` — this
  phase's freeze logic operates on these two fields conceptually; it does **not** write to the
  table (no I/O in this phase) — it *decides* what a caller should write.

### 3.3.1 Design
No UI.

### 3.3.2 Data Model
None — operates on plain `entries`-shaped input and `CadenceConfig` from 3.2.

### 3.3.3 Derivation

```
lib/derive/streaks.ts
```

```ts
export function arcStreak(input: {
  entryDayKeys: string[];   // every day (any goal) at least one entry was logged, deduped
  now: Date;
  timezone: string;
}): { current: number; longest: number };

export function goalStreak(input: {
  cadence: CadenceConfig;
  entryDayKeys: string[];   // this goal's own logged days only
  freezesAvailable: number; // 0-3, current bank
  now: Date;
  timezone: string;
}): {
  current: number;
  longest: number;
  freezesConsumed: number;      // how many of freezesAvailable this calculation used
  freezesRemaining: number;     // freezesAvailable - freezesConsumed
};
```

**Streak logic**:
- `arcStreak`: walk backward day by day from `dayKey(now, tz)`; a day counts if
  `entryDayKeys` contains it; the streak breaks the first day it doesn't (no schedule-awareness
  — "very forgiving," per the spec, on purpose).
- `goalStreak` for `daily`/`specific_days`/`every_n_days`: walk backward through **due days
  only** (via `isDueOn`, skipping non-due days entirely — they never break or extend the
  streak). A missed due day breaks the streak *unless* a freeze is available, in which case one
  freeze is consumed and the streak continues.
- `goalStreak` for `n_per_week`: streak counts **consecutive weeks where the weekly target was
  met** (using `occurrencesInRange`'s exact-day-counting equivalent — actual entries that week
  vs. `weeklyTarget()`), not days. A week short of target breaks the streak unless a freeze
  covers the shortfall (one freeze covers being short by exactly one session that week — not an
  arbitrary shortfall; this matches "earn 1, consume 1" bank semantics from the spec).

**Required test cases** (`streaks.test.ts`):
- `arcStreak`: unbroken run, a single gap breaking it, today included when today already has an
  entry vs. not yet logged (today not having an entry yet must not itself break the streak —
  the day isn't over)
- `goalStreak` (`specific_days`): a missed non-scheduled day doesn't break the streak; a missed
  *scheduled* day does, when no freeze is available
- `goalStreak` (`specific_days`) with a freeze available: a missed scheduled day consumes one
  freeze and the streak continues; `freezesConsumed` and `freezesRemaining` both correct
  afterward
- `goalStreak` with freezes exhausted (0 available) on a missed scheduled day: streak breaks
- `goalStreak` (`n_per_week`): a week hitting exactly the target extends the streak; a week
  falling one short with a freeze available extends it (freeze consumed); a week falling two or
  more short breaks it even with a freeze available (one freeze ≠ unlimited forgiveness)
- `longest` correctly tracks a broken-then-rebuilt streak (current streak resets, longest does
  not)

### 3.3.4 Data Layer
None.

### 3.3.5 Components
None.

### 3.3.6 Navigation / Integration
None.

### 3.3.7 Impact on Existing Features
None.

### 3.3.8 What This Phase Does NOT Include
- Writing to the `freezes` table (earning/banking/consuming as actual database rows) — this
  phase computes what *should* happen; a mutation hook (Phase 9, Sunday Reset) does the writing.
- Any UI showing streak numbers.

### 3.3.9 Checklist
- [ ] All required test cases pass
- [ ] `arcStreak` never breaks on "today, not yet logged" — only on a genuinely skipped past day
- [ ] Freeze consumption math is exact: never consumes more freezes than `freezesAvailable`,
  never consumes a freeze when the streak wasn't actually at risk
- [ ] `tsc --noEmit` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 3.4 — mosaic.ts

### Goal
Day → cell state, feeding the `Mosaic` chart built in Phase 2.2 with real logic instead of
fixture data — while staying honest about a genuine design gap in how `n_per_week` cadence maps
onto individual daily cells (see below).

### Before Starting — Confirm Phase 3.3 is Approved
- Re-read `01-design-system.md` §4.3 — the Mosaic has exactly four cell states
  (`future`/`hit`/`hit-partial`/`miss`), **no fifth "rest day" or "not scheduled" state**. This
  matters directly for the `n_per_week` handling below.
- `Mosaic.tsx` (Phase 2.1) already takes `cells: MosaicCellState[]` as a prop — this phase's
  output type must match `MosaicCellState` exactly (`'future' | 'hit' | 'partial' | 'miss'`,
  from `components/charts/Mosaic.tsx`).

### 3.4.1 Design
`01-design-system.md` §4.3, already built (Phase 2.2) — this phase only supplies real data.

### 3.4.2 Data Model
None.

### 3.4.3 Derivation

```
lib/derive/mosaic.ts
```

```ts
import type { MosaicCellState } from '@/components/charts/Mosaic';

export function mosaicCells(input: {
  cadence: CadenceConfig | null;  // null for non-schedule-based types (Accumulate/Ship/Milestone)
  entries: { dayKey: string; value: number | null; target?: number }[]; // target present -> partial-vs-full check
  startDate: string;
  totalDays: number;
  now: Date;
  timezone: string;
}): MosaicCellState[];
```

**Cell-state rules**:
- Day index `>= daysElapsed(now)`: `'future'`
- Day has a logged entry: `'hit'` if the value meets/exceeds that day's expected unit (or simply
  "any entry" for binary Habit/Ship logging — see 3.4.7), else `'partial'`
- Day has no entry, day has passed:
  - `daily`/`specific_days`/`every_n_days`, day was due (`isDueOn`): `'miss'`
  - `daily`/`specific_days`/`every_n_days`, day was **not** due: `'miss'` too — **this is the
    documented gap**, see below
  - `cadence === null` (Accumulate/Ship/Milestone, no daily cadence at all): `'miss'` if no
    entry that day, same reasoning
  - `n_per_week`: see below

**The `n_per_week` gap, made explicit rather than silently picked**: the Mosaic has no "rest
day" cell state, so a non-scheduled day for a `specific_days` goal still renders as hollow
`'miss'`-styled — visually indistinguishable from an actually-missed scheduled day, contradicting
`garra-index.md` §4.4's "rest days are not misses." This is a real design gap in the 4-state
model inherited from the canvas, not something this phase can fix by inventing a fifth visual
state Phase 2 didn't build. **Interpretation used here, flagged for reconsideration**: for
`n_per_week` specifically (the cadence where "which days" is genuinely undefined), a day with no
entry only renders `'miss'` if it's the **last day of a completed week where the weekly target
wasn't met** — one miss marker per short week, landing on the week's final day, rather than
guessing which of the 7 days should carry the blame. For `specific_days`/`daily`/`every_n_days`,
non-due days simply render `'miss'` like any other unlogged past day, accepting the visual
inaccuracy the design's 4-state model creates, since there's no cell state to represent "day
wasn't expected." **Flag this to the user before Phase 4+ screens make the mosaic prominent** —
a 5th "not scheduled" cell state may be worth proposing as a design addition once this is
visible on a real screen, rather than guessed at now.

**Required test cases** (`mosaic.test.ts`):
- Future days all render `'future'`, regardless of cadence
- `specific_days`: a due day with an entry renders `'hit'`; a due day without renders `'miss'`
- `specific_days`: a non-due day without an entry renders `'miss'` (the documented gap, tested
  explicitly so it's a visible, intentional assertion — not an accidental behavior someone
  "fixes" later without realizing it was deliberate)
- `n_per_week`: a short week's unlogged days render `'future'` or nothing-special until the
  week actually closes; the week's *last* day renders `'miss'` only if the week ended short
- `n_per_week`: a week that met its target renders no `'miss'` cells that week at all
- A value-based entry below its day's target renders `'partial'`, at or above renders `'hit'`
- `cadence === null` (Accumulate/Ship/Milestone): every past day without an entry is `'miss'`

### 3.4.4 Data Layer
None.

### 3.4.5 Components
None — `components/charts/Mosaic.tsx` already exists (Phase 2.1); this phase only produces its
`cells` prop value.

### 3.4.6 Navigation / Integration
None.

### 3.4.7 Impact on Existing Features
| Item | Note |
|---|---|
| "Hit" vs "partial" for binary (Habit) goals | A Habit goal logged via a plain checkbox (no `session_target`) has no numeric value to compare against a target — any entry that day is `'hit'`, never `'partial'`. Partial only applies when `session_target` (or an Accumulate-style daily expected amount) gives something to fall short of. |

### 3.4.8 What This Phase Does NOT Include
- A fifth "not scheduled" Mosaic cell state — flagged as a design question, not built (would
  require a Phase 2 chart change, out of scope here).
- Reading real entries from SQLite — takes them as a plain array argument.

### 3.4.9 Checklist
- [ ] Output type matches `MosaicCellState` from `components/charts/Mosaic.tsx` exactly
- [ ] All required test cases pass, including the two that explicitly test the documented
  `n_per_week`/non-due-day gap (so it's provably intentional, not accidental)
- [ ] `tsc --noEmit` clean
- [ ] The `n_per_week` mosaic gap is flagged to the user in this phase's completion report

**→ Stop here. Show the result and wait for approval.**

---

## Phase 3.5 — load.ts

### Goal
Weekly and daily hour totals across all goals in an arc, with the "honesty band" framing from
`garra-index.md` §4.6 — feeding `LoadDonut` (Phase 2.1) with real per-goal shares.

### Before Starting — Confirm Phase 3.4 is Approved
- Re-read `garra-index.md` §4.6: "sum `est_minutes × cadence` across all goals... weekly and
  daily totals with an honesty band."
- `LoadDonut` (Phase 2.1) takes `segments: { color: string; hours: number }[]` — this phase's
  per-goal output must map directly to that shape (color comes from the goal's accent, supplied
  by the caller, not this function — `components/charts/geometry.ts`'s own rule: charts/derive
  functions take colors as data, never invent them).

### 3.5.1 Design
`01-design-system.md` §4.7 (LoadDonut), already built — this phase supplies real numbers.

### 3.5.2 Data Model
None.

### 3.5.3 Derivation

```
lib/derive/load.ts
```

```ts
export function loadCheck(input: {
  goals: { id: string; estMinutes: number; cadence: CadenceConfig | null }[];
  // cadence null for Accumulate/Ship/Milestone goals with no weekly cadence concept —
  // they contribute 0 to the load total (garra-index.md's load check is a Habit-goal concept;
  // "sum est_minutes x cadence" only makes sense where cadence exists)
}): {
  weeklyMinutesTotal: number;
  dailyAverageMinutes: number;
  perGoal: { id: string; weeklyMinutes: number }[];
};
```

**Weekly minutes per goal** = `estMinutes * weeklyOccurrences(cadence)`, where
`weeklyOccurrences` is `weeklyTarget(cadence)` directly for `n_per_week`, or
`occurrencesInRange(cadence, <any 7-day window>, ...)` for the day-deterministic modes (both
from `schedule.ts`, reused rather than reimplemented).

**Required test cases** (`load.test.ts`):
- A single `daily` goal: `weeklyMinutes = estMinutes * 7`
- A single `specific_days` goal (e.g. 3 configured days): `weeklyMinutes = estMinutes * 3`
- A single `n_per_week` goal: `weeklyMinutes = estMinutes * timesPerWeek`
- An `every_n_days` goal (e.g. every 3 days): `weeklyMinutes ≈ estMinutes * 7/3`
- A goal with `cadence: null` (Accumulate/Ship/Milestone): contributes 0 to the total
- Multiple goals: `weeklyMinutesTotal` is the exact sum of `perGoal[].weeklyMinutes`
- `dailyAverageMinutes = weeklyMinutesTotal / 7` exactly

### 3.5.4 Data Layer
None.

### 3.5.5 Components
None — `LoadDonut` already exists (Phase 2.1).

### 3.5.6 Navigation / Integration
None.

### 3.5.7 Impact on Existing Features
None.

### 3.5.8 What This Phase Does NOT Include
- The "honesty band" as a specific visual treatment (e.g. a colored range on the load-check
  screen) — that's Phase 4 (Arc Builder's load-check step, screen `09`), which this phase's
  `loadCheck()` output feeds. This phase only computes the numbers.
- Reading goals from SQLite — takes them as a plain array argument.

### 3.5.9 Checklist
- [ ] All required test cases pass
- [ ] `loadCheck()` reuses `schedule.ts`'s functions rather than reimplementing cadence math
- [ ] `tsc --noEmit` clean
- [ ] `00-index.md` §5 Shared Infrastructure updated: all five `lib/derive/` modules listed as
  built, in the same change

**→ Stop here. Phase 3 complete. Report to the user, then wait for Phase 4 go-ahead.**

---

## Data Model Summary (Final State After All Phases)

No schema changes in this phase — every function takes plain data as arguments.

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `pace()` | target, current, dates, now, basis | expected, deficit, requiredRate, fractionDone (p), fractionExpected (t), status | day 1, final day + day after, early `ends_at`, mid-arc rescope, backfill, `weekdays_only`, `custom_weekly` fallback, target exceeded, cooked, requiredRate never NaN/Infinity |
| `isDueOn()` / `weeklyTarget()` / `occurrencesInRange()` | `CadenceConfig`, day/range | boolean / number / number | all four cadence modes, anchor-date offsets, `n_per_week` throws on `isDueOn`, proration for partial weeks |
| `arcStreak()` | entry day keys, now, tz | current, longest | unbroken run, gap, today-not-yet-logged |
| `goalStreak()` | cadence, entry day keys, freezes, now, tz | current, longest, freezes consumed/remaining | schedule-aware skip, freeze consumption, freeze exhaustion, `n_per_week` weekly evaluation |
| `mosaicCells()` | cadence, entries, dates, now, tz | `MosaicCellState[]` | future, hit, partial, miss, the documented `n_per_week`/non-due-day gap |
| `loadCheck()` | goals with cadence + estMinutes | weekly/daily totals, per-goal breakdown | all four cadence modes, null cadence, multi-goal sum |

---

## Entitlement Gates

None. This phase is pure logic with no UI to gate, and `charts.deep` (Phase 1.3's entitlements
stub) governs *screens*, not derivation functions.

---

## Out of Scope (All Phases Here)

- Any hook (`useGoalPace`, `useMosaic`, etc.) wiring these functions to real SQLite data —
  Phase 4+, when there's a screen to consume them.
- A real `custom_weekly` implementation — documented fallback to `even`, resolved with the user.
- A fifth "not scheduled" Mosaic cell state — flagged as a design question for Phase 4+, not
  built here (would require changing the Phase 2 chart's state model).
- Writing freeze earn/consume as actual database rows — Phase 9 (Sunday Reset).
- The load-check screen's visual "honesty band" treatment — Phase 4 (Arc Builder).
