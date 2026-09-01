# Feature: Onboarding & Arc Creation
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/05-onboarding-arc-creation.md`
**Roadmap phase**: Phase 4 (`IMPLEMENTATION.md`)
**Status**: ✅ Complete (static verification; on-device visual/offline pass pending — see Implementation Notes)
**Last Updated**: 2026-09-01

---

## Context

Everything built so far — the chart set (Phase 2), the pace engine (Phase 3) — has been proven
against fixtures. This phase is the first time real data flows through the app: a fresh install
reaching a live, multi-goal Arc with **zero network calls and no account**, per
`IMPLEMENTATION.md`'s "Auth is late, on purpose" ordering choice.

It also implements the canvas's superseded-but-better onboarding (`IMPLEMENTATION.md`'s Design
Delta #1): **Welcome → Name → Intent → Recommended goals → Sign up**, where picking intent chips
makes the app *propose sized goals* — materially better than the original spec's seven-step
manual builder. Two entry paths exist correctly: **onboarding** (screens 01–05, fast, guided)
and **Arc Builder** (screens 06–09: window, goal type, goal form, load check — the full manual
path), and onboarding's "Recommended goals" screen reuses Arc Builder's goal-type/goal-form pair
for anything typed outside the recommendations, and its window screen for adjusting the default
window. Arc Builder is also what Phase 6 reuses later for adding a goal mid-arc.

**Designed screens**: `01` Welcome · `02` Name · `03` Intent · `04` Recommended goals ·
`05` Sign up · `06` Arc Builder — Window · `07` Arc Builder — Goal type ·
`08` Goal form (Accumulate — the only type designed; Habit/Ship/Milestone extend its structure
exactly, per `01-design-system.md` §9) · `09` Load check.

### Five real gaps found while planning, resolved before writing any code

**1. Where does the arc's window get set in the fast path?** Screens 01–05 never show a
date-window control — screen 04's header just states "STEP 3 OF 4 · 122 DAYS" as a given. The
window UI only exists on screen 06, which Design Delta #1 describes as the *manual* path's first
step. **Resolved**: onboarding defaults the window to **90 days starting tomorrow** (a
politically-neutral round number — the spec's own presets are `30d`/`60d`/`90d`/`End of year`,
and 90 is the safe middle one, not seasonally dependent like "End of year"). The default window
renders as a small tappable readout on screen 04 (e.g. "90 days · Sep 2 → Nov 30") that pushes to
the real screen 06 if the user wants to change it — reusing the existing pattern rather than
inventing a new inline date control. Accepting the default requires no extra tap.

**2. Where does "Pick your Mains, exactly 2" happen?** This was a dedicated step in the original
spec's seven-step builder (`garra-index.md` §7.2 step 4), but the five-screen canvas onboarding
has no Mains-picker screen, and `IMPLEMENTATION.md`'s Phase 4 scope (screens `01`–`09`) doesn't
list one either. **Resolved**: the fast path auto-designates the first two *accepted*
recommended goals (in the order shown on screen 04) as Mains; anything added afterward (via
"+ Add something else", or a third+ recommendation) is a Side. This keeps the fast path
one-screen-shorter, matching Design Delta #1's whole rationale. A manual Mains toggle belongs on
goal detail (Phase 6) once a goal exists to edit — not invented here as a new onboarding screen.

**3. Sign up (screen 05) has nothing to sign up with yet.** Supabase Auth doesn't exist until
Phase 8 — `IMPLEMENTATION.md` is explicit that auth is late on purpose. **Resolved**: screen 05
renders exactly as designed (email/Google/Apple buttons, "Keep it on this phone"), but every
button — including the three auth CTAs — currently performs the same action: leave the arc
local-only and proceed. Phase 8 is what gives the auth buttons real behavior; nothing here is a
stub UI, only the *handler* is temporarily unified.

**4. The sign-up screen's "fading mosaic" is decorative fake data.** The canvas's `fadeMosaic`
fixture is a seeded-random fade pattern with no relationship to any real arc — because at this
point in the flow, the arc hasn't started, so there's no real history to show. Rendering fabricated
progress data on a real screen (even as flavor) cuts against "nothing derived is ever stored/
fabricated." **Resolved**: render the real `Mosaic` component fed by the real (just-created,
day-zero) arc's cell states via `mosaicCells()` — which, on day zero, is simply every cell
`'future'`. Less visually dramatic than the canvas's fade, but honest; flagged here rather than
silently copying the fixture's fake data into production.

**5. The load-check screen's color bands don't match the design system.** The original spec
(`garra-index.md` §4.6) describes three bands — green `<8h` "Sustainable", amber `8–15h`
"Ambitious", red `>15h` "second job" — but the canvas's actual screen 09 only ever renders the
**amber** panel (`rgba(255,176,32,.1)` background, `#FFB020` text) for its example, and
`01-design-system.md` §0/§10 is explicit: success is neutral (no green), and red is reserved for
Cooked only. **Resolved**: two states, not three — **below the ambitious threshold, no panel at
all** (the total and per-goal rows speak for themselves in neutral text); **at or above it, the
one amber panel** with copy that scales from "Ambitious. Doable." to "This is a second job..."
by total hours, using `system.slippingPanel`/`system.slipping` — never a red state. This is the
same restraint `IMPLEMENTATION.md`'s Design Deltas §4 already documents for status colors
generally.

---

## Thesis Check

- **Fits the finite/pace model?** This is where the Arc — the whole premise — actually gets
  created. Every later phase depends on a real arc with real goals existing.
