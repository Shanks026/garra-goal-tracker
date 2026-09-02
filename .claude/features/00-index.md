# Garra — Project Index

The single orientation doc. What the app is, where everything lives, what's been built, and the
live schema.

**Update this in the same change as the code.** An index that lags is worse than no index.

Full product spec: [`garra-index.md`](../../garra-index.md) · Roadmap:
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)

---

## 1. What Garra is

A **finite, time-boxed goal tracker**. Every commitment lives inside an **Arc** — a fixed period
with a real end date. The app's promise is telling you whether you'll actually *make it*, not
just whether you showed up today.

Every habit app is infinite, which is why day 200 feels the same as day 12. Garra has an end
date, so progress is measurable against a real runway, falling behind is quantifiable, and the
run has a finale.

**Name**: *garra* — Spanish/Portuguese for grit, the fighting spirit ("tiene garra"). Same
formula as Strava (Swedish, "strive").

### Goal types

| Type | Shape | Example |
|---|---|---|
| **◉ Habit** | Recurring, schedule-based | Gym 4×/wk |
| **▲ Accumulate** | A number by the deadline | 800 km cycling |
| **✦ Ship** | Count of discrete outputs | 16 videos |
| **⬢ Milestone** | Ordered checkpoints | Chords → barre → 5 songs |
| ⊖ Limit | *(post-v1)* Stay under a cap | Screen time |

`checkpoints[]` lives on the shared schema, so any goal can carry them — a Milestone goal is
just a goal whose only content is checkpoints.

### Lexicon

Flavor lives only in headers, status labels, empty states, and celebrations. **All slang strings
live in `lib/copy.ts`**; tables and enums stay neutral.

| Concept | Term |
|---|---|
| The container | **Arc** |
| Anchor goals | **Mains** (rest: **Sides**) |
| Sub-targets | **Checkpoints** |
| Streak protection | **Freeze** |
| Weekly review | **Sunday Reset** |
| End-of-arc recap | **The Finale** |

**Status ladder**: `Locked in` (ahead) · `On track` · `Slipping` (behind, amber) ·
`Cooked` (unreachable). Locked in and On track both render **neutral grey** — success is the
absence of warning, not a color.

### Hard constraints

- **One active arc.** Archives read-only. Goals may end early via `goals.ends_at`.
- **Day rollover is 04:00 local**, not midnight. Everything goes through `dayKey()`.
- **Backfill window is 2 days**, and backfilled entries are visually marked.
- **A good day logs in under 10 seconds.** Outranks almost everything else in the log path.
- **Three tabs: Today · Arc · Settings.** Never a fourth.
- **Nothing derived is ever stored.** Pace, streaks, status, consistency, mosaic, load — all
  computed from `entries`.
- **Local-first.** SQLite is truth; Supabase is a sync target. No user action awaits the network.

---

## 2. Where everything lives

| Path | What |
|---|---|
| `garra-dev/` | The Expo app. All code. |
| `.claude/rules/01-design-system.md` | **Non-negotiable.** Tokens, all 9 chart specs, never-do list. |
| `.claude/rules/02-ui-components.md` | Folders, sheets, logging path, icons, a11y |
| `.claude/rules/03-state-and-data.md` | TanStack/Zustand split, derivation, time, sync, entitlements |
| `.claude/rules/04-hooks.md` | Hook kinds, shapes, naming, `useNow` |
| `.claude/rules/05-database.md` | Schema, RLS, migrations, sync engine |
| `.claude/rules/06-conventions.md` | TypeScript, testing, deps, definition of done |
| `design-system/…/Garra UI Kit.dc.html` | The 18 designed screens. **Visual source of truth**, and its `DCLogic` class holds exact chart math. |
| `garra-index.md` | Full product spec — mechanics, forms, monetization rationale |
| `IMPLEMENTATION.md` | Phased roadmap + design deltas |
| `.mcp.json` | Supabase MCP credentials. **Gitignored.** |

### Stack

Expo · React Native (new arch) · TypeScript strict · expo-router · NativeWind ·
`@shopify/react-native-skia` · Reanimated · TanStack Query · Zustand · expo-sqlite + Drizzle ·
**Supabase (Postgres + Auth + RLS)** · RevenueCat · Sentry

---

## 3. Phase status

| # | Phase | Doc | Status |
|---|---|---|---|
| 0 | Project initialization & dependency checks | `01-project-initialization.md` | ✅ Complete (0.1 ✅, 0.2 ✅ on emulator — physical-device spot check still pending, 0.3 ✅ mostly — see notes) |
| 1 | Foundation — tokens, schema, theme | `02-foundation.md` | ✅ Complete |
| 2 | The chart set | `03-chart-set.md` | ✅ Complete |
| 3 | The pace engine | `04-pace-engine.md` | ✅ Complete |
| 4 | Onboarding & arc creation | `05-onboarding-arc-creation.md` | ✅ Built, statically verified — on-device pass pending |
| 5 | Home & logging ⭐ | `06-home-and-logging.md` | ✅ Built, statically verified (145 tests) — on-device pass + the 10-second measurement deferred to end of Phase 7 |
| 5.5 | Motion & feel | `07-motion-and-feel.md` | ✅ Built, statically verified — on-device pass deferred to end of Phase 7 |
| 6 | Goal detail | `08-goal-detail.md` | ✅ Built, statically verified (181 tests) — on-device pass deferred to end of Phase 7 |
| 7 | The Arc tab | `09-arc-tab.md` | ✅ Built, statically verified (209 tests) — on-device pass pending |
| 8 | Auth & sync | `10-auth-and-sync.md` | ✅ 8.0–8.5 built, statically verified (251 tests) — on-device pass pending · 🔒 8.6 (Google/Apple OAuth) on hold by user decision |
| 9 | Sunday Reset & notifications | — | ⬜ |
| 10 | The Finale | — | ⬜ |
| 11 | Monetization | — | ⬜ |
| 12 | Polish & ship | — | ⬜ |

Next available feature-doc number: **11**

---

## 4. Schema Reference

**Applied 2026-09-01, Phase 1.5.** Since Supabase migrations aren't committed as files, this
section plus `02-foundation.md`'s Phase 1.5 SQL block are the only durable record of the remote
schema. Every table below has RLS enabled with the identical policy shape — only the name and
target table differ, so it's stated once instead of six times:

