# Feature Doc Template

Use this exact structure when writing a new feature planning doc.
Replace all `[placeholders]` with actual content.

---

````markdown
# Feature: [Feature Name]
**Product**: Garra — Finite Goal Tracker
**File**: `.claude/features/[NN]-[feature-slug].md`
**Roadmap phase**: [which IMPLEMENTATION.md phase this belongs to, or "outside the roadmap"]
**Status**: Planned
**Last Updated**: [Month Year]

---

## Context

[2–3 sentences: why this feature exists and what problem it solves. Reference the
existing pattern it follows — e.g. "reuses the log-sheet shell from screen 12".]

**Designed screens**: [screen numbers from the canvas, or "none — extending [pattern]"]

---

## Thesis Check

[Three short answers. If any is uncomfortable, resolve it before writing phases.]

- **Fits the finite/pace model?** [How it serves plan → log → see pace → adjust]
- **Derived, not stored?** [Confirm no derived value gets a column. If one does, justify it]
- **Works offline?** [Confirm no user action awaits the network]

---

## Phase Overview

```
Phase 1 — [Short name]
  [One sentence]

Phase 2 — [Short name]
  [One sentence]

[Typically 1–4 phases. Each must be independently useful.]
```

**After each phase: stop and wait for approval before proceeding.**

---

## Phase 1 — [Name]

### Goal
[One paragraph. What can the user do at the end of this phase that they couldn't before?]

### Before Starting — Confirm With Codebase
[3–5 specific things to verify by reading actual files first. Existing hook names,
token names, column names, whether a chart component already covers this, what the
canvas screen actually specifies.]

### 1.1 Design
[Which canvas screen this implements, and any values that need reading straight out of
it. If no design exists, name the pattern being extended and what was decided.
State "No UI in this phase" if it's pure logic.]

### 1.2 Data Model
[New/changed Drizzle tables and columns, and the matching Supabase SQL in full,
ready to paste into the SQL editor — including `ENABLE ROW LEVEL SECURITY` and the
policy. This block is the durable schema record; see SKILL.md Step 3.
Say "No schema changes in this phase" if none.]

### 1.3 Derivation
[New/changed pure functions in `lib/derive/`. Signature, what it computes, return
shape. **List the test cases required** — this layer is not optional to test.
Say "No derivation changes" if none.]

### 1.4 Data Layer
[New/changed hooks: name, kind (query/mutation/ui/selector), what it reads, return
shape, which query keys it invalidates. Mutations: what's optimistic, what the
rollback is, what gets enqueued to sync.]

### 1.5 Components
[Every new component/screen file with path and purpose. Route, sheet, chart, or plain
component. Props and key elements. File tree if more than 2–3 files.]

### 1.6 Navigation / Integration
[Changes to existing screens — new route, new entry point, new sheet provider mounted
at root. Be specific about file names.]

### 1.7 Impact on Existing Features
[Table of affected screens/hooks/derivations, what changes, what to watch for.
"None" if genuinely isolated.]

### 1.8 What This Phase Does NOT Include
[Explicit out-of-scope list for this phase specifically.]

### 1.9 Phase 1 Checklist
[Verifiable statements, not tasks.]

- [ ] [Specific, verifiable item]
- [ ] [...]
- [ ] Derivation changes covered by tests; suite passes
- [ ] `tsc --noEmit` clean
- [ ] Verified offline (airplane mode → log → relaunch → data survives)
- [ ] Rendered correctly in both dark and light mode
- [ ] No hex literal outside `theme/tokens.ts`
- [ ] All tappable targets ≥ 44×44

**→ Stop here. Show the result and wait for approval.**

---

## Phase 2 — [Name]

### Goal
[...]

### Before Starting — Confirm Phase 1 is Approved

[Repeat the same 1.1–1.9 structure for each subsequent phase.]

---

## Data Model Summary (Final State After All Phases)

```
[Short tree showing how new tables relate to arcs / goals / entries / checkpoints.]
```

### `[new_table]` — Schema
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, `default gen_random_uuid()` |
| `user_id` | uuid | RLS, FK → `auth.users`, `default auth.uid()` |
| `created_at` | timestamptz | `default now()` |
| `updated_at` | timestamptz | `default now()`, moddatetime trigger |
| [...] | [...] | [...] |

---

## Derivation Summary

| Function | Input | Output | Tested cases |
|---|---|---|---|
| `[name]` | [...] | [...] | [...] |

---

## Entitlement Gates

[Which parts sit behind `useFlag()`, and the free-tier behaviour. "None" if ungated.
Never gate core logging, the mosaic, or data export.]

---

## Out of Scope (All Phases)

- [Item] — [brief reason or "post-v1"]
- [...]
````
