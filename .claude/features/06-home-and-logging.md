# Feature: Home & Logging
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/06-home-and-logging.md`
**Roadmap phase**: Phase 5 (`IMPLEMENTATION.md`) — ⭐ "the phase the app lives or dies on"
**Status**: Planned
**Last Updated**: 2026-09-01

---

## Context

Phase 4 gets a user to a live Arc. This phase is the loop they come back to every day: see where
they stand, log the day, and know whether they'll make it. `IMPLEMENTATION.md` marks it the
starred phase and sets a **measured** done-condition — "a five-goal day logs in under 10 seconds,
timed with a stopwatch, in airplane mode" — not a subjective one.

It is also the first phase where the pace engine (Phase 3) and the chart set (Phase 2) meet real
data. `pace.ts`, `streaks.ts`, `PaceRing`, and `ArcSweep` have never had a single real caller;
Home is where every one of them gets wired at once.

**Designed screens**: `10` Home (dark) · `11` Home (light) · `12` Log sheet. The tab bar appears
in both Home screens. Not designed, and explicitly deferred rather than invented: the Arc tab
(Phase 7) and Settings (Phase 12) — this phase ships them as minimal placeholder routes so the
three-tab structure is real, per `IMPLEMENTATION.md`'s Phase 5 bullet "Tab bar: Today · Arc ·
Settings".

### What a pre-phase audit of Phases 1–4 turned up

Before planning, the previous four phases' code was audited against their own docs. The findings
that **this phase depends on** are folded into Phase 5.0 below rather than discovered mid-build.
The ones that don't block Phase 5 are listed in Out of Scope with a pointer to where they belong.

Two of the findings are genuine correctness bugs in shipped code, and one is a schema gap of
exactly the same shape as the missing `goals.title` column found during Phase 4:

**The cadence anchor is wrong, and Phase 5 would have multiplied it by three.**
`lib/derive/schedule.ts`'s `CadenceConfig.anchorDate` is required, and drives two different
things: `every_n_days` due-day math, and the week windowing that `n_per_week` streaks and mosaic
cells depend on. The `goals` table stores no anchor, so the codebase's only derivation is
`hooks/useArcBuilder.ts`'s `anchorDate: g.createdAt.slice(0, 10)`. That is wrong twice over:

1. `createdAt` defaults to SQLite's `(current_timestamp)`, which is **UTC** — slicing 10
   characters yields a UTC calendar date, not a `dayKey()` (04:00-local) day. A goal created at
   23:00 in a negative-offset timezone anchors to *tomorrow*, and `dayKey()` currently has no
   caller anywhere outside `lib/derive/` and its own tests.
2. Anchoring `n_per_week` weeks to each goal's creation weekday means no two goals in an arc
   share week boundaries, and none align with the arc-level mosaic grid Phase 7 draws.

`useDraftLoadCheck` is the only caller today. Home needs the identical goal-row → `CadenceConfig`
mapping for `pace`, `goalStreak`, **and** `mosaicCells` — so the fix has to land before three
copies of it exist. See Phase 5.0 for the resolution (a real `goals.starts_at` column, a shared
`cadenceForGoal()`, and split anchor semantics).

**`pace()` has no `basis` to read.** Its `basis` parameter is required, but no creation path in
`lib/intents.ts` or `app/arc-builder/goal-form.tsx` ever sets `paceBasis`. Same for `quickAdd`,
which is the *only* data source for the Log sheet's quick-add chips (`02-ui-components.md` §4),
and for `startingValue`.

**There is no optimistic mutation in the repo to copy.** `05-onboarding-arc-creation.md`'s
checklist claims every Phase 4 mutation "follows `04-hooks.md` §3 exactly (optimistic, prefix
invalidation)" — it doesn't: `useArcBuilder.ts`'s mutations have only `onSettled` invalidation,
with no `onMutate`, no optimistic cache patch, no `onError` rollback, and no haptic. That box was
checked in error and is corrected as part of this phase. It matters here because Phase 5's log
path is *required* to be optimistic — the optimistic patch **is** the user's feedback
(`04-hooks.md` §3: "Never show a spinner on a log").

---

## Thesis Check

- **Fits the finite/pace model?** This is the loop the whole product exists to serve: Home shows
  execution (Today) and trajectory (The Arc) on one screen, and `IMPLEMENTATION.md` §7.3 calls
  that pairing the thing almost every habit app omits.
- **Derived, not stored?** Every number on Home is computed at read time from `entries` — day
  counter, per-goal `current`, pace, status, hit ratios. This phase adds exactly one new pure
  derivation module (`lib/derive/progress.ts`) and **no** stored totals. The one schema addition
  (`goals.starts_at`) is input data, not a derived value.
- **Works offline?** Mandatory, and it's the done-condition: the 10-second measurement is taken
  *in airplane mode*. Every log writes SQLite and returns; nothing awaits a network call, and
  `lib/sync/` still does not exist (Phase 8).

---

## Phase Overview

```
Phase 5.0 — Foundation repairs
  The audit findings Phase 5 depends on: goals.starts_at, a shared cadenceForGoal() with
  correct anchor semantics, paceBasis/quickAdd defaults, updatedAt on every write, and the
  first genuinely optimistic mutation pattern. No new screens.

Phase 5.1 — The data layer
  useNow(), lib/derive/progress.ts, the entries mutations (log/undo/skip), the Today and
  Arc query hooks, and the Zustand toast store. Still no screens.

Phase 5.2 — Tab bar + Home hero
  app/(tabs)/ with three real tabs, and Home's arc sweep + day counter (screens 10/11).

Phase 5.3 — Today list + one-tap logging
  TodayRow, Mains above the divider, binary log in a single tap with haptic and undo toast.

Phase 5.4 — The Log sheet + Log everything
  Screen 12: the sheet provider pattern, custom numpad, quick-add chips, auto-dismiss.

Phase 5.5 — The Arc rows
  Per-goal pace rings, value column, status label — the trajectory half of the screen.

Phase 5.6 — Skip, backfill, and the stopwatch
  Swipe-left skip with reason, the pre-10:00 Yesterday row, and the measured 10-second
  five-goal verification in airplane mode that closes the phase.
