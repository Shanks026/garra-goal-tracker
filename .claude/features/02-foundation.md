# Feature: Foundation
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/02-foundation.md`
**Roadmap phase**: Phase 1 (`IMPLEMENTATION.md`)
**Status**: Planned
**Last Updated**: September 2026

---

## Context

Phase 0 proved the toolchain. Phase 1 gives the app its actual bones: the design tokens every
future screen reads from, the local + remote schema every future feature writes to, and the
handful of pure utilities (`dayKey()`, entitlements, copy) that the rules already assume exist.
Nothing here is product-visible beyond a themed placeholder — the goal is that Phase 2 (charts)
and Phase 4 (onboarding) never have to stop and build infrastructure mid-feature.

**Designed screens**: none directly — this phase is infrastructure. The token values themselves
come from `.claude/rules/01-design-system.md` §1–3, which was extracted from the canvas.

---

## Thesis Check

- **Fits the finite/pace model?** N/A — infrastructure. It exists so the pace model has
  somewhere correct to store and render itself.
- **Derived, not stored?** No derived values are introduced. The schema stores only what a user
  actually entered (arcs, goals, entries, checkpoints, rescopes, freezes) — nothing computed.
- **Works offline?** Yes by construction: the local Drizzle/SQLite schema is the one this phase
  actually wires into the app. The Supabase schema (1.5) is created but nothing reads or writes
  it yet — that starts in Phase 8.

---

## Phase Overview

```
Phase 1.1 — Design tokens & Tailwind theme
  theme/tokens.ts (colors, type, spacing) generated into tailwind.config.js's theme.

Phase 1.2 — Root app shell: theme provider, splash gate, Sentry
  Replaces the bare _layout.tsx with real dark/light/system theming, a splash gate that
  waits on it, and Sentry initialized (not yet reporting).

Phase 1.3 — Time, copy, and entitlements foundations
  lib/date.ts (dayKey, 04:00 rollover — unit tested), lib/copy.ts scaffold,
  lib/entitlements.ts. Gets the Jest runner actually working, since these need real tests.

Phase 1.4 — Local database
  Drizzle schema for all six tables, SQLite client, first migration, a round-trip
  persistence check.

Phase 1.5 — Remote database (Supabase via MCP)
  The matching Postgres schema, RLS, and moddatetime triggers, applied via the Supabase MCP
  server (confirmed connected and empty — see 01-project-initialization.md §0.3.4).
```

**After each phase: stop and wait for approval before proceeding.**

---

## Phase 1.1 — Design tokens & Tailwind theme

### Goal
`theme/tokens.ts` exists as the single source of every color, spacing, radius, and typography
value in the design system, and `tailwind.config.js` reads its theme from that file instead of
sitting empty. No more hardcoded hex/pixel values are possible without deliberately bypassing
the type system.

### Before Starting — Confirm With Codebase
- `garra-dev/tailwind.config.js` currently has an intentionally empty `theme: {}` with a comment
  pointing here — replace that comment and the empty object together.
- `garra-dev/app.config.ts` already sets `userInterfaceStyle: 'automatic'` and
  `newArchEnabled: true` — no changes needed there in this sub-phase.
- No `theme/` directory exists yet in `garra-dev/`.

### 1.1.1 Design
No canvas screen — this is the token extraction described in `01-design-system.md` §1–3 in
full: `dark`, `light`, `ACCENTS`/`ACCENT_ORDER`, `system`, the typography table (§2), and
`layout`/`radii`/`controls` (§3). Copy every value verbatim; this file does not get to
"improve" or round anything.

### 1.1.2 Data Model
No schema changes in this phase.

### 1.1.3 Derivation
None.

### 1.1.4 Data Layer
None — no hooks yet.

### 1.1.5 Components
```
garra-dev/theme/
  tokens.ts       # dark, light, ACCENTS, ACCENT_ORDER, system, typography, layout, radii, controls
