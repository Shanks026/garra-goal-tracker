# Rule 02 — UI Components

Visual values live in `01-design-system.md`. This file is about **structure**: what goes
where, what shape a component takes, and which decisions are already made.

---

## 1. Folder structure

```
app/                          # expo-router. Routes ONLY — no business logic
  _layout.tsx                 # providers, theme, splash gate
  (onboarding)/               # welcome, name, intent, recommended, signup
  (tabs)/
    _layout.tsx               # Today · Arc · Settings — exactly three
    index.tsx                 # Home
    arc.tsx
    settings.tsx
  goal/[id].tsx               # goal detail
  arc-builder/                # window, goal-type, goal-form, load-check
  finale.tsx
  paywall.tsx
components/
  charts/                     # Skia only. ArcSweep, PaceRing, Mosaic, BurnUp,
                              # WeekBars, Momentum, LoadDonut, CheckpointSpine, WindowTicks
  ui/                         # Button, Chip, ListGroup, ListRow, StatusPill, Sheet,
                              # Checkbox, NumPad, SectionLabel, Stat
  goal/                       # GoalRow, TodayRow, GoalTypeCard, AccentPicker
sheets/                       # LogSheet, RescopeSheet, GoalFormSheet
hooks/                        # see 04-hooks.md
lib/
  db/                         # Drizzle schema, migrations, client
  sync/                       # Supabase sync engine
  derive/                     # pace, streaks, mosaic, load — PURE FUNCTIONS, tested
  copy.ts                     # every user-facing slang string
  date.ts                     # 04:00 rollover, timezone helpers
theme/
  tokens.ts                   # the ONLY file with hex literals
```

**`app/` files contain layout and composition only.** A route that reaches into Supabase or
computes pace inline is wrong — that belongs in a hook or `lib/derive/`.

---

## 2. Charts

All charts are `@shopify/react-native-skia`. **Never a JS-thread SVG chart library.**

Rules for every chart component:

- **Props are already-computed values.** A chart receives `{ progress: 0.235, pace: 0.28 }`,
  never a goal object or an array of raw entries. Derivation happens in `lib/derive/`; charts
  only draw. This keeps them testable, reusable, and free of app logic.
- **One canvas per chart.** The 122-cell mosaic is a single `<Canvas>`, not 122 `View`s.
- Accept `accent` as a prop. Never look up a color from a goal inside a chart.
- Exact geometry comes from `01-design-system.md` §4 — that math is ported from the approved
  canvas, so don't re-derive it or "improve" the curve fitting.
- Animate on mount once via Reanimated shared values; never on every render.

Charts get **unit-tested on their path output**, not snapshot-tested on pixels. The
Catmull-Rom smoother and the ring dash/offset math are the two things most likely to break
silently.

---

## 3. Sheets vs pushed screens

**Sheet** (`@gorhom/bottom-sheet`) — a quick, single-purpose form the user dismisses in
seconds. Logging a value, rescoping, adding a goal.

**Pushed screen** (`app/...`) — anything with sub-navigation, a long list, or content the
user browses rather than fills in. Goal detail, Settings, the Finale.

### Sheet pattern

Provider + Context + `forwardRef`/`useImperativeHandle`, mounted once at the app root so any
screen can open it without prop-drilling:

```tsx
const { openLog } = useLogSheet();
openLog(goal);          // imperative, not navigation
```

**`useSheetBackHandler(modalRef)` is mandatory on every sheet.** `@gorhom/bottom-sheet` v5
ships no Android hardware-back handling. Without it, pressing back with a sheet open falls
through to expo-router, and since Home is the root there's nothing to pop — the OS exits the
app. This is a real bug that has shipped in a sibling project. Wire it to the modal's
`onChange` from the start, on every sheet, no exceptions.

---

## 4. The logging path

This is the most important interaction in the product. **A good day must log in under 10
seconds** or the app is dead by week three. Every decision here is subordinate to that.