```

**After each phase: stop and wait for approval before proceeding.**

---

## Phase 5.0 — Foundation repairs

### Goal
Everything Home is about to read is correct and consistent before a single pixel depends on it:
goals know when they started, cadence math has one shared derivation with defensible anchor
semantics, `pace()` has a `basis`, the Log sheet has quick-add data, local rows maintain
`updated_at`, and there is one real optimistic mutation in the repo to pattern the log path on.

### Before Starting — Confirm With Codebase
- Re-read `hooks/useArcBuilder.ts` in full — every mutation in it changes in this sub-phase
  (`updatedAt`, and the `onMutate`/`onError` shape from `04-hooks.md` §3).
- Re-read `lib/derive/schedule.ts`'s `CadenceConfig` and both its consumers (`streaks.ts`,
  `mosaic.ts`) before changing the type — `occurrencesInRange`/`isDueOn` are used by
  `load.ts` too, and all four modules' tests must stay green.
- Confirm `lib/date.ts`'s `dayKey(d, tz)` signature and that `arcs.timezone` is populated by
  Phase 4's `useSetArcWindow` (it is — `deviceTimezone()`), since the anchor fix needs both.
- Confirm `goals.endsAt` exists and `goals.startsAt` does **not** (verified during planning).

### 5.0.1 Design
No UI.

### 5.0.2 Data Model

One new nullable column, mirroring the existing `ends_at` release valve.

```ts
// lib/db/schema.ts — goals, add alongside endsAt
startsAt: text('starts_at'), // date, nullable — null means "the arc's start"
```

**Why a column and not a derivation**: `03-state-and-data.md` §4 already specifies `pace()`'s
`startDate` as "the arc's start, or the goal's own if it started later", and a goal added on day
40 of a 122-day arc must not be judged against 122 days of expected pace. `created_at` cannot
stand in for it — it is a UTC timestamp of a *row insert*, not a domain date, and a goal drafted
before the arc window is even set would anchor to a day outside the arc entirely. This is input
data (when does this commitment begin), so it gets a column, exactly like `ends_at`.

Generate and commit the Drizzle migration. **Supabase SQL** (the durable record; apply via MCP):

```sql
ALTER TABLE public.goals ADD COLUMN starts_at date;
```

Nullable, so no default/backfill dance is needed and existing rows keep meaning "starts with the
arc". Update `00-index.md` §4's `goals` table and the Applied Migrations log in the same change.

### 5.0.3 Derivation

**`lib/derive/schedule.ts` — split the two anchor meanings.** `CadenceConfig` gains one field so
the two things `anchorDate` was doing stop fighting each other:

```ts
export type CadenceConfig = {
  mode: CadenceMode;
  timesPerWeek?: number;
  daysOfWeek?: number[];
  intervalDays?: number;
  /** 'YYYY-MM-DD' — where every_n_days counts from: the goal's own start day. */
  anchorDate: string;
  /** 'YYYY-MM-DD' — where n_per_week's week boundaries fall. Defaults to anchorDate when
      absent, preserving current behaviour for callers that don't set it. */
  weekAnchorDate?: string;
};
```

`every_n_days` keeps counting from the goal's own start (a goal added on day 40 with a 3-day
interval is due on day 40, 43, 46 — not on a grid inherited from the arc). `n_per_week`'s week
windowing in `streaks.ts` and `mosaic.ts` switches to `weekAnchorDate`, which callers set to the
**arc's** `starts_at` — so every goal in an arc shares week boundaries, and those boundaries line
up with the arc-level mosaic Phase 7 draws. Making it optional with an `anchorDate` fallback means
`load.ts` and every existing test keep working untouched.

**New: `hooks/useCadenceForGoal.ts` is *not* where this goes** — the goal-row → `CadenceConfig`
mapping is pure, so it belongs in the derivation layer:

```ts
// lib/derive/cadence.ts
export function cadenceForGoal(
  goal: {
    cadenceMode: string | null; timesPerWeek: number | null;
    daysOfWeek: number[] | null; intervalDays: number | null;
    startsAt: string | null; createdAt: string;
  },
  arc: { startsAt: string; timezone: string },
): CadenceConfig | null;
```

Returns `null` when `cadenceMode` is null (Accumulate/Ship goals with no cadence — `loadCheck`
already treats that as contributing zero). Resolves `anchorDate` as
`goal.startsAt ?? dayKey(new Date(goal.createdAt + 'Z'), arc.timezone)` — going through `dayKey()`
so the 04:00 rollover applies, instead of the current raw UTC slice — clamped to be no earlier
than `arc.startsAt`. Sets `weekAnchorDate` to `arc.startsAt` unconditionally.

**Required test cases** (`lib/derive/cadence.test.ts`):
- A goal with an explicit `startsAt` uses it verbatim as `anchorDate`
- A goal with `startsAt: null` falls back to its `createdAt`, converted through `dayKey()` — with
  an explicit case for a 23:00 UTC `createdAt` in a negative-offset timezone proving it does
  **not** land on the following day the way the old `.slice(0, 10)` did
- A goal whose resolved anchor precedes `arc.startsAt` is clamped to `arc.startsAt`
- `weekAnchorDate` always equals `arc.startsAt`, regardless of the goal's own anchor
- `cadenceMode: null` returns `null`, not a config with an invalid mode

**`lib/derive/streaks.ts` / `mosaic.ts`**: use `weekAnchorDate ?? anchorDate` for week windowing.
Add one test each proving two goals with different creation days but the same arc produce
**aligned** week boundaries.

**`MosaicCellState` moves into the derivation layer.** `lib/derive/mosaic.ts` currently imports
its own return type from `@/components/charts/Mosaic` — a module that imports Skia. It only
survives Jest because it's an `import type` (standing rule #14), and `06-conventions.md` §1 puts
domain types next to their derivation. Move the type to `lib/derive/mosaic.ts` and have
`components/charts/Mosaic.tsx` re-export it for existing consumers, so no call site breaks.

### 5.0.4 Data Layer

**Every mutation in `hooks/useArcBuilder.ts` gets the `04-hooks.md` §3 treatment it was already
documented as having**: an `onMutate` that patches the relevant `qk` entry optimistically, an
`onError` that rolls the patch back, `onSettled` prefix invalidation (already present), and
`updatedAt: new Date().toISOString()` set explicitly on every `db.update()` — SQLite has no
`moddatetime` trigger, and a frozen `updated_at` makes Phase 8's last-write-wins sync impossible.

`useAddGoalToDraft` additionally:
- writes `startsAt` (the new column), defaulting to the arc's `startsAt`
- writes `paceBasis: 'even'` for Accumulate goals (the only basis fully implemented — see
  `04-pace-engine.md`'s `custom_weekly` note)
- writes a `quickAdd` triple, supplied by `lib/intents.ts` for recommended goals and defaulted
  from the target for manual ones (see 5.0.7)

### 5.0.5 Components
Two small fixes, both rule violations the audit verified:

- **`accessibilityLabel` on `PaceRing` and `ArcSweep`.** `02-ui-components.md` §8 is explicit
  ("A ring with no label is unusable on VoiceOver"), no chart currently has one, and 5.5 puts a
  `PaceRing` on every Home row. Both take an optional `accessibilityLabel` prop the caller
  supplies in words — e.g. *"Cycling, 188 of 800 kilometres, 35 behind pace"* — rendered on the
  wrapping `View`. The remaining seven charts get theirs in the phase that first puts them on a
  real screen; this phase does not retrofit charts it doesn't use.
- **`Checkbox`'s check glyph** is drawn in `tokens.bg` for both themes; `01-design-system.md` §5
  specifies `#FFFFFF` on light (light `bg` is `#FAFAF9`). One-line fix in `Checkbox.tsx`.