```

`typography` is exported from `tokens.ts` even though §2 doesn't say so as explicitly as §1/§3 —
`02-ui-components.md` §7's "no magic pixel value outside `layout`/`radii`/`controls`" and "no hex
literal outside `theme/tokens.ts`" only hold together if type sizes live there too. Shape:

```ts
export const typography = {
  displayXL: { size: 60, weight: '600', tracking: -0.045, lineHeight: 1.05 },
  displayL:  { size: 52, weight: '600', tracking: -0.04,  lineHeight: 1.05 },
  // ... every row of the §2 table, same field names
} as const;
```

### 1.1.6 Navigation / Integration
None yet — `tailwind.config.js` is updated to consume the new file:

```js
const { dark, light, ACCENTS } = require('./theme/tokens');
// theme.extend.colors built from the flattened dark/light + ACCENTS maps
```

**Decision needed before building**: `tailwind.config.js` is loaded directly by the Tailwind
engine as plain CommonJS — it cannot `require()` a `.ts` file with `as const` assertions without
a TypeScript loader in the process. `tsx` is already present in `node_modules` transitively (via
`drizzle-kit`), so the plan is to add it as an **explicit** `devDependency` (pinned exact,
`require('tsx/cjs/api').register()` at the top of `tailwind.config.js`) rather than rely on an
undeclared transitive package. This is a small, single-purpose addition — flagging it per
`06-conventions.md` §6 rather than adding it silently.

### 1.1.7 Impact on Existing Features
| File | Change |
|---|---|
| `tailwind.config.js` | Empty `theme` replaced with values generated from `theme/tokens.ts` |
| `app/index.tsx` | Unchanged in this sub-phase — still the Phase 0 placeholder |

### 1.1.8 What This Phase Does NOT Include
The theme *provider* (React context, `useColorScheme` wiring, dark/light switching at runtime)
— that's 1.2. This sub-phase only makes the values exist and reach Tailwind.

### 1.1.9 Checklist
- [x] `theme/tokens.ts` contains every value from `01-design-system.md` §1–3, matched field
  for field against the rule file (not retyped from memory)
- [x] `tailwind.config.js` no longer has an empty `theme` object
- [x] `npx tailwindcss` (via NativeWind) resolves a class like `bg-indigo-500`-equivalent for a
  token color, e.g. confirm a class using a token name compiles without error — verified by
  compiling actual CSS output, both the light default and the `dark:` override
- [x] `tsc --noEmit` clean
- [x] No hex literal appears anywhere outside `theme/tokens.ts` — **true again as of Phase 5.0.**
  This box was ticked in error at the time: `app.config.ts` carried an Expo-template `#E6F4FE`,
  and Phase 2 later added hexes to `components/charts/__fixtures__/chartFixtures.ts` and
  `geometry.test.ts` after the box was already checked. All three now read from
  `theme/tokens.ts`; see `06-home-and-logging.md` §5.0.8.
- [x] `tsx` added as an explicit pinned `devDependency` (not left as an implicit transitive one)

✅ **Phase 1.1 complete — 2026-09-01.**

**→ Stop here. Show the result and wait for approval.**

### Implementation Notes

**Real finding, generalizes to every UI phase from here on**: the plan in §1.1.6 assumed a
single CSS-custom-property per semantic color, switched by a `.dark`-scoped `addBase` rule (the
standard *web* Tailwind pattern for "one token name, two values"). Verified against actual
compiled output that this does **not** work on NativeWind's native (non-web) compiler — it
silently drops any custom-property declaration under a non-`:root` selector, including the
exact `:is(.dark *)` selector Tailwind's own `dark:` variant uses internally. Standard `dark:`
*utility* variants (e.g. `dark:bg-black`) compile correctly and were confirmed working.

**Resolution**: every theme-variant semantic color gets two literal Tailwind color names instead
of one CSS variable — the plain name holds the light value, a `-dark` suffix holds the dark
value. A themed element writes both classes together:

```
className="bg-bg dark:bg-bg-dark border-hairline dark:border-hairline-dark"
```

This is more verbose per-element than a single auto-switching token, but it's the actually-
supported mechanism rather than a gamble on undocumented internals. **Every future phase writing
a themed component must use this two-class pattern for any semantic color from `tokens.ts`** —
`bg`, `surface`, `textPrimary`, `border`, etc. all need both the plain and `-dark` class. The
three dark-only tokens (`fillStrong`, `handle`, `borderSelectedHi` — no light value exists in the
rule file) get only their one plain name; there is no light-mode fallback to pair it with.
*(Update, Phase 2.5: `handle` gained a light value once `sheets/Sheet.tsx` — the first real
component needing it in both themes — was built. `fillStrong` and `borderSelectedHi` remain
dark-only until something actually needs them in light mode.)*

Static colors (`ACCENTS`, `system`) and all spacing/radius values are theme-invariant and need
no `dark:` pairing — they're plain literals in the generated Tailwind config.

Promoted to `00-index.md` §6 as a standing rule, since it will bite the next UI phase silently
otherwise.

---

## Phase 1.2 — Root app shell: theme provider, splash gate, Sentry

### Goal
The app boots showing a real themed screen (not a hardcoded `bg-white`), correctly following
dark/light/system, with the splash screen held until that's resolved, and Sentry initialized
(silently — no DSN configured yet is fine, this just wires the call).

### Before Starting — Confirm Phase 1.1 is Approved
- Re-confirm `theme/tokens.ts` field names before importing them here.
- `app/_layout.tsx` currently just wraps `GestureHandlerRootView` + `SafeAreaProvider` + `Stack`
  — extend it, don't replace its structure.