> `CREATE POLICY "Users manage own [table]" ON [table] FOR ALL`
> `USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);`
>
> Plus a `moddatetime` trigger on **`synced_at`** (⚠️ *not* `updated_at` — see below), and the
> standard columns (`id uuid PK default gen_random_uuid()`, `user_id uuid default auth.uid()`,
> `created_at`/`updated_at`/`synced_at timestamptz default now()`) on every table.

**Two timestamps, two owners** (Phase 8.0, `10-auth-and-sync.md`). This is load-bearing:

| Column | Owner | Purpose |
|---|---|---|
| `updated_at` | the **client**, sent explicitly on every write, **no trigger** | last-write-wins conflict resolution |
| `synced_at` | the **server**, `DEFAULT now()` + `moddatetime` trigger, never sent by a client | the pull watermark |

Until Phase 8.0 the trigger targeted `updated_at`, which **inverted LWW** — a device pushing a
stale row had its timestamp rewritten to `now()`, so the stale edit looked newest and destroyed
the fresher one on the other device. `synced_at` exists remotely only; it never enters SQLite.

### arcs
| Column | Type | Notes |
|---|---|---|
| title | text | not null |
| starts_at / ends_at | date | not null |
| status | text | default `'draft'`, CHECK in (`draft`,`active`,`archived`) |
| timezone | text | not null |
Indexes: none beyond PK.

### goals
| Column | Type | Notes |
|---|---|---|
| arc_id | uuid | FK → arcs, ON DELETE CASCADE |
| type | text | CHECK in (`habit`,`accumulate`,`ship`,`milestone`) |
| title | text | not null — added Phase 4.1; missing since Phase 1.5, see `05-onboarding-arc-creation.md` |
| direction | text | default `'up'`, CHECK in (`up`,`down`) — the ⊖ Limit type's seam |
| accent, icon | text | not null |
| is_main | boolean | default `false` |
| target_amount, starting_value, session_target | numeric | nullable |
| unit, cadence_mode, pace_basis, item_noun | text | nullable |
| times_per_week, interval_days, est_minutes | integer | nullable |
| days_of_week | integer[] | nullable — **native Postgres array**; SQLite side stores this as JSON `text` (no array type exists there), see `02-foundation.md` §1.4.7 |
| quick_add | numeric[] | nullable, same array-type note as above |
| starts_at | date | nullable — null means "starts with the arc"; added Phase 5.0, mirrors ends_at |
| ends_at | date | nullable — lets a goal end before the arc does |
| status | text | default `'active'`, CHECK in (`active`,`paused`,`archived`) |
Indexes: `goals_arc_id_idx` on `arc_id`.

### entries
| Column | Type | Notes |
|---|---|---|
| goal_id | uuid | FK → goals, ON DELETE CASCADE |
| day_key | text | not null, `'YYYY-MM-DD'` post-04:00-rollover |
| logged_at | timestamptz | not null |
| value | numeric | nullable |
| skipped, backfilled | boolean | default `false` |
| skip_reason, title, link | text | nullable |
Indexes: `entries_goal_day` **unique**, `(goal_id, day_key) WHERE skipped = false`.

### checkpoints
| Column | Type | Notes |
|---|---|---|
| goal_id | uuid | FK → goals, ON DELETE CASCADE |
| title | text | not null |
| position | integer | not null |
| target_date | date | nullable |
| hit_at | timestamptz | nullable |
| notes | text | nullable |
Indexes: `checkpoints_goal_id_idx` on `goal_id`.

### rescopes
Append-only audit log — no `updated_at`-driven edits expected in practice, though the column and
trigger exist like every other table.
| Column | Type | Notes |
|---|---|---|
| goal_id | uuid | FK → goals, ON DELETE CASCADE |
| from_target, to_target | numeric | nullable |
| reason | text | nullable |
| updated_at | timestamptz | remote has had it since 1.5; **added locally in Phase 5.0** — the two had silently diverged, and LWW sync keys on it |
Indexes: none beyond PK.

### freezes
| Column | Type | Notes |
|---|---|---|
| arc_id | uuid | FK → arcs, ON DELETE CASCADE |
| earned_for_week | text | not null |
| consumed_for_day_key | text | nullable |
Indexes: none beyond PK.

### Local-only tables (in SQLite, never mirrored remotely)
- `sync_queue` — the outbox: `table_name`, `row_id`, `op`, `payload jsonb`, `attempts`,
  `last_error`. **Written by all nine mutations as of Phase 8.2** (it had zero writers from
  Phase 1 until then, so every row created in Phases 4–7 was invisible to sync). Rows store
  `(table, row_id, op)` only — the drain re-reads the row fresh, which is what makes replay
  idempotent; `payload` holds `{}`.
- `sync_state` — one row, `id` fixed to `'singleton'`: `user_id`, `watermark`, `last_synced_at`,
  `last_error`. Added Phase 8.0. In SQLite rather than MMKV because `last_error` should survive
  a cache clear.
- `local_profile` — one row, `id` fixed to `'local'`, plus `name`. Holds the display name
  captured in onboarding; mirrored up to `profiles` on first sign-in (Phase 8.4). Added Phase
  4.1; it was missing from this reference entirely until the Phase 5 audit caught it.

### `profiles` (remote-only) — created Phase 8.0
`id uuid PK references auth.users(id) on delete cascade`, `name text not null`,
`created_at`/`updated_at`/`synced_at`. **Keyed on `id`, not a separate `user_id`** — it is 1:1
with `auth.users` — so its RLS policy is `(select auth.uid()) = id` in both clauses. Not one of
the synced tables and has no outbox entry; `pushProfileName()` upserts it directly.

### Local ↔ remote divergences (all deliberate, all recorded)
1. `goals.days_of_week` / `goals.quick_add` are JSON-mode `text` locally vs native Postgres
   arrays remotely — SQLite has no array type.
2. Locally generated ids come from `expo-crypto`'s `Crypto.randomUUID()`; remote defaults to
   `gen_random_uuid()`.
