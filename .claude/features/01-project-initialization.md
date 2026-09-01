# Feature: Project Initialization & Dependency Checks
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/01-project-initialization.md`
**Roadmap phase**: Phase 0
**Status**: Planned
**Last Updated**: September 2026

---

## Context

Scaffold `garra-dev/` and prove the toolchain works before any product code exists. Garra
depends on four native modules that are historically where React Native projects lose a week —
Skia, Reanimated, gesture-handler, and MMKV — all under the new architecture. This phase finds
out whether they cooperate *now*, while there's nothing built on top of them.

**No app code, no screens, no tokens.** The deliverable is a booting dev client and eight green
smoke checks.

**Designed screens**: none — this phase has no UI beyond a throwaway smoke-test route.

---

## Thesis Check

- **Fits the finite/pace model?** N/A — infrastructure.
- **Derived, not stored?** N/A — no data model yet.
- **Works offline?** Yes by construction; there is no network code in this phase.

---

## Phase Overview

```
Phase 0.1 — Scaffold & dependencies
  Expo + TypeScript strict + expo-router, every dependency installed and pinned.

Phase 0.2 — Native dev client & smoke checks
  Build a dev client, verify all eight checks on a real device.

Phase 0.3 — Supabase MCP & tooling
  Confirm MCP connectivity, wire lint/format/typecheck/test.
```

**After each sub-phase: stop and wait for approval before proceeding.**

---

## Phase 0.1 — Scaffold & dependencies

### Goal
`garra-dev/` exists, installs cleanly, typechecks, and boots to a blank themed screen in a
simulator. Nothing is proven about native modules yet — that's 0.2.

### Before Starting — Confirm With Environment
1. `node --version` — Expo's current SDK requires Node 20+
2. `npx expo --version` and which Expo SDK is current at time of build
3. Whether Xcode (iOS) and/or Android Studio + JDK 17 are installed — determines whether 0.2
   runs locally or needs EAS
4. **Current NativeWind ↔ Tailwind compatibility.** Check NativeWind's own docs before
   installing. v4 targets Tailwind 3.4; TW4 support is in the v5 line.
   **TW 3.4 is completely acceptable — do not burn time forcing TW4.**
5. Whether `@shopify/react-native-skia` and `@gorhom/bottom-sheet` v5 both list the target
   Reanimated major as a supported peer

### 0.1.1 Scaffold

```bash
cd garra-dev
npx create-expo-app@latest . --template blank-typescript
```

`app.json` / `app.config.ts`:

| Field | Value |
|---|---|
| `name` | `Garra` |
| `slug` | `garra` |
| `scheme` | `garra` |
| `ios.bundleIdentifier` | `com.<you>.garra` |
| `android.package` | `com.<you>.garra` |
| `newArchEnabled` | `true` |
| `userInterfaceStyle` | `automatic` |

`tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, path alias `@/*` → `./`.

### 0.1.2 Dependencies

Install in groups so a failure is attributable. **Pin exact versions** in `package.json` — no
`^` ranges. Use `npx expo install` for anything with a native side so Expo picks the
SDK-compatible version.

**Navigation & core**
```
expo-router  react-native-safe-area-context  react-native-screens
expo-constants  expo-linking  expo-status-bar  expo-splash-screen
```

**Styling**
```
nativewind  tailwindcss@<version matched in check #4>
```

**Animation & gestures** *(native)*
```
react-native-reanimated  react-native-gesture-handler
```

**Charts** *(native)*
```
@shopify/react-native-skia
```

**Data**
```
@tanstack/react-query  @tanstack/react-query-persist-client
zustand
expo-sqlite  drizzle-orm
@supabase/supabase-js
react-native-mmkv          # native — query cache persister
date-fns
```

**UI**
```
@gorhom/bottom-sheet  expo-haptics  lucide-react-native  react-native-svg
@shopify/flash-list
```

**Platform**
```
expo-notifications  expo-secure-store
@sentry/react-native
```

