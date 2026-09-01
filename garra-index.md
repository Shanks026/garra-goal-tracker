# Garra — Product Index

> Master reference for the Garra app. Everything decided in the design discussion.
> Status: **pre-build**. Nothing implemented yet. Expect revisions during build.
> Last updated: 2026-09-01

---

## 1. What it is

A **finite, time-boxed goal tracker**. You commit to an **Arc** — a fixed period (e.g. Sep 1 → Dec 31) — set goals inside it, log daily, and the app tells you whether you'll actually make it.

**The thesis:** every habit app is infinite, which is why day 200 feels the same as day 12. Garra has an end date. That makes progress measurable against a real runway, makes falling behind quantifiable instead of vibes, and gives the whole thing a finale.

**Origin use case (the real one):** a 4-month Q4 lock-in covering gym, cycling, guitar, personal care, content creation, and technical skills.

---

## 2. Naming — decided

| Thing | Name | Reasoning |
|---|---|---|
| **App** | **Garra** | Spanish/Portuguese: grit, fighting spirit — what commentators praise in athletes ("tiene garra"). Same formula as Strava (Swedish for "strive"): an obscure-to-English European word for a sport-adjacent virtue. Two syllables, vowel-ended, unambiguous pronunciation (GAH-rah), no autocorrect risk. |
| **Core entity** | **Arc** | Narrative term — arcs have a beginning, a rise, and a resolution. Gen-z native ("redemption arc", "training arc"). Bonus: an arc is also a drawing primitive, so the hero visual and the entity are the same shape. |

### Rejected, and why (do not revisit)

