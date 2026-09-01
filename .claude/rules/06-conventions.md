# Rule 06 — Code Conventions

---

## 1. Language

**TypeScript, strict.** `strict: true`, `noUncheckedIndexedAccess: true`.

- No `any`. Use `unknown` and narrow. If a third-party type is genuinely wrong, write a local
  type and a one-line comment saying why.
- Domain unions are string literal types, not enums:
  ```ts
  type GoalType   = 'habit' | 'accumulate' | 'ship' | 'milestone';
  type PaceStatus = 'locked_in' | 'on_track' | 'slipping' | 'cooked';
  ```
  They serialise straight into SQLite and Postgres with no mapping layer.
- Types for a domain object live next to its derivation (`lib/derive/types.ts`), not in a
  global `types.ts` dumping ground.
- Prefer `type` over `interface` unless declaration merging is actually needed.

---

## 2. Files & naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase, one per file, named export | `PaceRing.tsx` |
| Hooks | camelCase `use*` | `useGoalPace.ts` |
| Pure modules | camelCase | `pace.ts`, `dayKey.ts` |
| Routes | expo-router kebab-case | `arc-builder/load-check.tsx` |
| Tests | co-located `.test.ts` | `pace.test.ts` |
| Constants | `SCREAMING_SNAKE` | `DAY_ROLLOVER_HOUR` |

- **Named exports everywhere except route files**, which expo-router requires to default-export.
- One component per file. If a subcomponent is only used by its parent and is under ~30 lines,
  keeping it in the same file is fine — extract when it's reused or tested.
- No `index.ts` barrel files. They break tree-shaking in Metro and obscure where things live.

---

## 3. Testing

Test what breaks silently. Skip what a screenshot would catch.

**Must have tests:**
- `lib/derive/*` — pace, streaks, mosaic, load. **This is the product; it is not optional.**
  See `03-state-and-data.md` §4 for the required cases.
- `lib/date.ts` — the 04:00 rollover, timezone boundaries, DST transitions.
- Chart path generators — the Catmull-Rom smoother and ring dash/offset math.
- The sync reducer — replay idempotency.

**Don't bother:**
- Snapshot tests of screens. They break on every design tweak and catch nothing real.
- Testing TanStack Query's behaviour.
- Mocking Supabase to assert a call happened.

Vitest or Jest — whichever the Expo template ships with. Don't add a second runner.

---

## 4. Comments

Comment **why**, never what. The code says what.

```ts
// Rollover is 04:00, not midnight: a session logged at 00:30 belongs to yesterday.
// Changing this silently reassigns historical entries — see rules/03 §5.
const DAY_ROLLOVER_HOUR = 4;
```

Worth a comment: a non-obvious constant, a workaround for a library bug (with a link), a
deliberate deviation from these rules. Not worth a comment: anything restating the line below
it, or a `// TODO` with no owner and no context.

Match the density of the surrounding file.

---

## 5. Git

- Branch per feature phase: `feat/03-onboarding-phase-2`.
- Commit messages: imperative, scoped — `feat(charts): add PaceRing with pace tick`.
- **Commit only when asked.** Never push to a default branch without being told.
- One phase from a feature doc = one PR, ideally one commit stack. It should be reviewable
  against the phase's checklist.

---

## 6. Dependencies

The stack is settled (`garra-index.md` §10). Adding a dependency is a decision, not a
convenience:

- **Never** add a state manager, a chart library, a styling system, an HTTP client, or a date
  library. Those slots are filled.
- Before adding anything, check it works with the RN new architecture and Expo's current SDK.
- A dependency that pulls in a native module means a new build — say so before adding it.
- Prefer 20 lines in `lib/` over a package for something small.
- If a dependency seems necessary, raise it in the feature doc's Risks section first.

---

## 7. Performance

- **The 122-cell mosaic is one Skia canvas.** Not 122 `View`s. This is the single easiest way
  to make the Arc tab feel cheap.
- Memoise every derived object handed to a chart (`useMemo`), or the chart re-animates.
- Charts animate on mount once per session, not on every render.
- Use `FlashList` for any list that can exceed ~30 rows. Today's list (≤ 10) is a plain map.
- No console logging in committed code. `Sentry.addBreadcrumb` if it matters.

---

## 8. Definition of done

A phase is complete only when every item is actually true — not "should be true":

- [ ] Every checklist item in the feature doc verified individually
- [ ] `tsc --noEmit` clean
- [ ] Derivation changes covered by tests, and the suite passes
- [ ] Works **offline** — airplane mode, log something, relaunch, data survives
- [ ] Rendered in **both** dark and light mode
- [ ] No hex literal outside `theme/tokens.ts`
- [ ] Every tappable target ≥ 44×44
- [ ] Feature doc updated: items checked, deviations recorded, phase header marked complete

**Then stop and wait for approval.** Do not roll into the next phase.