**Dev**
```
drizzle-kit  eslint  prettier  eslint-config-expo  jest-expo  @types/react
```

**Deferred to their own phases** — do not install now: `react-native-purchases` (Phase 11),
`react-native-view-shot` + `expo-sharing` (Phase 10), `expo-auth-session` +
`expo-apple-authentication` + Google sign-in (Phase 8).

### 0.1.3 Config wiring

- `babel.config.js` — `react-native-reanimated/plugin` **last in the plugin array** (this is the
  single most common Reanimated misconfiguration); NativeWind's jsxImportSource preset
- `metro.config.js` — NativeWind's `withNativeWind`, plus `.sql` in `assetExts` for Drizzle
  migrations
- `tailwind.config.js` — content globs; **leave the theme empty for now.** Phase 1 generates it
  from `theme/tokens.ts`, and hardcoding values here would create a second source of truth
- `global.css` with the Tailwind directives
- `nativewind-env.d.ts` for types
- `.eslintrc` / `prettier` config
- `drizzle.config.ts` pointed at `lib/db/schema.ts`, dialect `sqlite`, driver `expo`

### 0.1.4 Files created

```
garra-dev/
├── app/
│   ├── _layout.tsx          # providers only; SafeArea + GestureHandlerRootView
│   └── index.tsx            # blank themed screen
├── app.config.ts
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
├── drizzle.config.ts
├── nativewind-env.d.ts
├── tsconfig.json
└── package.json
```

### 0.1.5 What This Sub-Phase Does NOT Include
Tokens, theme provider, folder structure beyond the above, any chart, any DB schema, any
Supabase call, the dev client build.

### 0.1.6 Checklist

- [x] `garra-dev/` scaffolded; `app.json` fields match the table above (as `app.config.ts` —
  see Implementation Notes)
- [x] `newArchEnabled: true`
- [x] Every dependency installed at an **exact pinned version**; `package.json` has no `^`
- [x] `npx expo install --check` reports no version mismatches
- [x] `npx tsc --noEmit` clean
- [x] `npx expo-doctor` clean (or every warning explained in Implementation Notes) — 18/18,
  one explained Sentry warning
- [x] `reanimated/plugin` is **last** in the Babel plugin array
- [x] `tailwind.config.js` theme left empty, with a comment pointing to Phase 1
- [x] App boots to a blank screen in a simulator — verified via `expo export`, a clean
  1390-module bundle; literal on-device confirmation folds into 0.2 (see notes)
- [x] Root `.gitignore` covers `garra-dev/` build output; `git status` shows no `node_modules`

**→ Stop here. Report versions installed and any resolution conflicts, then wait.**

✅ **Phase 0.1 complete — 2026-09-01.**

---

## Phase 0.2 — Native dev client & smoke checks

### Goal
A dev client on a **real device** where all eight native capabilities are proven to work. This
is the actual point of Phase 0.

### Before Starting
1. Confirm 0.1 approved
2. Decide local build vs EAS — depends on the toolchain check in 0.1
3. **Expo Go will not work.** Skia, MMKV, and gesture-handler are native. Anyone expecting to
   test in Expo Go should stop here.

### 0.2.1 Build

```bash
npx expo prebuild --clean
npx expo run:ios      # or run:android
```

Or, if the local toolchain isn't available:
```bash
eas build --profile development --platform ios
```

`ios/` and `android/` are gitignored — they're regenerable from config, and committing them
turns every Expo upgrade into a merge conflict.

### 0.2.2 Smoke checks

One throwaway route (`app/smoke.tsx`, deleted at the end of Phase 1) with one section per check.