- NativeWind v4 ships its own `useColorScheme()`/`colorScheme.set()` — confirm the installed
  version (`4.2.6`, pinned in Phase 0) still exposes these before writing against them.

### 1.2.1 Design
No canvas screen. "Themed placeholder" per `IMPLEMENTATION.md` Phase 1 — the existing
`app/index.tsx` text becomes a screen using `bg-bg` / `text-textPrimary` token classes instead of
`bg-white`, proving the theme actually switches.

### 1.2.2 Data Model
None.

### 1.2.3 Derivation
None.

### 1.2.4 Data Layer
None (no query/mutation hooks — this is UI plumbing, not data).

### 1.2.5 Components
```
garra-dev/theme/
  useAppTheme.ts     # selector hook: resolves NativeWind's scheme -> tokens.dark | tokens.light
                      # for consumers needing raw values (Skia draws, inline RN styles)
garra-dev/app/
  _layout.tsx         # + Sentry.init(), + splash gate around theme/font readiness
```

`useAppTheme()` is a **selector** hook per `04-hooks.md` §1 — cheap synchronous read, no async
work. It does not duplicate NativeWind's own dark-mode state; it just exposes the matching token
object for the non-className cases (chart colors, `StyleSheet` values that can't take a
`className`).

### 1.2.6 Navigation / Integration
`app/_layout.tsx` gains, in order: `Sentry.init()` at module scope (before any component),
`SplashScreen.preventAutoHideAsync()` at module scope, then `SplashScreen.hideAsync()` once the
root layout has mounted (no fonts are loaded in this phase — see Out of Scope — so this is
effectively immediate, but the gate exists as the seam future font-loading hooks into).

`app/index.tsx` swaps `bg-white`/plain `<Text>` for token-driven classes to visibly prove the
theme.

### 1.2.7 Impact on Existing Features
| File | Change | Watch for |
|---|---|---|
| `app/_layout.tsx` | Adds Sentry init + splash gate | Splash must not hang if init throws — wrap in try/catch, never block boot on Sentry |
| `app/index.tsx` | Token classes instead of hardcoded white | Must render correctly in both dark and light system settings |

### 1.2.8 What This Phase Does NOT Include
- Custom font loading (SF Pro / Inter Tight / Geist per §2) — no font asset has been sourced
  yet. Flagged in Out of Scope below; Android currently renders its default sans-serif, which is
  a known, visible gap until a font file is chosen.
- A Settings toggle for the theme — `setColorScheme()` is wired and callable, but nothing in the
  UI calls it yet (Settings itself is Phase 12, not designed).

### 1.2.9 Checklist
- [x] App boots to a screen using `theme/tokens.ts` values via NativeWind classes, not a literal
  `bg-white`
- [x] Switching the OS appearance between dark/light while the app is open updates it — verified
  live via Expo Go on-device; dark mode confirmed dark bg (`#0A0A0B`) + light text (`#F5F5F7`)
- [x] Splash screen is held and then dismissed exactly once — no fonts load in this phase so
  this is effectively instant; no flash observed
- [x] `Sentry.init()` runs without crashing when `EXPO_PUBLIC_SENTRY_DSN` is empty — app boots
  and runs normally with no DSN configured
- [x] `tsc --noEmit` clean
- [x] Rendered correctly in both dark and light mode — dark confirmed on-device; light mode
  confirmed by user before moving on

✅ **Phase 1.2 complete — 2026-09-01.**

**→ Stop here. Show the result and wait for approval.**

### Implementation Notes

`app/smoke.tsx` (written in Phase 0.2, deferred there) was **deleted during this phase**, ahead
of its originally planned end-of-Phase-1 removal. Reason: Expo Router statically imports every
file under `app/` to build its route table, so `smoke.tsx`'s `createMMKV()` call at module scope
was loading on every app boot regardless of which screen was open — breaking the Expo Go dev
loop with a "failed to get NitroModules, native module could not be found" error the moment this
phase's changes were tested. Removed it and its link from `app/index.tsx` rather than waiting;
nothing in it was needed once Phase 0.2's native verification was deferred anyway. Generalizes:
**any file placed under `app/` is eagerly bundled, even if no screen navigates to it** — this
matters again if a future throwaway/dev-only route imports Skia or MMKV.

---

## Phase 1.3 — Time, copy, and entitlements foundations

### Goal
`dayKey()` exists, is unit-tested against the 04:00 rollover and DST, and every future feature
that needs "what day does this belong to" goes through it instead of ad-hoc date formatting.
`lib/copy.ts` holds the lexicon so slang has one home. `lib/entitlements.ts` resolves every flag
to Pro in dev, so nothing downstream has to special-case "not built yet."

### Before Starting — Confirm Phase 1.2 is Approved
- Confirm `date-fns` is still pinned (`4.4.0` from Phase 0) — all arithmetic here uses it, never
  manual `Date` string math.
