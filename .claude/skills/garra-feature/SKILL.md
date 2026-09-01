---
name: garra-feature
description: Use this skill whenever the user wants to plan, design, research, or build a new feature for GARRA (the finite time-boxed goal tracker built with Expo/React Native + TypeScript + expo-sqlite + Supabase) — or continue building an existing one. Triggers on phrases like "I want to build", "new feature", "let's add", "I'm thinking of adding", "plan this feature", "implement this", "let's do phase 2 of", "continue the X feature", "start phase N", or any description of new product functionality for Garra — arcs, goals, logging, entries, pace, streaks, freezes, charts, onboarding, the Sunday Reset, the Finale, settings, auth, sync, or monetization. Also triggers when the user asks to extend or modify an existing Garra feature or to work through a phase of IMPLEMENTATION.md. This skill analyses fit and scope against Garra's data model, design system, and project rules, produces or updates a phased implementation markdown file in `.claude/features/`, and guides the build phase by phase with approval gates. Always use this skill before writing any feature code for Garra — the planning doc must exist first.
---

# Garra Feature Planning & Implementation Skill

You are helping build **Garra** — a finite, time-boxed goal tracker. Every commitment lives
inside an **Arc**: a fixed period with a real end date. The app's promise is telling the user
whether they'll actually *make it*, not just whether they showed up today.

Stack: Expo · React Native (new arch) · TypeScript · expo-router · NativeWind ·
`@shopify/react-native-skia` · TanStack Query · Zustand · expo-sqlite + Drizzle · Supabase ·
RevenueCat.

Your job is to plan features carefully and then build them one phase at a time, **stopping for
approval between phases.**

---

## The three principles every feature is judged against

**1. Chrome is neutral, data is loud.** The only saturated color on screen comes from goal
accents, the system indigo, and one amber warning. A feature that introduces a new color, a
gradient background, or a tinted icon is violating the design system — flag it.

**2. Nothing derived is ever stored.** Pace, required rate, status, streaks, consistency,
mosaic cells, and load totals are always computed from `entries`. Any feature that seems to
need a stored running total is working against the grain of this app — say so before building it.

**3. Local-first, always.** SQLite is the source of truth; Supabase is a sync target. No user
action may await the network. If a feature can't work in airplane mode, that's a design flaw,
not an acceptable limitation.

---

## Step 1 — Orient Yourself

Read these before doing anything else:

- `CLAUDE.md` — project entry point and hard constraints
- `IMPLEMENTATION.md` — the phased build roadmap; **which phase are we actually in?**
- `.claude/rules/01-design-system.md` — **always**, before any UI work
- `.claude/rules/` — the rule that matches the work (components, state, hooks, database, conventions)
- `.claude/features/00-index.md` — what's been planned/built, plus the running schema reference
- `garra-index.md` — the product spec, when scope or intent is in question

**The design canvas is the visual source of truth:**
`design-system/garra-design-system-sixteenscreens/Garra UI Kit.dc.html`

It contains 18 designed screens with exact geometry, and its `DCLogic` class at the bottom of
the file holds the **exact chart math** — arc paths, ring dash/offset, mosaic thresholds,
burn-up smoothing, donut segments. **Read the relevant screen before building it.** Port that
math; don't re-derive it.

### Then determine what kind of work this is

**Continuing a feature** ("let's do Phase 2 of onboarding", "continue the logging feature"):
- Find the file in `.claude/features/`, read it fully
- Note which phases are complete, what was deferred, what the next phase specifies
- Skip to Step 4

**Working a phase of the roadmap** ("start Phase 3", "let's do the Home screen"):
- Read that phase in `IMPLEMENTATION.md`
- If it has no feature doc yet, write one (Step 3) — the roadmap phase is the scope, so
  Step 2's scoping conversation is usually brief
- Then Step 4

**A new feature idea**:
- Scan `.claude/features/` for overlap, then proceed to Step 2

---

## Step 2 — Clarify and Analyse (New Features Only)

### Clarify first

Ask only if genuinely unclear:

- What does this replace or improve — a screen that's lacking, a number the user is working
  out in their head, a gap in the core loop (plan → log → see pace → adjust)?
- Does it need its own route, or does it extend an existing screen?
- Is it v1 or post-v1? (`garra-index.md` §12–13 already cut a lot deliberately.)

**One focused question beats a list.** If the feature is obvious, don't ask — proceed.

### Analyse and recommend

Think it through, then say what you think. Don't just list considerations.

**Does it fit the thesis?** Garra is finite, time-boxed, and pace-driven. Features that make
sense in an infinite habit tracker often don't here. A feature that weakens the Arc constraint
or the finish line deserves real scrutiny.

**What does it reuse?** Map it to what exists: the goal types (`habit`/`accumulate`/`ship`/
`milestone`), the chart primitives in `components/charts/`, the derivation functions in
`lib/derive/`, the sheet pattern, `theme/tokens.ts`. Features that reuse these ship faster and
stay visually coherent.

**Is it derived or stored?** Almost always derived. If it looks like it needs a new column,
challenge that first.

**Does it work offline?** If not, it's not done.

**Does it need a design?** Check the canvas. If the screen isn't among the 18, say so
explicitly and either extend an existing pattern (naming which one) or flag that a design is
needed. Never invent a new visual language quietly — `01-design-system.md` §9 lists the known
gaps.

**What's the minimum useful version?** Phase 1 is the smallest thing that delivers real value
alone. Later phases must each be independently useful too.

**What are the risks?** Scope creep, an assumption about data that doesn't hold, anything that
would surprise the user mid-build, anything touching the pace engine.

End with a concrete proposal:

