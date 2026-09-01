# Rule 01 — Design System

**Every value here was extracted from the approved design canvas**
(`design-system/garra-design-system-sixteenscreens/Garra UI Kit.dc.html`, 18 screens).
It is not a suggestion or a starting point. If a screen needs a value that isn't here,
that's a design gap — raise it, don't invent one.

The canvas is the visual source of truth. When this file and the canvas disagree, the
canvas wins and this file gets corrected.

---

## 0. The governing law

> **Chrome is neutral. Data is loud.**

Backgrounds, cards, dividers, body text, icons, tab bars, buttons, and form fields are
**greyscale only**. The only saturated color anywhere in the app comes from:

1. **Goal accents** — one per goal, from the fixed 8-swatch palette
2. **The system indigo** — the Arc's own color
3. **Amber** — the single semantic warning color

That's it. Three sources. If you are about to put color on anything else, stop.

### Corollaries

- A "Locked in" or "On track" status is rendered in **neutral grey**, not green. Success is
  the absence of warning, not a color. Only **Slipping** gets amber.
- Buttons are white-on-black or grey-on-black. **The primary button is never accent-colored.**
- Icons are always `textPrimary` or a muted grey. Never tinted to a goal's accent.
- No gradient backgrounds, no glassmorphism, no glow, no colored card borders, no emoji
  as UI furniture, no decorative illustration.

---

## 1. Color tokens

Ship these as `theme/tokens.ts`. Never write a hex literal in a component.

### Dark (primary — design it first)

```ts
export const dark = {
  bg:              '#0A0A0B',   // screen ground. NEVER pure #000
  surface:         '#141416',   // cards, list rows, sheets, tab-bar fill
  scrim:           'rgba(0,0,0,.62)',        // behind bottom sheets

  textPrimary:     '#F5F5F7',
  textSecondary:   'rgba(255,255,255,.45)',  // body copy, descriptions
  textTertiary:    'rgba(255,255,255,.35)',  // meta, row detail
  textQuaternary:  'rgba(255,255,255,.30)',  // captions, disabled
  label:           'rgba(255,255,255,.40)',  // uppercase section labels

  hairline:        'rgba(255,255,255,.06)',  // list separators
  border:          'rgba(255,255,255,.08)',  // card + group borders
  borderStrong:    'rgba(255,255,255,.12)',  // chips, outline buttons
  borderControl:   'rgba(255,255,255,.14)',  // outline button, input underline
  borderSelected:  'rgba(255,255,255,.28)',  // selected card / tier
  borderSelectedHi:'rgba(255,255,255,.32)',

  fill:            'rgba(255,255,255,.05)',  // numpad keys, mosaic future cells
  fillMed:         'rgba(255,255,255,.08)',  // secondary button, status pill
  fillStrong:      'rgba(255,255,255,.11)',  // keyboard keys

  track:           'rgba(255,255,255,.09)',  // arc + ring unfilled track
  mosaicMiss:      'rgba(255,255,255,.16)',  // inset stroke on a missed cell
  barMiss:         'rgba(255,255,255,.18)',  // week-bar missed outline
  tabInactive:     'rgba(255,255,255,.32)',
  handle:          'rgba(255,255,255,.18)',  // sheet grab handle
  homeIndicator:   'rgba(255,255,255,.28)',
  requiredLine:    'rgba(255,255,255,.3)',   // BurnUp's required-rate dashed line, §4.4
  donutGhost:      'rgba(255,255,255,.07)',  // LoadDonut's ghost ring, §4.7
  spineIdle:       'rgba(255,255,255,.1)',   // CheckpointSpine's non-done spine connector, §4.8
  checkboxBorder:  'rgba(255,255,255,.22)',  // unchecked checkbox border, §7
  pillText:        'rgba(255,255,255,.7)',   // StatusPill's default (non-slipping) text, §7
};
```

### Light