| # | Check | Proves | Pass condition |
|---|---|---|---|
| 1 | Skia `<Canvas>` draws a filled circle | Skia works under new arch | Circle renders, no redbox |
| 2 | Skia draws a **stroked arc with round caps** | the exact primitive every chart needs | Arc visible with rounded ends |
| 3 | A `withSpring` value animates a box | worklets + Babel plugin correct | Smooth motion, no "Reanimated 2 failed to create a worklet" |
| 4 | A `Pan` gesture moves a box | native gesture wiring + `GestureHandlerRootView` | Box follows finger |
| 5 | `BottomSheetModal` opens, closes, **and Android back closes it rather than exiting the app** | sheet + reanimated + the standing back-handler rule | Sheet dismisses; app stays open |
| 6 | SQLite: insert → **kill app** → relaunch → read | persistence survives cold start | Row still there |
| 7 | MMKV: write → relaunch → read | query-cache persister will work | Value still there |
| 8 | A NativeWind `className` applies a color and a padding | Tailwind pipeline live | Style visibly applied |

Check 2 exists separately from 1 because the stroked round-cap arc is the primitive behind
`ArcSweep`, `PaceRing`, `BurnUp`, and `WeekBars` — if that specific path renders wrong, the
whole design language is at risk and it needs finding now.

### 0.2.3 If something fails

**Stop and report.** Do not work around a broken native module by swapping in a JS
alternative — that decision changes the design system's feasibility and is the user's call.

Known swap candidates, in order of preference, if forced:
- MMKV → `expo-sqlite` key-value table, or AsyncStorage *(cheap, no design impact)*
- Skia → **no acceptable substitute.** A JS-thread SVG chart lib will not hold 60fps on the
  122-cell mosaic. If Skia can't work, that's a conversation, not a substitution.

### 0.2.4 Checklist

- [ ] Dev client installed on a physical device (not only a simulator)
- [ ] All eight checks pass; each visually confirmed
- [ ] Check 5 specifically verified with the Android hardware back button
- [ ] Checks 6 and 7 verified after a **full app kill**, not a reload
- [ ] Both dark and light system appearance render without crashing
- [ ] `ios/` and `android/` are gitignored
- [ ] Any failure documented in Implementation Notes with the resolution

**→ Stop here. Report the eight results, then wait.**

---

## Phase 0.3 — Supabase MCP & tooling

### Goal
Remote database access works from this session, and the quality gates run.

### 0.3.1 Supabase MCP

Credentials go in **`.mcp.json` at the repo root** (already created, gitignored). Two values:

| Field | Where to find it |
|---|---|
| `--project-ref=` | Supabase dashboard → your project → **Settings → General → Reference ID**. A 20-char string like `abcdefghijklmnopqrst`. **This is the ref, not the display name** — the project's name will not work. |
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token**. Starts `sbp_`. |

After pasting, **restart Claude Code** — MCP servers connect at startup.

Scoping notes:
- `--project-ref` limits the server to one project. Keep it; an account-wide token with no
  project scope can touch every project you own.
- `--read-only` can be added for sessions that shouldn't modify schema. Phase 1 needs DDL, so
  leave it off for now — but it's the right default once the schema settles.

### 0.3.2 Verify

- MCP tools appear in the session
- Listing the project / fetching current schema succeeds
- Confirm the project has **no tables yet** — Phase 1 assumes a clean database. If it isn't
  clean, stop and report before creating anything.
- Confirm the project's **Auth** settings are reachable: this same Supabase project provides
  auth (Phase 8), so email + Apple + Google providers all live here.

### 0.3.3 Tooling

- `npm run lint`, `format`, `typecheck`, `test` scripts
- One trivial passing test to prove the runner works
- Sentry DSN in `.env`, initialised but not yet reporting

### 0.3.4 Checklist

- [ ] `.mcp.json` populated; **`git status` does not show it**
- [ ] Claude Code restarted; Supabase MCP tools available
- [ ] Project schema readable via MCP; database confirmed empty
- [ ] Auth providers page reachable in the dashboard
- [ ] `lint` / `format` / `typecheck` / `test` all pass
- [ ] `.env.example` documents every variable, with no real values

**→ Stop here. Phase 0 complete. Phase 1 begins the actual foundation.**

---

