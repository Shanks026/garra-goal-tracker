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
| 0 | Project initialization & dependency checks | `01-project-initialization.md` | 🚧 Closed out (0.1 ✅, 0.2 ⏸️ deferred to before Phase 2, 0.3 ✅ mostly — see notes) |
| 1 | Foundation — tokens, schema, theme | `02-foundation.md` | 📋 Planned |
| 2 | The chart set | — | ⬜ |
| 3 | The pace engine | — | ⬜ |
| 4 | Onboarding & arc creation | — | ⬜ |
| 5 | Home & logging ⭐ | — | ⬜ |
| 6 | Goal detail | — | ⬜ |
| 7 | The Arc tab | — | ⬜ |
| 8 | Auth & sync | — | ⬜ |
| 9 | Sunday Reset & notifications | — | ⬜ |
| 10 | The Finale | — | ⬜ |
| 11 | Monetization | — | ⬜ |
| 12 | Polish & ship | — | ⬜ |

Next available feature-doc number: **03**

---

## 4. Schema Reference

**Nothing applied yet.** Phase 1 creates the initial schema via the Supabase MCP server.

Since Supabase migrations aren't committed as files, **this section plus the feature docs are
the only durable record of the remote schema.** Record every table here once applied, using:

```
### arcs
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | FK auth.users, default auth.uid(), RLS |
| ... | | |
RLS: "Users manage own arcs" — FOR ALL, (select auth.uid()) = user_id, both USING and WITH CHECK
Indexes: ...
```

Planned tables: `arcs`, `goals`, `entries`, `checkpoints`, `rescopes`, `freezes`,
`sync_queue` (local only), `profiles` (remote only).

### Applied migrations

| Date | Phase / doc | What changed |
|---|---|---|
| — | — | — |

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
*None yet.* Phase 2 builds `PaceRing`, `ArcSweep`, `Mosaic`, `BurnUp`, `WeekBars`, `Momentum`,
`LoadDonut`, `CheckpointSpine`, `WindowTicks`.

### Derivations — `lib/derive/`
*None yet.* Phase 3 builds `pace`, `schedule`, `streaks`, `mosaic`, `load`.

### Hooks — `hooks/`
*None yet.*

### UI primitives — `components/ui/`
*None yet.* Phase 2 builds `Button`, `Chip`, `ListGroup`, `ListRow`, `StatusPill`, `Checkbox`,
`SectionLabel`, `NumPad`, `Sheet`.

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
   native dev-client build (deferred, `01-project-initialization.md` §0.2.4) is actually done.
10. **The bare `crypto.randomUUID()` global is not actually available at runtime**, despite
    TypeScript's ambient lib types not flagging it as an error — a type declaration existing
    doesn't mean the runtime global does. Found on-device in Phase 1.4 ("property 'crypto'
    doesn't exist"). Use `expo-crypto`'s `Crypto.randomUUID()` instead for every locally
    generated id (SQLite has no `gen_random_uuid()`) — it's a first-party Expo module, bundled
    in Expo Go, so it doesn't affect standing rule #7's compatibility window.