3. `created_at`/`updated_at` are TEXT locally vs `timestamptz` remotely, and **locally they
   carry two different formats**: every `db.insert()` omits `updated_at` and takes SQLite's
   `(current_timestamp)` → `'2026-09-02 14:33:01'` (UTC, zone-less, space-separated), while
   every `db.update()` sets it via `toISOString()` → `'2026-09-02T14:33:01.123Z'`. Both break
   naive comparison — `' '` (0x20) sorts before `'T'` (0x54), and `new Date('… 14:33:01')` is
   parsed as *local* time by JS. **Everything goes through `parseTimestamp()` in
   `lib/sync/mapping.ts`**; never compare these as strings and never hand one to `new Date()`
   directly. There is no local `moddatetime` trigger, so every `db.update()` must set
   `updatedAt` by hand (Phase 5.0 fixed the mutations that didn't).
5. `synced_at` exists **remotely only** — server-owned, and a local copy would invite someone to
   read it as truth. The pull watermark lives in `sync_state.watermark` instead.
4. `ON DELETE CASCADE` now exists on every child FK on **both** sides (Phase 5.0 — local FKs
   were `no action`), and `lib/db/client.ts`'s `enableForeignKeys()` turns on SQLite's
   per-connection enforcement **after** migrations run, since Drizzle's table-recreate
   migrations must not execute with enforcement on.

### Known advisor notes (non-blocking, Phase 1.5)
- ~~A pre-existing `public.rls_auto_enable()` function flagged `SECURITY DEFINER`-callable by
  `anon`/`authenticated`.~~ **Investigated and closed at Phase 8.5: not exploitable.** It
  `RETURNS event_trigger`, a pseudo-type PostgREST cannot serialize, and its body calls
  `pg_event_trigger_ddl_commands()`, which errors outside an event-trigger context — calling it
  over REST returns `cannot display a value of type event_trigger`. It is Supabase-managed
  infrastructure (it's what auto-enabled RLS on these tables), so it is left untouched.
- Unindexed `user_id` FKs on every table, and the two goal/checkpoint indexes flagged "unused" —
  both expected on an empty schema with no query traffic yet. Not adding speculative indexes;
  revisit once real usage shows an actual slow query.

### Applied migrations

| Date | Phase / doc | What changed |
|---|---|---|
| 2026-09-01 | Phase 1.5, `02-foundation.md` | `create_arcs`, `create_goals`, `create_entries`, `create_checkpoints`, `create_rescopes`, `create_freezes` — full initial schema, RLS on all six |
| 2026-09-01 | Phase 4.1, `05-onboarding-arc-creation.md` | `add_goals_title` — `goals.title text not null`, a Phase 1.5 omission (no table ever held a goal's display name) found while wiring the first real goal-creation mutation |
| 2026-09-02 | Phase 5.0, `06-home-and-logging.md` | `add_goals_starts_at` — `goals.starts_at date` nullable. Locally the same migration (`0003`) also adds `rescopes.updated_at` and `ON DELETE CASCADE` to every child FK, both of which the remote schema already had. |
| 2026-09-02 | Phase 8.0, `10-auth-and-sync.md` | `add_synced_at_and_profiles` — `synced_at timestamptz` on all six synced tables; `moddatetime` **retargeted** from `updated_at` to `synced_at` (the old trigger inverted LWW); `(user_id, synced_at)` watermark index per table; the `entries (goal_id, day_key) WHERE skipped = false` partial unique index, which had existed only in SQLite; and the `profiles` table with RLS. Locally, migration `0004` adds `sync_state` only. |

---

## 5. Shared Infrastructure

Check here before building — most of a feature is usually already available.

### Motion — `theme/motion.ts`
Built Phase 5.5. **The single source for every duration, stiffness, and delay** — same rule as
`tokens.ts` is for color, and `01-design-system.md` §6 is the full spec. Four springs (`press`
140ms · `snappy` 260ms · `gentle` 380ms · `bouncy` 420ms, the one flourish), three timings for
opacity, transform amounts (`pressScale`, `pulseScale`, `enterOffset`), and `staggerDelay(index)`
which clamps so a long list's last row isn't seconds late.

Library is **`react-native-reanimated`** (already a dependency): UI-thread animations, layout
presets, and `ReduceMotion.System` on every preset — so the OS accessibility setting is honored
without any component calling `AccessibilityInfo`. **Never add a second animation library.**

`components/ui/PressableScale.tsx` is the one implementation of press feedback; `Button`, `Chip`,
`GoalTypeCard`, and `GoalRow` all route through it. `theme/motion.test.ts` asserts the design
constraints themselves (nothing over 400ms except the flourish and the chart draw; press settles
faster than any state change; every spring overshoots), so a too-slow animation fails a test.

### Theme — `theme/`
`tokens.ts` — every color/typography/spacing/radius value from `01-design-system.md` §1–3.
`tailwind.config.js` generates its theme from this file (see standing rule #8 above for the
dark-mode class-pairing convention). `useAppTheme()` resolves the current NativeWind color
scheme to the matching raw `tokens.dark`/`tokens.light` object, for Skia/inline-style consumers
that can't take a `className`. Built Phase 1.1–1.2.

### `lib/`
- `date.ts` — `dayKey()`, the 04:00 rollover, via `@date-fns/tz`'s `TZDate` (plain `date-fns`
  is timezone-naive — see `02-foundation.md` Phase 1.3 notes). Unit-tested: rollover boundary,
  DST spring-forward/fall-back, non-DST half-hour-offset timezone, cross-timezone divergence.
- `copy.ts` — the core lexicon (Arc, Mains, Sides, Checkpoints, Freeze, Sunday Reset, The
  Finale, status ladder). Screen-specific strings get added by whichever phase needs them.
- `entitlements.ts` — `useFlag<T>(flag): T`, every flag resolves to a permissive Pro-tier
  placeholder until Phase 11 (RevenueCat, held by user decision) settles the real free/Pro
  numbers from `IMPLEMENTATION.md`'s Design Deltas §3.
Built Phase 1.3.
- `date.ts`'s `deviceTimezone()` — a one-line `Intl.DateTimeFormat().resolvedOptions().timeZone`
  wrapper, the one deliberate place the device's own timezone is read (everywhere else takes
  `tz` as a parameter). Built Phase 4.1, captured once at arc creation onto `arcs.timezone`.
- `arcNaming.ts`'s `seasonalArcTitle(now)` — Spring/Summer/Autumn/Winter Arc by month; the fast
  onboarding path never asks for an arc name, so this fills `arcs.title` (not null) with a
  sensible default, editable later. Built Phase 4.1.
- `intents.ts` — the intent → goal template catalog (`INTENTS[]`, one entry per `IntentKey`,
  each with a `buildGoal({ totalDays })` that scales its target proportionally to the 122-day
  canvas reference). Excludes Sleep/Less scrolling/Weight (the ⊖ Limit type, post-v1). Built
  Phase 4.1, real work per `IMPLEMENTATION.md`'s explicit callout, not a stub.
- `queryKeys.ts` — the `qk` object (`03-state-and-data.md` §3's convention): `activeArc`,
  `draftArc`, `goals(arcId)`, `localProfile`. Built Phase 4.1.
- `queryPersister.ts` — a hand-written ~20-line MMKV-backed `Persister` for
  `@tanstack/react-query-persist-client`, not a separate persister package (`06-conventions.md`
  §6). Built Phase 4.1 — see standing rule #18 for `react-native-mmkv` v4's Nitro API shape.
- `date.ts`'s day-key arithmetic — `addDaysToKey`, `daysBetweenKeysInclusive`, `endOfYearKey`.
  Added Phase 5.0: three screens were each rebuilding day buckets with
  `format(new Date(), 'yyyy-MM-dd')`, which uses the device's local midnight and so bypassed the
  04:00 rollover every `entries.day_key` uses. **Never rebuild a day key with `format()`.**
- `accents.ts` — `ACCENT_HEXES`, `nextUnusedAccent(used)`, `assignAccents(count, alreadyUsed)`.
  One shared assignment rule so a preview and the row it writes can't disagree (Phase 5.0 fixed
  a case where Recommended goals colored dots by index while the mutation assigned next-unused).
- `navigation.ts` — `safeBack(router, fallback)`: `router.back()` when `canGoBack()`, else
  `replace`. Screens reachable by `router.replace` from the cold-start router have no history to
  pop, so a bare `back()` silently did nothing (Phase 5.0).
- `onboardingSteps.ts` — the fast path's ordered steps, so the "STEP n OF m" labels and the dot
  row share one source of truth (Phase 5.0; they had drifted apart).
- `format.ts` — `formatAmount`, `formatSigned`, `formatMinutes`, `formatGoalValue`. Pure display
  formatting, tested, so one value can't render two ways on two screens. Built Phase 5.1.
- `stores/toast.ts` — Zustand's first use in the app (installed since Phase 0, unused until
  now): the 5-second toast queue that makes undo possible. Ephemeral UI state only.

