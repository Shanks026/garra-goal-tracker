# Feature: Goal Detail
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/08-goal-detail.md`
**Roadmap phase**: Phase 6 (`IMPLEMENTATION.md`)
**Status**: ✅ Built, statically verified — on-device pass (incl. the rescope state machine) deferred to end of Phase 7
**Last Updated**: 2026-09-02

---

## Context

Home answers "am I going to make it?" in one line per goal. This phase is where the user goes
when that line worries them: the full picture for a single goal, and — critically — the ability
to **change the plan**. `IMPLEMENTATION.md`'s done-condition is a state machine, not a screen:
*"a goal can be driven on-track → slipping → cooked → rescoped, with charts and status tracking
correctly at each step."*

It's also where four things that have been waiting finally land: the Arc rows become pressable
for real, `BurnUp`/`WeekBars`/`Mosaic`/`CheckpointSpine` get their first real data, the
`rescopes` table gets its first writer, and `system.cooked` gets its first — and only sanctioned
— use.

**Designed screens**: `13` Goal detail (Accumulate) · `14` Goal detail (Milestone). Habit and
Ship variants are **not designed**; per `01-design-system.md` §9 they reuse screen 13's structure
exactly (header → identity/value/status → hero chart → required-rate line → mosaic → week bars →
recent), swapping only the hero and the "recent" section's shape. The rescope flow is **not
designed** either and builds on the log-sheet shell, which is what §9 prescribes.

### The one place red is allowed

`01-design-system.md` §9 says `system.cooked` is *"a proposal, not approved. Use it only in the
status pill and the rescope prompt; never as a chart series."* Both of those live in this phase,
so this is where red enters the app — and nowhere else. Phase 5 deliberately rendered `cooked`
neutral on Home for exactly this reason: a Home row is neither of the two sanctioned surfaces.

That asymmetry is intentional and worth keeping: Home stays calm, and the goal you opened
*because* you're worried is the one place the app is allowed to say it plainly.

### What `cooked` actually means here

From Phase 3: `cooked` is **deadline passed and target not reached** — not "very far behind."
A goal needing 40km/day is alarming but not cooked, and `requiredRate` carries that alarm on its
own. So the rescope prompt can't wait for `cooked` to become true, because by then the arc is
over and rescoping is pointless. **Resolution**: the prompt is offered when `status === 'cooked'`
*or* when the required rate has become implausible against the goal's own history — specifically
when `requiredRate` exceeds twice the goal's best actual daily rate so far. That's a heuristic,
flagged as one, and it's the only new judgment call in this phase.

---

## Thesis Check

- **Fits the finite/pace model?** This is the "adjust" in plan → log → see pace → adjust. Without
  rescoping, a slipping goal has only two outcomes — abandonment or a lie — and both end the run.
- **Derived, not stored?** Everything on the screen is computed: the burn-up series, week bars,
  mosaic cells, required rate, streak. The only writes are genuine user input (a rescope's audit
  row, a checkpoint's `hit_at`, a goal's `status`).
- **Works offline?** Every action is a local SQLite write through the same optimistic pattern as
  the log path. Nothing here awaits a network.

---

## Phase Overview

```
Phase 6.1 — The data layer
  useGoalDetail(), the burn-up and week-bar derivations, and the cooked/rescope trigger.
  StatusPill gains its sanctioned cooked variant. No screens.

Phase 6.2 — The screen shell + type-swapped heroes
  app/goal/[id].tsx, screens 13 and 14, plus the Habit and Ship variants that extend 13.

Phase 6.3 — The history sections
  Per-goal mosaic (20-col), this week's bars, and the recent list — including Ship's
  "things you made" list, which is the emotional payoff of a creative goal.

Phase 6.4 — Actions: pause, archive, edit, checkpoint hit
  The ⋯ menu, and the two writes that aren't logs.

Phase 6.5 — The rescope flow
  The sheet, the audit row, and the auto-offer. The done-condition lives here.