- **Locked In** — cheap apps already own it on Play Store. Two-word common phrases are unownable in search. The LinkedIn parallel is useful as internal positioning but must never appear in marketing: LinkedIn is cringe-coded to the target demo, and it sets a social-network expectation the product doesn't meet.
- **Diald** — the vowel-drop reads as a typo, not a name. Autocorrect destroys word-of-mouth ("get Diald" → the friend's phone types "dialed"). The Flickr/Tumblr aesthetic is 2008–2013 and reads as dated.
- **Dialed** — taken by several apps.
- **Montage** — best emotional fit, but the Play Store is saturated with video montage makers. Solving a discoverability problem by making it worse.
- **Arc (as the app name)** — Arc Browser owns that space.

### Retained from "Locked In"

The phrase survives in copy even though it isn't the brand: the onboarding CTA is `Lock in`, and the top status tier is **Locked in**.

### App Store listing

`Garra — Goal Arcs & Streaks`. The coined word owns the brand; the subtitle does the ASO work. Same play as Strava.

---

## 3. Lexicon

Flavor lives in **headers, status labels, empty states, and celebrations**. Never in navigation, buttons, settings, or errors. One strong metaphor, plain language everywhere else.

| Concept | Term | Note |
|---|---|---|
| The container | **Arc** | |
| Things inside it | **Goals** | Plain on purpose. "Quests" is RPG-cringe, "Pillars" is LinkedIn |
| Anchor goals | **Mains** | From "main quest / side quest" — fully in the vernacular |
| Everything else | **Sides** | |
| Sub-targets | **Checkpoints** | |
| Streak protection | **Freeze** | Duolingo trained everyone; don't reinvent |
| Weekly review | **Sunday Reset** | Already a TikTok genre — free cultural fit |
| End-of-arc recap | **The Finale** | An arc ends in a finale, not a "wrapped" |
| Daily logging | **Log** | Boring, correct, never change |

### Status ladder

| State | Label | Colour |
|---|---|---|
| Ahead of pace | **Locked in** | accent, filled |
| On pace | **On track** | neutral |
| Behind pace | **Slipping** | amber |
| Mathematically unreachable | **Cooked** | red |

"Cooked" is doing real UX work. The unreachable state is where users delete the app — a red **GOAL FAILED** banner is a punch in the face; self-deprecating humour defuses shame and keeps them moving toward a rescope instead of the uninstall button.

### Architectural consequence

Every slang string lives in a single `copy.ts` / i18n file. Not for localization — so the whole app can be re-voiced in one commit when "cooked" ages out. **DB tables stay neutral** (`arcs`, `goals`, `entries`).

---

## 4. Core mechanics

### 4.1 One active Arc

A single active arc at a time. Archives are read-only. The constraint is the point.

**Release valve:** individual goals can have their **own end date inside the arc**. The arc runs Sep 1 → Dec 31, but "ship 3 projects" can end Nov 15. Each goal computes pace against its own deadline. This gets the flexibility people want from multiple arcs with none of the complexity — one nullable column.

### 4.2 Pace — the killer feature

With a fixed deadline you can compute what generic apps cannot:

```
Cycling: 240 / 800 km. Day 34 of 122.
On pace: 275 km. You're 35 km behind.
Required from here: 6.4 km/day (was 6.6 at start)
```

The required-rate number goes up when you slack and down when you push. It's a burn-down chart for your life.

For **Habit** goals the equivalent is **consistency %** = sessions completed ÷ sessions scheduled so far.

### 4.3 Rescoping

When a goal becomes **Cooked**, the app offers to rescope rather than fail it silently. Every rescope is timestamped and surfaces in the Finale. Adjusting is a feature, not a confession — rigid targets set on day 1 by someone who didn't yet know what they were doing are the single biggest reason people quit on day 40.

### 4.4 Streaks that don't cause quitting

- **Schedule-aware.** Gym 4×/week means rest days are *not* misses. Streaks count scheduled sessions, not calendar days.
- **Two levels.** *Arc streak* (app-level: did you log anything today — very forgiving, and the only thing notifications defend) and *goal streaks* (per goal, schedule-aware, secondary).
- **Freezes.** Earn 1 per fully-completed week, bank up to 3. Auto-applies to a missed scheduled day. This is harm reduction, not gamification.
- **A miss is data, not a sin.** Optional one-tap reason: `sick` `travel` `no time` `chose not to`. Four months later the Finale says "you missed gym 9 times; 6 were travel days" — actionable, and it reframes misses as information rather than shame.

### 4.5 Mains vs Sides

Exactly 2 Mains per arc. Mains get defended by notifications, sit above a divider on Home, and are what the Finale judges you on. This kills the "guilt spread evenly across six things" problem that causes total collapse.

### 4.6 Load check

At planning time, sum `est_minutes × cadence` across all goals and show weekly and daily totals with an honesty band. Seeing "2h 45m per day, every day" *before* committing is worth more than any streak.

### 4.7 Day rollover

**04:00, not midnight.** A gym session logged at 12:30am means yesterday. Small decision, enormous UX consequence, painful to retrofit.

### 4.8 Backfill

Allowed within a **2-day window** only. Backfilled cells get a subtle diagonal hatch so the dataset stays honest. Unlimited backfill turns the data into fiction.

---

## 5. Goal types

Generic apps flatten every goal into "check a box daily," which makes cycling and content creation meaningless. Four kinds:

| Type | Shape | Example |
|---|---|---|
| **◉ Habit** | Recurring, schedule-based | Gym 4×/wk, personal care daily |
| **▲ Accumulate** | A number to reach by the deadline | 800 km cycling, 100 hrs guitar |
| **✦ Ship** | A count of discrete outputs | 16 videos, 3 projects |
| **⬢ Milestone** | Ordered checkpoints, no daily cadence | Guitar: open chords → barre → first song → 5 songs |

**Compound goals fall out for free.** `checkpoints[]` lives on the *shared* schema, so any goal can carry them. "Milestone type" is just a goal whose only content is checkpoints. Guitar = Milestone (5 songs) + attached cadence (practice 5×/wk).

### Fifth type — later

**⊖ Limit** — stay *under* a daily cap: screen time, spending, junk food. An inverted Habit, and a genuinely common personal-care goal. Not v1, but design the schema so `direction: up | down` isn't a migration later.

---

## 6. Forms

### Shared fields (every type)

| Field | Type | Notes |
|---|---|---|
| `title` | text, req | max 40 |
| `emoji` | picker, opt | defaults per type |
| `accent` | 1 of 8 swatches | auto-assigns next unused; no duplicates within an arc |
| `est_minutes` | number, req | per session — powers the load meter |
| `ends_at` | date, opt | defaults to arc end; can end earlier |
| `checkpoints[]` | list, opt | available on any type |
| `notes` | text, opt | 140 char |
| `is_main` | bool | set in builder step 4 |

### ◉ HABIT

| Field | Type | Notes |
|---|---|---|
| `cadence_mode` | enum | `daily` / `n_per_week` / `specific_days` / `every_n_days` |
| `times_per_week` | 1–7 stepper | if `n_per_week` |
| `days_of_week` | multi-select | if `specific_days` |
| `interval_days` | number | if `every_n_days` |
| `session_target` | number, opt | e.g. 45 |
| `unit` | enum, opt | min / reps / sets / sessions / pages |
| `ramp` | opt | start 3×/wk → 4×/wk from week 4 |

**Log:** checkbox, or checkbox + value if `session_target` is set.

### ▲ ACCUMULATE

| Field | Type | Notes |
|---|---|---|
| `target_amount` | number, req | e.g. 800 |
| `unit` | picker + custom | km / mi / hrs / min / pages / words / reps / kg / currency / custom |
| `starting_value` | number | default 0, for mid-flight goals |
| `pace_basis` | enum | `even` / `weekdays_only` / `custom_weekly` |
| `quick_add[]` | 3 numbers | the +chips on the log sheet, e.g. +5 +10 +25 |

**Log:** number pad + quick-add chips. Two taps for a typical entry.

### ✦ SHIP

| Field | Type | Notes |
|---|---|---|
| `target_count` | number, req | e.g. 16 |
| `item_noun` | text | "videos" — used throughout copy |
| `capture_title` | bool | ask for a name on each ship |
| `capture_link` | bool | ask for a URL |

**Log:** one big `+1 Shipped` → optional metadata sheet.

**Why it's separate from Accumulate:** the log is an *event with metadata*, not a quantity, and the detail screen shows a **list of the things you made** — the entire emotional payoff of a creative goal. Same math, completely different screen.

### ⬢ MILESTONE

| Field | Type | Notes |
|---|---|---|
| `checkpoints[]` | ordered list, req | each: `title`, `target_date?`, `notes?` |
| `sequential` | bool | must complete in order — default off |
| `attached_cadence` | opt | borrows the full Habit cadence block |

**Log:** tap a checkpoint. If `attached_cadence` is set, it also appears in Today as a habit.

---

## 7. App flow

### 7.0 Cold start

```
Splash (ring draws in, ~600ms)
  └─ session? ──no──→ Welcome
       └─yes─→ active arc? ──no──→ Arc Builder
                    └─yes─→ Home
```

### 7.1 Welcome — 3 screens, skippable

Show the product, don't explain it. One live visual + one line each:

1. Arc sweep — *"Pick an end date. This isn't a forever app."*
2. Pace ring with tick — *"Know if you'll actually make it."*
3. Mosaic filling — *"See the whole run at once."*

CTA: **`Build your arc`** plus a small `I have an account`.

**Critical:** build the arc **before** auth. Create it locally, then hit auth at save time with *"Save your arc"*. A login wall on first launch kills 40–60% of installs. Store in-progress state locally and upsert to Supabase after sign-in.

Auth: Sign in with Apple, Google, Email magic link. Apple is mandatory on iOS if Google is present.

### 7.2 Arc Builder

**Step 1 — Name it.** `title` text, max 40, seasonal prefill ("Winter Arc" in September). Chips: `Winter Arc` `Q4 Lock In` `Redemption Arc` `Training Arc` `Custom`.

**Step 2 — Set the window.** `start_date` defaults to **tomorrow** (creates anticipation, avoids a half-day miss on day 1). `end_date` presets `30d` `60d` `90d` `End of year` `Custom`. Live readout: **122 days · Sep 1 → Dec 31**, with the arc redrawing as they adjust.

**Step 3 — Add goals.** Type picker first (2×2 grid), then the type-specific form. Copy under the picker uses real examples so the choice is obvious.

**Step 4 — Pick your Mains.** Exactly 2. Copy: *"If everything falls apart, these two survive. Mains get defended — notifications, streak freezes, and the Finale judges you on these."*

**Step 5 — Load check.** Do not skip this screen.

```
Gym          4×/wk × 75m   5h 00m
Cycling      3×/wk × 60m   3h 00m
Guitar       5×/wk × 30m   2h 30m
Content      2×/wk × 90m   3h 00m
Tech         4×/wk × 60m   4h 00m
Care         7×/wk × 15m   1h 45m
─────────────────────────────────
             19h 15m / week
             2h 45m / day, every day
```

Bands: `< 8h` green *"Sustainable."* · `8–15h` amber *"Ambitious. Doable."* · `> 15h` red *"This is a second job. Most people drop two of these by week 4."*

Buttons: `Trim something` / `I know what I'm doing`. Always let them proceed — just make them look first.

**Step 6 — Reminders.** Explain *before* the OS permission prompt. `daily_log_time` default 21:00. `sunday_reset_time` default Sunday 10:00. `day_rollover` default 04:00, buried in advanced.

**Step 7 — Auth → Save → Confirm.** Full-screen countdown: *"Your arc starts in 14 hours."* One button: `Lock in`.

### 7.3 Home

```
┌─────────────────────────────────┐
│  Winter Arc              ⚙      │
│         ●                       │
│    ╭────╯╌╌╌╌╌╮                 │
│  ╱               ╲              │
│  Day 34 of 122 · 88 left        │
├─────────────────────────────────┤
│  TODAY                    2/5   │
│  ⬤ Gym — Push              ✓   │  ← Mains above the divider
│  ⬤ Personal care           ✓   │
│  ─────────────────────────────  │
│  ○ Guitar          30m     ☐   │
│  ○ Cycling         12km    ☐   │
│  ○ Tech            1h      ☐   │
│                                 │
│     [  Log everything  ]        │
├─────────────────────────────────┤
│  THE ARC                        │
│  ◗ Cycling   240/800    −35km   │
│  ◗ Content     5/16     ahead   │
│  ◗ Guitar    41/100h    on      │
└─────────────────────────────────┘
```

Two axes on one screen — **Today** (execution) and **The Arc** (trajectory). Almost every habit app only shows the first. One scroll, no top tabs. The countdown never leaves the screen.

**Nav:** `Today` · `Arc` · `Settings`. Three tabs. Resist a fourth.

### 7.4 Logging — the path that decides everything

| Flow | Taps | Behaviour |
|---|---|---|
| Binary log | 1 | Tap checkbox → haptic → fill animation. No confirm, no sheet |
| Value log | 2–3 | Tap → sheet with quick-add chips + number pad → auto-dismiss |
| Log everything | 1 | Marks all binary goals done; queues value goals into one sheet |
| Ship | 2 | `+1` → optional metadata sheet |
| Checkpoint | 1 | Tap the node |
| Skip w/ reason | 2 | Swipe left → `sick` `travel` `no time` `chose not to` |
| Backfill | 2 | Long-press a mosaic cell, or the "Yesterday" row shown before 10am |
| Widget | 1 | Home-screen checkboxes, no app launch |
| Notification | 1 | Action buttons on the 9pm nudge |

**Rules:** every log is optimistic and local-first — it writes to SQLite immediately and syncs when there's signal. Undo lives in a 5-second toast, never a confirm dialog. **If a good day takes more than 10 seconds to log, the app is dead by week three.** This path gets optimized harder than anything else in the product.

### 7.5 Goal detail

The hero chart swaps by type — pace ring (Habit), burn-up (Accumulate), shipped-count ring + item list (Ship), spine (Milestone). Below: status pill, required rate, filtered mosaic, week bars, history, and `Edit · Rescope · Pause · Archive`.

### 7.6 Rescope

Auto-offered on **Cooked**, available manually anytime.

> *"800 km by Dec 31 isn't happening — you'd need 24 km/day. That's fine. What's real?"*
> Suggested: **620 km** (your current pace) · Custom · Keep it anyway

### 7.7 Sunday Reset

A Sunday morning notification. 60 seconds, one screen: week mosaic row, per-goal hit/miss, freezes earned, one prompt *"Anything to adjust?"* with inline rescope, and an optional one-line note. **Those notes become the best content in the Finale.**

### 7.8 Arc tab

Full mosaic · momentum curve · load donut (planned vs actual hours) · all-goal pace summary · streak stats.

### 7.9 The Finale

Auto-fires on `end_date`. Scrolling recap → composite poster → share sheet → **`Start your next arc`**, prefilled with carry-forward goals.

Content: total distance, hours, ships. Best week. Worst week. The day you almost quit and didn't. The consistency curve over 122 days. Mains hit vs missed. What you rescoped and when.

**This is the retention loop and the entire distribution channel.** If only one delightful thing gets built, it's this. An infinite habit app cannot have a finale.

### 7.10 Settings

Profile · theme (system/light/dark) · day rollover · notifications · units · widgets · subscription · data export · sign out · delete account.

---

## 8. Charts

Apple's coherence comes from ruthlessly reusing four primitives: **the stroked arc with round caps, the rounded rect, the capsule, and the gradient-filled line.** That constraint is the aesthetic.

### 8.1 The Arc — hero, top of Home

A 180° stroked arc. A dot rides it left→right as the arc progresses. Behind the dot, gradient fill; ahead, a faint track. The name, the hero visual, and the app icon are all the same shape.

### 8.2 Pace Rings — the differentiator

Activity rings, but showing **progress against a pace marker**. A tick sits on the ring where you *should* be today. Fill past the tick = Locked in. Short of the tick = Slipping. **The gap between fill and tick is your deficit, made visible.** No consumer app does this. Prototype it first — it's the product thesis rendered as a shape.

Three concentric rings on Home for the Mains (Apple Activity homage). Tap to explode into detail.

### 8.3 The Mosaic — 122 blocks

One rounded square per day of the arc. Intensity = share of that day's commitments hit. Future days are hollow outlines.

```
▪ ▪ ▪ ▫ ▪ ▪ ▪    ▪ full day
▪ ▪ ▫ ▪ ▪ ▪ ▪    ▪ partial
▪ ▪ ▪ ▪ ▪ ▫ ▫    ▫ missed
▪ ▪ ▪ ▪ ░ ░ ░    ░ not yet
░ ░ ░ ░ ░ ░ ░
```

GitHub's contribution graph, except **an infinite habit app physically cannot build this** — 122 days fits on one screen, forever doesn't. Seeing your remaining runway as unfilled squares feels completely different to seeing a number. There's a per-goal filtered view tinted in that goal's accent.

**Perf: render as ONE Skia canvas, not 122 Views.**

### 8.4 Burn-up — Accumulate goals

Thick line = the actual cumulative curve, goal accent, with a soft gradient fading to transparent. Thin dashed grey = the required pace from 0 to target. The area between them is shaded: green above, amber below. No gridlines, no axis labels, no legend. Scrub to reveal values.

### 8.5 Week Bars

Seven bars, rounded caps. Height = minutes. **Scheduled-but-missed days render as hollow outlined bars**, not absent ones — the miss is visible and honest without being an accusation. Unscheduled days are simply gone.

### 8.6 Momentum

Rolling 7-day completion %, smoothed, across the whole arc. Shows the shape of your effort — the dip in week 6, the recovery after. This is what makes the Finale emotional. One line, gradient fill, a single annotated peak and trough.

### 8.7 Checkpoint Spine — Milestone goals

A vertical line with nodes. Done = filled accent. Current = pulsing ring. Future = hollow. A metro map of the skill you're building.

```
  ●  Open chords          ✓ day 12
  │
  ●  Barre chords         ✓ day 31
  │
  ◉  First full song      ← now
  │
  ○  Song 3
  │
  ○  Song 5
```

### 8.8 Load Donut

Where the week actually went, per goal. The hollow center holds the total. The planning-screen estimate sits behind it as a ghost ring: *planned 19h, logged 13h.*

### 8.9 The Finale Poster

One tall shareable card, dark gradient: the full arc, the completed mosaic, three enormous numerals, best week, longest streak, rescopes and their dates. Composed entirely of the primitives above.

---

## 9. Design language

**Apple-esque minimal + colourful data.** The governing rule: **chrome is neutral, data is loud.** Backgrounds, cards, and text are greyscale. The only saturated colour in the entire app comes from goal accents and charts. That's the Fitness/Health formula and it's why those charts pop.

- **One accent per goal**, chosen at creation from ~8 curated swatches. That colour is the goal's identity everywhere — ring, chart series, checkbox fill, detail header. Never reused within an arc.
- **Big numerals.** Day counter and pace numbers genuinely large, tight-tracked. SF Pro on iOS; Inter Tight or Geist on Android.
- **Dark mode:** never pure `#000`. Background ~`#0A0A0B`, elevated surfaces ~`#141416`. True black is OLED marketing — near-black with subtle elevation reads more premium, and card boundaries actually exist. Bump accents ~10% lighter in dark or they muddy.
- **Motion:** spring physics, never linear easing. Check animation ~250ms with a slight overshoot. Ring fills animate once per session on entry, not on every render.
- **Haptics on every log.** `expo-haptics`, success notification style. Two lines of code, 30% of why the app feels expensive.
- **Restraint on red.** Behind-pace is amber. Red is reserved for Cooked only. A dashboard that's 60% red on a mediocre Tuesday is one you stop opening.
- **Shape scale:** corner radii `8 / 16 / 28`. Stroke widths `2 / 6 / 14`. Round caps on every stroke, without exception. Gradients go accent → accent-at-40%, never accent → a different hue.

### Brand mark

The **ring is the icon** — the pace ring alone on near-black. In the wordmark, the ring can sit as the counter of the **G**. Name → hero visual → app icon, one shape.

---

## 10. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | **Expo** (latest SDK) + Metro | Metro is the default, nothing to configure |
| Framework | **React Native**, new architecture | |
| Routing | **Expo Router** | File-based, typed routes, deep links for widget + notification tap-through |
| Styling | **NativeWind** | Verify the Tailwind version coupling — NativeWind v4 targets TW 3.4, TW4 support is in the v5 line. **TW 3.4 is completely fine; don't burn a week on this** |
| Components | **react-native-reusables** (rn-primitives) | ⚠️ **shadcn/ui does NOT work in React Native** — it's Radix + Tailwind for the web DOM, and there are no `div`s in RN. react-native-reusables is the direct shadcn port |
| Charts | **@shopify/react-native-skia**, or Victory Native XL | Skia is how you get Apple-quality rings and gradients at 60fps. **Never use a JS-thread SVG chart lib** — it will feel cheap, and that's the one thing this design can't afford |
| Animation | **Reanimated + Gesture Handler** | Non-negotiable for the feel |
| Server state | **TanStack Query** | |
| Local state | **Zustand** | Don't blur the boundary with TanStack |
| Local DB | **expo-sqlite + Drizzle** | **Source of truth.** Gyms, basements, and bike rides have no signal. If offline logging fails, the app is dead |
| Backend | **Supabase** | Sync target, not source of truth. **RLS on from the first migration** — every table gets `user_id` + a policy |
| Notifications | **expo-notifications** | Local only for v1. No push infra, no server, no cost |
| Payments | **RevenueCat** | Both stores, receipt validation, entitlements. Do not hand-roll |
| Widgets | **expo-apple-targets** (WidgetKit) | v1.1 — the highest-leverage post-launch feature |
| Errors | **Sentry** | A single user means silent crashes otherwise |
| Dates | **date-fns** + explicit timezone handling | |

---

## 11. Monetization

**Build the gates now, ship everything unlocked, flip them at launch.** One `entitlements` check plus a feature-flag map costs an afternoon today and saves a painful refactor in month six.

| | Free | Pro |
|---|---|---|
| Active arcs | 1 | 1 |
| **Goals** | **3** | **10** |
| Goal types | all 4 | all 4 |
| Logging, streaks, quick log | ✓ | ✓ |
| Pace rings + mosaic | ✓ | ✓ |
| Freezes | 1 banked | 3 banked |
| Reminders | 1 daily | per-goal |
| **Past arcs** | current only | **full history + lifetime stats** |
| Momentum, load donut, deep stats | — | ✓ |
| **Finale** | basic recap | **poster + share cards + milestone cards** |
| Widgets | 1 basic | all + Live Activity + lock screen |
| Custom palettes, alt app icons | — | ✓ |
| Ramps, custom cadence | — | ✓ |
| Health / Strava sync (later) | — | ✓ |
| Data export | ✓ | ✓ |

**Why these lines.** The goal cap is the cleanest gate — the origin use case is 6 goals, so it bites naturally at setup without feeling punitive. Arc history is the strongest long-term gate because its value compounds; nobody on arc four gives up two years of data. And the Finale gate hits at peak emotional investment — day 122, you just finished, you want the artifact. That's the highest-converting moment in the product.

**Never gate:** the mosaic (it's the signature screenshot — let free users post it), core logging, or data export. Don't gate freezes to zero either — capping the bank at 1 is fine, removing harm reduction entirely is predatory and it shows up in reviews.

**Pricing:** `$3.99/mo` · `$24.99/yr` (7-day trial) · **`$59.99 lifetime`**. Keep the lifetime tier — gen-z is actively subscription-hostile, and a low-server-cost app can afford it. Expect a meaningful revenue share from it.

**Paywall placement — contextual only:**

1. Adding a 4th goal in the builder *(highest intent)*
2. The Finale share card *(highest emotion)*
3. Tapping a locked chart
4. A quiet `Garra Pro` row in Settings

Never a hard wall on first launch. Never before a week of logging. Conversion in this category comes from accumulated investment, not from blocking the door.

---

## 12. Cut from v1

| Cut | Reason |
|---|---|
| Full gamification (XP, levels, badges) | Streaks + freezes + pace is enough game. Add in month 3 if engagement sags |
| Social / friends / leaderboards | A different app, 3× the backend, and it changes the soul. Sharing a Finale poster as an image gets 80% of the value for 2% of the work |
| AI coach / insights | No data on day 1, and generated encouragement reads hollow fast. Revisit at Arc 2 with 122 days of real history |
| Apple Health / Strava sync | Great for gym + cycling auto-logging, and a genuine rabbit hole. Straight after the widget |
| Multiple concurrent arcs | The constraint is the point (see the 4.1 release valve) |
| Rich journaling / photos | A 140-char optional note per entry is plenty |

---

## 13. Post-v1 roadmap (rough order)

1. **iOS home-screen widget** — the highest-leverage feature in the entire app. Day counter + tappable checkboxes without opening it
2. Apple Health / Strava auto-logging
3. **⊖ Limit** goal type
4. Live Activity for in-progress sessions
5. Lifetime stats across arcs
6. Milestone share cards mid-arc
7. Reconsider a light social layer — with real usage data, in Arc 2

---

## 14. Open questions

1. **What persists across arcs?** Leaning: arcs stand alone, but a lifetime stats page exists (total km ever, total hours).
2. **Adding a goal mid-arc?** Leaning: allow it, with a shortened runway and a visible "started day 40" marker. Cap active goals around 6 or the load meter is theater.
3. **Notification aggressiveness.** Leaning: one evening nudge if Mains are unlogged, one Sunday Reset prompt. Nothing else. Anything more gets muted in week two, and a muted app is a dead app.
4. **Data model.** The next thing to nail down — `direction: up|down` and `checkpoints[]` on the shared schema both have real schema consequences.
5. Domain availability for `garra.app` / `getgarra.com` — unchecked.
6. Play Store + App Store availability for "Garra" — unchecked.

---

## 15. Notes

- The project folder is still named `locked-in` — rename to `garra` when the repo is initialized.
- No code exists yet. This document is the source of truth until it does.
- See `design-prompt.md` for the Claude Design brief covering all 14 screens.