### 5.0.6 Navigation / Integration
None.

### 5.0.7 Impact on Existing Features
| Item | Note |
|---|---|
| `lib/intents.ts` | Each template gains `quickAdd?: number[]` and `paceBasis?` where the type warrants one (Accumulate). Cycling's is the canvas's own `+5 / +10 / +25`; the rest are sized from the proposed target. Its existing tests get one case asserting every Accumulate proposal carries both. |
| `app/arc-builder/goal-form.tsx` | Sets `paceBasis: 'even'` and a computed `quickAdd` for Accumulate; validates the `type` route param against the four known values and renders a plain error state instead of inserting an invalid `goals.type` (audit finding — SQLite has no CHECK constraint from Drizzle's enum, so a bad param corrupts the row silently). |
| `app/arc-builder/goal-form.tsx` (accent race) | `defaultAccent` is computed from `usedAccents` while that query is still loading, then frozen into `useState` — so the manual form can submit an accent another goal already owns, breaking `01-design-system.md` §1. Fixed by initialising the accent only once `useGoalsForArc` has resolved. |
| `lib/copy.ts` | Currently has **zero importers** — `app/(onboarding)/welcome.tsx` and `name.tsx` hardcode "Arc", "Sunday Reset", and "Finale", violating `01-design-system.md` §8 ("all slang strings live in `lib/copy.ts`"). Those call sites are switched over, and this phase's own strings (Today, The Arc, Log everything, skip reasons, undo) are added there rather than inline. |
| `00-index.md` | §4 gains `local_profile` (currently absent from the Schema Reference entirely) and the `goals.starts_at` row; §5's stale "51 tests / 73 total" becomes the real count; the `ON DELETE CASCADE` claim is corrected (local FKs are `no action` and no `PRAGMA foreign_keys` is set) and the local/remote `rescopes.updated_at` divergence recorded. `hooks/useSheetBackHandler.ts`'s comment citing the long-deleted `app/smoke.tsx` is repointed. |
| `02-foundation.md` / `05-onboarding-arc-creation.md` | Two checklist boxes that are not true get unchecked with a one-line note: Phase 1's "no hex literal outside `theme/tokens.ts`" (`app.config.ts`, the chart fixtures, and `geometry.test.ts` all carry hexes) and Phase 4's optimistic-mutation claim. A checked box that isn't true is worse than an unchecked one. |

### 5.0.8 Also fixed here — every remaining audit bug

Per the user's instruction to fix all the important bugs before Phase 5 proper, 5.0 also closes
the onboarding-flow and structural findings that were originally deferred:

| Bug | Fix |
|---|---|
| **Duplicate goals on back-navigation.** Recommended inserts every accepted proposal, then Load Check's "Trim something" is `router.back()` — returning with "Start the arc" still live, so tapping it re-inserts all of them. | `useAddGoalToDraft` gets an idempotency guard (a goal with the same `arcId` + `title` is not inserted twice), and Recommended tracks which proposals it has already committed. |
| **The manual path dead-ends.** `goal-type` → `goal-form` → `router.back()`, and nothing routes onward to Load Check, so a user resumed into `goal-type` must kill the app to progress. | `goal-form` returns to wherever it was entered from, and the builder gains an explicit "Done adding" path to Load Check so the manual route reaches the end of the flow. |
| **`router.back()` with nothing to pop.** Both Load Check and Window are reachable via `router.replace` from the cold-start router, where the history is empty. | A `safeBack(router, fallback)` helper in `lib/navigation.ts`: `router.back()` when `router.canGoBack()`, else `router.replace(fallback)`. |
| **Duplicate accent through the manual form.** `defaultAccent` is computed while `useGoalsForArc` is still loading and frozen into `useState`, so the form can submit an accent another goal owns. | The accent initialises only once the goals query resolves; `AccentPicker` no longer exempts the current value from the disabled set when it collides. |
| **Displayed accent ≠ stored accent.** Recommended colors each proposal's dot by array index; the mutation assigns the next *unused* accent over accepted goals only, so deselecting a middle proposal makes the dots lie. | The preview computes accents with the same next-unused-over-accepted logic the mutation uses, from a single shared helper. |
| **Unvalidated route param.** `goal-form` takes `type` straight from `useLocalSearchParams` and would insert an invalid `goals.type` (SQLite has no CHECK constraint from Drizzle's enum). | Validated against the four known types, with a plain error state instead of a corrupt row. |
| **Step-label drift.** "STEP 1 OF 4" → "2 OF 4" → "3 OF 4" → **"STEP 3 OF 3"** → "STEP 4 OF 4", with `StepDots` always `total={5}`. | One source of truth for the step sequence, so labels and dots agree along the real path. |
| **`rescopes` diverges local vs remote.** Remote has `updated_at`; local doesn't — and LWW sync keys on it (`05-database.md` §3 requires structural identity). | `updatedAt` added to the local `rescopes` table in the same migration as `goals.starts_at`. |
| **No FK cascade or enforcement locally.** Remote cascades on every child FK; local FKs are `no action`, and `PRAGMA foreign_keys` is never enabled, so SQLite isn't enforcing them at all. | `onDelete: 'cascade'` on every child FK in the Drizzle schema, and `PRAGMA foreign_keys = ON` in `lib/db/client.ts`. Done now, while the tables are near-empty, rather than during Phase 6's deletes. |
| **Day buckets bypass the 04:00 rollover.** `recommended.tsx` and `window.tsx` build the arc's `starts_at`/`ends_at` with `format(new Date(), 'yyyy-MM-dd')` — device-local midnight, not `dayKey()`. `dayKey()` has no caller outside `lib/derive/` and its tests. | Two pure helpers in `lib/date.ts` — `todayKey(now, tz)` and `addDaysToKey(key, n)` — used by both screens, so every day bucket in the app goes through the rollover. |
| **Hex literals outside `theme/tokens.ts`.** `app.config.ts`, `components/charts/__fixtures__/chartFixtures.ts`, `components/charts/geometry.test.ts`. | All three import from `theme/tokens.ts` (`app.config.ts` via the same `tsx/cjs/api` require that `tailwind.config.js` already uses). |
| **`useSheetBackHandler`'s comment cites the deleted `app/smoke.tsx`.** | Repointed at the real reference. |

### 5.0.9 What This Phase Does NOT Include
- A `lib/sync/` outbox, or enqueuing anything to `sync_queue` — Phase 8.
- Retrofitting `accessibilityLabel` onto the seven charts this phase doesn't render.

### 5.0.10 Checklist
- [x] `goals.starts_at` exists locally (Drizzle migration `0003`) and remotely
  (`add_goals_starts_at` via MCP), and `00-index.md` §4 + Applied Migrations record both
- [x] `cadenceForGoal()`'s required test cases pass, including the 23:00-negative-offset case
  that proves the old UTC slice was wrong
- [x] `streaks.ts` and `mosaic.ts` week boundaries are arc-aligned; the three new alignment/
  fallback tests pass and every pre-existing test still passes (105 total, 11 suites)
- [x] No caller anywhere still derives a cadence anchor inline — `cadenceForGoal()` is the only
  producer of a `CadenceConfig` in the app
- [x] Every `db.update()` in the repo sets `updatedAt`
- [x] Every Accumulate/Ship goal created by either path has a non-null `paceBasis` and `quickAdd`
- [x] `lib/copy.ts` has real importers and no slang string is hardcoded in `app/`
- [x] The two false checklist boxes in Phases 1 and 4 are corrected
- [x] Every bug in the 5.0.8 table is fixed and its fix is verifiable in code
- [x] `tsc --noEmit`, `eslint .`, and `jest` all clean

**✅ Phase 5.0 complete — 2026-09-02.**



---

## Phase 5.1 — The data layer

### Goal
Every number and every write Home needs exists and is tested, with no UI attached: a clock that
ticks only when it should, a pure `current`-from-entries derivation, the three entries mutations
(log, undo, skip) with genuinely optimistic patches, the Today and Arc query hooks, and the toast
queue that makes undo possible.

### Before Starting — Confirm 5.0 is Approved
- Re-read `04-hooks.md` §2/§3/§4 in full — the query shape, the mutation shape, and `useNow`'s
  exact contract ("Ticks on: mount, app foreground, and the next 04:00 rollover. Nothing else.").
- Re-read `05-database.md` §1's uniqueness section and confirm against
  `lib/db/migrations/0000_mean_loners.sql`: the index is
  `UNIQUE (goal_id, day_key) WHERE skipped = 0` (verified during planning). Logging is therefore
  an **upsert** — a second ride today updates the existing row's `value`, never inserts a second
  row ("aggregate into the single row's `value` rather than adding rows").
- Confirm `lib/derive/pace.ts`'s exact input/output field names before writing the hook that
  feeds it — `p`/`t` are `fractionDone`/`fractionExpected`.

### 5.1.1 Design
No UI.

### 5.1.2 Data Model
No schema changes — 5.0 already added the only column this phase needs.

### 5.1.3 Derivation

```
lib/derive/progress.ts
```

The missing piece between `entries` and `pace()`: `pace()` takes `current` as an input, and
nothing computes it. Inlining it in a hook is forbidden (`04-hooks.md` §6), so:

```ts
export type ProgressEntry = {
  dayKey: string; value: number | null; skipped: boolean;
};

/** The goal's current total, by type. Accumulate/Ship sum or count; Habit counts completed
    due days. `startingValue` is added for mid-flight Accumulate goals. */
export function currentValue(input: {
  type: 'habit' | 'accumulate' | 'ship' | 'milestone';
  entries: ProgressEntry[];
  startingValue?: number | null;
  checkpointsHit?: number;
}): number;

/** Whether this goal is done for the given day — drives the Today list's checkbox state. */
export function isLoggedOn(entries: ProgressEntry[], dayKey: string): boolean;
```

**Required test cases** (`lib/derive/progress.test.ts`):
- Accumulate sums `value` across entries, and adds `startingValue` when present
- Accumulate ignores `skipped` entries (a skipped day contributes nothing, and must not count
  as a zero that drags an average — it is an absence, not a value)
- Ship counts entries, not their values (a ship's `value` may be null)
- Habit counts completed days, not summed values
- Milestone uses `checkpointsHit`, ignoring entries entirely
- An entry with `value: null` on an Accumulate goal contributes 0, not `NaN`
- `isLoggedOn` is false for a day whose only entry is `skipped: true`

### 5.1.4 Data Layer

**`hooks/useNow.ts`** — the clock, per `04-hooks.md` §4. Ticks on mount, on `AppState` change to
`active`, and via a single timeout scheduled for the next 04:00 boundary in the arc's timezone
(computed with `lib/date.ts`, not a 60-second interval — "re-rendering the whole app every second
is waste and battery"). Returns a `Date`.

**`lib/queryKeys.ts`** gains the two keys `03-state-and-data.md` §3 already specifies and this
phase needs: `entries: (goalId) => ['entries', goalId]` and
`today: (arcId, dayKey) => ['today', arcId, dayKey]`.

**Query hooks:**

```ts
// hooks/useTodayList.ts — the execution half of Home.
export function useTodayList(): {
  mains: TodayItem[]; sides: TodayItem[];
} | null;
// TodayItem: { goalId, title, accent, icon, type, isDone, detail, isMain, quickAdd, unit }

// hooks/useArcRows.ts — the trajectory half. One row per active goal.
export function useArcRows(): ArcRow[] | null;
// ArcRow: { goalId, title, accent, p, t, status, valueLabel }

// hooks/useArcProgress.ts — the hero: day number, total, days left, and the sweep's own p.
export function useArcProgress(): { day: number; totalDays: number; daysLeft: number; p: number } | null;
```

Each follows `04-hooks.md` §2 exactly: `useQuery` over SQLite, then a `useMemo`'d call into
`lib/derive/` — never math inlined in the hook — returning `null` while loading so no chart ever
receives `NaN`.

**Which goals appear in Today** is a real decision, not a lookup, because
`schedule.ts`'s `isDueOn()` **throws** for `n_per_week` (no per-day answer is well-defined for it).
Resolution, documented here rather than buried in code:
- `daily` / `specific_days` / `every_n_days`: `isDueOn(cadence, todayKey)` decides.
- `n_per_week`: the goal appears **every day until its week's target is met**, then drops off the
  list for the rest of that week. This matches the cadence's own promise ("4 times a week,
  you pick which days") without inventing a schedule the user never set. The week is the
  `weekAnchorDate`-aligned week from 5.0, so it matches what the streak and mosaic will say.
- `cadenceMode: null` (Accumulate/Ship with no cadence): always available to log, so always
  listed — these are the goals the user logs opportunistically.

**Mutation hooks** — `hooks/useLogEntry.ts`, `useUndoEntry.ts`, `useSkipDay.ts`. All three follow
`04-hooks.md` §3, and `useLogEntry` is the one the whole phase is judged on:

```ts
export function useLogEntry(): UseMutationResult<void, Error, LogInput>;
// LogInput: { goalId, arcId, dayKey, value?: number | null, backfilled?: boolean,
//             title?: string, link?: string }
```

- `mutationFn` **upserts**: select the existing non-skipped row for `(goalId, dayKey)`; if one
  exists, `update` its `value` (adding for Accumulate, replacing for a corrected Habit value);
  else `insert`. Preserves the partial unique index's guarantee and keeps replay idempotent
  (`05-database.md` §5).
- `onMutate` fires `Haptics.notificationAsync(Success)` **and** patches
  `qk.today(arcId, dayKey)` + `qk.entries(goalId)` optimistically, returning the previous
  snapshots. The haptic fires here, not on success — "the user gets feedback in the same frame as
  their tap".
- `onError` restores both snapshots and pushes a toast (`'Could not save that. Tap to retry.'`).
- `onSettled` invalidates by prefix: `['today']` and `qk.goals(arcId)`.
- Sets `loggedAt` (a real timestamp) and `dayKey` (from `dayKey(now, arc.timezone)` — never
  `format(d,'yyyy-MM-dd')`), plus `backfilled: true` when the day key isn't today's.
- **Enforces the 2-day backfill window** (`03-state-and-data.md` §5) by rejecting a `dayKey`
  more than two days behind today's before touching SQLite. The DB-level half of that rule is
  noted as a follow-up, since SQLite can't express it without a trigger.

**`lib/stores/toast.ts`** — Zustand's first use in the app (installed since Phase 0, zero
imports). A queue of `{ id, message, actionLabel?, onAction?, expiresAt }`, with `push`,
`dismiss`, and automatic expiry after 5 seconds. Undo is a toast action, **never** a confirm
dialog (`02-ui-components.md` §4). `lib/stores/` is a new folder; `02-ui-components.md` §1's
folder list gains it in the same change, since a convention that lags the code is worse than none.

### 5.1.5 Components
None — `components/ui/Toast.tsx` renders in 5.3, where there's a screen to host it.

### 5.1.6 Navigation / Integration
None.

### 5.1.7 Impact on Existing Features
| Item | Note |
|---|---|
| `hooks/useArcBuilder.ts` | `useActiveArc` starts being read by three new hooks. Its return type gains `timezone` (needed by `dayKey()` at every call site) — currently selected from the row but not exposed. |

### 5.1.8 What This Phase Does NOT Include
- Any screen, any rendering, the toast component itself.
- Ship metadata capture and Milestone checkpoint logging (5.4 and Phase 6 respectively).
- Freeze earning/consumption — `streaks.ts` computes it, but writing `freezes` rows is Phase 9.

### 5.1.9 Checklist
- [ ] `progress.ts`'s required test cases pass, including the skipped-entry and null-value cases
- [ ] `useNow()` ticks on mount, foreground, and the 04:00 boundary — and demonstrably not on a
  timer; no `new Date()` appears in any component this phase adds
- [ ] `useLogEntry` upserts (logging the same goal twice in one day leaves exactly one row) and
  its optimistic patch is visible before the write resolves
- [ ] `onError` rolls back and surfaces a toast; no spinner exists anywhere on the log path
- [ ] Backfill beyond 2 days is rejected before any SQLite write
- [ ] The Today-list cadence rules above hold, including `n_per_week` dropping off once its week
  target is met
- [ ] `tsc --noEmit`, `eslint .`, and `jest` all clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 5.2 — Tab bar + Home hero

### Goal
The app has its three real tabs, and Home's top half — arc name, sweep, and day counter — renders
real numbers from a real arc, in both themes.

### Before Starting — Confirm 5.1 is Approved
- Re-read `01-design-system.md` §4.1 (arc geometry: Home is `cx 171, cy 146, r 140, sw 14`) and
  §7's tab-bar spec (`h64`, 1px `border` top, active `textPrimary` 10/600, inactive
  `tabInactive` 10/500, line-drawn 17–18px glyphs).
- `components/charts/ArcSweep.tsx` takes `{ p, size }` and already has a `'home'` size variant —
  confirm it needs no change beyond 5.0's `accessibilityLabel`.
- Read canvas screens `10` and `11` again for the hero's exact stack: arc name (22/600/−.025em),
  the 150px-tall arc block, then the centred `DAY` label (11/600/+.16em) over the day number
  (46/600/−.045em) over "of 122 · 88 days left" (13/400).

### 5.2.1 Design
Screens `10` (dark) and `11` (light), top half only. The tab bar is shared chrome for both.

### 5.2.2 Data Model
No schema changes.

### 5.2.3 Derivation
None new — consumes 5.1's `useArcProgress()`.

### 5.2.4 Data Layer
Consumes `useArcProgress()` and `useActiveArc()`. No new hooks.

### 5.2.5 Components
```
app/(tabs)/
  _layout.tsx     — Tabs, three screens, custom tab bar per §7. Exactly three; never a fourth.
  index.tsx       — Today (Home). This sub-phase builds its hero; 5.3–5.5 fill the rest.
  arc.tsx         — placeholder: centred textSecondary copy naming Phase 7
  settings.tsx    — placeholder: centred textSecondary copy naming Phase 12
components/home/
  ArcHero.tsx     — arc name + ArcSweep + the absolutely-positioned day counter
```
Placeholders use the empty-state pattern `01-design-system.md` §9 prescribes (plain centred
`textSecondary` copy, no illustration), so they're honest rather than fake-looking.

### 5.2.6 Navigation / Integration
`app/index.tsx` (Phase 4's cold-start router) replaces its "Home is Phase 5" placeholder with
`router.replace('/(tabs)')` on the active-arc branch. The draft-arc and no-arc branches are
untouched.

### 5.2.7 Impact on Existing Features
| Item | Note |
|---|---|
| `app/index.tsx` | Its placeholder branch becomes a real redirect. The onboarding and resume branches keep working exactly as Phase 4 left them. |
| `app/(onboarding)/signup.tsx` | Its `router.replace('/')` after activation now lands on the cold-start router, which forwards to the tabs — verify the redirect doesn't flash. |

### 5.2.8 What This Phase Does NOT Include
- The Today list, Log everything, or The Arc rows (5.3–5.5).
- Any real content in the Arc or Settings tabs.

### 5.2.9 Checklist
- [ ] Exactly three tabs, matching §7's heights, weights, and colors in both themes
- [ ] Day counter reads correctly on day 1, mid-arc, the final day, and past the end date
- [ ] The sweep's `p` matches the day counter (both from `useArcProgress`, not computed twice)
- [ ] Cold start with an active arc lands on Home with no visible flash of another screen
- [ ] No hex literal outside `theme/tokens.ts`; both themes verified
- [ ] `tsc --noEmit`, `eslint .`, `jest` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 5.3 — Today list + one-tap logging

### Goal
The core interaction works: the day's goals are listed with Mains above the divider, and tapping
a checkbox logs a binary goal in **one tap** — haptic in the same frame, optimistic fill, a
5-second undo toast, and no confirm, no sheet, no navigation, no spinner.

### Before Starting — Confirm 5.2 is Approved
- Re-read `02-ui-components.md` §4's logging-path table and its hard rules, and
  `01-design-system.md` §7's Today-row spec: `h36`, gap 14, 24px round checkbox, **completed rows
  go `textSecondary` + line-through**, and Mains sit above a plain 1px `border` divider with
  `margin: 7 0` — the divider is unlabeled; position carries the meaning.
- `components/ui/Checkbox.tsx` already fires the haptic internally on tap. Confirm the mutation's
  `onMutate` doesn't fire a **second** one (double-buzz is worse than none) — decide one owner.

### 5.3.1 Design
Screens `10`/`11`, the `TODAY` section and its `Log everything` button.

### 5.3.2 Data Model
No schema changes.

### 5.3.3 Derivation
None new — consumes `progress.ts` and 5.1's `useTodayList()`.

### 5.3.4 Data Layer
Consumes `useTodayList()` and `useLogEntry()`. The binary path calls `useLogEntry` with
`value: null` for Habit goals with no `sessionTarget`; goals with a value open the sheet (5.4)
instead of toggling.

### 5.3.5 Components
```
components/goal/TodayRow.tsx   — accent checkbox, title, right-aligned detail; completed state
components/home/TodayList.tsx  — Mains, the unlabeled divider, Sides, then Log everything
components/ui/Toast.tsx        — the 5-second undo toast, driven by lib/stores/toast.ts
```
`Toast.tsx` mounts once in `app/(tabs)/_layout.tsx` so it survives tab switches, and renders
above the tab bar.

### 5.3.6 Navigation / Integration
`Toast` mounts in the tabs layout. `Log everything` marks every binary goal done in one tap; the
value goals it queues are handed to the sheet in 5.4 (until then, it logs the binary ones and
leaves the value ones alone, with the queueing wired in the next sub-phase).

### 5.3.7 Impact on Existing Features
| Item | Note |
|---|---|
| `components/ui/Checkbox.tsx` | Becomes the app's first real interactive control. Its own haptic makes it the single haptic owner on the binary path. |

### 5.3.8 What This Phase Does NOT Include
- The Log sheet, value entry, or the value half of `Log everything` (5.4).
- Swipe-to-skip and backfill (5.6).

### 5.3.9 Checklist
- [ ] A binary goal logs in exactly **one tap** — no sheet, no confirm, no navigation, no spinner
- [ ] Exactly one haptic per tap
- [ ] The row's fill and line-through appear before the write resolves (optimistic), and survive
  a relaunch (SQLite)
- [ ] Undo is a 5-second toast that actually reverses the write; there is no confirm dialog
  anywhere on this path
- [ ] Mains render above the unlabeled divider; completed rows are `textSecondary` + line-through
- [ ] Every tappable target ≥ 44×44 (the 24px checkbox via hit-slop)
- [ ] Verified in airplane mode: log, relaunch, data survives
- [ ] Both themes; `tsc`/`eslint`/`jest` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 5.4 — The Log sheet + Log everything

### Goal
Value goals log in 2–3 taps through screen 12: the sheet opens imperatively from any row,
quick-add chips cover the common case, the custom 12-key numpad covers the rest, and submitting
auto-dismisses. `Log everything` becomes complete — binary goals marked, value goals queued into
one sheet pass.

### Before Starting — Confirm 5.3 is Approved
- Re-read `02-ui-components.md` §3's sheet pattern: Provider + Context + `forwardRef`/
  `useImperativeHandle`, **mounted once at the app root**, opened imperatively
  (`const { openLog } = useLogSheet(); openLog(goal)`) — not via navigation. This pattern does
  not exist in the repo yet; `sheets/Sheet.tsx` is the shell it builds on and already wires
  `useSheetBackHandler` (mandatory — without it Android back exits the app).
- `components/ui/NumPad.tsx` takes only `onKeyPress: (key: string) => void` — the controlled
  value and its parsing live in the sheet.
- Read canvas screen `12` for the exact stack: accent dot + goal name + `188 / 800 km` on one
  row, the 52px value with its unit, three quick-add chips (`h40 r20`, 1px `borderStrong`), the
  12-key pad (`h50 r12`, `bg: fill`, 24px/500), then a primary button labelled with the pending
  value (`Log 12.4 km`).

### 5.4.1 Design
Screen `12`.

### 5.4.2 Data Model
No schema changes — `quickAdd` was populated in 5.0, which is what makes the chips real.

### 5.4.3 Derivation
None new.

### 5.4.4 Data Layer
Consumes `useLogEntry()`. The sheet's provider holds the currently-open goal and an optional
queue (for `Log everything`), advancing to the next value goal on submit rather than dismissing.

### 5.4.5 Components
```
sheets/LogSheetProvider.tsx  — the context + provider + the single mounted Sheet instance
sheets/LogSheet.tsx          — screen 12's content
hooks/useLogSheet.ts         — { openLog(goal), openLogQueue(goals) }
```

### 5.4.6 Navigation / Integration
`LogSheetProvider` mounts in `app/_layout.tsx`, inside `BottomSheetModalProvider` (which Phase 4
already mounts) so any screen can open the sheet without prop-drilling.

### 5.4.7 Impact on Existing Features
| Item | Note |
|---|---|
| `components/goal/TodayRow.tsx` | Value goals now call `openLog(goal)` instead of no-op'ing. |
| `components/home/TodayList.tsx` | `Log everything` marks binary goals then calls `openLogQueue(valueGoals)`. |
| `app/_layout.tsx` | Gains the provider. Verify the splash gate and the query provider still bracket it correctly. |

### 5.4.8 What This Phase Does NOT Include
- Ship metadata capture (`capture_title`/`capture_link`) beyond the optional-skip path, and
  Milestone checkpoint tapping — both belong to Phase 6's goal detail, where the spine lives.
- Rescope (Phase 6) and the Sunday Reset sheet (Phase 9), even though both reuse this shell.

### 5.4.9 Checklist
- [ ] A typical value log is 2–3 taps: row → chip (or pad) → submit, auto-dismissing on submit
- [ ] The OS keyboard never appears for value entry — the custom numpad only
- [ ] Android hardware back dismisses the sheet and does **not** exit the app
- [ ] `Log everything` marks binary goals and walks the value goals in one sheet pass
- [ ] Logging twice in one day aggregates into the single row (no duplicate-row error)
- [ ] Both themes; every target ≥ 44×44; `tsc`/`eslint`/`jest` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 5.5 — The Arc rows

### Goal
The trajectory half of Home: one row per goal with its 32px pace ring, current value, and status
— the first time the pace engine's output is visible anywhere in the app, and the first time the
amber deficit gap renders against real data.

### Before Starting — Confirm 5.4 is Approved
- Re-read `01-design-system.md` §4.2 (the four ring layers, and the Home-row variant `r:13,
  sw:6` in a 32×32 box) and §7's Arc-row spec: 32px ring, name 17/500, then a right column of
  value (16/600, **tabular-nums**) over status (13/500).
- **Status colors**: `locked_in` and `on_track` both render neutral grey; only `slipping` gets
  amber, and it must swap to `system.slippingLight` on light backgrounds (§5 — `#FFB020` is
  illegible on `#FAFAF9`). `cooked` has no approved treatment (§9) — see 5.5.7.
- `components/charts/PaceRing.tsx` takes `{ p, t, accent, size: 'row' }` and needs no geometry
  change; it gains only 5.0's `accessibilityLabel`.

### 5.5.1 Design
Screens `10`/`11`, the `THE ARC` section.

### 5.5.2 Data Model
No schema changes.

### 5.5.3 Derivation
None new — `useArcRows()` (5.1) already composes `progress.ts` → `pace.ts`. This sub-phase adds
only display formatting:

```
lib/format.ts
```
Pure display formatters, tested, so the same value never renders two ways on two screens:
`formatGoalValue(row)` produces the canvas's own shapes — `−35 km` (Accumulate deficit),
`5 / 7 days` (Habit hit ratio), `+2 sessions` (ahead), `3 of 5` (Milestone checkpoints).

**Required test cases** (`lib/format.test.ts`): a behind Accumulate goal renders a signed
negative; an ahead one renders a signed positive; a Habit renders `hit / due`; a Milestone renders
`hit of total`; zero and exactly-on-pace render without a stray sign.

### 5.5.4 Data Layer
Consumes `useArcRows()`.

### 5.5.5 Components
```
components/goal/GoalRow.tsx  — pace ring + name + value/status column; tappable, pushing to
                               goal detail (Phase 6) — inert here, with the route noted
```

### 5.5.6 Navigation / Integration
Rows are pressable but have nowhere to go until Phase 6 builds `app/goal/[id].tsx`. The handler is
written and explicitly commented as awaiting that route rather than silently swallowing the tap.

### 5.5.7 Impact on Existing Features
| Item | Note |
|---|---|
| `components/ui/StatusPill.tsx` | Accepts only `'slipping' \| 'neutral'`, and `system.cooked` has no consumer anywhere. Home's rows render status as plain text (not a pill), so this phase needs the **cooked label** but not a cooked pill. Per `01-design-system.md` §9, `system.cooked` stays unapproved: the Home row renders `cooked` in the same neutral treatment as on-track, with the word "Cooked" carrying the meaning (never color alone — §8). A red pill, if it's ever approved, belongs to Phase 6's goal detail and the rescope prompt. Flagged for a design call there. |
| `lib/copy.ts` | The status ladder strings already exist there and are finally used. |

### 5.5.8 What This Phase Does NOT Include
- Goal detail (Phase 6) — rows are pressable but inert.
- A `cooked` pill or any red treatment.

### 5.5.9 Checklist
- [ ] The amber gap appears only when `p < t`, sits between fill and tick, and is absent when ahead
- [ ] `locked_in`/`on_track` are neutral grey; only `slipping` is amber, and it swaps to
  `slippingLight` in light mode
- [ ] Every numeric column uses `tabular-nums`
- [ ] `formatGoalValue`'s test cases pass; the value shown matches `pace()`'s deficit exactly
- [ ] Each ring carries an `accessibilityLabel` with the value in words
- [ ] Both themes; `tsc`/`eslint`/`jest` clean

**→ Stop here. Show the result and wait for approval.**

---

## Phase 5.6 — Skip, backfill, and the stopwatch

### Goal
The edges of the daily loop close, and the phase's real done-condition gets **measured**: a
five-goal day logged in under 10 seconds, in airplane mode, with a stopwatch.

### Before Starting — Confirm 5.5 is Approved
- Re-read `02-ui-components.md` §4's remaining rows: skip-with-reason is 2 taps (swipe left →
  `sick` `travel` `no time` `chose not to`), and backfill is 2 taps (a mosaic long-press, **or**
  the "Yesterday" row shown before 10:00). No mosaic appears on Home, so this phase builds the
  Yesterday row; the mosaic long-press lands with the mosaic (Phase 6/7).
- Confirm `react-native-gesture-handler` 2.28's `ReanimatedSwipeable` is the current API (the
  older `Swipeable` is deprecated) before wiring the row gesture.

### 5.6.1 Design
Not designed. Swipe actions extend the Today-row pattern; the reason picker reuses the
`Chip`-in-a-`Sheet` pattern from 5.4 rather than introducing a new surface. The Yesterday row is a
Today row with a `metaS` "Yesterday" label. Both choices are extensions, not new visual language.

### 5.6.2 Data Model
No schema changes — `entries.skipped`, `skipReason`, and `backfilled` all already exist.

### 5.6.3 Derivation
None new. `progress.ts` already ignores skipped entries, and `mosaic.ts` already has a
`backfilled` story for Phase 7 to render.

### 5.6.4 Data Layer
Consumes `useSkipDay()` (5.1) and `useLogEntry({ backfilled: true })`. The 2-day window is
already enforced in the mutation; the Yesterday row simply can't offer anything outside it.

### 5.6.5 Components
```
components/goal/TodayRow.tsx   — gains the swipe-left action
sheets/SkipReasonSheet.tsx     — four reason chips on the shared shell
components/home/YesterdayRow.tsx — shown before 10:00 when yesterday has unlogged goals
```

### 5.6.6 Navigation / Integration
The skip sheet mounts through the same provider pattern as the log sheet.

### 5.6.7 Impact on Existing Features
| Item | Note |
|---|---|
| `components/goal/TodayRow.tsx` | Gains a gesture. Verify the swipe doesn't fight the tab navigator's own edge gestures or the checkbox's tap. |

### 5.6.8 What This Phase Does NOT Include
- Backfill via mosaic long-press (needs the mosaic — Phase 6/7).
- A DB-level backfill constraint (SQLite needs a trigger; noted for Phase 8's schema pass).
- Notifications and their action buttons (Phase 9).

### 5.6.9 Checklist
- [ ] Skip is 2 taps and writes `skipped: true` + a `skipReason`, and a skipped day is visibly
  distinct from both a hit and a miss
- [ ] The Yesterday row appears only before 10:00, only when yesterday has unlogged goals, and
  writes `backfilled: true`
- [ ] Backfill beyond 2 days is impossible from the UI **and** rejected by the mutation
- [ ] **A five-goal day logs in under 10 seconds, timed with a stopwatch, in airplane mode** —
  the actual measured number recorded in this doc's Implementation Notes, not "feels fast"
- [ ] Airplane mode: log, relaunch, everything survives
- [ ] Both themes; `tsc`/`eslint`/`jest` clean

**→ Stop here. Phase 5 complete. Report to the user, then wait for Phase 6 go-ahead.**

---

## Data Model Summary (Final State After All Phases)

```
arcs
  └─ goals (+ new `starts_at` column — nullable, null means "starts with the arc")
       ├─ entries      (first real writer: the log path)
       └─ checkpoints  (untouched this phase)
```

### `goals` — changed column
| Column | Type | Notes |
|---|---|---|
| `starts_at` | date, nullable | New in 5.0. Null = the arc's start. Feeds `pace()`'s `startDate` and `cadenceForGoal()`'s `anchorDate`, mirroring the existing `ends_at` valve. |

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `cadenceForGoal()` | goal row + arc | `CadenceConfig \| null` | explicit `startsAt`, `dayKey` fallback (incl. 23:00 negative-offset), arc clamp, `weekAnchorDate` always the arc's start, null cadence |
| `currentValue()` | type, entries, startingValue | number | sums vs counts by type, skipped ignored, null values, milestone checkpoints |
| `isLoggedOn()` | entries, dayKey | boolean | skipped-only day is not "logged" |
| `formatGoalValue()` | an arc row | display string | signed deficits both directions, hit ratios, checkpoint counts, zero |

---

## Entitlement Gates

None gated. `03-state-and-data.md` §6 and the skill's own rule are explicit that **core logging
is never gated**, and `IMPLEMENTATION.md`'s Design Delta #3 keeps the pace ring and mosaic free
on purpose (gating the thesis leaves a generic habit tracker with nothing to convert on).
`useFlag('goals.max')` currently has zero importers — enforcing it belongs to Phase 11, not here.

---

## Out of Scope (All Phases Here)

- **Goal detail** (Phase 6) — Arc rows are pressable but inert until `app/goal/[id].tsx` exists.
- **The Arc tab and Settings** — placeholder routes only (Phases 7 and 12).
- **Sync** — `lib/sync/` still doesn't exist; nothing enqueues to `sync_queue`. Every arc and
  goal created so far is invisible to Phase 8's outbox, which Phase 8 must reconcile on first
  sign-in via the local-to-remote upsert (`05-database.md` §5).
- **The four auth-looking affordances** on Welcome/Sign up that share one local-activation
  handler — already documented as gap #3 of Phase 4 and resolved by Phase 8, not a bug.
- **`useFlag('goals.max')` enforcement** — zero importers by design until Phase 11.
- **Reading the onboarding name back** (`useLocalProfileName` has no consumer) — by spec it
  surfaces only in the Sunday Reset and the Finale (Phases 9/10), not on Home.
- **A DB-level backfill-window constraint** — needs a SQLite trigger; the derivation-layer half
  ships in 5.1.
- **`accessibilityLabel` on the seven charts this phase doesn't render** — each lands with the
  screen that first uses it.
- **Freeze earning/consumption**, notifications, and the widget — Phases 9 and post-v1.