- Re-read `03-state-and-data.md` §5 and §6 before writing `dayKey()` and `entitlements.ts` — the
  exact function signatures are specified there.

### 1.3.1 Design
No UI in this phase.

### 1.3.2 Data Model
None.

### 1.3.3 Derivation
`lib/date.ts`:

```ts
export const DAY_ROLLOVER_HOUR = 4;
export function dayKey(d: Date, tz: string): string;   // 'YYYY-MM-DD', shifted for 04:00 rollover
```

Not technically `lib/derive/` (it has no goal/entries dependency — it's a standalone time
utility), but `06-conventions.md` §3 lists it as a **must-test** file alongside the derivation
layer, so it gets the same discipline. Required test cases, from `03-state-and-data.md` §5 and
the project-wide testing rule:

- A timestamp at 03:59 local belongs to the *previous* day; 04:00 exactly belongs to the new one
- A timestamp at noon is unambiguous, sanity check
- Midnight local (00:00) belongs to the previous day (this is the case that breaks naive
  `format(d, 'yyyy-MM-dd')` code)
- A DST "spring forward" day and a "fall back" day, both near the 04:00 boundary, in a timezone
  that observes DST (e.g. `America/New_York`)
- A timezone that does **not** observe DST (e.g. `Asia/Kolkata`), to confirm no accidental
  DST-only logic
- Two different `tz` values for the same instant produce different day keys when appropriate

