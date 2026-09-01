# Garra

A **finite, time-boxed goal tracker**. Every commitment lives inside an **Arc** — a fixed
period with a real end date. The app's promise is telling you whether you'll actually
*make it*, not just whether you showed up today.

Expo · React Native · TypeScript · expo-router · NativeWind · Skia · expo-sqlite/Drizzle ·
Supabase (Postgres + Auth + RLS)

**All application code lives in `garra-dev/`.** Everything above it is planning and rules.

---

## Read these before writing any code

| File | What it is |
|---|---|
| `.claude/features/00-index.md` | **Start here.** Product at a glance, phase status, live schema, shared infrastructure. |
| `IMPLEMENTATION.md` | Phased roadmap. Which phase are we in, what's next, and the canvas-vs-spec deltas. |
| `.claude/rules/01-design-system.md` | **Non-negotiable.** Every token, all nine chart specs, the never-do list. |
| `.claude/rules/` | The rest — components, state, hooks, database, conventions. |
| `design-system/…/Garra UI Kit.dc.html` | The 18 designed screens. Visual source of truth; its `DCLogic` class holds the exact chart math. |
| `garra-index.md` | Full product spec — mechanics, form fields, monetization rationale. |

**Never write feature code without a feature doc.** Invoke the `garra-feature` skill first —
it plans, writes the doc to `.claude/features/`, then builds phase by phase with approval gates.

---

## The three rules that matter most

**1. Chrome is neutral. Data is loud.**
Backgrounds, cards, text, icons, dividers are greyscale. The *only* saturated color on screen
comes from goal accents, the system indigo, and one amber warning. If color appears on
something that isn't data, it's a bug.

**2. Nothing derived is ever stored.**
Pace, required rate, status, streaks, consistency %, mosaic cells, and load totals are
**always computed** from the `entries` table. A column holding a running total is working
against the grain of this app — flag it rather than building it.

**3. Local-first, always.**
`expo-sqlite` is the source of truth. Supabase is a sync target. Gyms, basements, and bike
rides have no signal — if a log fails offline, the app is dead. Every write lands locally
first and syncs later. **No user action ever awaits the network.**

---

## Hard constraints

- **One active arc.** Archives are read-only. Goals may end early inside the arc (`ends_at`).
- **Day rollover is 04:00 local, not midnight.** A session logged at 00:30 belongs to yesterday.
  Everything goes through `dayKey()`.
- **Backfill window is 2 days.** Backfilled entries are visually marked.
- **A good day must log in under 10 seconds.** This governs every logging decision.
- **Three tabs: Today · Arc · Settings.** Do not add a fourth.
- **Success is neutral, not green.** Amber is the only warning color; red is Cooked only.
- **Slang lives only in `lib/copy.ts`.** DB tables and code identifiers stay neutral
  (`arcs`, `goals`, `entries`) so the app can be re-voiced in one commit.
- **Expo Go cannot run this app.** Skia, MMKV, and gesture-handler are native — a dev client
  is required.

---

## Supabase

One project provides **both** the database and auth. Access from a Claude session goes through
the **Supabase MCP server**, configured in `.mcp.json` (gitignored — see
`.mcp.json.example`). Schema changes are made via MCP, and the SQL is also written into the
feature doc as the durable record, since Supabase migrations are not committed as files.