| Flow | Taps | Implementation |
|---|---|---|
| Binary log | **1** | Tap checkbox → haptic → fill animation. No confirm, no sheet, no navigation |
| Value log | 2–3 | Tap row → LogSheet → quick-add chip or numpad → auto-dismiss on submit |
| Log everything | **1** | Marks every binary goal done; queues value goals into one sheet |
| Ship | 2 | `+1` → optional metadata sheet (skippable) |
| Checkpoint | **1** | Tap the node on the spine |
| Skip with reason | 2 | Swipe left → `sick` `travel` `no time` `chose not to` |
| Backfill | 2 | Long-press a mosaic cell, or the "Yesterday" row shown before 10:00 |

**Hard rules**

- Every log is **optimistic**: write to SQLite, update the UI immediately, sync later.
  Never show a spinner on a log.
- **Undo is a 5-second toast, never a confirm dialog.** Confirming a log is a tax on the
  99% case to protect the 1%.
- No modal, no navigation, and no network round-trip on the binary path.
- Value entry uses the **custom numpad** (`01-design-system.md` §7), not the OS keyboard.

---

## 5. Errors, confirmations, loading

- **Inline form errors** — local `error` state rendered as `<Text>` inside the sheet.
  Never a toast for validation.
- **Destructive confirmations** — RN `Alert.alert` with a `destructive` style button.
  Only for delete/archive. Logging is never confirmed.
- **Loading** — a plain `loading` boolean. No skeleton library. On Home, render the arc
  chrome immediately and let the numbers fill in; never block the whole screen.
- **Empty states** — plain centered `textSecondary` copy. No illustrations, no emoji.
- Copy rule: an error says what went wrong and how to fix it. No apologies, no vagueness.

---

## 6. Icons

`lucide-react-native` exclusively. The canvas already uses Lucide (`bike`, `music`,
`pen-line`, `languages`, `dumbbell`, `book-open`, `rocket`, `moon`, `smartphone`, `scale`,
`mail`, `share`).

Goals reference a **curated icon key**, not a component — `components/goal/GoalIcon.tsx`
maps keys → Lucide components and exports `GOAL_ICON_KEYS` for the picker. Never import a
Lucide icon ad hoc to render a goal's icon.

Icons are `textPrimary` or a muted grey. **Never tinted to a goal accent** (see the
governing law).

Goal-type glyphs (`◉ ▲ ✦ ⬢`) are text, not icons, and need the symbol font stack from the
canvas: `'Apple Symbols','Segoe UI Symbol','Noto Sans Symbols 2','DejaVu Sans',sans-serif`.

---

## 7. Styling

- **NativeWind** for layout and spacing. Values come from the Tailwind config, which is
  generated from `theme/tokens.ts` — so tokens stay the single source.
- Skia and animated components take values from `theme/tokens.ts` directly.
- **No hex literal outside `theme/tokens.ts`.** No magic pixel values — if a number isn't in
  `layout`, `radii`, or `controls`, it needs adding there first.
- Verify the NativeWind ↔ Tailwind version coupling on setup. NativeWind v4 targets Tailwind
  3.4; TW4 support is in the v5 line. **TW 3.4 is fine — do not burn a week on this.**
- Components use `react-native-reusables` (rn-primitives) where a primitive exists.
  ⚠️ **shadcn/ui does not work in React Native** — it's Radix + Tailwind for the web DOM.
  `react-native-reusables` is the direct port.

---

## 8. Accessibility

- Every tappable target ≥ 44×44 even when the visual is smaller (the 24px checkbox gets a
  hit-slop).
- Charts carry `accessibilityLabel` with the value in words: *"Cycling, 188 of 800
  kilometres, 35 behind pace."* A ring with no label is unusable on VoiceOver.
- **Never encode state in color alone.** Slipping is amber *and* says "Slipping". A missed
  mosaic cell is hollow *and* a missed week bar is an outline.
- Support Dynamic Type on body text. Display numerals may cap their scaling — say so in the
  component.