```ts
export const light = {
  bg:              '#FAFAF9',
  surface:         '#FFFFFF',
  scrim:           'rgba(0,0,0,.45)',

  textPrimary:     '#0A0A0B',
  textSecondary:   'rgba(10,10,11,.45)',
  textTertiary:    'rgba(10,10,11,.40)',
  textQuaternary:  'rgba(10,10,11,.30)',
  label:           'rgba(10,10,11,.45)',

  hairline:        'rgba(10,10,11,.06)',
  border:          'rgba(10,10,11,.08)',
  borderStrong:    'rgba(10,10,11,.12)',
  borderControl:   'rgba(10,10,11,.14)',
  borderSelected:  'rgba(10,10,11,.25)',

  fill:            'rgba(10,10,11,.05)',
  fillMed:         'rgba(10,10,11,.06)',
  track:           'rgba(10,10,11,.08)',
  mosaicMiss:      'rgba(10,10,11,.16)',
  barMiss:         'rgba(10,10,11,.18)',
  tabInactive:     'rgba(10,10,11,.30)',
  homeIndicator:   'rgba(10,10,11,.25)',
  requiredLine:    'rgba(10,10,11,.3)',      // not spec'd beyond alpha; same dark/light pattern as every other pair
  // `handle` was dark-only when §1 was first written. Sheet.tsx (Phase 2.5) is the first real
  // component to need it in light mode too — added with the same alpha-preserved conversion.
  handle:          'rgba(10,10,11,.18)',
  donutGhost:      'rgba(10,10,11,.07)',     // not spec'd beyond alpha; same dark/light pattern
  spineIdle:       'rgba(10,10,11,.1)',      // not spec'd beyond alpha; same dark/light pattern
  checkboxBorder:  'rgba(10,10,11,.22)',     // not spec'd beyond alpha; same dark/light pattern
  pillText:        'rgba(10,10,11,.7)',      // not spec'd beyond alpha; same dark/light pattern

  // Light mode uses shadow where dark mode uses fill — see §5
  cardShadow: '0 1px 3px rgba(10,10,11,.08), 0 6px 20px rgba(10,10,11,.06)',
};
```

### Goal accents — fixed order, never reordered

```ts
export const ACCENTS = {
  coral:  '#FF6B5A',
  amber:  '#FFB020',
  lime:   '#9BD64A',
  teal:   '#22C7B4',
  sky:    '#4FA8FF',
  indigo: '#5B6CFF',
  violet: '#9B6BFF',
  rose:   '#FF5C8A',
} as const;
export const ACCENT_ORDER = ['coral','amber','lime','teal','sky','indigo','violet','rose'] as const;
```

Assignment: a new goal takes the **next unused** accent in `ACCENT_ORDER`. **No two goals in
the same arc share an accent.** The accent is the goal's identity across every screen — its
ring, its chart series, its checkbox fill, its dot, its mosaic tint.

### System + semantic

```ts
export const system = {
  arc:      '#5B6CFF',  // indigo — the Arc itself
  slipping: '#FFB020',  // amber  — behind pace. The ONLY warning color
  slippingLight: '#B87400',           // amber is illegible on light bg; use this instead
  slippingBg:    'rgba(255,176,32,.12)',  // status pill background
  slippingArea:  'rgba(255,176,32,.14)',  // burn-up deficit shading
  slippingPanel: 'rgba(255,176,32,.10)',  // load-check warning panel
  cooked:   '#FF453A',  // ⚠ NOT IN THE CANVAS — see §9
};
```

**`system.arc` (indigo) is reserved.** It drives the arc sweep, the arc-level mosaic, the
momentum curve, and the window ticks. Indigo also appears in `ACCENTS` — allow it for a
goal only when the palette is exhausted, since goal charts are always contextual.

---

## 2. Typography

**SF Pro Display / SF Pro Text.** System font on iOS; ship Inter Tight or Geist on Android.

**Weight ceiling is 600.** The entire canvas uses 400/500/600, with 700 only on two
micro-badges. Never use 700 for a heading and never use 800 at all — heavy weights are the
fastest way to stop looking like an Apple app.

| Role | Size | Weight | Tracking | Used for |
|---|---|---|---|---|
| `displayXL` | 60 | 600 | −.045em | Arc Builder day count |
| `displayL` | 52 | 600 | −.04em | Log sheet value |
| `displayM` | 46 | 600 | −.045em | Home day number |
| `displayS` | 44 | 600 | −.04em | Goal detail value, onboarding count |
| `numeric` | 42 | 600 | −.04em | Goal form target |
| `statL` | 38 | 600 | −.04em | Load-check total |
| `statM` | 34 | 600 | −.035em | Momentum % |
| `titleXL` | 32 | 600 | −.035em | Finale arc name |
| `titleL` | 30 | 600 | −.03em | Onboarding + paywall titles |
| `titleM` | 28 | 600 | −.03em | Screen titles, goal name in form |
| `statS` | 26 | 600 | −.03em | Milestone sub-stats |
| `titleS` | 24 | 600 | −.025em | Sunday Reset prompt |
| `heading` | 22 | 600 | −.025em | Arc name on Home |
| `nodeLabel` | 19 | 600 | −.02em | Checkpoint label |
| `cardTitle` | 18 | 600 | −.02em | Goal-type card title |
| `row` | 17 | 500 | −.01em | **Primary list row text** |
| `button` | 17 | 600 | −.01em | Button labels |
| `listRow` | 16 | 400/600 | — | Settings-style row label / value |
| `body` | 15 | 400 | — | Secondary body copy |
| `meta` | 14 | 400 | — | Row detail, sub-labels |
| `metaS` | 13 | 400 | — | Small meta, captions |
| `label` | 11 | 600 | **+.14em / +.16em** | UPPERCASE section labels |
| `tab` | 10 | 500/600 | — | Tab bar, Finale stat labels |