```

**After each phase: stop and wait for approval before proceeding.**

---

## Phase 6.1 — The data layer

### Goal
Everything screen 13/14 needs exists as tested, pure data: a cumulative series for the burn-up,
this week's bars, and one hook that assembles a goal's whole picture.

### Before Starting — Confirm With Codebase
- `BurnUp` takes `{ points: [number, number][], win, day, accent }` — **already-computed** points
  in chart coordinates, one per visible day. `WeekBars` takes
  `{ bars: { height, state }[], accent, dayLetters }`. `CheckpointSpine` takes
  `{ checkpoints: { label, meta, status }[], accent }`. `Mosaic` takes `{ cells, accent, columns,
  width }` and the goal-detail variant is **20 columns** (`01-design-system.md` §4.3).
- `lib/derive/progress.ts` already has `currentValue`/`isLoggedOn`/`valueOn`/`loggedCountInRange`;
  `lib/derive/cadence.ts`'s `cadenceForGoal()` is the only legal producer of a `CadenceConfig`.
- `BurnUp`, `WeekBars`, `CheckpointSpine`, and `Mosaic` still call
  `AccessibilityInfo.isReduceMotionEnabled()` and carry no `accessibilityLabel` — Phase 5.5
  migrated only the two charts Home renders. This phase renders all four, so it finishes the job.

### 6.1.1 Design
No UI.

### 6.1.2 Data Model
No schema changes. `rescopes` and `checkpoints` already exist and are finally written to.

### 6.1.3 Derivation

```
lib/derive/series.ts
```

```ts
/** Cumulative total per day across an inclusive day-key range — the burn-up's actual line. */
export function cumulativeSeries(input: {
  entries: ProgressEntry[];
  startKey: string;
  endKey: string;
  startingValue?: number | null;
  /** 'sum' for Accumulate; 'count' for Ship/Habit — mirrors currentValue()'s split. */
  mode: 'sum' | 'count';
}): number[];

/** The 7 bars for the week containing `dayKey`, arc-aligned via the cadence's weekAnchorDate. */
export function weekBars(input: {
  cadence: CadenceConfig | null;
  entries: ProgressEntry[];
  dayKey: string;
  sessionTarget?: number | null;
}): { height: number; state: 'done' | 'missed' | 'none' }[];
```

`weekBars`' three states come straight from `01-design-system.md` §4.5: completed → filled;
**scheduled but missed → a hollow stub** (`state: 'missed'`, which the chart draws as an outline —
"the miss is honest without being an accusation"); not scheduled → height 0, renders as nothing.
Height is the logged value over `sessionTarget`, clamped to [0,1] with a visible floor so a small
value still reads as a bar rather than as nothing; a binary goal's hit is full height.

**Required test cases** (`lib/derive/series.test.ts`):
- `cumulativeSeries` is monotonically non-decreasing, and its last value equals `currentValue()`
  for the same entries — the burn-up must not disagree with the number above it
- `startingValue` offsets the whole series, not just day 1
- A skipped day carries the previous total forward (no dip, no jump)
- A day with no entry repeats the previous value, so the line is flat rather than broken
- `mode: 'count'` counts entries; `mode: 'sum'` sums values, treating null as 0
- `weekBars` returns exactly 7 entries for every cadence
- A `specific_days` non-due day is `'none'` (height 0), a due-and-unlogged past day is
  `'missed'`, a logged day is `'done'`
- **A due day in the future is `'none'`, not `'missed'`** — a Wednesday that hasn't happened yet
  is not a miss, which is the bug this test exists to prevent
- `n_per_week` never marks an individual day `'missed'` (no per-day answer exists), and its
  week window is the arc-aligned one
- A value below `sessionTarget` yields a partial height above the floor; a value at or above it
  yields full height

Also in 6.1: **the rescope trigger**, which is a judgment call and therefore pure and tested:

```ts
// lib/derive/rescope.ts
export function shouldOfferRescope(input: {
  status: PaceStatus;
  requiredRate: number;
  /** Best actual daily rate achieved so far, from the goal's own history. */
  bestDailyRate: number;
}): boolean;