## Data Model Summary
No schema in this phase. Phase 1 creates `arcs`, `goals`, `entries`, `checkpoints`, `rescopes`,
`freezes`, `sync_queue`, `profiles` — see `.claude/rules/05-database.md` §1.

---

## Derivation Summary
None in this phase.

---

## Entitlement Gates
None. `lib/entitlements.ts` arrives in Phase 1 resolving everything to Pro in dev.

---

## Out of Scope (All Phases Here)

- `theme/tokens.ts` and the Tailwind theme — Phase 1
- Any database schema, local or remote — Phase 1
- Any chart component — Phase 2
- Any pace/streak logic — Phase 3
- Auth, sign-in UI, session handling — Phase 8
- RevenueCat — Phase 11
- `react-native-reusables` component installation — deferred to Phase 2, when there's a real
  component to install rather than a speculative set

---

## Implementation Notes
*(filled in during the build — versions installed, conflicts hit, deviations, smoke-check
results)*

### Phase 0.1 — 2026-09-01

**SDK version — deliberately downgraded from 57 to 54.** The scaffold initially landed on
Expo SDK 57 (latest at time of build, React 19.2.3 / RN 0.86.3). The user had direct prior
experience of the newest SDK line failing on a sibling app ("Flo") and asked to use SDK 54
instead. Wiped the SDK 57 install and rebuilt clean rather than patching versions in place —
safer than trying to downgrade in place given how many native packages were already resolved.

**Final pinned versions** (all exact, no `^`/`~`):
`expo@54.0.37` · `react@19.1.0` · `react-native@0.81.5` · `expo-router@6.0.24` ·
`react-native-reanimated@4.1.1` · `react-native-worklets@0.5.1` · `react-native-gesture-handler@2.28.0` ·
`@shopify/react-native-skia@2.2.12` · `@gorhom/bottom-sheet@5.2.14` · `nativewind@4.2.6` ·
`tailwindcss@3.4.17` · `@shopify/flash-list@2.0.2` · `expo-sqlite@16.0.10` · `drizzle-orm@0.45.2` ·
`drizzle-kit@0.31.10` · `@supabase/supabase-js@2.112.4` · `@tanstack/react-query@5.102.8` ·
`zustand@5.0.15` · `react-native-mmkv@4.3.2` · `date-fns@4.4.0` · `lucide-react-native@1.38.0` ·
`react-native-svg@15.12.1` · `expo-haptics@15.0.8` · `expo-notifications@0.32.17` ·
`expo-secure-store@15.0.8` · `@sentry/react-native@7.2.0` · `eslint@9.39.5` ·
`eslint-config-expo@10.0.0` · `jest-expo@54.0.18` · `prettier@3.9.6` · `typescript@5.9.2`.

**Resolution conflicts hit, and how they were resolved:**

1. **react-dom peer conflict, unrelated to any package we asked for.** `expo-router`'s
   web/DOM-webview support chain (via `@radix-ui/*` → `vaul`) transitively pulls a `react-dom`
   version that doesn't match the pinned `react`. This reproduced on both SDK 57 and SDK 54 —
   it's a real upstream inconsistency in the current expo-router release, not specific to our
   dependency choices. Fixed with a project-level `.npmrc` (`legacy-peer-deps=true`). Harmless
   for us: we don't ship the web target in v1, so the DOM-webview chain is dead weight either way.
2. **`react-native-worklets` is a required peer, not a transitive install.** Reanimated 4 split
   the worklets runtime into its own package (`react-native-worklets`, peer range `0.5–0.8` on
   SDK 54). `npx expo install react-native-reanimated` does not pull it automatically — installed
   separately. Confirmed `react-native-reanimated/plugin` just re-exports
   `react-native-worklets/plugin`, so the Babel config in `01-project-initialization.md` §0.1.3
   (`reanimated/plugin` last) is still correct as written.
