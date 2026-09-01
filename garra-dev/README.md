# garra-dev

The Garra Expo app. **Empty until Phase 0 runs** — see
[`../.claude/features/01-project-initialization.md`](../.claude/features/01-project-initialization.md).

Everything above this folder is planning and rules; all application code lives here.

---

## Before you build

Read [`../CLAUDE.md`](../CLAUDE.md), then the rule that matches the work in
[`../.claude/rules/`](../.claude/rules/). `01-design-system.md` is non-negotiable for any UI.

**Never write feature code without a feature doc.** Invoke the `garra-feature` skill first.

## Expo Go will not work

Skia, MMKV, and gesture-handler are native modules. This app requires a **dev client**:

```bash
npx expo prebuild --clean
npx expo run:ios        # or run:android
```

`ios/` and `android/` are gitignored — regenerable from `app.config.ts`, and committing them
turns every Expo upgrade into a merge conflict.

## Stack

| Layer        | Choice                                                |
| ------------ | ----------------------------------------------------- |
| Runtime      | Expo (new architecture)                               |
| Language     | TypeScript, strict                                    |
| Routing      | expo-router                                           |
| Styling      | NativeWind — theme generated from `theme/tokens.ts`   |
| Charts       | `@shopify/react-native-skia`                          |
| Animation    | Reanimated + Gesture Handler                          |
| Server state | TanStack Query (querying **SQLite**, not the network) |
| UI state     | Zustand                                               |
| Local DB     | expo-sqlite + Drizzle — **source of truth**           |
| Backend      | Supabase — Postgres + Auth + RLS, sync target only    |
| Payments     | RevenueCat (Phase 11)                                 |

## The three rules

1. **Chrome is neutral, data is loud.** Color comes only from goal accents, the system indigo,
   and one amber warning.
2. **Nothing derived is ever stored.** Pace, streaks, status, mosaic, load — all computed from
   `entries`.
3. **Local-first.** No user action awaits the network.