> "I'd build this as [N] phases. Phase 1 covers [X], which means [user value]. Does that match
> what you had in mind, or do you want to adjust the scope?"

**Wait for approval before writing the feature doc.**

---

## Step 3 — Write the Feature Doc

Once scope is agreed, write a complete doc using `referenced/feature-template.md`.

- **Name**: `[NN]-[feature-slug].md`, next number from `.claude/features/00-index.md`
- **Location**: `.claude/features/[NN]-[feature-slug].md`

Write the whole thing — all phases, all SQL, all file paths, all checklists. A vague plan
creates blockers mid-build. It should be specific enough that someone else could implement any
phase without asking questions.

### On SQL specifically

There are **no committed Supabase migration files** — remote schema lives only in the Supabase
dashboard. Every feature doc's Database section is therefore *the only durable record of that
schema change.* Write the full SQL in the doc, say exactly when to paste it into the SQL
editor, and once it's confirmed applied, treat that block as the migration record. Don't let
it drift from what's live.

Drizzle migrations for SQLite **are** committed — generate and commit them normally, and keep
the two schemas structurally identical (`rules/05-database.md` §3).

### On design

Every phase that touches UI names the screen it implements (e.g. "screen 10 — Home") or states
plainly that no design exists and which pattern it's extending.

After writing:

> "Feature plan saved to `.claude/features/[NN]-[feature-slug].md`. Read it through and let me
> know if anything needs adjusting before we start Phase 1."

**Wait for approval before implementing anything.**

---

## Step 4 — Phased Implementation

One phase at a time. **Never start a phase until the previous one is explicitly approved.**

### Before starting each phase

1. **Re-read the phase section from the doc.** Never rely on memory.
2. **Verify against the actual codebase** — file paths, hook names, route names, column names,
   token names. The code may have moved on since the doc was written.
3. **Re-read `01-design-system.md`** if the phase touches UI, and open the relevant screen in
   the canvas.
4. If the phase has Supabase SQL, hand it to the user to paste and **confirm it applied**
   before writing any code against it.

### While building

Build only what the phase specifies. No "nice to haves", no anticipating a later phase, no
refactoring nearby code unless the feature requires it.

**Stop immediately on a blocker** — a derivation that doesn't return what the doc assumed, a
Skia component behaving differently than described, a missing dependency, a design gap. Describe
it, propose two or three options, ask which. Don't improvise around blockers silently.

**Watch for these specifically**, because they're the ones that go wrong quietly:

- A derived value being stored instead of computed
- A hex literal outside `theme/tokens.ts`
- A network call on a user-action path
- `new Date()` inside a component or a derivation instead of `useNow()` / a passed-in `now`
- A day bucket computed with `format(d,'yyyy-MM-dd')` instead of `dayKey()` (04:00 rollover)
- A new sheet missing `useSheetBackHandler` (this exits the app on Android back)
- An accent color applied to chrome

### Completing a phase

1. Walk the phase checklist item by item and verify each is **actually true**
2. Run the definition of done in `rules/06-conventions.md` §8 — including the offline test and
   both themes
3. Update the feature doc: check off items, add an **Implementation Notes** section recording
   deviations and deferred scope, mark the phase header `✅ Complete`
4. Report:

> "Phase [N] complete. Built: [summary]. Deviations: [what changed, or 'none'].
> Ready for Phase [N+1] when you are."

**Then stop.** Wait for explicit go-ahead.

---

## Step 5 — Update the Index

After all phases are complete, update `.claude/features/00-index.md`:

- Add the feature to the Feature Files table with its status
- Add new tables/columns/indexes to the Schema Reference
- Add new reusable components, hooks, or derivation functions to Shared Infrastructure
- If it changed a rule or established a new convention, update the relevant `.claude/rules/`
  file in the same change — **rules that lag the code are worse than no rules**

---

## Quick Reference

Full detail lives in `.claude/rules/`. This is orientation only.

| Concern | Rule file |
|---|---|
| Colors, type, charts, spacing, motion, copy tone | `01-design-system.md` |
| Folder structure, sheets, logging path, icons, a11y | `02-ui-components.md` |
| TanStack/Zustand split, derivation, time, sync, entitlements | `03-state-and-data.md` |
| Hook shapes, naming, `useNow` | `04-hooks.md` |
| Schema, RLS, migrations, sync engine | `05-database.md` |
| TypeScript, testing, deps, definition of done | `06-conventions.md` |

### The constraints most likely to be violated

- **One active arc.** Archives are read-only. Goals may end early via `goals.ends_at`.
- **Day rollover is 04:00 local.** Everything goes through `dayKey()`.
- **Backfill window is 2 days**, and backfilled entries are visually marked.
- **A good day logs in under 10 seconds.** This outranks almost every other consideration in
  the logging path.
- **Three tabs: Today · Arc · Settings.** Do not add a fourth.
- **Slang only in `lib/copy.ts`.** Tables and enums stay neutral.
- **Success is neutral, not green.** Amber is the only warning color; red is Cooked only.

### Screens in the canvas

`01` Welcome · `02` Name · `03` Intent · `04` Recommended goals · `05` Sign up ·
`06` Arc window · `07` Goal type · `08` Goal form (Accumulate) · `09` Load check ·
`10` Home dark · `11` Home light · `12` Log sheet · `13` Goal detail (Accumulate) ·
`14` Goal detail (Milestone) · `15` Arc tab · `16` Sunday Reset · `17` The Finale · `18` Paywall

**Not designed** (see `01-design-system.md` §9): Habit/Ship/Milestone goal forms, rescope,
settings, freeze UI, empty states, the Cooked state, widgets.

---

## Reference Files

- `referenced/feature-template.md` — the exact structure for a feature planning doc
