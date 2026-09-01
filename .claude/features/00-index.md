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
| 3 | The pace engine | `04-pace-engine.md` | 📋 Planned |
| 4 | Onboarding & arc creation | — | ⬜ |
| 5 | Home & logging ⭐ | — | ⬜ |
| 6 | Goal detail | — | ⬜ |
| 7 | The Arc tab | — | ⬜ |
| 8 | Auth & sync | — | ⬜ |
| 9 | Sunday Reset & notifications | — | ⬜ |
| 10 | The Finale | — | ⬜ |
| 11 | Monetization | — | ⬜ |
| 12 | Polish & ship | — | ⬜ |

Next available feature-doc number: **05**

---

## 4. Schema Reference

**Applied 2026-09-01, Phase 1.5.** Since Supabase migrations aren't committed as files, this
section plus `02-foundation.md`'s Phase 1.5 SQL block are the only durable record of the remote
schema. Every table below has RLS enabled with the identical policy shape — only the name and
target table differ, so it's stated once instead of six times:

> `CREATE POLICY "Users manage own [table]" ON [table] FOR ALL`
> `USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);`
>
> Plus a `moddatetime` trigger on `updated_at`, and the standard columns
> (`id uuid PK default gen_random_uuid()`, `user_id uuid default auth.uid()`,
> `created_at`/`updated_at timestamptz default now()`) on every table.

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
| direction | text | default `'up'`, CHECK in (`up`,`down`) — the ⊖ Limit type's seam |
| accent, icon | text | not null |
| is_main | boolean | default `false` |
| target_amount, starting_value, session_target | numeric | nullable |
| unit, cadence_mode, pace_basis, item_noun | text | nullable |
| times_per_week, interval_days, est_minutes | integer | nullable |
| days_of_week | integer[] | nullable — **native Postgres array**; SQLite side stores this as JSON `text` (no array type exists there), see `02-foundation.md` §1.4.7 |
| quick_add | numeric[] | nullable, same array-type note as above |
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
Append-only audit log — no `updated_at`-driven edits expected in practice, though the trigger
exists like every other table.
| Column | Type | Notes |
|---|---|---|
| goal_id | uuid | FK → goals, ON DELETE CASCADE |
| from_target, to_target | numeric | nullable |
| reason | text | nullable |
Indexes: none beyond PK.

### freezes
| Column | Type | Notes |
|---|---|---|
| arc_id | uuid | FK → arcs, ON DELETE CASCADE |
| earned_for_week | text | not null |
| consumed_for_day_key | text | nullable |
Indexes: none beyond PK.

### Not yet created
- `profiles` (remote-only) — shape unknown until Phase 8 (auth) actually needs it.
- `sync_queue` — **local-only**, lives in SQLite (`lib/db/schema.ts`), never mirrored remotely.

### Known advisor notes (non-blocking, Phase 1.5)
- A pre-existing `public.rls_auto_enable()` function (not created by any migration here) is
  flagged as `SECURITY DEFINER`-callable by `anon`/`authenticated`. Not investigated — revisit
  at Phase 12 (Settings/security pass) or sooner if it matters for Phase 8 auth.
- Unindexed `user_id` FKs on every table, and the two goal/checkpoint indexes flagged "unused" —
  both expected on an empty schema with no query traffic yet. Not adding speculative indexes;
  revisit once real usage shows an actual slow query.

### Applied migrations

| Date | Phase / doc | What changed |
|---|---|---|
| 2026-09-01 | Phase 1.5, `02-foundation.md` | `create_arcs`, `create_goals`, `create_entries`, `create_checkpoints`, `create_rescopes`, `create_freezes` — full initial schema, RLS on all six |

---

## 5. Shared Infrastructure

Check here before building — most of a feature is usually already available.

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
*None yet.* Phase 3 builds `pace`, `schedule`, `streaks`, `mosaic`, `load`.

### Hooks — `hooks/`
`useSheetBackHandler` (Phase 2.5) — wires `BackHandler` to a `BottomSheetModal` ref so Android
back dismisses the sheet instead of falling through to expo-router and exiting the app. Every
sheet must use this; see standing rule #13 for the provider it depends on.

### UI primitives — `components/ui/`
All built, Phase 2.5: `Button` (primary/secondary/outline — primary never accent-colored),
`Chip` (filter/intent variants), `ListGroup`/`ListRow` (inset grouped list), `StatusPill`
(neutral/slipping), `Checkbox` (spring overshoot + haptic-on-tap), `SectionLabel`, `NumPad`
(the custom 12-key value-entry pad — never the OS keyboard). `sheets/Sheet.tsx` is the shared
shell every real sheet (Phase 4+) builds on — standard chrome plus `useSheetBackHandler` wired
automatically.

### Dev routes
`app/_dev-charts.tsx` — permanent kitchen-sink route (not deleted after Phase 2, unlike the
throwaway smoke-test routes from Phase 0/1) exercising every chart and UI primitive against
fixture data, with an in-route dark/light toggle. Reachable from `app/index.tsx`.

---

## 6. Standing Rules Learned The Hard Way

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