/** The realistic target if the goal continues at its current pace — the sheet's suggestion. */
export function suggestedTarget(input: {
  current: number;
  daysElapsed: number;
  daysTotal: number;
}): number;
```

**Test cases** (`lib/derive/rescope.test.ts`): `cooked` always offers; a goal needing more than
twice its own best rate offers; a goal needing less does not; a goal with no history yet
(`bestDailyRate === 0`) does **not** offer on day one (nothing has been demonstrated to be
implausible against); `suggestedTarget` extrapolates current pace to the full window and never
suggests a target *above* the original.

### 6.1.4 Data Layer

```ts
// hooks/useGoalDetail.ts
export function useGoalDetail(goalId: string): GoalDetail | null;
```

One hook, same reasoning as `useHomeData`: the hero, the burn-up, the mosaic, the week bars, the
recent list, and the status pill are all views of one goal's one dataset. Returns `null` while
loading so no chart receives `NaN`. Composes `cadenceForGoal` → `currentValue` → `pace` →
`cumulativeSeries`/`weekBars`/`mosaicCells`/`goalStreak`, and calls each from the hook rather than
inlining any of it (`04-hooks.md` §6).

Mutations, all following the Phase 5 optimistic pattern:
`useSetGoalStatus()` (pause/resume/archive), `useHitCheckpoint()` (writes `checkpoints.hit_at`),
and `useRescopeGoal()` (6.5 — updates `goals.target_amount` **and** appends a `rescopes` row in
one transaction; the audit trail is the point).

### 6.1.5 Components
`StatusPill` gains `status: 'cooked'` — `system.cooked` text on a low-alpha red ground, the first
and only sanctioned red in the app (`01-design-system.md` §9). Its existing `'slipping'`/
`'neutral'` cases are untouched.

### 6.1.6 Navigation / Integration
None yet.

### 6.1.7 Impact on Existing Features
| Item | Note |
|---|---|
| `BurnUp` / `WeekBars` / `CheckpointSpine` / `Mosaic` | Migrated to `theme/motion.ts`'s presets and given `accessibilityLabel`s, finishing what Phase 5.5 started on the two charts Home renders. |
| `theme/tokens.ts` | Needs a `cookedBg` (low-alpha red) for the pill's ground. `system.cooked` itself already exists. |

### 6.1.8 What This Phase Does NOT Include
- Any screen.
- The rescope *sheet* (6.5) — only its two pure functions.

### 6.1.9 Checklist
- [x] `series.ts` and `rescope.ts` test cases all pass, including the future-due-day case
- [x] `cumulativeSeries`' last value equals `currentValue()` for the same entries
- [x] All four remaining charts use the motion presets and carry `accessibilityLabel`s
- [x] `useGoalDetail` returns `null` while loading; no chart can receive `NaN`
- [x] `tsc --noEmit`, `eslint .`, `jest` clean

**✅ Complete — 2026-09-02.**

---

## Phase 6.2 — The screen shell + type-swapped heroes

### Goal
Tapping any Arc row opens a real goal-detail screen whose hero matches the goal's type.

### Before Starting — Confirm 6.1 is Approved
- Re-read screens 13 and 14 for the exact header (‹ back · arc name 15/500 · ⋯), the identity
  block (`CYCLING · 800 KM` at 11/600/+.16em over a 44/600 value with an 18/500 unit), and the
  status pill's position.
- Re-read `01-design-system.md` §9's instruction for undesigned variants: reuse the designed
  screen's structure *exactly*, swapping only the type-specific block.

### 6.2.1 Design
Screens `13` (Accumulate) and `14` (Milestone) exactly. The two undesigned variants:

| Type | Hero | Value line |
|---|---|---|
| Accumulate | `BurnUp` + required-rate line | `188` / `km` |
| Habit | `PaceRing` (hero size, r:58) + required-rate line | `18` / `of 40 days` |
| Ship | `PaceRing` + the shipped list as its "recent" section | `5` / `of 16 videos` |
| Milestone | `CheckpointSpine` + the two stat columns | `2` / `of 5` |

### 6.2.2 Data Model
No schema changes.

### 6.2.3 Derivation
None new.

### 6.2.4 Data Layer
Consumes `useGoalDetail`.

### 6.2.5 Components
```
app/goal/[id].tsx                    — the route, branching hero by goal.type
components/goal/GoalDetailHeader.tsx — ‹ back · arc name · ⋯
components/goal/GoalIdentity.tsx     — label, value, unit, status pill
components/goal/heroes/              — AccumulateHero, HabitHero, ShipHero, MilestoneHero
```

### 6.2.6 Navigation / Integration
`components/goal/GoalRow.tsx`'s `onPress` — written and deliberately inert since Phase 5.5 —
finally routes to `/goal/[id]`. The screen pushes over the tabs (a pushed screen, not a sheet, per
`02-ui-components.md` §3: it has sub-navigation and content to browse).

### 6.2.7 Impact on Existing Features
| Item | Note |
|---|---|
| `app/(tabs)/index.tsx` | Arc rows become navigable; the comment noting the inert handler comes out. |
| `app/_layout.tsx` | The root `Stack` gains the `goal/[id]` route with a slide transition. |

### 6.2.8 What This Phase Does NOT Include
The history sections (6.3) and every action (6.4/6.5) — the ⋯ menu renders but opens nothing yet,
explicitly commented rather than silently swallowing the tap.

### 6.2.9 Checklist
- [ ] All four types render a correct hero with no dead space where a chart doesn't apply — **on-device, pending**
- [x] The identity block's value matches Home's row for the same goal (both from `pace()`)
- [ ] Back returns to the tab the user came from, not to the cold-start router — **on-device, pending**
- [x] Every target ≥ 44×44; `tsc`/`eslint`/`jest` clean (both-theme rendering pending on-device)

**✅ Complete — 2026-09-02.**

---

## Phase 6.3 — The history sections

### Goal
The bottom two-thirds of screen 13: what actually happened, day by day.

### Before Starting — Confirm 6.2 is Approved
- Goal-detail mosaic is **20 columns** with gap 4 / radius 4 (`§4.3`); the Arc tab's is 14. Don't
  reuse the wrong variant.
- Week bars: `x = 17.4 + i * 48.86`, width 14, rx 7, baseline y=80, and day letters at
  11/600/+.1em in `textQuaternary` (`§4.5`).
- Recent rows are `h42` with a 1px `hairline` bottom border and tabular numerals.

### 6.3.1 Design
Screen 13's `EVERY DAY`, `THIS WEEK`, and `RECENT` sections. Ship's recent list is the one
deliberate divergence: `garra-index.md` §5 calls the list of things you made *"the entire
emotional payoff of a creative goal"*, so for Ship it shows `entries.title` (and `link` when
present) rather than a value column.

### 6.3.2 Data Model
No schema changes.

### 6.3.3 Derivation
None new — consumes 6.1's `weekBars` and the existing `mosaicCells`.

### 6.3.4 Data Layer
Consumes `useGoalDetail`. **Long-pressing a mosaic cell backfills that day**, which is the second
backfill path from `02-ui-components.md` §4 and the one Phase 5 couldn't build (Home has no
mosaic). It routes through the same `useLogEntry` with its 2-day window guard, so an old cell
simply refuses.

### 6.3.5 Components
```
components/goal/GoalMosaicSection.tsx  — 20-col mosaic + long-press backfill
components/goal/GoalWeekSection.tsx    — week bars + day letters
components/goal/GoalRecentList.tsx     — value rows, or Ship's "things you made"
```

### 6.3.6 Navigation / Integration
Long-press opens the log sheet pre-targeted at that day.

### 6.3.7 Impact on Existing Features
| Item | Note |
|---|---|
| `mosaicCells()` | First real render. Its documented 4-state gap (a non-due day looks like a miss) becomes *visible* here — see 6.3.8. |

### 6.3.8 What This Phase Does NOT Include
**A fifth "rest day" mosaic cell state.** Phase 3 flagged that the canvas's 4-state model can't
represent "wasn't due", and said to raise it once a real screen made it visible. This is that
screen — but adding a state means changing the approved chart, so it stays a **design question to
raise, not a change to make quietly**. Recorded here and in the completion report.

### 6.3.9 Checklist
- [x] Mosaic is 20 columns and its cell count equals the goal's own window length
- [x] A future due-day renders as nothing, not as a miss, in both the mosaic and the week bars
- [ ] Long-press backfill works within 2 days and refuses beyond it — **on-device, pending** (the window is enforced in `useLogEntry` and unit-tested)
- [x] Ship's recent list shows titles; every other type shows values, tabular
- [x] `tsc`/`eslint`/`jest` clean (both-theme rendering pending on-device)

**✅ Complete — 2026-09-02.**

---

## Phase 6.4 — Actions: pause, archive, edit, checkpoint hit

### Goal
The ⋯ menu works, and the two non-log writes land: a checkpoint can be hit in one tap, and a goal
can be paused, archived, or edited.

### Before Starting — Confirm 6.3 is Approved
- `02-ui-components.md` §5: destructive confirmations use `Alert.alert` with a `destructive`
  button, and **only** for delete/archive. Pausing is reversible, so it is not confirmed.
- Checkpoint tapping is **1 tap** (`§4`'s table) — no confirm, no sheet.
- `goals.status` is already `'active' | 'paused' | 'archived'`; nothing new is needed to store it.

### 6.4.1 Design
Not designed. The ⋯ menu is an `ActionSheetIOS`-style list on the shared sheet shell (Android has
no native action sheet, so one implementation serves both). Screen 14's `Mark checkpoint hit`
button is designed — `h54`, `fillMed`, 16/600.

### 6.4.2 Data Model
No schema changes.

### 6.4.3 Derivation
None new.

### 6.4.4 Data Layer
`useSetGoalStatus()` and `useHitCheckpoint()` from 6.1. Edit reuses
`app/arc-builder/goal-form.tsx` in an edit mode: it takes an optional `goalId`, prefills from the
row, and calls a new `useUpdateGoal()` instead of `useAddGoalToDraft()`. Reusing the form is the
point — a second form for editing would drift from the creating one within two phases.

**A paused goal leaves the Today list but stays in The Arc**, greyed: it's still part of the run's
trajectory, just not today's work. An archived goal leaves both.

### 6.4.5 Components
```
sheets/GoalActionsSheet.tsx  — Edit · Rescope · Pause/Resume · Archive
```

### 6.4.6 Navigation / Integration
`useHomeData` filters on `status === 'active'` already, so pausing removes a goal from Today with
no extra wiring. The Arc rows need the paused case added.

### 6.4.7 Impact on Existing Features
| Item | Note |
|---|---|
| `app/arc-builder/goal-form.tsx` | Gains edit mode. Its accent picker must exclude *other* goals' accents but allow the goal's own. |
| `useHomeData` | Arc rows include paused goals, rendered muted; Today excludes them. |

### 6.4.8 What This Phase Does NOT Include
- Deleting a goal outright — archive is the reversible, audit-preserving equivalent, and
  `entries` cascade on a real delete (Phase 5.0 wired the cascade, but nothing should exercise it
  casually).
- Reordering goals, changing a goal's type after creation.

### 6.4.9 Checklist
- [ ] A checkpoint is hit in exactly one tap, with the spine's `current` node advancing — **on-device, pending**
- [x] Pause is not confirmed; archive is, with a `destructive` Alert
- [x] A paused goal disappears from Today and renders muted in The Arc
- [x] Edit prefills every field for all four types and writes through `useUpdateGoal`
- [x] Editing a goal's accent can't collide with another goal's (rules/01 §1)
- [x] `tsc`/`eslint`/`jest` clean (both-theme rendering pending on-device)

**✅ Complete — 2026-09-02.**

---

## Phase 6.5 — The rescope flow

### Goal
The phase's done-condition: a goal can be driven on-track → slipping → cooked → rescoped, with
every chart and status following correctly, and the rescope leaving an audit trail.

### Before Starting — Confirm 6.4 is Approved
- `garra-index.md` §7.6 has the exact tone: *"800 km by Dec 31 isn't happening — you'd need
  24 km/day. That's fine. What's real?"* with **Suggested (current pace) · Custom · Keep it
  anyway**. That last option matters: the app never forces a rescope.
- `rescopes` is **append-only** (`05-database.md` §1) — `from_target`, `to_target`, `reason`.
  Never update or delete a row; the history of what changed and when is the feature.
- `01-design-system.md` §9 permits `system.cooked` in the rescope prompt. This and the status pill
  are its only two homes.

### 6.5.1 Design
Not designed. Built on the log-sheet shell (§9's instruction), reusing `Chip` for the three
choices, with the amber/red framing coming only from the status the goal is actually in.

### 6.5.2 Data Model
No schema changes — `rescopes` has been waiting since Phase 1.5.

### 6.5.3 Derivation
None new — consumes 6.1's `shouldOfferRescope` and `suggestedTarget`.

### 6.5.4 Data Layer
`useRescopeGoal()`: updates `goals.target_amount` and inserts the `rescopes` row **in one
transaction**, so a target can never change without its audit row. Optimistic, like every other
mutation, and invalidating by prefix so Home's row and the detail screen both re-derive.

### 6.5.5 Components
```
sheets/RescopeSheet.tsx
```

### 6.5.6 Navigation / Integration
Auto-offered when `shouldOfferRescope()` is true and the user opens the goal — **offered, never
forced, and never more than once per session per goal** (a prompt that reappears on every visit
becomes a nag, and the nag is what makes people delete habit apps). Also always reachable from the
⋯ menu.

### 6.5.7 Impact on Existing Features
| Item | Note |
|---|---|
| `pace()` | Nothing changes — it already takes `target` as a plain number, so a rescoped goal just re-derives. Phase 3 tested exactly this case ("a rescoped target mid-arc"). |
| Home | A rescope changes the row's deficit and status immediately via prefix invalidation. |

### 6.5.8 What This Phase Does NOT Include
- Rescoping the **arc's** dates (that's an arc-level edit — Phase 12's settings).
- Un-rescoping. The audit row records what happened; reverting is just another rescope.
- Rescoping a Milestone goal's checkpoint list — that's Edit, not rescope.

### 6.5.9 Checklist
- [x] A rescope writes both the new `target_amount` **and** a `rescopes` row, or neither
- [x] "Keep it anyway" writes nothing at all
- [ ] The prompt appears at most once per session per goal, and never blocks the screen — **on-device, pending**
- [ ] **The full state machine, driven by hand: on-track → slipping → cooked → rescoped**, with
  the ring, burn-up, status pill, and required rate all correct at each step
- [x] `system.cooked` appears in exactly two places in the whole app: the status pill and this sheet
- [x] `tsc`/`eslint`/`jest` clean (both-theme rendering pending on-device)

**Phase 6 built and statically verified — 2026-09-02. The state-machine walkthrough and the rest of on-device verification run with everything else after Phase 7.**

---

## Data Model Summary (Final State After All Phases)

No schema changes. Three tables get their first writer:

```
goals      — status transitions to 'paused'/'archived'; target_amount changes on rescope
checkpoints — hit_at set when a checkpoint is tapped
rescopes    — append-only audit: from_target, to_target, reason
```

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `cumulativeSeries()` | entries, range, mode | number[] | monotonic, agrees with `currentValue()`, skipped days, gaps, startingValue |
| `weekBars()` | cadence, entries, day | 7 × {height, state} | all cadences, future due-days are not misses, partial heights, `n_per_week` |
| `shouldOfferRescope()` | status, requiredRate, bestDailyRate | boolean | cooked always, 2× heuristic, no history on day one |
| `suggestedTarget()` | current, daysElapsed, daysTotal | number | extrapolates current pace, never exceeds the original target |

---

## Entitlement Gates

None in this phase. `IMPLEMENTATION.md`'s Design Delta #3 keeps the pace ring and burn-up free
on purpose — gating the thesis leaves a free tier with nothing to convert on. `charts.deep`
(Phase 11) may gate *additional* stats later; it must never gate this screen's core.

---

## Out of Scope (All Phases Here)

- **A fifth "rest day" mosaic cell state** — the design question this screen finally makes
  visible (6.3.8). Raise it; don't quietly change an approved chart.
- The Arc tab (Phase 7), Sunday Reset (Phase 9), the Finale (Phase 10).
- Deleting goals; reordering; changing a goal's type after creation.
- Arc-level editing (dates, title) — Phase 12.
- Freeze earning/consumption — `streaks.ts` computes it, Phase 9 writes it.

---

## Implementation Notes

Built 6.1–6.5 in one pass. **181 tests across 18 suites**, `tsc --noEmit` and `eslint .` clean.
29 of those tests are new and all passed on their first run.

### Deviations from the plan

**`useGoalRow()` was added alongside `useGoalDetail()`.** The goal form's edit mode needs the raw
row to prefill from, and running the whole detail hook (burn-up series, mosaic, week bars) just to
read six fields would be waste.

**Edit mode routes a target change through `useRescopeGoal()`, not the plain update.** This wasn't
in the plan and is the more important half of the decision: if Edit could change `target_amount`
directly, a target could move with no `rescopes` row, and the audit trail — which is the whole
point of that table — would silently be a lie. So the form updates everything *except* the target
via `useUpdateGoal`, and diverts a changed target to the rescope mutation with `reason: 'edited'`.

**The mosaic's long-press targets are a transparent grid layered over the canvas.** The mosaic is
deliberately one Skia canvas for performance (rules/01 §4.3 — 122 Views would jank the scroll), so
per-cell components aren't available to attach a gesture to. An absolutely-positioned grid of
empty `Pressable`s sits on top instead.

**`weekStartFor()` falls back to a Sunday-anchored week when a goal has no cadence.** Without a
cadence there's no arc anchor to align to, and Sunday matches how weekdays are numbered
everywhere else in the codebase (0 = Sunday).

### Decisions worth re-reading

- **Red now exists in exactly two places**, both sanctioned by `01-design-system.md` §9: the
  status pill's `cooked` variant and the rescope sheet. Home still renders cooked *neutral* — the
  asymmetry is deliberate, so the calm screen stays calm and the screen you opened *because*
  you're worried is the one allowed to say it plainly.
- **The rescope offer is a heuristic and is labelled as one.** `cooked` alone is too late (by
  definition the deadline has passed), so the offer also fires when the required rate exceeds
  **twice the goal's own best day**. Using the goal's own history rather than an absolute
  threshold is what makes it work for both a 5km/day cyclist and a 50km/day one. A goal with no
  history never triggers it — on day one nothing has been demonstrated to be implausible against.
- **`suggestedTarget()` never suggests aiming higher.** A flow that exists to make a plan
  achievable shouldn't tell a slipping user to raise their target, so the original is the ceiling
  and the current total is the floor.
- **Pause keeps a goal in The Arc but drops it from Today.** It's still part of the run's
  trajectory, just not today's work. Archive removes it from both.
- **Archive confirms, pause doesn't** (rules/02 §5) — one is reversible and one is not.

### The design question this phase surfaces

**The mosaic's missing fifth cell state.** Phase 3 flagged that the canvas's four states
(`future`/`hit`/`partial`/`miss`) can't represent "wasn't due", and said to raise it once a real
screen made it visible. This is that screen: a `specific_days` goal's Tuesday now renders as a
hollow miss-styled cell on goal detail even though Tuesday was never expected.

Adding a fifth state means changing an approved chart, so it is **not** being done quietly. The
options, for a real decision:

1. Add a `'rest'` state — a flat `fill`-colored cell with no stroke, visually quieter than `miss`.
   Cleanest, but touches the canvas's approved spec.
2. Render non-due days as `'future'` (which `mosaic.ts` already does for `n_per_week`). Consistent
   with existing behaviour and needs no chart change, but makes a past rest day look identical to
   a day that hasn't happened.
3. Leave it. Honest for `daily` goals, misleading for `specific_days` ones.

Recommendation is (1), because the mosaic is the app's signature screenshot and "hollow cell" is
currently overloaded to mean both *missed* and *never asked for*.

### Still open after this phase

- The Arc tab (Phase 7) — the last screen before the on-device pass.
- Ship metadata capture on the log path (`capture_title`/`capture_link` are schema columns with no
  UI yet); the detail screen already *displays* titles.
- Deleting a goal outright; reordering; changing a goal's type after creation.
- Arc-level editing (title, dates) — Phase 12's settings.