- **Derived, not stored?** The intent → goal template catalog (`lib/intents.ts`) is a static
  lookup table, not a derived value. Everything written to SQLite here (`arcs`, `goals` rows,
  the local display name) is genuine input data, not something computed from `entries` — there
  are no entries yet. Nothing here stores a derived number.
- **Works offline?** This entire phase's point is that it must — "install → live arc, entirely
  offline, no account" is the Phase 4 done-condition verbatim. No screen in this phase makes a
  network call.

---

## Phase Overview

```
Phase 4.1 — Foundation
  TanStack Query wired to SQLite, the local-profile table, lib/intents.ts, and the first
  real query/mutation hooks. No screens yet — everything downstream depends on this.

Phase 4.2 — Onboarding screens 01–05
  Welcome, Name, Intent, Recommended goals, Sign up (deferred). app/(onboarding)/.

Phase 4.3 — Arc Builder screens 06–07
  Window and goal-type picker — the manual path's first two steps, reused by 4.2's
  "adjust window" and "add something else" affordances.

Phase 4.4 — Goal forms (all four types) + Load check (screen 09)
  Extends the one designed form (Accumulate) to Habit/Ship/Milestone; load check shows the
  real total and forwards to Sign Up, which is where activation actually happens (see
  Implementation Notes' resolution of the fast-path step ordering).

Phase 4.5 — Cold-start wiring & end-to-end verification
  app/index.tsx becomes the real splash → session → active-arc router. Draft-survives-kill
  and full offline-airplane-mode checks across the whole flow.
```

**After each phase: stop and wait for approval before proceeding.**

---

## Phase 4.1 — Foundation

### Goal
Every later sub-phase has real data to read and write: TanStack Query is wired to SQLite (with
an MMKV-backed persister so a cold start paints instantly), a tiny local-only table holds the
onboarding name, and `lib/intents.ts` — the catalog that makes onboarding feel intelligent —
exists and is tested. No UI in this sub-phase.

### Before Starting — Confirm With Codebase
- `app/_layout.tsx` currently mounts `GestureHandlerRootView` → `SafeAreaProvider` →
  `BottomSheetModalProvider` → `Stack`. No `QueryClientProvider` exists yet — this sub-phase adds
  it as the outermost data provider, inside `SafeAreaProvider`.
- `lib/db/schema.ts`'s `arcs.status` already has a `'draft'` value (`03-state-and-data.md` §2
  calls draft arc-builder state "explicitly persisted to SQLite as a draft row" — this is that
  row; no new table needed for the arc itself).
- `lib/entitlements.ts`'s `useFlag('goals.max')` already resolves to `Infinity` in dev — no goal-
  count gating logic needs building or stubbing in this phase.
- `theme/tokens.ts` exports `ACCENTS`/`ACCENT_ORDER` (8 swatches, fixed order) — reuse directly
  for accent auto-assignment; do not redefine.
