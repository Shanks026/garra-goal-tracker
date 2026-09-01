# Garra — Implementation Roadmap

**Status**: pre-build.
**Last updated**: 2026-09-01

Thirteen phases to a shippable v1. Each phase ends with something you can open, run, or verify.

**Rules of engagement**
- Work through the `garra-feature` skill. Every phase gets a doc in `.claude/features/` before
  any code.
- One phase at a time. Stop at the end of each and wait for approval.
- Definition of done: `.claude/rules/06-conventions.md` §8 — including the offline test and
  both themes.
- Remote schema work goes through the **Supabase MCP server**, not hand-pasted SQL. The SQL
  still gets written into the feature doc as the durable record.

---

## Layout

```
garra/
├── garra-dev/              ← the Expo app. All code lives here
├── .claude/
│   ├── rules/              ← project rules. 01-design-system.md is non-negotiable
│   ├── features/           ← 00-index.md + one doc per phase
│   └── skills/garra-feature/
├── design-system/          ← the 18-screen canvas. Visual source of truth
├── garra-index.md          ← full product spec
├── IMPLEMENTATION.md       ← this file
└── .mcp.json              ← Supabase MCP credentials (gitignored)
```

---

## Ordering logic

Four deliberate choices, because they'll look wrong otherwise:

**Phase 0 writes no app code.** Toolchain, dependencies, native build, and a smoke test that
every risky native module actually renders. Skia + Reanimated + new architecture is where RN
projects lose a week — find that out before there's code to debug around.

**Charts before screens (Phase 2).** The chart set is the highest-risk visual work and the
canvas hands us exact math for all nine primitives. Proving them against fixture data means the
riskiest part is settled before any wiring exists.

**The pace engine before anything consumes it (Phase 3).** Pace *is* the product. Pure, tested
functions, no UI. If the math is wrong, every screen lies.

**Auth is late (Phase 8), on purpose.** The app must be fully usable offline before Supabase
auth is wired at all — the only way local-first stays real rather than aspirational. It also
matches the designed onboarding, where signing up is step 4 of 4 and skippable via "Keep it on
this phone."

---

## Phase 0 — Project initialization & dependency checks

**No app code.** A booting dev client that proves every native dependency works.

- `garra-dev/` scaffolded: Expo + TypeScript strict + expo-router, app name/slug `garra`
- Every dependency installed and version-pinned (full list in the phase doc)
- NativeWind ↔ Tailwind coupling resolved and **verified working**
- Native dev client built (`expo prebuild` + local run, or EAS dev build) — Expo Go cannot
  load Skia, MMKV, or gesture-handler
- `.mcp.json` wired; Supabase MCP connection confirmed by listing the project
- Lint, format, typecheck, test runner all configured and green

**Smoke checks — each must actually render/run on a real device:**

| Check | Proves |
|---|---|
| Skia draws a circle | the riskiest native dep works under new arch |
| A Reanimated spring animates | worklets + Babel plugin configured |
| A gesture-handler pan responds | native gesture wiring |
| A bottom sheet opens and closes | `@gorhom/bottom-sheet` v5 + reanimated |
| SQLite write → relaunch → read | persistence survives cold start |
| NativeWind class applies | Tailwind pipeline is live |
| `expo-doctor` clean, `tsc --noEmit` clean | no version drift |
| Supabase MCP lists the project | remote access before any schema work |

**Done when**: all eight pass on device. Nothing else.

> If any native module fights the new architecture, that's the moment to swap it — not in
> Phase 5 with twenty screens built on top.

---

## Phase 1 — Foundation

**Ship**: an app that boots to a themed placeholder, with the schema live locally and remotely.

- `theme/tokens.ts` — every value from `rules/01-design-system.md` §1–3
- Tailwind config **generated from tokens**, so tokens stay the single source
- Folder structure per `rules/02-ui-components.md` §1
- `lib/date.ts` — `dayKey()`, 04:00 rollover, timezone helpers
- `lib/copy.ts` scaffold
- Drizzle schema + first local migration; SQLite client
- **Supabase schema via MCP**: tables, RLS policies, `moddatetime` triggers
- `lib/entitlements.ts` — `useFlag()` resolving everything to Pro in dev
- Theme provider (dark/light/system), splash gate, Sentry

**Done when**: `dayKey()` tests pass including DST, a row round-trips through SQLite, the
Supabase schema matches Drizzle structurally, and `00-index.md`'s schema section is filled in
for real.

---

## Phase 2 — The chart set

**Ship**: a dev-only kitchen-sink route rendering all nine charts with fixture data, both themes.

Skia components, geometry ported verbatim from the canvas `DCLogic` class:

| Component | Spec |
|---|---|
| `PaceRing` | §4.2 — **build this first. It's the thesis as geometry.** |
| `ArcSweep` | §4.1 — three size variants |
| `Mosaic` | §4.3 — one canvas; 14/20/7-column variants |
| `BurnUp` | §4.4 — Catmull-Rom + amber deficit shading |
| `WeekBars` | §4.5 — hollow stubs for missed days |
| `Momentum` | §4.6 |
| `LoadDonut` | §4.7 |
| `CheckpointSpine` | §4.8 — incl. pulse |
| `WindowTicks` | §4.9 |

Plus `components/ui/`: `Button`, `Chip`, `ListGroup`, `ListRow`, `StatusPill`, `Checkbox`,
`SectionLabel`, `NumPad`, `Sheet` shell.

**Done when**: every chart matches its canvas screen side by side, path generators are
unit-tested, and the 122-cell mosaic scrolls at 60fps on device.

---

## Phase 3 — The pace engine

**Ship**: no UI. Pure, tested logic.

- `lib/derive/pace.ts` — expected, deficit, required rate, `p`, `t`, status
- `lib/derive/schedule.ts` — cadence expansion, what's due today
- `lib/derive/streaks.ts` — schedule-aware, freeze-consuming
- `lib/derive/mosaic.ts` — day → cell state
- `lib/derive/load.ts` — weekly/daily hours, honesty band

**Done when**: every required case in `rules/03-state-and-data.md` §4 passes — day 1, final day,
past end, early `ends_at`, mid-arc rescope, backfill, all pace bases, target exceeded,
unreachable → `cooked`.

> The one phase where thoroughness beats speed.

---

## Phase 4 — Onboarding & arc creation

**Ship**: install → live arc, entirely offline, no account.

Screens `01`–`09`.

- `01` Welcome ("hello." → arc hook) · `02` Name · `03` **Intent chips** ·
  `04` **Recommended goals** · `05` Sign up (deferred, skippable)
- `06`–`09` Arc Builder: window · goal type · goal form · load check
- **`lib/intents.ts` — the intent → goal template catalog.** Each intent maps to a proposed
  goal: type, target sized from arc length, cadence, est. minutes, accent, icon. This is what
  makes onboarding feel intelligent; it's real work, not a stub.
- Goal forms for all four types (only Accumulate is designed — extend its structure exactly)
- Draft arc persisted to SQLite so a killed app doesn't lose the flow

**Done when**: fresh install reaches a live arc with 3+ goals with no network, and the load check
shows a real total.

---

## Phase 5 — Home & logging ⭐

**Ship**: the daily loop. The phase the app lives or dies on.

Screens `10` (dark), `11` (light), `12` (log sheet).

- Home: arc sweep + day counter, Today list (Mains above the divider), `Log everything`,
  The Arc rows with pace rings
- Log sheet: custom 12-key numpad, quick-add chips, auto-dismiss
- Binary log = 1 tap. No sheet, no confirm, haptic in `onMutate`
- Optimistic SQLite writes; 5-second undo toast
- Swipe-left skip with reason; backfill via long-press and the pre-10:00 "Yesterday" row
- Tab bar: Today · Arc · Settings

**Done when**: **a five-goal day logs in under 10 seconds, timed with a stopwatch, in airplane
mode.** Not "feels fast" — measured.

---

## Phase 6 — Goal detail

**Ship**: tap any goal, understand where you stand, change the plan.

Screens `13` (Accumulate), `14` (Milestone), plus Habit and Ship variants.

- Type-swapped hero: pace ring · burn-up · shipped list · spine
- Status pill, required rate, per-goal mosaic, week bars, recent entries
- `Edit · Rescope · Pause · Archive`
- **Rescope flow** — auto-offered on `cooked`, writes an audit row to `rescopes`. Not designed;
  build on the log-sheet shell.

**Done when**: a goal can be driven on-track → slipping → cooked → rescoped, with charts and
status tracking correctly at each step.

---

## Phase 7 — The Arc tab

**Ship**: the whole run at a glance. Screen `15`.

Full 122-cell mosaic, momentum curve with headline %, load donut with planned-vs-actual,
all-goal pace summary.

**Done when**: the mosaic renders as one canvas and planned-vs-actual reads truthfully against
logged entries.

---

## Phase 8 — Auth & sync

**Ship**: the arc survives a lost phone. **Supabase Auth** — same project as the database.

- Apple, Google, and email magic link via `@supabase/supabase-js` + `expo-auth-session`
  (**Apple is mandatory on iOS if Google ships**)
- Session tokens in `expo-secure-store`, never AsyncStorage
- `lib/sync/` — outbox drain, last-write-wins on `updated_at`
- **Local-to-remote upsert on first sign-in.** Never pull-then-overwrite, or the "keep it on
  this phone" path loses data at account creation.
- RLS verified from the client: a second account must see nothing
- Quiet sync state in Settings only

**Done when**: log offline on device A, sign in, it appears on device B. Then kill the network
and confirm the app is still fully usable.

---

## Phase 9 — Rituals: Sunday Reset & notifications

**Ship**: the weekly loop. Screen `16`.