### `lib/db/` — local SQLite (Drizzle)
`schema.ts` — all 6 tables (`arcs`, `goals`, `entries`, `checkpoints`, `rescopes`, `freezes`) +
local-only `sync_queue`, no `user_id` column (RLS is Postgres-only; the sync engine attaches it
on the way up in Phase 8). `client.ts` exports the single shared `db` instance every future
query/mutation hook must import. `migrations/` is drizzle-kit-generated and committed; applied
at boot via `useMigrations()` in `app/_layout.tsx`, gating the splash screen. Round-trip
persistence verified on-device (kill + relaunch) in Phase 1.4. Two SQLite-only representation
deviations from the remote schema, both necessary and documented in `02-foundation.md` Phase
1.4: `goals.daysOfWeek`/`goals.quickAdd` are JSON-mode `text` locally vs. native Postgres
arrays remotely (no SQLite array type exists), and locally generated ids use `expo-crypto`'s
`Crypto.randomUUID()` (the bare `crypto` global isn't actually available at runtime — see
standing rule #10). `lib/derive/*` and `lib/sync/` don't exist yet.

### Charts — `components/charts/`
All nine built, Phase 2: `PaceRing`, `ArcSweep`, `Mosaic`, `WeekBars`, `WindowTicks`, `BurnUp`,
`Momentum`, `LoadDonut`, `CheckpointSpine`. Shared geometry (arc/ring math, the Catmull-Rom
smoother, load-donut segment math) lives in `components/charts/geometry.ts`, unit-tested
separately from rendering (22 tests). Every chart takes already-computed props (points, cell
states, `accent`) — none read `entries` or a goal object directly (rules/02-ui-components.md
§2). Fixture generators for dev/preview use only (never production) live in
`components/charts/__fixtures__/chartFixtures.ts`, and reuse the canvas's own seeded-random
approach deliberately — see standing rule #12.

### Derivations — `lib/derive/`
All five built, Phase 3 — pure functions, no React/hooks/I/O, `now` always passed in:
- `pace.ts` — `pace()`: expected/deficit/requiredRate/fractionDone(p)/fractionExpected(t)/status.
  Signature ported verbatim from `03-state-and-data.md` §4; feeds `PaceRing`'s `p`/`t` directly.
  `custom_weekly` basis is a documented fallback to `even` (no schema field exists for a real
  per-weekday distribution — user decision). On-track tolerance band is `±1/daysTotal`.
- `schedule.ts` — `isDueOn()`/`weeklyTarget()`/`occurrencesInRange()`: the single source of truth
  for cadence math (`daily`/`n_per_week`/`specific_days`/`every_n_days`). `isDueOn` throws for
  `n_per_week` (no per-day answer is well-defined for it) — callers must use the other two.
- `streaks.ts` — `arcStreak()` (forgiving, app-level, any-goal-logged) and `goalStreak()`
  (schedule-aware, freeze-consuming; `n_per_week` evaluates whole weeks, not days).
- `mosaic.ts` — `mosaicCells()`: day → `MosaicCellState`. Documents a real design gap — the
  4-state Mosaic model has no "rest day" state, so non-due days under `specific_days`/`daily`/
  `every_n_days` still render `'miss'`; `n_per_week` gets a best-effort treatment (miss lands on
  the last day of a completed short week) rather than guessing per-day. Flag for a possible 5th
  cell state once the Mosaic is live on a real screen.
- `load.ts` — `loadCheck()`: weekly/daily minute totals per goal and overall. Uses an 84-day
  (12-week) reference window, not a single 7-day window, to average `every_n_days` occurrences
  correctly regardless of interval/7 alignment (see standing rule #16).

- `cadence.ts` — `cadenceForGoal(goal, arc)`: the **only** producer of a `CadenceConfig` from a
  stored goal row. Resolves the goal's own anchor (`startsAt`, else `createdAt` through
  `dayKey()`, clamped to the arc's start) separately from `weekAnchorDate` (always the arc's
  start, so every goal's `n_per_week` weeks align with each other and the arc mosaic). Added
  Phase 5.0 after the audit found the previous inline `createdAt.slice(0, 10)` was UTC-sliced
  and about to be copy-pasted three times.

Full rationale and the two test-design bugs found while writing the original five modules:
`04-pace-engine.md`'s Implementation Notes. Suite-wide test count lives in the Phase status
table's own notes rather than here, so it can't go stale again.

### Sync & auth — `lib/sync/`, `lib/supabase.ts` (Phase 8)

**The only place SQLite and Supabase meet is `lib/sync/engine.ts`.** A hook or component that
imports `lib/supabase` is a bug — it's how local-first quietly becomes online-first
(`rules/03` §2).

- `tables.ts` — `SyncTable`, `SyncOp`, and `SYNC_TABLES` (push/pull order: parents before
  children, because remote FKs are real). Types only, so the pure modules can import it.
- `mapping.ts` — **pure.** Per-table field specs plus `toRemote`/`fromRemote`: camelCase ⇄
  snake_case, JSON-text arrays ⇄ real arrays, `user_id` omitted on push (relies on
  `DEFAULT auth.uid()`), `synced_at` stripped on pull, Postgres `numeric`-as-string coerced back
  to a number. **`parseTimestamp()` lives here and is the only correct way to compare a local
  timestamp** — see divergence #3.
- `resolve.ts` — **pure.** The sync reducer: `collapseQueue()` (replay idempotency — repeated
  upserts collapse to one, a later delete beats earlier upserts, a later upsert beats an earlier
  delete), `resolveConflict()` (LWW on client `updated_at`), `nextWatermark()`.
- `outbox.ts` — `enqueueUpsert`/`enqueueDelete` (fire-and-forget, never awaited, never throws),
  `pendingRows`, `pendingCount`, `dequeue`, `dropQueuedFor`, `recordAttempt`.
- `state.ts` — the `sync_state` singleton.
- `engine.ts` — `syncNow()` (`pull → resolve → push`, mutex'd, never throws), `scheduleSync()`
  (2s debounce), `pushProfileName()`. Triggered on boot, app foreground, sign-in, and a settled
  mutation via `MutationCache.onSuccess` — **never on an interval.**
- `lib/secureSessionStore.ts` — chunked `SecureStore` adapter. Sessions run 2–4 KB against
  SecureStore's ~2048-byte ceiling, and an oversized Android write *warns rather than throws*,
  so the failure mode without this is a user silently signed out on every cold start.

### Hooks — `hooks/`
`useSheetBackHandler` (Phase 2.5) — wires `BackHandler` to a `BottomSheetModal` ref so Android
back dismisses the sheet instead of falling through to expo-router and exiting the app. Every
sheet must use this; see standing rule #13 for the provider it depends on.

`useArcBuilder.ts` (Phase 4.1) — the app's first real query/mutation hooks, all facets of the
in-progress-draft-arc concern: `useDraftArc`/`useActiveArc`/`useGoalsForArc` (query),
`useLocalProfileName`/`useSetLocalProfileName` (query/mutation pair for the local-only name),
`useSetArcWindow`/`useAddGoalToDraft`/`useActivateArc` (mutation), `useDraftLoadCheck` (query,
wires real goal rows to Phase 3's `loadCheck()`). Every mutation writes SQLite directly and
invalidates by prefix — none touch Supabase (Phase 8 territory).

`useAuth.ts` / `useSignIn.ts` / `useSyncStatus.ts` (Phase 8.4–8.5) — `useAuth` exposes the
session (`undefined` while the keychain read is still in flight, so Settings doesn't flash "Sign
in" at someone already signed in). `useSendCode`/`useVerifyCode` are the **email-OTP** path —
six-digit code, not a magic link, so no redirect-URL allowlisting and no deep-link handler is
needed. `useVerifyCode` also refuses a *different* account on a device that already holds data,
mirrors `local_profile.name` to `profiles`, and triggers the first (push-only) sync.
`useSignOut` clears the session and `sync_state` and **leaves every SQLite row alone.**

`useNow.ts` (Phase 5.1) — the app's clock, per `04-hooks.md` §4: ticks on mount, on app
foreground, and at the next 04:00 rollover in the *arc's* timezone. One re-armed timeout, never
an interval. `msUntilNextRollover()` is exported and tested separately.

`useLogEntry.ts` (Phase 5.1) — `useLogEntry`, `useUndoEntry`, `useSkipDay`, `useLogEverything`.
The log path: **upserts** (the partial unique index means a second ride aggregates into the day's
single row), haptic + optimistic patch in `onMutate`, rollback + toast in `onError`, prefix
invalidation in `onSettled`, and no spinner anywhere. The 2-day backfill rule lives in
`lib/derive/backfill.ts` so it's testable without the native SQLite module.

`useHomeData.ts` (Phase 5.1) — everything Home renders, from one pass over one dataset: the arc
hero's day counter, the Today list split into Mains/Sides, the Arc rows' `p`/`t`/status/value,
and yesterday's unlogged goals for the pre-10:00 backfill row. Deliberately one hook rather than
three — see the feature doc's Implementation Notes.

### UI primitives — `components/ui/`
All built, Phase 2.5: `Button` (primary/secondary/outline — primary never accent-colored),
`Chip` (filter/intent variants), `ListGroup`/`ListRow` (inset grouped list), `StatusPill`
(neutral/slipping), `Checkbox` (spring overshoot + haptic-on-tap), `SectionLabel`, `NumPad`
(the custom 12-key value-entry pad — never the OS keyboard). `sheets/Sheet.tsx` is the shared
shell every real sheet (Phase 4+) builds on — standard chrome plus `useSheetBackHandler` wired
automatically.

`Chip` gained an optional `icon?: LucideIcon` prop in Phase 4.2 (intent chips carry a leading
glyph) — additive, existing filter-chip usages unaffected. `StepDots` (Phase 4.2) is the 5-dot
onboarding progress row.

### Goal components — `components/goal/`
Built Phase 4.2–4.4: `GoalIcon`/`GOAL_ICON_KEYS`/`ICONS_BY_KEY` (the curated icon-key → Lucide
map, `02-ui-components.md` §6 — built in 4.2, ahead of its planned 4.4 slot, since the Intent
screen needed it first), `GoalTypeCard` (the 2×2 type-picker tile, screen 07), `AccentPicker`
(the 8-swatch row with per-arc uniqueness enforced by a disabled set, screen 08). `GoalRow`/
`TodayRow` (Home-specific) are still Phase 5.

### Home & the tab bar — `app/(tabs)/`
Built Phase 5: `_layout.tsx` (exactly three tabs — Today · Arc · Settings — with the canvas's
line-drawn glyphs built from Views, plus the `Toast` mounted once so undo survives a tab switch),
`index.tsx` (Home, screens 10/11), and placeholder `arc.tsx`/`settings.tsx` for Phases 7 and 12.
Supporting components: `components/home/ArcHero.tsx`, `components/home/YesterdayRow.tsx`,
`components/goal/TodayRow.tsx` (with swipe-left skip), `components/goal/GoalRow.tsx`,
`components/ui/Toast.tsx`. Sheets: `sheets/LogSheet.tsx` + `LogSheetProvider` + `LogSheetHost`
(the imperative `useLogSheet().openLog(goal)` pattern from rules/02 §3, mounted at the app root)
and `sheets/SkipReasonSheet.tsx`.

### Onboarding & Arc Builder routes
`app/(onboarding)/` (screens 01–05: welcome, name, intent, recommended, signup) and
`app/arc-builder/` (screens 06–09: window, goal-type, goal-form, load-check) — built Phase 4,
full detail and the fast-path's real screen order in `05-onboarding-arc-creation.md`.
`app/index.tsx` is now the real cold-start router (splash → onboarding / resume builder / a
temporary Home-is-Phase-5 placeholder), replacing the Phase 0/2 dev placeholder.

### Dev routes
`app/_dev-charts.tsx` — permanent kitchen-sink route (not deleted after Phase 2, unlike the
throwaway smoke-test routes from Phase 0/1) exercising every chart and UI primitive against
fixture data, with an in-route dark/light toggle. **No longer linked from `app/index.tsx`**
since Phase 4.5 repurposed that route as the real cold-start router — reach it during
development by navigating to `/_dev-charts` directly (e.g. typing the URL in Expo's dev menu, or
a deep link). Still exercises `WindowTicks` with its Phase 4.3 `startDate` prop addition.

---

## 6. Pending verification — the post-Phase-7 test pass

**Nothing in this list has been verified on a device.** Every phase below is statically verified
only (`tsc --noEmit`, `eslint .`, `jest`), and by explicit user decision the whole on-device pass
runs **once, after Phase 7 is complete** — the emulator causes severe I/O contention on this
machine (standing rule #17), so batching is cheaper than paying that cost per phase.

Treat this as the test plan for that session. Anything checked here should be checked in its own
feature doc at the same time.

### Phase 0 — native dependencies
- [ ] Physical-device spot check (`01-project-initialization.md` §0.2.4). Emulator passed; a real
      device never ran.

### Phase 4 — onboarding & arc creation (`05-onboarding-arc-creation.md` §4.5.9)
- [ ] Fresh install (empty SQLite) lands on Welcome with no flash of another screen first
- [ ] Kill the app mid-builder (after Window, before goals) → relaunch resumes at goal-type
- [ ] Kill it after 3 goals exist → relaunch resumes at load check
- [ ] The full flow completed once in **airplane mode**, ending with `status: 'active'` and 3+ goals
- [ ] Both themes render correctly across all nine screens

### Phase 5 — Home & logging (`06-home-and-logging.md`)
- [ ] **A five-goal day logs in under 10 seconds, timed with a stopwatch, in airplane mode.**
      This is `IMPLEMENTATION.md`'s own done-condition for Phase 5 and the single most important
      item in this list — the phase is not actually done until this number exists. Record the
      measured value in that doc's Implementation Notes.
- [ ] Airplane mode: log, relaunch, everything survives
- [ ] Exactly three tabs, matching §7's heights/weights/colors, in both themes
- [ ] Cold start with an active arc lands on Home with no visible flash
- [ ] Android hardware back dismisses the log sheet and does **not** exit the app
      (`useSheetBackHandler` is wired, but this has shipped broken in a sibling project before —
      standing rule #1)
- [ ] Logging the same goal twice in one day leaves exactly one row (the upsert)
- [ ] The undo toast actually reverses the write, and expires on its own after 5s
- [ ] Swipe-left skip doesn't fight the tab navigator's edge gestures or the checkbox tap
- [ ] The Yesterday row appears only before 10:00 and only when yesterday has unlogged goals
- [ ] The 122-cell mosaic still scrolls at 60fps (re-check after Phase 7 renders it for real)

### Phase 5.0 — foundation repairs (`06-home-and-logging.md` §5.0)
- [ ] Migration `0003` applies cleanly on a device that already has Phase 4 data — it recreates
      five tables, and its two hand-fixed defects (see standing rule #21) have only been read,
      not run
- [ ] `local_profile` round-trips through a real cold start
- [ ] Foreign-key enforcement is actually on after boot (`PRAGMA foreign_keys`), and deleting an
      arc cascades to its goals and entries

### Phase 5.5 — motion & feel (`07-motion-and-feel.md`)
- [ ] Every animation runs on the UI thread — no frame drops while logging
- [ ] Reduce Motion (OS setting) genuinely disables entrances, press scales, and pulses while
      leaving every state change intact
- [ ] Both themes, and a low-end Android device if one is available


### Phase 6 — goal detail (`08-goal-detail.md`)
- [ ] **The full state machine, driven by hand: on-track → slipping → cooked → rescoped**, with
      the ring, burn-up, status pill, and required rate correct at each step. This is
      `IMPLEMENTATION.md`'s own done-condition for Phase 6.
- [ ] All four type-swapped heroes render with no dead space
- [ ] A checkpoint is hit in exactly one tap and the spine's `current` node advances
- [ ] Long-press on a mosaic cell backfills within 2 days and refuses beyond it
- [ ] The rescope prompt appears at most once per visit and never blocks the screen
- [ ] Back from goal detail returns to the tab the user came from
- [ ] `system.cooked` appears in exactly two places app-wide: the status pill and the rescope sheet

### Phase 7 — the Arc tab (`09-arc-tab.md`)
- [ ] **Planned vs actual reads truthfully against logged entries** — `IMPLEMENTATION.md`'s own
      done-condition for Phase 7
- [ ] Rest days are visibly distinct from both misses and future days on a real 122-day arc, in
      both themes — the fifth cell state's whole reason for existing
- [ ] The 122-cell mosaic still scrolls at 60fps as one Skia canvas
- [ ] The momentum headline matches the curve's last point
- [ ] The pace summary matches Home's rows exactly for the same goals

### Phase 8 — auth & sync (`10-auth-and-sync.md`)
Needs **two devices and two email accounts** for the full pass — the heaviest test setup of any
phase so far.

- [ ] Migration `0004` applies at boot (`sync_state` created)
- [ ] A real OTP email arrives and verifies — note Supabase's built-in sender is rate-limited to
      ~2–3/hour on the free tier, so don't burn attempts
- [ ] **First sign-in pushes a local-only arc up** and does not pull first — build an arc with
      "Keep it on this phone", then sign in, then confirm the rows in Supabase
- [ ] **A second account sees nothing** (`IMPLEMENTATION.md` requires this explicitly). The
      unauthenticated half is already verified: every table returns `[]` to a REST request
      carrying only the publishable key
- [ ] Signing in as a *different* account on a device that already holds data is refused with an
      explanation, not merged
- [ ] **Log offline on device A → sign in → it appears on device B** — the phase's real
      done-condition
- [ ] Then **kill the network and confirm the app is still fully usable** — the other half of it
- [ ] Airplane mode: log, kill the app, relaunch, data survives, and no sync error surfaces
      anywhere in the UI
- [ ] A session survives a cold start — this is what proves the chunked SecureStore adapter
      works on a real keychain; the unit tests only prove the chunking logic
- [ ] Sign out, then confirm **every local row is still there**
- [ ] Google and Apple buttons are visibly disabled and do nothing when pressed (§8.6 is on hold)
- [ ] The Settings sync row reads sensibly through the states: not signed in → pending → synced
- [ ] Both themes


## 7. Standing Rules Learned The Hard Way

Append whenever something breaks in a way a rule would have prevented, then promote it into
`.claude/rules/` if it generalises.

1. **`useSheetBackHandler` on every sheet.** `@gorhom/bottom-sheet` v5 has no Android
   hardware-back handling. Without it, back with a sheet open falls through to expo-router, and
   since Home is the root there's nothing to pop — the OS exits the app. Carried from a sibling
   project where it shipped on 11 sheets before being caught on-device.
2. **`DEFAULT auth.uid()` on every `user_id`.** Client inserts omit `user_id`. Without the
   default it inserts NULL and RLS rejects it with a misleading
   `new row violates row-level security policy` rather than a NOT NULL error. Verify against
   `information_schema.columns` before applying — not from memory.
3. **Expo Go cannot load this app.** Skia, MMKV, and gesture-handler are native. A dev client
   build is required from Phase 0 onward.
4. **`eslint-config-expo` and `jest-expo` are versioned per-SDK, not on an independent semver
   line.** Plain `npm install` grabs their latest overall release, which can be several SDK
   lines ahead of the app. Always install these via `npx expo install` (or verify with
   `npx expo install --check` immediately after) rather than a bare `npm install --save-dev`.
5. **A bare `npm install`/`npx expo install` in this dependency graph hits an unrelated
   react-dom peer conflict**, from `expo-router`'s web/DOM-webview chain (`@radix-ui/*` →
   `vaul`) wanting a different `react-dom` than the pinned `react`. Reproduced independently on
   SDK 57 and SDK 54, so it's an upstream expo-router issue, not a version choice of ours.
   `garra-dev/.npmrc` sets `legacy-peer-deps=true` to bypass it — harmless since v1 ships no web
   target. Re-check if a future `npm install` starts failing with an ERESOLVE mentioning
   `react-dom`/`@radix-ui`.
6. **ESLint 10 breaks `eslint-plugin-react`** (pulled in by `eslint-config-expo`) — its latest
   release only declares support up to `eslint@^9.7`. `garra-dev` pins `eslint@9.39.5` (last
   stable 9.x) until the plugin catches up. Re-check before ever bumping ESLint.
7. **Expo Go stays usable only as long as no screen imports `@shopify/react-native-skia` or
   `react-native-mmkv`.** Both compile native code that Expo Go's fixed binary doesn't contain;
   every other installed native dep (gesture-handler, Reanimated, bottom-sheet, SQLite, etc.) is
   bundled in Expo Go and works fine there. This buys a fast dev loop through Phase 1, but
   Phase 2 (the chart set, all Skia) and any MMKV persister wiring need a real dev-client build —
   see `01-project-initialization.md` §0.2.4 for the deferred-verification note.
8. **NativeWind's native compiler does not support CSS custom properties scoped to a `.dark`
   (or `:is(.dark *)`) base-layer selector** — only its own `dark:` *utility variant* is
   reliable (confirmed by inspecting actual compiled output; a custom-property `addBase` rule
   is silently dropped outside `:root`). Every theme-variant semantic color from
   `theme/tokens.ts` therefore exists as **two** Tailwind color names — the plain name (light
   value) and a `-dark` suffix (dark value) — used together:
   `className="bg-bg dark:bg-bg-dark"`. There is no single auto-switching token name. See
   `02-foundation.md` Phase 1.1's Implementation Notes for the full story.
9. **Every file under `app/` is eagerly bundled by Expo Router**, whether or not any screen
   navigates to it — it statically imports the whole directory to build the route table. One
   dev-only route importing Skia or MMKV breaks Expo Go for the *entire* app, not just that
   screen (this is exactly what happened with `app/smoke.tsx` in Phase 1.2 — see
   `02-foundation.md`). Keep anything importing those two out of `app/` entirely until the
   native dev-client build (now complete on emulator, `01-project-initialization.md` §0.2.4).
10. **The bare `crypto.randomUUID()` global is not actually available at runtime**, despite
    TypeScript's ambient lib types not flagging it as an error — a type declaration existing
    doesn't mean the runtime global does. Found on-device in Phase 1.4 ("property 'crypto'
    doesn't exist"). Use `expo-crypto`'s `Crypto.randomUUID()` instead for every locally
    generated id (SQLite has no `gen_random_uuid()`) — it's a first-party Expo module, bundled
    in Expo Go, so it doesn't affect standing rule #7's compatibility window.
11. **On this Windows dev machine, port 8081 is unreliable** — a protected Hyper-V system
    service (`macmnsvc.exe`) persistently binds it and cannot be killed, and can cause a Metro
    instance sharing that port to silently fail to answer requests even though `netstat` shows
    it listening. When a native dev-client build can't reach Metro (`Unable to load script.` /
    red screen), check `netstat -ano | grep :8081` first. Prefer a different port for
    `expo run:android`/`expo start`, and use `taskkill //F //PID <n>` — not `pkill`, which
    doesn't reliably match these processes in git-bash — to clear any of *our own* stale
    listeners on whatever port is chosen. Full debugging story in
    `01-project-initialization.md`'s Phase 0.2 Implementation Notes.
12. **`@gorhom/bottom-sheet`'s `BottomSheetModal` requires a `BottomSheetModalProvider`
    mounted at the app root** — without it, rendering any `BottomSheetModal` (including via
    `sheets/Sheet.tsx`) crashes with `'BottomSheetModalInternalContext' cannot be null!`.
    Mounted once in `app/_layout.tsx`, wrapping the `Stack` — every sheet gets it for free from
    here on. Found on-device in Phase 2.6; `02-ui-components.md` §3 already documented the
    provider pattern but nothing had actually mounted it yet.
13. **Fixture/demo data for a chart must respect that chart's own scale, not just its target**
    — `BurnUp`'s Y-axis ceiling is scaled to the *visible window* (`target * win / totalDays`),
    not the full-arc target. A fixture value that's a plausible fraction of the full target can
    still be wildly out of range for the window and clip off the canvas — found via a user's
    on-device visual check in Phase 2.6, not by any unit test (the path-generator tests check
    string well-formedness, not visual plausibility against a specific viewBox). Worth a
    runtime sanity check when real data starts feeding this chart (Phase 3+).
14. **Skia cannot be imported inside a Jest test** (`Cannot find module '.../NativeSetup'`) —
    it's a native module with no Jest mock. Any pure function whose only consumer is Skia (e.g.
    asserting a path string is valid for `Skia.Path.MakeFromSVGString`) has to be tested via a
    structural proxy (e.g. a regex checking the string is well-formed) rather than by actually
    calling Skia. See `components/charts/geometry.test.ts`'s `isWellFormedSvgPath` helper.
15. **A long session sending many screenshots can hit a hard "many-image request" limit** on
    reading further images, independent of individual file size (a 220×489px resize still
    failed after enough prior images). If this happens, pivot to asking the user to look at the
    device/emulator directly and report back, combined with `adb logcat` checks — don't keep
    retrying reads.
16. **Averaging a cadence's weekly occurrence count from a single arbitrary 7-day window gives
    phase-dependent (sometimes wrong) results for `every_n_days` intervals that don't divide
    evenly into 7** — e.g. `intervalDays: 3` can land 2 or 3 occurrences depending on which 7
    days are sampled. Found while building `load.ts` (Phase 3.5), before it became a test
    failure. Fixed by using an 84-day (12-week) reference window instead — a common multiple of
    7 and every practical interval value — which converges on the correct long-run average
    regardless of alignment. Applies to any future derivation that needs a "per week" figure
    from a day-deterministic cadence.
17. **The Android emulator running causes severe system-wide I/O contention on this Windows
    machine** — `Bash`/PowerShell calls (even trivial ones like `cat`) repeatedly time out and
    auto-background under load, but the `Read` tool bypasses this contention entirely and
    returns instantly, since it doesn't spawn a shell subprocess. During any phase with the
    emulator running (or any other heavy local process), prefer `Read` over `Bash`/`cat` for
    inspecting files if shell calls start stalling. Discovered during Phase 2; closing the
    emulator for Phase 3 (pure Jest-testable logic, no on-device verification needed) avoided
    the problem entirely rather than working around it.
18. **`react-native-mmkv` v4 is a Nitro-modules library, not the old class-based API** —
    `MMKV` is a type-only export; create an instance with `createMMKV(config)`, not
    `new MMKV(config)`. Caught immediately by `tsc` while building the query-cache persister
    (Phase 4.1), not a runtime surprise, but worth recording since the old constructor pattern
    is what most existing MMKV tutorials/examples still show. Check a library's actual shipped
    `.d.ts` before writing code against a remembered API shape, especially for a dependency that
    was installed in Phase 0 and not touched since.
19. **A type-cast that silences a TypeScript error is a place to stop and investigate, not a
    place to move past.** An `as never` cast in a mutation call (Phase 4.4's goal-creation form)
    was hiding two real defects at once — a missing `checkpoints` field and a missing `accent`
    field on the mutation's input type — meaning every Milestone goal silently lost its
    checkpoints and every manual accent choice was silently discarded. Both worked "fine" in the
    sense that nothing crashed; the bug was in data never being written. Caught only because the
    cast itself looked suspicious enough to double-check before closing out the phase. Any
    `as never`/`as any`/`as unknown as X` in new code is worth a second look before commit — see
    `05-onboarding-arc-creation.md`'s Implementation Notes for the full story.
20. **A pure rule must not live in a file that imports a native module.** The 2-day backfill
    guard was written inside `hooks/useLogEntry.ts`; its test failed instantly, because importing
    that hook pulls in `lib/db/client.ts` → `openDatabaseSync`, which Jest cannot load. Same
    shape as rule #14 (Skia). Moved to `lib/derive/backfill.ts` and it became testable — which is
    also where `03-state-and-data.md` §5 says the rule belongs. When a rule is hard to test, check
    whether it's sitting in the wrong layer before reaching for a mock.
21. **Drizzle's generated table-recreate migrations need reading before they run.** The Phase 5.0
    migration (`0003`) had two defects drizzle-kit produced on its own: its `INSERT ... SELECT`
    read columns from the *old* tables that only exist on the new ones (so it would have failed
    outright), and it re-enabled `PRAGMA foreign_keys` **mid-file**, before the destructive
    `DROP TABLE goals` — which with enforcement on would have cascade-deleted every entry and
    checkpoint. Always read a recreate migration end to end, and keep `PRAGMA foreign_keys` off
    for the whole of it (`lib/db/client.ts`'s `enableForeignKeys()` is called after migrations
    finish, deliberately not at module load).

22. **A `moddatetime` trigger on `updated_at` breaks last-write-wins sync.** `rules/05` §2 told
    us to add one; it silently inverted every conflict, because a device pushing a *stale* row
    got its timestamp rewritten to `now()` and therefore looked newest. The general lesson:
    **when a column is used to decide a conflict, exactly one side may own it.** Splitting it
    into a client-owned `updated_at` and a server-owned `synced_at` is what fixed it (Phase 8.0).
    Both rules that referenced it were rewritten in the same commit.

23. **Never compare two SQLite timestamps as strings, and never pass one to `new Date()`.**
    `(current_timestamp)` yields `'2026-09-02 14:33:01'` — UTC, but zone-less and
    space-separated — while `toISOString()` yields `'2026-09-02T14:33:01.123Z'`. Both formats
    are in circulation locally, because inserts take the default and updates set it by hand.
    String comparison puts every space-form value before every ISO one (`' '` 0x20 < `'T'`
    0x54), and JS parses the space form as *local* time. Everything goes through
    `parseTimestamp()` in `lib/sync/mapping.ts`.

24. **A jest.mock() factory may not close over anything except `mock`-prefixed variables.**
    Babel hoists the factory above the imports, so a plain `const store = new Map()` referenced
    inside it fails with "The module factory of `jest.mock()` is not allowed to reference any
    out-of-scope variables". Name it `mockStore`. (And when fixing it, don't `sed` the bare
    word — it rewrote `expo-secure-store` into `expo-secure-mockStore`.)