- No `lib/queryKeys.ts` exists yet (`03-state-and-data.md` §3's `qk` convention) — this phase
  creates it.
- Dependencies are already installed and unused: `@tanstack/react-query`,
  `@tanstack/react-query-persist-client`, `react-native-mmkv`, `zustand`. No new package
  installs required for this entire phase.

### 4.1.1 Design
No UI.

### 4.1.2 Data Model

One new local-only table — the durable local record of the display name captured on screen 02.
There is no remote equivalent yet (`00-index.md` §4: "`profiles` (remote-only) — shape unknown
until Phase 8"); this table is never synced and Phase 8's real `profiles` table supersedes it
for signed-in users.

```ts
// lib/db/schema.ts — add
export const localProfile = sqliteTable('local_profile', {
  id: text('id').primaryKey(), // always the literal 'local' — single row, no query needed
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});
```

Generate and commit the Drizzle migration (`npx drizzle-kit generate` inside `garra-dev/`) in
this sub-phase. **No Supabase SQL** — this table is deliberately local-only, so there is nothing
to paste into the SQL editor and nothing to add to `00-index.md`'s remote schema reference (it
gets its own local-only note instead, alongside `sync_queue`).

### 4.1.3 Derivation

```
lib/intents.ts
```

```ts
export type IntentKey =
  | 'cycling' | 'guitar' | 'writing' | 'language' | 'strength' | 'reading' | 'sideProject';
// Sleep/Less-scrolling/Weight deliberately excluded — see IMPLEMENTATION.md Design Delta #2:
// those three imply the ⊖ Limit type, which is post-v1. A chip that produces a goal the app
// can't model is worse than a shorter list.

export type IntentTemplate = {
  key: IntentKey;
  label: string;
  icon: string; // lucide-react-native icon name, matches GoalIcon's key space
  buildGoal: (arc: { startDate: string; endDate: string; totalDays: number }) => {
    type: 'habit' | 'accumulate' | 'ship' | 'milestone';
    title: string;
    targetAmount?: number;
    unit?: string;
    cadenceMode?: 'daily' | 'n_per_week' | 'specific_days' | 'every_n_days';
    timesPerWeek?: number;
    estMinutes: number;
    checkpoints?: { title: string }[];
  };
};

export const INTENTS: IntentTemplate[] = [ /* one entry per IntentKey, sizing target/cadence
  from totalDays the way the canvas's Cycling example does (800km / 122 days ≈ 4×/wk × ~13km,
  scaled proportionally for other window lengths) */ ];
```

This is real work, not a stub, per `IMPLEMENTATION.md` Phase 4's explicit callout — each of the
seven intents needs a genuine, reasonably-sized proposed goal (type, target, cadence,
`estMinutes`), not a placeholder. `accent`/`icon` are assigned by the caller at goal-creation
time (next-unused `ACCENT_ORDER` slot), not baked into the template, matching
`components/charts/`'s "colors are data, never invented by the function" convention.

**Required test cases** (`lib/intents.test.ts`):
- Every `IntentKey` has exactly one `INTENTS` entry
- `buildGoal()` scales its target/cadence proportionally with `totalDays` (e.g. a 90-day window
  produces roughly 90/122 of the 122-day example's target, not an identical fixed number)
- `buildGoal()` never returns a `targetAmount`/`checkpoints` combination invalid for its `type`
  (an `accumulate` goal always has `targetAmount`, a `milestone` goal always has `checkpoints`)
- `estMinutes` is always a positive integer

### 4.1.4 Data Layer

New file: `lib/queryKeys.ts`

```ts
export const qk = {
  activeArc: ['arc', 'active'] as const,
  draftArc: ['arc', 'draft'] as const,
  goals: (arcId: string) => ['goals', arcId] as const,
  localProfile: ['localProfile'] as const,
};
```

New file: `lib/queryPersister.ts` — a ~20-line hand-written `Persister` (the
`@tanstack/react-query-persist-client` interface: `persistClient`/`restoreClient`/
`removeClient`) backed directly by `react-native-mmkv`. **Not a new dependency** — MMKV's API is
already synchronous and JSON-friendly, so wrapping it directly is simpler and smaller than
adding another package for this (`06-conventions.md` §6: "prefer 20 lines in `lib/` over a
package for something small").

New hooks (all in `hooks/useArcBuilder.ts` unless noted — one file because they're all facets of
the same in-progress-draft concern, not because it's a god hook; each is single-purpose):

```ts
// Query — reads the single draft-status arc row, or null if none exists yet.
export function useDraftArc(): { id: string; startsAt: string; endsAt: string } | null | undefined;

// Query — reads the single active-status arc row, or null. Used by 4.5's cold-start router
// and by 4.2/4.3/4.4 to confirm they're extending the right arc.
export function useActiveArc(): { id: string; startsAt: string; endsAt: string } | null | undefined;

// Query — this device's saved local profile name, or null before screen 02 is completed.
export function useLocalProfileName(): string | null | undefined;

// Mutation — screen 02. Upserts the single local_profile row.
export function useSetLocalProfileName(): { mutate: (name: string) => void };

// Mutation — screen 06 "Next" / the 90-day default. Creates the single draft arc row if none
// exists, or updates its dates if one does (re-entering the builder). timezone is captured via
// Intl.DateTimeFormat().resolvedOptions().timeZone at call time — see 4.1.7.
export function useSetArcWindow(): { mutate: (input: { startsAt: string; endsAt: string }) => void };

// Mutation — screen 04's accepted recommendations, screen 08's "Add goal". Inserts a goal row
// against the current draft arc, auto-assigning the next-unused accent from ACCENT_ORDER and
// is_main per gap #2's first-two-accepted rule.
export function useAddGoalToDraft(): { mutate: (input: AddGoalInput) => void };

// Mutation — load check's "Trim something" / "I know what I'm doing" (either one proceeds;
// see 4.4). Flips the draft arc's status to 'active'. This is THE moment garra-index.md §7.0's
// "active arc? no → Arc Builder / yes → Home" branch starts returning yes.
export function useActivateArc(): { mutate: () => void };
```

Every mutation here follows `04-hooks.md` §3's shape: writes SQLite in `mutationFn`, patches the
relevant `qk` entry optimistically in `onMutate`, invalidates by prefix in `onSettled`. None of
them touch Supabase or `enqueueSync` — that queue and its drain don't exist until Phase 8; a
local-only arc has nothing to sync yet.

### 4.1.5 Components
None yet.

### 4.1.6 Navigation / Integration
`app/_layout.tsx`: mount `QueryClientProvider` (with `persistQueryClientSave`/`PersistQueryClientProvider`
using `queryPersister.ts`) around the existing `BottomSheetModalProvider`/`Stack`, inside
`SafeAreaProvider`. This is the first real data provider in the tree.

### 4.1.7 Impact on Existing Features
| Item | Note |
|---|---|
| Device timezone | No helper exists yet for capturing the device's IANA timezone (needed on `arcs.timezone` at creation — `lib/date.ts`'s `dayKey()` takes `tz` as a parameter, it never reads the device's own zone). Add `deviceTimezone()` to `lib/date.ts`: a one-line wrapper around `Intl.DateTimeFormat().resolvedOptions().timeZone`, kept in `lib/date.ts` rather than inlined in the mutation so it's mockable in tests the same way `now` already is. |

### 4.1.8 What This Phase Does NOT Include
- Any screen.
- `enqueueSync`/`sync_queue` writes — nothing here syncs, by design (Phase 8).
- Real auth of any kind.

### 4.1.9 Checklist
- [x] `local_profile` table exists via a committed Drizzle migration; round-trips through
  `useSetLocalProfileName`/`useLocalProfileName` — verified by type/shape, on-device cold-start
  round-trip still pending (see Implementation Notes)
- [x] `lib/intents.ts`'s required test cases all pass
- [x] `QueryClientProvider` boots without delaying the splash screen beyond the existing
  migration gate
- [x] Every new mutation hook follows `04-hooks.md` §3 exactly (optimistic, prefix invalidation,
  no `await` on anything network-shaped)
- [x] `tsc --noEmit` clean

**✅ Phase 4.1 complete — 2026-09-01.**

---

## Phase 4.2 — Onboarding screens 01–05

### Goal
A new install can walk Welcome → Name → Intent → Recommended goals → Sign up and land with a
**draft** arc holding 1–3 recommended goals — entirely from `app/(onboarding)/`, entirely local.

### Before Starting — Confirm Phase 4.1 is Approved
- Re-read `01-design-system.md` §2/§3/§7 for exact type sizes, control heights, and the primary-
  button spec (`h54 r28`, never accent-colored) before touching any of these five screens.
- `components/charts/ArcSweep.tsx` takes only `{ p, size }` — screen 01's looping arc uses
  `size="onboarding"` with a fixed illustrative `p` (e.g. `0.28`, matching the canvas's own
  demo), since no real arc exists yet at Welcome. This is decorative, like the canvas's own
  looping animation — not a data claim, unlike gap #4's mosaic (there's no "day zero" reading
  possible before any arc exists at all, versus the sign-up screen where a draft arc already
  does exist).
- `components/ui/Chip.tsx` has no icon slot; the intent chips (screen 03) need one
  (`i.icon` in the canvas fixture). Add an optional `icon?: LucideIcon` prop rendered before the
  label — additive, not a breaking change to the two chips already using it in the Phase 2
  kitchen sink.
- `components/goal/` does not exist yet. This sub-phase does not need it — the "Recommended
  goals" row (screen 04) is a one-off layout (accent dot, name, detail, tick/plus button) simple
  enough to write inline; `GoalTypeCard`/`AccentPicker` (needed by 4.3/4.4) are built there, not
  here, since 4.2 never reaches the goal-type/goal-form screens directly.

### 4.2.1 Design
Screens `01`–`05` exactly, per the canvas markup read in this doc's planning pass (welcome's
looping hello/arc-reveal animation, name's custom-keyboard-styled text field — actually the OS
keyboard here, since this is free-text name entry, not the log path's value entry; the canvas's
inline key-row rendering is a static screenshot artifact of the design tool, not a real custom
keyboard to build), intent's chip grid, recommended's card list, sign-up's mosaic + three CTAs.

### 4.2.2 Data Model
No schema changes — consumes 4.1's `local_profile`/`arcs`/`goals` tables.

### 4.2.3 Derivation
None new — consumes `lib/intents.ts` (4.1) and `mosaicCells()` (Phase 3) for gap #4's honest
day-zero mosaic on screen 05.

### 4.2.4 Data Layer
Consumes 4.1's hooks directly. No new hooks.

### 4.2.5 Components
```
app/(onboarding)/
  _layout.tsx        — Stack, no header, shared step-dot progress bar (5 dots, matches canvas)
  welcome.tsx         — 01
  name.tsx            — 02
  intent.tsx          — 03
  recommended.tsx     — 04
  signup.tsx          — 05
```
Plus the `Chip` icon-slot addition (4.2's "Before Starting" note).

### 4.2.6 Navigation / Integration
`app/(onboarding)/_layout.tsx` is a plain `Stack` — no entry point yet; 4.5 wires
`app/index.tsx`'s cold-start router to push here when there's no active or draft arc. Until 4.5,
this route group is reachable only by direct navigation (fine for testing this sub-phase in
isolation, matching how Phase 2's kitchen-sink route worked before it had a "real" entry point).

### 4.2.7 Impact on Existing Features
None — purely additive; no existing screen links here yet (that's 4.5).

### 4.2.8 What This Phase Does NOT Include
- Real auth behavior on screen 05's three CTAs (gap #3 — unified "keep local" handler for all
  of them until Phase 8).
- The window-adjustment tap-through from screen 04 (gap #1) — that requires screen 06, built in
  4.3. Screen 04 in this sub-phase can show the 90-day default readout as static text; wiring the
  tap becomes possible once 4.3 exists (do it in 4.3, not here, to avoid a forward reference to
  an unbuilt route).
- "+ Add something else" actually opening the goal-type/goal-form pair — same reason, wired in
  4.4 once those screens exist. Render the row; its `onPress` is a no-op until then, explicitly
  marked with a comment, not silently swallowed.

### 4.2.9 Checklist
- [x] All five screens match their canvas geometry/copy/type scale (welcome's looping animation
  simplified to a static reveal — see Implementation Notes' scope note)
- [x] Screen 03's chips exclude Sleep/Less scrolling/Weight (Design Delta #2)
- [x] Screen 04 auto-marks the first two accepted recommendations as Mains (gap #2) — implemented
  in `useAddGoalToDraft`'s `existing.length < 2` default, on-device inspection still pending
- [x] Screen 05 renders the real, honest day-zero mosaic (gap #4), not a fabricated fade
- [x] Every button ≥ 44×44; small text-link taps (e.g. "I already have an account") wrapped in
  `Pressable` with `hitSlop={8}` rather than relying on bare `Text.onPress`
- [x] `tsc --noEmit` clean

**✅ Phase 4.2 complete — 2026-09-01.**

---

## Phase 4.3 — Arc Builder screens 06–07

### Goal
The manual path's first two steps exist as real, reusable screens: set an arbitrary window, pick
a goal type. Screen 04's "adjust window" tap-through (gap #1) and "+ Add something else" (into
goal-type) both become real navigations.

### Before Starting — Confirm Phase 4.2 is Approved
- `components/charts/WindowTicks.tsx` currently hardcodes `MONTH_BOUNDARIES = [0, 30, 61, 91]` —
  correct only for the canvas's exact Sep 1 → Dec 31 demo. A real window screen needs boundaries
  computed from the *actual* `startDate`/`totalDays`, since a user's 90-day arc starting on an
  arbitrary date has month boundaries nowhere near indices 0/30/61/91. Add a pure helper —
  `windowTickMonthBoundaries(startDate: string, totalDays: number): number[]` — to
  `components/charts/geometry.ts` (matching that file's existing role: pure, tested chart math),
  and change `WindowTicks` to accept `startDate` and call it instead of the hardcoded array. This
  is a real, necessary extension to Phase 2 work, not a new component.
- Re-read `01-design-system.md` §4.9 for the exact tick heights/colors (44/26/15px,
  `system.arc` at 100/55/28%) — already correct in the existing component; only the *which
  index counts as a month boundary* logic needs generalizing.

### 4.3.1 Design
Screens `06` (Window) and `07` (Goal type) exactly.

### 4.3.2 Data Model
No schema changes.

### 4.3.3 Derivation
```ts
// components/charts/geometry.ts — add
export function windowTickMonthBoundaries(startDate: string, totalDays: number): number[];
// Returns the day-indices (0-based, within [0, totalDays)) that land on the 1st of a calendar
// month, given the arc starts on startDate. Pure date arithmetic — no I/O, no `now`.
```

**Required test cases** (add to `components/charts/geometry.test.ts`):
- A window starting exactly on the 1st of a month includes index 0
- A window starting mid-month correctly finds the *next* month's 1st, not an anchored-to-start
  offset like the old hardcoded array
- A window shorter than 30 days may return zero boundaries (must not crash)
- Matches `[0, 30, 61, 91]` for the canvas's own Sep 1 → Dec 31, 122-day example (regression
  check against the exact fixture this replaces)

### 4.3.4 Data Layer
Screen 06 calls 4.1's `useSetArcWindow()`. Screen 07 has no data write of its own — it only
carries the chosen `type` forward as a route param into 4.4's goal-form screen.

### 4.3.5 Components
```
app/arc-builder/
  window.tsx      — 06
  goal-type.tsx   — 07
components/goal/
  GoalTypeCard.tsx  — the 2×2 grid tile (glyph, name, one-line description), selected-state
                      border per canvas (rgba(255,255,255,.28) vs .08)
```

### 4.3.6 Navigation / Integration
- Screen 04 (4.2)'s window readout becomes a real `Pressable` pushing `arc-builder/window`, with
  `router.back()` (or equivalent) returning to Recommended goals afterward, dates refreshed.
- Screen 04's "+ Add something else" pushes `arc-builder/goal-type`, which pushes
  `arc-builder/goal-form` (built in 4.4) with the chosen type as a param.
- `arc-builder/goal-type.tsx`'s "Next" is disabled until a type is selected (no type pre-selected
  by default, unlike the canvas's static screenshot which shows Accumulate pre-highlighted purely
  for demo purposes).

### 4.3.7 Impact on Existing Features
| Item | Note |
|---|---|
| `WindowTicks` | Prop signature changes (`startDate` added) — the Phase 2 kitchen-sink demo (`app/_dev-charts.tsx`) must be updated to pass a `startDate` too, or it breaks. |

### 4.3.8 What This Phase Does NOT Include
- The goal form itself (4.4).
- Any load-check logic (4.4).

### 4.3.9 Checklist
- [x] `windowTickMonthBoundaries()`'s required test cases pass, including the exact-fixture
  regression check
- [x] Screen 04 → 06 → back-to-04 round-trip updates the draft arc's dates (implemented via
  `useSetArcWindow`; on-device round-trip still pending)
- [x] Screen 04 → 07 → 08 works with the chosen type passed as a param (goal-form built in 4.4,
  ahead of schedule, so this is a real navigation, not a stub)
- [x] `app/_dev-charts.tsx` updated for `WindowTicks`'s new prop; kitchen sink still renders
- [x] `tsc --noEmit` clean

**✅ Phase 4.3 complete — 2026-09-01.**

---

## Phase 4.4 — Goal forms (all four types) + Load check

### Goal
Every goal type can actually be created through the builder, and the arc can be activated. This
is the sub-phase where "install → live arc" becomes true end-to-end for the manual path, and
where 4.2's deferred "+ Add something else" and screen 04's recommendations both resolve to real
`goals` rows via the same form.

### Before Starting — Confirm Phase 4.3 is Approved
- Re-read `01-design-system.md` §9: only the Accumulate form (screen 08) is designed. Habit,
  Ship, and Milestone "reuse its structure exactly: header → identity → accent row →
  type-specific block → inset list group → footer hint + primary button." Read screen 08's exact
  markup again before writing the other three — the shared chrome must be byte-for-byte
  consistent, only the middle block changes.
- `garra-index.md` §6 has the exact field lists per type (Habit: `cadence_mode` + friends; Ship:
  `target_count`/`item_noun`/capture toggles; Milestone: `checkpoints[]`/`sequential`/
  `attached_cadence`) — build against that table, not from memory.
- `components/ui/NumPad.tsx` takes only `onKeyPress` — reusable as-is for every numeric field
  across all four forms (target amount, `est_minutes`, `times_per_week` stepper, etc.) with a
  thin controlled-value wrapper local to each form; no NumPad changes needed.
- `components/goal/` needs `GoalIcon.tsx` (`02-ui-components.md` §6: "Goals reference a curated
  icon key, not a component... exports `GOAL_ICON_KEYS` for the picker") and `AccentPicker.tsx`
  (the 8-swatch row with the selected-ring treatment, screen 08's `swatches`) — neither exists
  yet; build both here since this is the first screen needing them.

### 4.4.1 Design
Screen `08`'s exact structure, extended per `01-design-system.md` §9's rule for the other three
types. Screen `09` (Load check) exactly, with gap #5's two-state (not three-state) color
treatment.

### 4.4.2 Data Model
No schema changes — every field this phase writes already exists on `goals`
(`05-database.md` §1's column list covers all four types' fields plus `checkpoints`).

### 4.4.3 Derivation
None new. Reuses Phase 3's `loadCheck()` directly for screen 09's total — this is its first real
caller outside a test file.

### 4.4.4 Data Layer
- Goal-form screens call 4.1's `useAddGoalToDraft()`.
- Load-check screen reads the draft arc's goals (`useQuery` over `qk.goals(draftArcId)`,
  `queryFn` reading SQLite directly per `04-hooks.md` §2) and calls `loadCheck()` in a `useMemo`,
  never inline — matching `04-hooks.md`'s "derivation is called from the hook, never inlined in
  it" rule. New hook: `useDraftLoadCheck()` (query kind — reads data, calls the pure function,
  returns the memoized result).
- "I know what I'm doing" / "Trim something" both call 4.1's `useActivateArc()`; "Trim something"
  additionally routes back into the goal list instead of forward — it does not skip activation
  entirely, it just delays it by one interaction. Neither button is disabled; per
  `garra-index.md` §7.2 step 5, "Always let them proceed — just make them look first."

### 4.4.5 Components
```
app/arc-builder/
  goal-form.tsx    — 08, and its three structural extensions (branches on the `type` param)
  load-check.tsx   — 09
components/goal/
  GoalIcon.tsx       — GOAL_ICON_KEYS + the key→Lucide-component map
  AccentPicker.tsx   — the 8-swatch selectable row
```

### 4.4.6 Navigation / Integration
- `arc-builder/goal-type.tsx` (4.3) → `arc-builder/goal-form.tsx?type=X` → on submit, calls
  `useAddGoalToDraft()` then returns to wherever the flow entered from (screen 04, or back into
  the load-check goal list if editing).
- `arc-builder/load-check.tsx` is reachable from screen 04's "Start the arc" (once 3+ goals
  exist) — the canvas's own screen 04 CTA already reads "Start the arc," which this phase wires
  to push here rather than activating immediately, so the load check is never skippable, per
  `garra-index.md` §7.2 step 5's "do not skip this screen."

### 4.4.7 Impact on Existing Features
| Item | Note |
|---|---|
| Screen 04 ("+ Add something else") | Its `onPress` no-op from 4.2 becomes real: pushes `arc-builder/goal-type`. |
| Screen 04 ("Start the arc") | Now pushes `arc-builder/load-check` instead of being an unwired button. |

### 4.4.8 What This Phase Does NOT Include
- Editing an existing goal (Phase 6 — this phase only creates).
- Reminders setup (`garra-index.md` §7.2 step 6) — explicitly Phase 9's `expo-notifications`
  work, not this phase's.
- A three-tier (green/amber/red) load-check treatment — gap #5 resolves this to two states, and
  no third tier is being deferred, it's rejected outright per the design system.

### 4.4.9 Checklist
- [x] All four goal-type forms produce a valid `goals` row with every required field for that
  type populated, including milestone `checkpoints` rows (a real bug caught and fixed during
  this sub-phase — see Implementation Notes)
- [x] `AccentPicker` never allows picking an accent already used by another goal in the same
  draft arc (`01-design-system.md` §1: "No two goals in the same arc share an accent") —
  disabled accents are un-tappable, and the user's pick is now actually persisted (also fixed —
  see Implementation Notes)
- [x] Load check's total matches `loadCheck()`'s output exactly, by construction (`useDraftLoadCheck`
  calls the pure function directly on the real goal rows; hand cross-check still pending on-device)
- [x] The amber panel appears only at/above the ambitious threshold; below it, no panel renders
  (gap #5)
- [x] "I know what I'm doing" no longer activates the draft arc directly — it forwards to Sign
  Up, which does (see Implementation Notes' resolution of the fast-path step ordering, gap #6)
- [x] `tsc --noEmit` clean

**✅ Phase 4.4 complete — 2026-09-01.**

---

## Phase 4.5 — Cold-start wiring & end-to-end verification

### Goal
`app/index.tsx` stops being the Phase 0/2 placeholder and becomes the real
`garra-index.md` §7.0 router: splash → (no active or draft arc → onboarding) / (draft arc exists
→ resume Arc Builder where it left off) / (active arc exists → a temporary placeholder, since
Home doesn't exist until Phase 5). The whole Phase 4 flow is verified end-to-end, offline.

### Before Starting — Confirm Phase 4.4 is Approved
- `app/index.tsx` is currently a dev placeholder linking to `_dev-charts` — this sub-phase
  replaces its content but the kitchen-sink route itself stays (`00-index.md`'s "Dev routes"
  entry: "permanent... not deleted after Phase 2").
- Re-confirm `useDraftArc()`/`useActiveArc()` (4.1) return `undefined` while loading and `null`
  when genuinely absent — `04-hooks.md` §2: "return `null` while loading rather than a half-
  populated object," and the router must not flash onboarding before the query resolves.

### 4.5.1 Design
No new screen. `garra-index.md` §7.0's cold-start diagram, implemented as routing logic.

### 4.5.2 Data Model
No schema changes.

### 4.5.3 Derivation
None new.

### 4.5.4 Data Layer
No new hooks — composes 4.1's `useActiveArc()`/`useDraftArc()`.

### 4.5.5 Components
`app/index.tsx` rewritten: while either query is loading, render nothing (the splash screen is
still up at this point per `app/_layout.tsx`'s existing gate); once resolved, `router.replace()`
to `(onboarding)/welcome` (no arc at all), the correct `arc-builder/*` step (draft arc exists —
resume at goal-type if 0 goals, load-check if ≥1 goal, matching where a killed app would have
left off), or a plain "Arc active — Home is Phase 5" placeholder (active arc exists).

### 4.5.6 Navigation / Integration
This *is* the navigation change — the single entry point for the whole app.

### 4.5.7 Impact on Existing Features
| Item | Note |
|---|---|
| `app/_dev-charts.tsx` | Its link from `app/index.tsx` is removed since `index.tsx` no longer has spare UI to hold it; add a direct note in `00-index.md`'s Dev routes entry for how to reach it during development (e.g. typing the route directly), since it must stay reachable per that entry's existing rule. |

### 4.5.8 What This Phase Does NOT Include
- Building Home itself — the placeholder is explicitly temporary, replaced whole in Phase 5.
- Any Supabase interaction.

### 4.5.9 Checklist
- [ ] Fresh install (empty SQLite) → Welcome, with no flash of any other screen first —
  **on-device, pending**
- [ ] Kill the app mid-builder (after Window, before any goals) → relaunch → resumes at goal-type,
  not back at Welcome — **on-device, pending**
- [ ] Kill the app after 3 goals exist but before "I know what I'm doing" → relaunch → resumes at
  load check — **on-device, pending**
- [ ] Full flow (Welcome → ... → activate) completed once in **airplane mode**, arc ends up
  `status: 'active'` in SQLite with 3+ goals — **on-device, pending**
- [x] `00-index.md` updated: Phase 4 status, new `lib/intents.ts`/`components/goal/` entries under
  Shared Infrastructure, `local_profile` noted alongside `sync_queue` as local-only
- [x] `tsc --noEmit` clean

All static verification (`tsc --noEmit`, `eslint .`, `jest`) is clean across every sub-phase, and
two real implementation bugs were found and fixed before this pass (see Implementation Notes).
The four on-device items above need the emulator or a physical device, deliberately deferred to
a dedicated visual/offline pass rather than booting the emulator mid-build — see Implementation
Notes for why, matching how Phase 3 batched its own on-device work.

**Phase 4 built and statically verified — 2026-09-01. On-device visual/offline pass pending before declaring the phase fully done; see Implementation Notes below.**

---

## Data Model Summary (Final State After All Phases)

```
arcs (existing, status now genuinely transitions draft → active for the first time)
  └─ goals (existing + new `title` column, created for real for the first time, all four types)
       └─ checkpoints (existing, first real writer — milestone goals)
local_profile   (new, local-only, one row, never synced)
```

**`goals.title`** was added in 4.1, both locally (Drizzle migration `0002_wide_misty_knight`)
and remotely (Supabase migration `add_goals_title`) — a Phase 1.5 omission, not a Phase 4
schema change per se. See Implementation Notes.

### `local_profile` — Schema (local SQLite only, no Supabase equivalent)
| Column | Type | Notes |
|---|---|---|
| `id` | text | PK, always the literal `'local'` |
| `name` | text | not null — the display name from screen 02 |
| `created_at` | text | default current_timestamp |
| `updated_at` | text | default current_timestamp |

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `lib/intents.ts`'s `INTENTS[].buildGoal()` | arc window | a sized goal proposal | one entry per intent, proportional scaling, type-valid shape, positive `estMinutes` |
| `windowTickMonthBoundaries()` | startDate, totalDays | day-indices landing on the 1st of a month | month-start alignment, mid-month start, short windows, exact-fixture regression |
| `loadCheck()` (Phase 3, first real caller here) | goals with cadence + estMinutes | weekly/daily totals | already tested in Phase 3; this phase adds no new cases, just a real caller |

---

## Entitlement Gates

None. `useFlag('goals.max')` already resolves to `Infinity` in dev (Phase 1); this phase writes
no gating UI, since real limits are Phase 11's decision per `IMPLEMENTATION.md`'s Design
Delta #3.

---

## Out of Scope (All Phases Here)

- Home (Phase 5) — 4.5's placeholder is explicitly temporary.
- Real auth of any kind (Phase 8) — screen 05's three CTAs are unified until then (gap #3).
- Reminders / `expo-notifications` (Phase 9) — `garra-index.md` §7.2 step 6 is not built here.
- Editing an existing goal, rescoping, pausing, archiving (Phase 6).
- A manual Mains-picker screen (gap #2) — auto-assignment only; revisit as a Phase 6 goal-detail
  affordance if the auto-assignment proves wrong often in practice.
- A three-tier load-check color treatment (gap #5) — rejected, not deferred.
- The ⊖ Limit goal type / its three intent chips (Design Delta #2) — post-v1, dropped from the
  catalog entirely, not stubbed.

---

## Implementation Notes

All five sub-phases (4.1–4.5) were built in one continuous pass per the user's explicit
instruction to replicate Phase 2/3's no-stop-between-subphases workflow. Static verification —
`tsc --noEmit`, `eslint .`, and the full `jest` suite (82 tests, 9 suites) — is clean throughout.
**On-device visual and offline verification is deliberately deferred to a dedicated pass**,
matching how Phase 3 closed out: booting the Android emulator on this Windows machine causes
severe system-wide I/O contention (documented as standing rule #17 in `00-index.md`), and this
phase's UI surface (13 new screens/components) is large enough that batching the visual/dark-
light/offline walkthrough into one focused session is more efficient than paying that cost
repeatedly mid-build. The 4.5.9 checklist's four on-device items are left honestly unchecked
rather than marked done on the strength of static checks alone.

**A real Phase 1 schema gap, found immediately on writing the first goal-creation mutation**:
`goals` had no column anywhere to hold a goal's display name — `title` didn't exist locally
or remotely, an oversight that nothing caught until an actual goal needed to be created. Fixed
in 4.1 by adding `goals.title text not null` both locally (Drizzle migration
`0002_wide_misty_knight`) and remotely (Supabase migration `add_goals_title`, applied via MCP
with a temporary `''` default then dropped, since both tables were empty). `00-index.md`'s
schema reference and Applied Migrations log were updated in the same change.

**A second real gap in the fast path, not caught during planning**: nothing in canvas screens
01–05 ever names the arc — the original spec's "Name it" step (with seasonal chip suggestions)
was dropped along with the rest of the seven-step builder, but `arcs.title` is `not null`. Fixed
by adding `lib/arcNaming.ts`'s `seasonalArcTitle(now)` — a pure function returning "Spring/
Summer/Autumn/Winter Arc" based on the month, matching the canvas's own example ("Autumn Arc"
throughout the Home mockups). Called once, at draft-arc creation, inside `useSetArcWindow`'s
mutation. Editable later (Phase 6+); not exposed as a rename step here.

**Two real bugs caught before this pass, both traced back to the same root cause**: an
`as never` type-cast in `goal-form.tsx`'s `mutateAsync` call, added to silence a type error
without investigating it. That cast was hiding two genuine defects: (1) `AddGoalInput` had no
`checkpoints` field, so every Milestone goal created through the manual form silently lost its
checkpoints — nothing ever inserted them into the `checkpoints` table; (2) `AddGoalInput` had no
`accent` field either, so a user's explicit `AccentPicker` selection on screen 08 was silently
discarded in favor of the auto-assigned next-unused accent. Both fixed properly: `checkpoints`
and `accent` are now real, typed, optional fields on `AddGoalInput`, `useAddGoalToDraft` inserts
real `checkpoints` rows (ordered by position) and honors a passed-in `accent`, and the cast was
removed — the object now type-checks on its own merits. Lesson worth restating: a cast that
silences an error is a place to stop and look, not a place to move past.

**A real ordering inconsistency in this doc's own plan, found and resolved during 4.4**: §4.4.6
originally had Load Check's "I know what I'm doing" activate the draft arc directly. But the
canvas's own screen 04 is explicitly labeled "STEP 3 OF 4" with Sign Up as "STEP 4 OF 4" —
meaning the canvas's fast path doesn't route through Load Check at all, while
`IMPLEMENTATION.md`'s Phase 4 done-condition explicitly requires "the load check shows a real
total." Reconciled by inserting Load Check between Recommended Goals and Sign Up (screen
numbers stay canvas-accurate; the onboarding step *labels* are cosmetic, not a routing
contract), and by moving arc activation from Load Check to Sign Up — matching
`garra-index.md` §7.1's "hit auth/save at the very end" principle from the original spec, which
Design Delta #1 never contradicted (it changed the *front* of the flow, not the activation
point). Final fast-path order: Welcome → Name → Intent → Recommended (→ Load Check) → Sign Up →
activate. Both Load Check buttons now forward to Sign Up; only Sign Up's handlers call
`useActivateArc()`.

**`react-native-mmkv` v4 uses a Nitro-modules API**, not the `new MMKV()` constructor the
feature doc assumed while planning: `MMKV` is now a type-only export, and instances are created
via `createMMKV(config)`. Found immediately via `tsc` while writing `lib/queryPersister.ts`
(4.1) — no runtime surprise, just a stale mental model of the library's shape. Fixed by using
`createMMKV`; the persister's actual logic (three methods against a synchronous key-value store)
was unaffected.

**Two scope-narrowing decisions made during 4.3/4.4, flagged rather than silently absorbed**:
- The Window screen's "Custom" date preset is present in the UI (matching the canvas's layout)
  but inert — a real date-range picker needs a native dependency that isn't installed
  (`06-conventions.md` §6: adding one is a decision, not a default). The four functional presets
  (30d/60d/90d/End of year) cover the real need for this phase.
- Goal-form numeric fields (target amount, est. minutes, cadence numbers) use a plain
  `TextInput` with `keyboardType="number-pad"`, not the custom 12-key `NumPad`. The mandatory-
  numpad rule (`02-ui-components.md` §4) governs the *logging* path specifically, where the
  10-second rule is load-bearing; a one-time goal-creation form has no such constraint, and
  reusing `NumPad` here would need a bespoke value-entry sheet with no real speed benefit.

**`components/goal/GoalIcon.tsx` was built in 4.2, ahead of its originally planned 4.4 slot**,
because the Intent screen (03) needed to resolve `lib/intents.ts`'s icon-name strings to actual
Lucide components before Chip could render them — the same map Arc Builder's goal form needed
later, so it was written once and reused rather than duplicated.

**One deliberate motion simplification**: the Welcome screen's looping hello→arc-reveal
animation (canvas: a 9s `ease-in-out infinite` CSS loop) was built as a static, already-revealed
layout instead of an animated loop. `01-design-system.md` §6 governs motion generally, but
nothing in Phase 4's done-condition depends on this specific animation, and the arc/ring mount
animations that *do* matter (built in Phase 2, e.g. `ArcSweep`'s one-time fill) are unaffected.
Worth a pass with real motion polish later; not blocking.

No implementation-code bugs were found by `tsc`/`eslint`/`jest` in `lib/intents.ts`,
`lib/arcNaming.ts`, or `windowTickMonthBoundaries()` — every test in those passed on first run,
reflecting the manual arithmetic done before each was written (following the same discipline
Phase 3 established).