- `expo-notifications`, **local only** — no push infra, no server, no cost
- One evening nudge if Mains are unlogged; one Sunday morning prompt. Nothing else.
- Sunday Reset: week row, per-goal hit/miss, freezes earned, inline rescope, one-line note
- Freeze earn/bank/consume wired to `lib/derive/streaks.ts`

**Done when**: notification actions log without opening the app, and Sunday notes persist into
the data the Finale reads.

---

## Phase 10 — The Finale

**Ship**: the ending. Screen `17`.

Scrolling recap → composite poster → share sheet → `Start your next arc` with carry-forward.
The poster is **editable** (canvas shows "Showing 3 of 7 goals" + Edit). Rendered to an image
via `react-native-view-shot`, shared via `expo-sharing`.

Content: totals, best week, worst week, momentum curve, Mains hit vs missed, rescopes with
dates, and the Sunday notes.

**Done when**: a completed arc produces a poster worth screenshotting, and archiving into a new
arc carries the right goals forward.

> Both the retention loop and the entire distribution channel. Budget real time rather than
> treating it as a victory lap.

---

## Phase 11 — Monetization

**Ship**: revenue. Screen `18`.

- RevenueCat (`react-native-purchases`); products `$3.99/mo` · `$24.99/yr` (7-day trial) ·
  `$59.99 lifetime`
- Flip `useFlag()` from dev-Pro to real entitlements
- Contextual triggers only: 4th goal in the builder, the Finale share card, a locked chart, a
  quiet Settings row
- Restore purchases, terms, privacy

⚠️ **The gating drawn in the canvas contradicts the spec.** Resolve before building — see
Design Deltas.

**Done when**: sandbox purchase unlocks, restore works on reinstall, and no paywall appears in
the first week of use.

---

## Phase 12 — Polish & ship

- Settings (not designed — standard inset grouped list)
- Empty states, error states, offline indicator
- Accessibility: chart labels, Dynamic Type, reduce-motion, 44×44 targets
- Sentry verified in release, store assets, privacy manifest, TestFlight

**Done when**: a stranger can install, build an arc, and log for a week without you present.

---

## Post-v1

1. **iOS home-screen widget** — day counter + tappable checkboxes. Highest-leverage feature in
   the product; out of v1 only because it's a native target.
2. Apple Health / Strava auto-logging
3. **⊖ Limit goal type** — the `direction` column already exists from Phase 1
4. Live Activity for in-progress sessions
5. Lifetime stats across arcs
6. Mid-arc milestone share cards
7. Reconsider a light social layer — with real usage data, in Arc 2

---

## Design Deltas — the canvas vs. the original spec

### 1. Onboarding got better — adopted

The spec had three marketing slides then a seven-step builder. The canvas has **Welcome → Name
→ Intent → Recommended goals → Sign up**, where picking intent chips makes the app *propose
sized goals*. Materially better first run; it's what Phase 4 builds. Adds the intent catalog as
real work.

Two entry paths now exist, correctly: **onboarding** is the fast guided path; **Arc Builder**
(`06`–`09`) is the full manual path, reused later for adding goals and editing.

### 2. Intent chips imply the Limit type

The canvas offers `Sleep`, `Less scrolling`, `Weight` — all *stay-under-a-cap* goals, i.e. the
⊖ Limit type deferred to post-v1. **Either drop those three chips from v1 or pull Limit
forward.** Recommendation: drop the chips, keep the column. A chip that produces a goal the app
can't model is worse than a shorter list.

### 3. Paywall gating conflicts ⚠️ *needs a decision before Phase 11*

| | Canvas (screen 18) | Spec (`garra-index.md` §11) |
|---|---|---|
| Active arcs | 1 free / **∞** Pro | 1 / 1 |
| Goals | **2** free / ∞ Pro | 3 / 10 |
| Pace ring & burn-up | **Pro only** | always free |
| Mosaic | **30 days** free | always free |
| Sunday Reset | **Pro only** | free |
| Finale | Pro only | basic free, poster Pro |

**Recommendation: keep the spec, not the canvas.** Gating the pace ring and burn-up removes the
entire thesis from the free tier — a free Garra without pace is a generic habit tracker with
nothing left to convert on. Same for the mosaic: it's the signature screenshot, so free users
posting it is marketing, not lost revenue. And "∞ arcs" contradicts the one-active-arc
constraint the whole product rests on.

Gate instead on **goal count, arc history, deep stats, and the Finale poster** — all of which
bite naturally as investment accumulates. The paywall *layout* is good; only the feature rows
need rewriting.

### 4. Smaller details, adopted

- Status colors are more restrained than spec'd: **"Locked in" and "On track" both render
  neutral grey**; only "Slipping" is amber. Red appears nowhere in the canvas.
- Arc named "Autumn Arc" in the canvas.
- Value entry uses a **custom 12-key numpad**, not the OS keyboard.
- Goal-detail mosaic is 20 columns; the Arc tab is 14.
- Signup is genuinely skippable, with a visible "Saved on device only" state.