**Rules**

- Big numerals get negative tracking. It is the single strongest Apple signal in the kit.
- Uppercase labels get **positive** tracking (`.14em` in forms, `.16em` on Home/detail).
- **Every number that can change or sit in a column gets `fontVariant: ['tabular-nums']`.**
  Non-negotiable on: pace values, day counts, load costs, entry values, hit ratios.
- Line-height: `1.05` on display, `1.2` on titles, `1.45–1.5` on body. Default `1` on
  standalone numerals.
- Long copy gets `textWrap: 'pretty'` (web) / manual balancing in RN.

---

## 3. Spacing & geometry

```ts
export const layout = {
  screenX:        24,   // default horizontal screen padding
  screenXWide:    28,   // onboarding
  screenXFinale:  30,   // Finale poster
  statusBarH:     56,
  tabBarH:        64,
  homeIndicatorH: 26,
};

export const radii = {
  key:     6,    // keyboard key
  cell:    4,    // mosaic cell (goal detail)
  cellLg:  5,    // mosaic cell (arc tab, finale)
  numKey:  12,   // numpad key
  unit:    16,   // unit chip
  card:    16,   // card, list group, status panel
  pill:    15,   // status pill
  chip:    19,   // filter chip (h38)
  chipLg:  21,   // intent chip (h42)
  button:  26,   // inline button (h48)
  buttonLg:28,   // primary button (h54), sheet top corners
  phone:   46,   // device frame (design only)
};

export const controls = {
  buttonPrimaryH:   54,   // radius 28
  buttonInlineH:    48,   // radius 26 — "Log everything"
  listRowH:         56,   // goal form group
  listRowHAlt:      58,   // date group
  chipH:            38,   // radius 19
  intentChipH:      42,   // radius 21
  unitChipH:        32,   // radius 16
  numKeyH:          50,   // radius 12
  keyboardKeyH:     42,   // radius 6
  checkbox:         24,   // fully round (r13)
  statusPillH:      30,   // radius 15
  entryRowH:        42,
  todayRowH:        36,
  dotSm:            8,    // list accent dot
  dotMd:            10,   // reco-card accent dot
  sheetHandle:      [36, 5],
  homeIndicatorBar: [132, 5],
};
```

**Inset grouped lists** (goal form, date pickers) are built the iOS way: a container with
`background: border` and `gap: 1`, each row `background: surface`. The 1px gaps *are* the
separators — do not add border-bottom.

---

## 4. Chart specifications

Charts are **`@shopify/react-native-skia`**. Never a JS-thread SVG chart library — it will
drop frames and the whole design collapses.

The canvas ships exact math in its `DCLogic` class. Port it directly; don't re-derive.

### 4.1 The Arc — hero, top of Home

```
path  = `M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`   // 180° sweep
L     = π * r
dash  = `${L*p} ${L+4}`                                      // p = day/total
angle = π * (1 - p)
dot   = { x: cx + r*cos(angle), y: cy - r*sin(angle) }
```

| Context | cx | cy | r | strokeWidth |
|---|---|---|---|---|
| Home / light Home | 171 | 146 | 140 | 14 |
| Onboarding | 171 | 180 | 150 | 14 |
| Arc Builder | 155 | 150 | 132 | 14 |

Track stroke `track`, progress stroke `system.arc`, **round caps always**.
Dot = `r:11` circle in `bg` + `r:7` circle in `system.arc` (the bg circle punches a hole so
the dot reads as riding *on* the stroke). Day count is absolutely positioned at the arc's
centre, not baked into the SVG.

### 4.2 Pace Ring — the signature component

Four layers, in order:

```
1. track   circle(r)                                        stroke: track,      sw
2. gap     circle(r) rotate(-90)  dash=`${C*max(0,t-p)} ${C+4}`  offset=-C*p
                                                            stroke: slipping (or transparent when ahead)
3. fill    circle(r) rotate(-90)  dash=`${C*p} ${C+4}`      stroke: goal accent, round caps
4. tick    line at angle (t*360 - 90)°, from r-o to r+o     stroke: textPrimary, sw 2, round
           where C = 2πr,  o = sw/2 + 3.5
```

- `p` = actual fraction complete · `t` = fraction you *should* be at today
- Ahead (`p >= t`): gap is transparent, status reads neutral
- Behind (`p < t`): the amber gap arc sits between the fill and the tick — **the deficit is
  literally the visible shape.** This is the product thesis rendered as geometry. Get it right.
- Home row rings: `r:13, sw:6` in a 32×32 box. Tick is `textPrimary` on dark, `#0A0A0B` on light.

### 4.3 The Mosaic

```
future day        → bg: fill ('rgba(255,255,255,.05)'), no stroke
hit (full)        → bg: accent
hit (partial)     → bg: accent @ 42% alpha
missed            → bg: transparent, inset 1px stroke mosaicMiss
```

| Context | Columns | Gap | Radius |
|---|---|---|---|
| Arc tab, Finale | 14 | 4–5 | 5 |
| Goal detail | 20 | 4 | 4 |
| Sunday Reset (1 week) | 7 | 8 | 8, inset 1.5px |

Cells are `aspectRatio: 1`. Arc-level mosaics tint `system.arc`; per-goal mosaics tint that
goal's accent.

**Render the 122-cell mosaic as ONE Skia canvas.** 122 RN `View`s will jank the scroll.

### 4.4 Burn-up — Accumulate goals

viewBox `342 × 112`.

- **Actual line** — Catmull-Rom → cubic Bézier (control points at ±1/6 of the neighbour
  delta), stroke goal accent, `sw 6`, round cap + join.
- **Fill** — same path closed to the baseline, vertical gradient `accent @.38 → accent @0`.
- **Required line** — `M 0 H L W reqEndY`, stroke `rgba(255,255,255,.3)`, `sw 2`,
  dash `2 7`, round cap.
- **Deficit area** — region between actual and required, filled `system.slippingArea`.
- **Head dot** — `r:10` in `bg` + `r:6` in accent.

No gridlines. No axis labels. No legend. Scrub to reveal values.

### 4.5 Week Bars

viewBox `342 × 86`, baseline `y = 80`, `x = 17.4 + i * 48.86`, bar `width 14`, `rx 7`.

- Completed → filled with goal accent
- **Scheduled but missed → `fill: transparent`, `stroke: barMiss`, `sw 2`** (a visible hollow
  stub — the miss is honest without being an accusation)
- Not scheduled → height 0, renders as nothing

Day letters below: 11px, weight 600, `+.1em`, `textQuaternary`.

### 4.6 Momentum

viewBox `342 × 96`. Rolling 7-day completion %, smoothed with the same Catmull-Rom helper.
Stroke `system.arc`, `sw 6`, round. Gradient fill `arc @.38 → 0`.

### 4.7 Load Donut

viewBox `148 × 148`.

```
ghost ring   circle(r:64)  stroke rgba(255,255,255,.07)  sw 6
inner track  circle(r:51)  stroke rgba(255,255,255,.05)  sw 14
segments     circle(r:51)  rotate(-90)  sw 14  round caps
             dash   = `${C*share - 7} ${C+4}`     ← the −7 creates the gap between segments
             offset = -(cumulative arc length)
```

Total sits in the hollow centre: 22px/600 value over a 10px/600/`+.14em` label.

### 4.8 Checkpoint Spine — Milestone goals

Node column `22px` wide; node is an 18×18 circle (`radius 10`).

| State | Node | Spine below |
|---|---|---|
| Done | filled accent | accent |
| Current | transparent + inset 2px accent ring + **pulse** | `rgba(255,255,255,.1)` |
| Future | transparent + inset 2px `rgba(255,255,255,.18)` | `rgba(255,255,255,.1)` |
| Last node | — | transparent |

Pulse: `scale(1) opacity .55 → scale(2.1) opacity 0`, `2.4s ease-out infinite`.
Label 19px/600/−.02em; future labels drop to `textTertiary`. Row `paddingBottom: 38`.

### 4.9 Window Ticks — Arc Builder date range

122 bars, `gap 1`, `borderRadius 2`, aligned to a 44px baseline:

| Bar | Height | Color |
|---|---|---|
| Month boundary (index 0, 30, 61, 91) | 44 | `system.arc` |
| Every 7th day | 26 | `arc @ 55%` |
| All others | 15 | `arc @ 28%` |

---

## 5. Light mode

Light mode is **not** an inversion. Two structural differences:

1. **Dark uses fill, light uses shadow.** The "Log everything" button is
   `rgba(255,255,255,.08)` on dark but `#FFFFFF` + `cardShadow` on light.
2. **Amber is illegible on `#FAFAF9`.** Every "Slipping" status swaps to
   `system.slippingLight` (`#B87400`). Never render `#FFB020` text on a light ground.

Goal accents stay identical across themes — they're already tuned for both.
Checkmark glyphs are `bg`-colored on dark, `#FFFFFF` on light.

---

## 6. Motion

**Every value lives in `theme/motion.ts`.** Same rule as the color tokens: a component that
invents its own duration, stiffness, or delay is a bug. Library is
**`react-native-reanimated`** — already a dependency, runs on the UI thread, and ships both the
spring configs and the layout-animation presets this system needs. Never add a second animation
library.

### 6.0 The governing law, applied to movement

> **Motion serves the data.**

The same test as color: if something moves because the *data changed* or because the *user
touched it*, that's motion doing its job. If it moves because it exists, that's decoration —
cut it.

**The reference is Duolingo's feel, not its volume.** What's worth borrowing is that every tap
feels *received*: snappy spring feedback, immediate acknowledgement, a brief flourish on
completion. What isn't: constant ambient animation, mascots, celebration that interrupts. Garra
is a tool someone opens for ten seconds a day — motion has to make those ten seconds feel good
without ever adding to them.

**Nothing on the log path may take longer than the log.** The 10-second rule
(`02-ui-components.md` §4) outranks every animation in this file.

### 6.1 The four springs

| Preset | Use | Feel |
|---|---|---|
| `spring.press` | Press feedback, every tappable surface | 140ms, barely overshoots — must settle before the finger lifts |
| `spring.snappy` | State changes the user caused: checkbox filling, value settling | 260ms, slight overshoot |
| `spring.gentle` | Larger travel: sheets, layout reflow, a ring seeking a new value | 380ms, well damped |
| `spring.bouncy` | The one flourish: a goal completing, a checkpoint landing | 420ms, loose. **If this is on screen twice at once, something is wrong.** |

`timing.*` exists for opacity only — a fade has no physicality to model with a spring.

### 6.2 What animates

- **Press**: every tappable surface scales to `motion.pressScale` (0.97) via
  `components/ui/PressableScale.tsx`. This is the single highest-value animation in the app — the
  only one the user triggers dozens of times a day.
- **Entrances**: list rows fade and rise `motion.enterOffset`, staggered by `staggerDelay(index)`
  and **clamped** at `motion.staggerMaxItems` — past ~5 items a stagger stops reading as
  choreography and starts reading as lag.
- **Completion**: one `pulseScale` pulse when a goal is logged, fired off the *data* changing, not
  off a render.
- **Charts**: draw on once per mount, **and spring to a new value when the underlying number
  changes.** A log must visibly move the ring — that's the payoff for the tap. What the old rule
  ("once per session, never on re-render") was actually guarding against is re-animating on
  *unrelated* renders; driving the animation from the value itself achieves that properly.
- **Screens**: sequences (onboarding, the arc builder) slide from the right; tabs cross-fade,
  because Today/Arc/Settings are siblings with no order between them.
- **Checkpoint pulse**: 2.4s ease-out infinite (spec in §4.8) — the one deliberately ambient
  animation in the app, and it marks *where you are*, which is data.

### 6.3 What does not animate

- Chrome appearing: headers, labels, dividers, the tab bar.
- Anything on a timer nobody asked for.
- Numbers ticking up digit by digit. A pulse says "this changed" in 260ms; a ticker makes the
  user wait to read their own data.
- Layout of the Today list while logging — a row that reflows under the finger causes mis-taps.

### 6.4 Reduced motion

Every preset in `theme/motion.ts` sets `reduceMotion: ReduceMotion.System`, so the OS setting is
honored **on the UI thread** with no component checking anything. Do not hand-roll an
`AccessibilityInfo.isReduceMotionEnabled()` check — it's async, it races the first frame, and it
puts the decision in the wrong place.