3. **`npx expo install` defaults to caret ranges for JS-only packages**, which violates the
   "no `^`" rule. Added `save-exact=true` to `.npmrc` and swept the existing `package.json` to
   strip every `^`/`~` prefix, then reinstalled to sync the lockfile.
4. **`eslint-config-expo` and `jest-expo` are versioned per-SDK, not semver-independent** —
   `npm install` without `expo install` grabbed their latest overall release (`57.0.2` /
   `57.0.5`), several SDK lines ahead of ours. `npx expo install --check` caught the
   `eslint-config-expo` mismatch directly (expected `~10.0.0`); `jest-expo` was corrected by
   checking for a matching `54.x` line before it caused a subtler test-runner/Babel mismatch.
5. **ESLint 10 breaks `eslint-plugin-react` (pulled in by `eslint-config-expo`).** Its latest
   published release (`7.37.5`) only declares support up to `eslint@^9.7` — running `eslint .`
   under ESLint 10.9.1 threw `contextOrFilename.getFilename is not a function` immediately.
   This is a real upstream gap (the React plugin hasn't caught up to ESLint 10's removed
   `context.getFilename()`), not a config mistake. Downgraded to `eslint@9.39.5` (last stable
   9.x) — pure dev tooling, zero effect on the shipped app. Using `eslint-config-expo/flat` +
   `eslint/config`'s `defineConfig` per that package's own README, since ESLint ≥9 requires
   flat config (`.eslintrc` is legacy-only).
6. **`create-expo-app` scaffolds a nested `.git` repo plus generic `AGENTS.md`/`CLAUDE.md`/
   `LICENSE` template files.** Removed all four — the project's single source of instructions
   is the root `CLAUDE.md` and `.claude/rules/`, and git history belongs at the project root
   (`c:\Users\chris_austin\Desktop\garra`), not nested one level down. Root wasn't a git repo
   yet either, so ran `git init` there — no commits made, none requested.
7. Expo's own template ships a `.claude/settings.json` inside `garra-dev/` enabling the
   official `expo` Claude Code plugin. Left it in place — scoped to `garra-dev/`, doesn't
   conflict with the root `.claude/` (rules/features/skills), and is genuinely useful Expo
   tooling.

**Bundle identifier**: `com.chrisaustin.garra` (user's choice — asked directly since this is
expensive to change after a store submission).

**Deviations from the phase doc:**
- `app.json` became `app.config.ts` per the doc's own file list in §0.1.4 — same field values.
- `expo-status-bar` and `expo-secure-store`/`@sentry/react-native` plugin entries were tried in
  `app.config.ts` `plugins[]` (Expo's install step suggested them); `expo-status-bar` has no
  actual config plugin on this SDK line (no `app.plugin.js`) and was removed. `expo-secure-store`
  and `@sentry/react-native` do resolve as plugins and were kept.
- Added `npm run lint/format/typecheck/test` scripts and a `jest` config block (`jest-expo`
  preset) now rather than waiting for 0.3.3, since the eslint/prettier/drizzle config files were
  already being wired — no scope beyond what 0.3.3 asks for, just sequenced earlier.
- `npx expo-doctor` surfaced one expected warning: `@sentry/react-native/expo` has no
  organization/project configured yet. Correct at this stage — Sentry DSN wiring is 0.3.3/Phase 1.

**Not yet done** (explicitly deferred to 0.2 per the doc's own stop point): `expo prebuild`,
a real native dev-client build, and the eight on-device smoke checks. The Metro/Babel/NativeWind
pipeline is confirmed healthy via `npx expo export -p android` (clean 1390-module bundle, no
errors) as the closest available proxy — this is not a substitute for the on-device checks in
0.2, since Expo Go cannot load this app either way (Skia, MMKV, gesture-handler are native).

**Paywall / RevenueCat**: user confirmed holding this — Phase 11 stays deferred, no
`react-native-purchases` installed, no decision yet on the Design Deltas §3 gating question in
`IMPLEMENTATION.md`. Revisit when Phase 11 actually starts.