This is also where the Jest runner actually needs to work — `jest-expo` (the preset) is
installed from Phase 0, but the `jest` package itself is not; `npx jest` currently fails on a
missing module. Installing the missing `jest` package (pinned exact, matching `jest-expo`
`54.0.18`'s expected major) is part of this sub-phase, not deferred further — there's finally
something real to test.

### 1.3.4 Data Layer
None — pure functions, no hooks.

### 1.3.5 Components
```
garra-dev/lib/
  date.ts
  date.test.ts
  copy.ts          # scaffold: the lexicon table from CLAUDE.md / 00-index.md §1, as constants
  entitlements.ts  # useFlag<T>(flag: Flag) -> T, every flag resolves to its Pro value in dev
```

`copy.ts` scaffold shape:

```ts
export const copy = {
  arc: 'Arc',
  mains: 'Mains',
  sides: 'Sides',
  checkpoints: 'Checkpoints',
  freeze: 'Freeze',
  sundayReset: 'Sunday Reset',
  theFinale: 'The Finale',
  status: {
    lockedIn: 'Locked in',
    onTrack: 'On track',
    slipping: 'Slipping',
    cooked: 'Cooked',
  },
} as const;
```

No screen-specific strings yet (empty states, celebrations) — those get added by the phase that
introduces the screen using them, per `01-design-system.md` §8's slang rule.

`entitlements.ts` shape, per `03-state-and-data.md` §6:

```ts
export type Flag = 'goals.max' | 'arcs.history' | 'charts.deep' | 'finale.poster'
                 | 'freezes.max' | 'reminders.perGoal' | 'widgets.all';
export function useFlag<T>(flag: Flag): T;
```

In dev (`__DEV__` true, or until RevenueCat is wired in Phase 11), every flag resolves to its
Pro value — there is no RevenueCat call in this phase or any phase before 11, matching the
user's decision to hold monetization.

### 1.3.6 Navigation / Integration
None — nothing renders these yet.

### 1.3.7 Impact on Existing Features
None. Fully additive.

### 1.3.8 What This Phase Does NOT Include
- `lib/derive/*` (pace, streaks, mosaic, load) — Phase 3.
- Any real copy beyond the lexicon scaffold — filled in as each screen needing it gets built.
- RevenueCat / real entitlement checks — Phase 11, explicitly deferred by user decision.

### 1.3.9 Checklist
- [x] `npx jest` runs and passes — 7 real assertions, not a zero-test pass
- [x] Every `dayKey()` case listed above has a passing test
- [x] `lib/copy.ts` has no screen-specific/flavor strings beyond the core lexicon
- [x] `useFlag()` returns the Pro value for every defined `Flag` in dev
- [x] `tsc --noEmit` clean
- [x] No `new Date()` call inside `dayKey()` itself — `now`/`d` is always a parameter

✅ **Phase 1.3 complete — 2026-09-01.**

**→ Stop here. Show the result and wait for approval.**

### Implementation Notes

**Added `@date-fns/tz` (pinned `1.5.0`), not anticipated in this doc's original plan.** Core
`date-fns` v4 is timezone-naive by design — its functions (`getHours`, `subDays`, `format`) all
read a `Date` through the *system's local* timezone via native getters. Given `dayKey()` takes
an arbitrary IANA `tz` string that's very often not the system's own timezone, using plain
`date-fns` functions directly would have silently used the wrong offset. `@date-fns/tz`'s
`TZDate` class (zero dependencies, same date-fns organization, not a competing library) is the
first-party companion package built exactly for this — it subclasses `Date` so every existing
date-fns function operates correctly against the given timezone's wall-clock time instead. This
satisfies `03-state-and-data.md` §5's "date-fns for all arithmetic" rather than working around
it with hand-rolled UTC-offset math, which was the realistic alternative and considerably more
error-prone for exactly the DST edge cases this phase is testing.

Also installed: `jest@29.7.0` (matching `jest-expo@54.0.18`'s own internal `^29.x`
dependencies — installing latest `jest@30` instead would have mismatched) and
`@types/jest@29.5.14`, finally getting `npx jest` itself working (only the `jest-expo` preset
existed before this phase, per Phase 0's implementation notes).

---

## Phase 1.4 — Local database

### Goal
Every table in `05-database.md` §1 exists in SQLite via Drizzle, a migration is generated and
committed, and a round-trip (insert → close → reopen → read) proves persistence survives a cold
start — the same guarantee the whole local-first architecture depends on.

### Before Starting — Confirm Phase 1.3 is Approved
- Re-read `05-database.md` §1 in full before writing the schema — column names, nullability,
  and the `entries_goal_day` unique index are load-bearing for later phases; do not improvise.
- `drizzle.config.ts` already points at `./lib/db/schema.ts` (written in Phase 0) — the schema
  file needs to actually exist at that path now.
- SQLite has no native array type — `goals.days_of_week` (`int[]`) and `goals.quick_add`
  (`numeric[]`) need a documented representation (see 1.4.7).

### 1.4.1 Design
No UI.

### 1.4.2 Data Model

```
arcs ─┬─ goals ─┬─ entries
      │         ├─ checkpoints
      │         └─ rescopes
      └─ freezes
```

Drizzle schema (`garra-dev/lib/db/schema.ts`), SQLite dialect. Standard columns on every table
per `05-database.md` §1 — `id` (text/uuid, default via `crypto.randomUUID()` at insert time,
since SQLite has no `gen_random_uuid()`), `created_at`/`updated_at` (integer/text timestamp,
`default(sql\`(unixepoch())\`)` equivalent), **no `user_id` locally** — that column is
Supabase-only (RLS has no meaning in a single-user local file; the sync engine attaches
`user_id` when it writes to Supabase, not before).

```ts
export const arcs = sqliteTable('arcs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  startsAt: text('starts_at').notNull(),       // date, 'YYYY-MM-DD'
  endsAt: text('ends_at').notNull(),
  status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull().default('draft'),
  timezone: text('timezone').notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  arcId: text('arc_id').notNull().references(() => arcs.id),
  type: text('type', { enum: ['habit', 'accumulate', 'ship', 'milestone'] }).notNull(),
  direction: text('direction', { enum: ['up', 'down'] }).notNull().default('up'),
  accent: text('accent').notNull(),
  icon: text('icon').notNull(),
  isMain: integer('is_main', { mode: 'boolean' }).notNull().default(false),
  targetAmount: real('target_amount'),
  unit: text('unit'),
  startingValue: real('starting_value'),
  cadenceMode: text('cadence_mode'),
  timesPerWeek: integer('times_per_week'),
  daysOfWeek: text('days_of_week', { mode: 'json' }).$type<number[]>(),
  intervalDays: integer('interval_days'),
  sessionTarget: real('session_target'),
  estMinutes: integer('est_minutes'),
  paceBasis: text('pace_basis'),
  quickAdd: text('quick_add', { mode: 'json' }).$type<number[]>(),
  itemNoun: text('item_noun'),
  endsAt: text('ends_at'),
  status: text('status', { enum: ['active', 'paused', 'archived'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id),
  dayKey: text('day_key').notNull(),
  loggedAt: text('logged_at').notNull(),
  value: real('value'),
  skipped: integer('skipped', { mode: 'boolean' }).notNull().default(false),
  skipReason: text('skip_reason'),
  backfilled: integer('backfilled', { mode: 'boolean' }).notNull().default(false),
  title: text('title'),
  link: text('link'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  goalDayUnique: uniqueIndex('entries_goal_day').on(t.goalId, t.dayKey).where(sql`${t.skipped} = 0`),
}));

export const checkpoints = sqliteTable('checkpoints', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id),
  title: text('title').notNull(),
  position: integer('position').notNull(),
  targetDate: text('target_date'),
  hitAt: text('hit_at'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const rescopes = sqliteTable('rescopes', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id),
  fromTarget: real('from_target'),
  toTarget: real('to_target'),
  reason: text('reason'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
});

export const freezes = sqliteTable('freezes', {
  id: text('id').primaryKey(),
  arcId: text('arc_id').notNull().references(() => arcs.id),
  earnedForWeek: text('earned_for_week').notNull(),
  consumedForDayKey: text('consumed_for_day_key'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  tableName: text('table_name').notNull(),
  rowId: text('row_id').notNull(),
  op: text('op', { enum: ['insert', 'update', 'delete'] }).notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
});
```

No Supabase SQL in this sub-phase — that's 1.5. `sync_queue` is local-only per
`05-database.md` §1 and is created here since it's structurally part of "the local schema," even
though nothing drains it until Phase 8.

### 1.4.3 Derivation
None.

### 1.4.4 Data Layer
```
garra-dev/lib/db/
  schema.ts
  client.ts     # openDatabaseSync + drizzle() wrapper, one shared instance
  migrations/   # generated by drizzle-kit, committed
```

`client.ts` exports a single `db` instance (`drizzle(openDatabaseSync('garra.db'), { schema })`)
— every future query/mutation hook imports this, never opens its own connection.

No query/mutation **hooks** yet (`useArc`, `useGoals`, etc.) — those need real UI to consume
them and arrive with the features that need them (Phase 4 onward). This sub-phase stops at "the
database exists and round-trips," per `04-hooks.md`'s own scoping.

### 1.4.5 Components
None — no UI.

### 1.4.6 Navigation / Integration
None.

### 1.4.7 Impact on Existing Features / Risks
| Item | Note |
|---|---|
| `days_of_week` / `quick_add` arrays | SQLite has no array type. Stored as `text` in JSON mode locally; Postgres side (1.5) uses native `int[]`/`numeric[]`. This is a **documented, necessary** deviation from "structurally identical" (`05-database.md` §3) — there's no SQLite array type to match against. Flagging explicitly rather than discovering it as drift later. |
| `user_id` absent locally | Local rows have no `user_id` — RLS is a Postgres-only concept. The sync engine (Phase 8) is responsible for attaching it on the way up, never the local schema. |
| UUIDs generated client-side | SQLite has no `gen_random_uuid()`. **Correction, found on-device**: the global `crypto.randomUUID()` this doc assumed was available in Hermes is **not** actually polyfilled at runtime (throws "property 'crypto' doesn't exist"), despite TypeScript's ambient lib types not flagging it — the type declaration existing doesn't mean the runtime global does. Use `expo-crypto`'s `Crypto.randomUUID()` instead (first-party Expo module, bundled in Expo Go, so this doesn't affect the Expo-Go-compatibility window). Every future mutation hook generating a local id must import from `expo-crypto`, not the bare `crypto` global. |

### 1.4.8 What This Phase Does NOT Include
- The Supabase/Postgres schema — 1.5.
- Any query or mutation hook — arrives with the feature that first needs it.
- The sync engine / outbox drain — Phase 8.

### 1.4.9 Checklist
- [x] All six tables + `sync_queue` exist in `lib/db/schema.ts`, matching `05-database.md` §1
  column-for-column (besides the documented `user_id`/array deviations above)
- [x] `entries_goal_day` unique index exists and is scoped to `skipped = false`
- [x] `npx drizzle-kit generate` produces a migration; it's committed
- [x] A manual round-trip test proves: insert a row → close the app fully → relaunch → row is
  still there — verified live via Expo Go: inserted a test arc, fully killed the app, relaunched,
  the row was still there
- [x] `tsc --noEmit` clean

✅ **Phase 1.4 complete — 2026-09-01.**

**→ Stop here. Show the result and wait for approval.**

### Implementation Notes

**Two real findings on-device, both corrected and promoted to `00-index.md`'s standing rules:**

1. **The bare `crypto.randomUUID()` global doesn't actually exist at runtime** — despite
   TypeScript's ambient lib types not flagging it as an error, `tsc --noEmit` stayed clean while
   the app threw `property 'crypto' doesn't exist` the moment the round-trip test tried to
   insert a row. A type declaration existing doesn't prove a runtime global does. Switched to
   `expo-crypto`'s `Crypto.randomUUID()` — a first-party Expo module, bundled in Expo Go, so this
   doesn't shrink the Expo-Go-compatibility window. This doc's own §1.4.7 Risks table originally
   asserted the opposite; corrected there too.
2. **Phase 0.1's `.sql`-as-`assetExts` Metro config was wrong for this use case.** Treating
   `.sql` as an asset extension resolves an import to an opaque asset object (like an image),
   not the file's text content — `useMigrations()` needs the actual SQL string. Fixed to the
   standard Drizzle+Expo pattern instead: `.sql` added to `sourceExts`, with
   `babel-plugin-inline-import` (`{ extensions: ['.sql'] }`) inlining the file content as a
   string literal at build time. Verified via a full Metro export before handing off for the
   on-device test — an earlier failure here would have been a build-time error, not a subtle bug.

**Also added `expo-system-ui`-style permanent wiring beyond the doc's original "no UI, no
navigation integration" scope**: `app/_layout.tsx` now runs `useMigrations()` and gates
rendering on it (extending the existing splash gate from Phase 1.2), because the round-trip
checklist item is meaningless without migrations actually running somewhere real — this isn't
throwaway, every future DB access depends on it having already run. A temporary
`app/db-check.tsx` screen (SQLite only, so Expo-Go-safe) was used to drive the manual insert/
kill/relaunch test and deleted immediately after confirming persistence, matching the
`smoke.tsx` pattern from Phase 1.2.

---

## Phase 1.5 — Remote database (Supabase via MCP)

### Goal
The Postgres schema mirrors Phase 1.4's structure (documented array deviation aside), with RLS
enabled in the same migration that creates each table, and `00-index.md` §4's schema reference
filled in for real. Nothing in the app reads or writes this yet — Phase 8 is the first consumer.

### Before Starting — Confirm Phase 1.4 is Approved
- Supabase MCP is connected and the project is confirmed empty (`list_tables` → `[]`,
  `list_migrations` → `[]`, verified 2026-09-01 in `01-project-initialization.md` §0.3.4) — safe
  to apply DDL.
- Re-read `05-database.md` §2 before applying — the `(select auth.uid())` wrapping in **both**
  `USING` and `WITH CHECK` is not optional, and is exactly the kind of thing to get right the
  first time rather than patch later.
- **Verify the final column list against `information_schema.columns` after applying** — not
  from this doc alone. This is `00-index.md` §6 rule #2, learned from a sibling project's RLS
  debugging pain.

### 1.5.1 Design
No UI.

### 1.5.2 Data Model — full SQL, apply via `mcp__supabase__apply_migration`

```sql
-- Extension for the updated_at trigger
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ============================================================= arcs
CREATE TABLE arcs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  title       text NOT NULL,
  starts_at   date NOT NULL,
  ends_at     date NOT NULL,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  timezone    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE arcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own arcs" ON arcs FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON arcs
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================================= goals
CREATE TABLE goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  arc_id          uuid NOT NULL REFERENCES arcs(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('habit', 'accumulate', 'ship', 'milestone')),
  direction       text NOT NULL DEFAULT 'up' CHECK (direction IN ('up', 'down')),
  accent          text NOT NULL,
  icon            text NOT NULL,
  is_main         boolean NOT NULL DEFAULT false,
  target_amount   numeric,
  unit            text,
  starting_value  numeric,
  cadence_mode    text,
  times_per_week  integer,
  days_of_week    integer[],
  interval_days   integer,
  session_target  numeric,
  est_minutes     integer,
  pace_basis      text,
  quick_add       numeric[],
  item_noun       text,
  ends_at         date,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON goals FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE INDEX goals_arc_id_idx ON goals(arc_id);

-- ============================================================= entries
CREATE TABLE entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  goal_id     uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  day_key     text NOT NULL,
  logged_at   timestamptz NOT NULL,
  value       numeric,
  skipped     boolean NOT NULL DEFAULT false,
  skip_reason text,
  backfilled  boolean NOT NULL DEFAULT false,
  title       text,
  link        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own entries" ON entries FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE UNIQUE INDEX entries_goal_day ON entries(goal_id, day_key) WHERE skipped = false;

-- ============================================================= checkpoints
CREATE TABLE checkpoints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  goal_id     uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title       text NOT NULL,
  position    integer NOT NULL,
  target_date date,
  hit_at      timestamptz,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkpoints" ON checkpoints FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON checkpoints
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE INDEX checkpoints_goal_id_idx ON checkpoints(goal_id);

-- ============================================================= rescopes (append-only)
CREATE TABLE rescopes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  goal_id     uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  from_target numeric,
  to_target   numeric,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rescopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rescopes" ON rescopes FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON rescopes
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================================= freezes
CREATE TABLE freezes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  arc_id               uuid NOT NULL REFERENCES arcs(id) ON DELETE CASCADE,
  earned_for_week      text NOT NULL,
  consumed_for_day_key text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE freezes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own freezes" ON freezes FOR ALL
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON freezes
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
```

`profiles` (remote-only, per `05-database.md` §1) is **not** created in this sub-phase — it has
no columns specified anywhere yet beyond "exists," and inventing its shape now would be
guessing. Add it in Phase 8 when auth actually needs it.

### 1.5.3 Derivation
None.

### 1.5.4 Data Layer
None — no sync engine yet (Phase 8). Nothing in the app calls Supabase after this migration
applies.

### 1.5.5 Components
None.

### 1.5.6 Navigation / Integration
None.

### 1.5.7 Impact on Existing Features
None — purely additive remote schema, unreferenced by app code until Phase 8.

### 1.5.8 What This Phase Does NOT Include
- `profiles` table — Phase 8.
- The sync engine, outbox drain, or any Supabase client call from the app — Phase 8.
- Auth provider configuration (Apple/Google/email) — Phase 8; this sub-phase only confirmed the
  Auth dashboard page's *reachability* was deferred from Phase 0.3, not configured it.

### 1.5.9 Checklist
- [x] All six tables applied via `mcp__supabase__apply_migration`, one migration per table
  (`create_arcs`, `create_goals`, `create_entries`, `create_checkpoints`, `create_rescopes`,
  `create_freezes`) — the SQL above is the durable record, applied verbatim
- [x] `mcp__supabase__list_tables` (verbose) confirms every column, matched against this doc —
  including `days_of_week`/`quick_add` coming back as real Postgres `ARRAY` types, correct
  defaults (`gen_random_uuid()`, `auth.uid()`, `now()`), and correct FKs/CHECK constraints
- [x] RLS enabled on all six (`rls_enabled: true` confirmed for each);
  `mcp__supabase__get_advisors` (security) shows **zero** warnings on any of these tables —
  the only two warnings returned are about a pre-existing `public.rls_auto_enable()` function
  neither this migration nor any prior phase created; out of scope, noted below
- [x] `user_id` default verified against the live column list (via `list_tables` verbose, which
  reads `information_schema` under the hood) — `auth.uid()` confirmed present on every table
- [x] `00-index.md` §4 Schema Reference updated with the real applied schema, in the same change
- [x] `entries_goal_day` unique index present — confirmed via the `entries` table structure

✅ **Phase 1.5 complete — 2026-09-01. Phase 1 (Foundation) is now fully complete.**

**→ Stop here. Phase 1 complete. Report to the user, then wait for Phase 2 go-ahead.**

### Implementation Notes

Applied cleanly on the first attempt — no deviations from the planned SQL. Two things worth
recording for later, neither blocking:

- **`get_advisors` (security) surfaced a pre-existing `public.rls_auto_enable()` function**
  callable by both `anon` and `authenticated` roles as `SECURITY DEFINER`, unrelated to anything
  this phase created (this project had zero tables and zero migrations before Phase 1.5 — this
  function predates our work, likely a Supabase project-level default). Not investigated further
  here since it's outside this phase's scope; worth a look whenever Settings/security gets a
  real pass (Phase 12), or sooner if it turns out to matter for Phase 8 auth.
- **`get_advisors` (performance) flagged unindexed `user_id` foreign keys on every table**, plus
  the two `goals_arc_id_idx`/`checkpoints_goal_id_idx` indexes as currently unused — both exactly
  what's expected on a schema with zero rows and no query traffic yet, not evidence of an actual
  problem. Deliberately not adding speculative indexes now, matching `03-state-and-data.md`'s
  own "don't reach for this before it's measurably needed" stance elsewhere. Revisit once Phase
  8's sync engine or a later phase's real usage shows an actual slow query.

---

## Data Model Summary (Final State After All Phases)

```
arcs ─┬─ goals ─┬─ entries
      │         ├─ checkpoints
      │         └─ rescopes
      └─ freezes
sync_queue   (local only, SQLite)
```

See 1.4.2 (Drizzle/SQLite) and 1.5.2 (Postgres, full DDL) above for the authoritative column
lists — this summary is structural, not a restatement of every column.

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `dayKey(d, tz)` | a `Date` and IANA timezone string | `'YYYY-MM-DD'` shifted for the 04:00 rollover | 03:59/04:00 boundary, midnight, DST spring-forward, DST fall-back, non-DST timezone, cross-timezone divergence (§1.3.3) |

Nothing else derived in this phase — `lib/derive/*` (pace, streaks, mosaic, load) is Phase 3.

---

## Entitlement Gates

None yet in the product sense — `lib/entitlements.ts` exists and `useFlag()` is callable, but no
screen calls it (nothing gated exists to gate). Every flag resolves to Pro in dev per
`03-state-and-data.md` §6, and stays that way until Phase 11 — held by explicit user decision.

---

## Out of Scope (All Phases Here)

- Custom font loading (SF Pro substitute for Android) — no font asset sourced yet; flagged as a
  known visible gap in 1.2.8, not silently skipped.
- Any query/mutation hook (`useArc`, `useGoals`, `useLogEntry`, etc.) — arrives with the first
  feature that actually needs it, per `04-hooks.md`'s own scoping discipline.
- The sync engine, outbox drain, and anything touching auth — all Phase 8.
- `lib/derive/*` — Phase 3.
- RevenueCat / real entitlement enforcement — Phase 11, deferred by user decision.
- `profiles` table — Phase 8, shape not yet known.
- A Settings screen or any UI to toggle theme manually — Phase 12 (not designed yet).