Reduced motion removes entrances, press scales, and pulses. **It never removes a state change**:
a checkbox still fills, a ring still shows the new value, it just arrives instead of travelling.

### 6.5 Haptics

**Haptics on every log.** `expo-haptics`, `NotificationFeedbackType.Success`, fired in the
mutation's `onMutate` — the same frame as the tap, not on animation end or on success. Two lines
of code and roughly a third of why the app feels expensive.

Currently one owner per path (`Checkbox` on the binary path, the mutations elsewhere) so a single
tap never double-buzzes. **Broader haptics are deliberately on hold** — held by user decision
until the motion layer has been felt on a real device.

---

## 7. Component patterns from the canvas

**Primary button** — `h54 r28`, `bg: textPrimary`, `color: bg`, label 17/600/−.01em.
Never accent-colored.

**Secondary button** — `h54 r28`, `bg: fillMed`, `color: textPrimary`.

**Outline button** — `h54 r28`, `1px borderControl`, `color: textSecondary`, weight 500.

**Inline action** — `h48 r26`, `bg: fillMed` ("Log everything").

**Status pill** — `h30 r15`, padding `0 14`, 14px/600/−.01em.
Slipping → `slippingBg` + `slipping`. Everything else → `fillMed` + `rgba(255,255,255,.7)`.

**Today row** — `h36`, gap 14. Checkbox 24px round: unchecked = `1.5px rgba(255,255,255,.22)`;
checked = filled accent with a `bg`-colored ✓. **Completed rows go `textSecondary` +
line-through.** Mains render above a plain 1px `border` divider with `margin: 7 0` — the
divider is unlabeled; position carries the meaning.

**Arc row** — 32px pace ring, name (17/500), then a right column: value (16/600, tabular)
over status (13/500).

**Bottom sheet** — `bg: surface`, top radius 28, `1px border` top edge, 36×5 handle centered,
scrim `rgba(0,0,0,.62)`, content padding `24`.

**Log numpad is custom** — a 3-column grid of 12 keys (`1–9`, `.`, `0`, `⌫`), `h50 r12`,
`bg: fill`, 24px/500. **Do not use the OS keyboard for value entry** — it costs a tap and
breaks the 10-second rule.

**Tab bar** — `h64`, `1px border` top. Active `textPrimary` 10/600; inactive `tabInactive`
10/500. Icons are line-drawn 17–18px glyphs.

---

## 8. Copy tone

Direct and warm. Never corporate, never preachy, no exclamation marks, no motivational quotes.

Flavor lives **only** in headers, status labels, empty states, and celebrations — never in
navigation, buttons, settings, or errors. **All slang strings live in `lib/copy.ts`** so the
app can be re-voiced in one commit when "cooked" ages out.

| Concept | Term |
|---|---|
| The container | **Arc** |
| Anchor goals | **Mains** (everything else: **Sides**) |
| Sub-targets | **Checkpoints** |
| Streak protection | **Freeze** |
| Weekly review | **Sunday Reset** |
| End-of-arc recap | **The Finale** |
| Status ladder | **Locked in · On track · Slipping · Cooked** |

---

## 9. Known design gaps

The canvas covers 18 screens. These are **not** designed — extend the patterns above and
flag the choice in the feature doc rather than inventing a new visual language:

| Gap | Guidance |
|---|---|
| **Cooked / red state** | No red appears anywhere in the canvas. `system.cooked` is a proposal, not approved. Use it only in the status pill and the rescope prompt; never as a chart series. |
| Habit, Ship, Milestone goal forms | Only the Accumulate form (screen 08) exists. Reuse its structure exactly: header → identity → accent row → type-specific block → inset list group → footer hint + primary button. |
| Rescope screen | Not designed. Build as a sheet using the log-sheet shell. |
| Settings | Not designed. Standard inset grouped list. |
| Freeze UI | Only appears as a Sunday Reset line item. No dedicated surface yet. |
| Empty states | Not designed. Plain centered `textSecondary` copy, no illustration. |
| Widget | Post-v1. |

---

## 10. Never do

- Pure `#000` background, or a `#FFFFFF` dark-mode card
- A weight above 600 outside a micro-badge
- An accent color on a button, icon, tab, or border
- Green for success — success is neutral
- Red for "behind" — that's amber; red is reserved for Cooked only
- A chart without round caps
- A gradient between two different hues (always accent → same accent at lower alpha)
- Two goals sharing an accent in one arc
- Axis labels, gridlines, or legends on any chart
- A hex literal anywhere outside `theme/tokens.ts`
