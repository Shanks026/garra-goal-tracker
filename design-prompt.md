# Claude Design prompt — Garra screens

Paste the block below into Claude Design. Drop the exported images into this project root; I'll build against them.

---

## THE PROMPT

Design a mobile app UI kit for **Garra** — a finite, time-boxed goal tracker. Unlike infinite habit apps, every commitment lives inside an **Arc**: a fixed period with a real end date (e.g. Sep 1 → Dec 31, 122 days). The app's core promise is telling you whether you'll actually *make it*, not just whether you showed up today.

**iPhone screens, 390 × 844. Show every screen in DARK MODE unless noted.**

### Design language

Apple-esque and minimal, in the spirit of the iOS Fitness, Health, and Activity apps. Clean, elegant, quietly confident. Simple enough to read in half a second, striking enough to screenshot.

**The one governing rule: chrome is neutral, data is loud.** Every background, card, divider, icon, label, and line of body text is pure greyscale — black, white, and greys, nothing else. The ONLY saturated color anywhere on the screen comes from goal accent colors and the charts they drive. If a color appears on something that isn't data, remove it. This single rule is what makes the charts pop and what separates this from every other habit app.

**Whitespace is the primary design material.** Be genuinely generous — more than feels necessary. Large margins, real breathing room between sections, nothing crowded against an edge or against its neighbor. Empty space is doing work; it's what makes a screen feel expensive rather than busy. When in doubt, remove an element rather than shrink the gaps.

**Restraint over decoration.** No borders where whitespace can separate. No shadows where contrast can. No gradient backgrounds, no glassmorphism, no drop-shadowed cards floating on patterns, no decorative icons, no badges or ribbons. One clear focal point per screen — usually a chart or a number — and everything else recedes to support it. Hierarchy comes from size, weight, and spacing, never from boxes and color fills.

- Dark background `#0A0A0B`. Elevated cards `#141416`. Never pure black. Subtle 1px borders at ~8% white.
- Light mode background `#FAFAF9`, cards pure white, soft shadows.
- Typography: SF Pro. Large tight-tracked numerals for hero stats (48–72pt). Section headers small, uppercase, letterspaced, 50% grey. Body 15–17pt.
- Corner radii: 8 / 16 / 28. Stroke widths: 2 / 6 / 14. **Round caps on every stroke, no exceptions.**
- Gradients go accent → same accent at 40% opacity. Never accent → a different hue.
- Eight goal accent swatches, vivid but not neon, distinguishable in both themes. Suggest: coral, amber, lime, teal, sky, indigo, violet, rose. Each goal owns exactly one, used consistently across every screen it appears on.
- Amber for "behind." Red reserved *only* for total failure — never for ordinary imperfection.
- Screen padding 20–24pt minimum. 32–40pt between major sections. Nothing touches an edge.

### Custom chart shapes — these are the heart of it, make them beautiful

1. **The Arc** — a 180° stroked arc, gradient-filled from the left up to a travelling dot showing progress through the period; faint untraveled track ahead of the dot. Sits at the top of Home.
2. **Pace Ring** — an Apple Activity–style ring, but with a small perpendicular tick mark on the ring showing where you *should* be today. Fill past the tick = ahead (accent). Fill short of the tick = behind, and the gap renders amber. This is the signature component.
3. **The Mosaic** — a grid of ~122 small rounded squares, one per day of the arc. Filled = full day, half-tone = partial, hollow outline = missed, very faint = future. Reads like a GitHub contribution graph but finite and beautiful.
4. **Burn-up chart** — thick accent line of actual cumulative progress with a soft gradient fading to transparent beneath it, plus a thin dashed grey "required pace" line. The area between them shaded green when above, amber when below. No gridlines, no axis labels, no legend.
5. **Week Bars** — seven rounded-cap vertical bars. Completed days solid; scheduled-but-missed days rendered as hollow outlined bars; unscheduled days absent entirely.
6. **Checkpoint Spine** — a vertical line with nodes down it, like a metro map. Completed nodes filled, current node a pulsing ring, future nodes hollow.
7. **Load Donut** — segmented donut of hours per goal with the total in the hollow center, and a faint "planned" ghost ring sitting behind the actual.

### Screens to design

1. **Onboarding 1–3** — full-bleed, one large live chart per screen, one line of copy. (1) The Arc: *"Pick an end date. This isn't a forever app."* (2) Pace Ring: *"Know if you'll actually make it."* (3) Mosaic: *"See the whole run at once."*
2. **Arc Builder — Set the window.** Date range picker, preset chips (30d / 60d / 90d / End of year / Custom), and a live arc that redraws as the range changes. Big readout: "122 days · Sep 1 → Dec 31".
3. **Arc Builder — Goal type picker.** A 2×2 grid of large tappable cards: ◉ Habit "do it regularly", ▲ Accumulate "reach a number", ✦ Ship "produce things", ⬢ Milestone "hit checkpoints". Each with a small illustrative glyph.
4. **Goal form — Accumulate.** Title, emoji, accent swatch row, target amount + unit picker, cadence, estimated minutes, end date. Show it half-filled: "Cycling · 800 km".
5. **Load check.** A list of goals with weekly hour costs, a bold total (`19h 15m / week`, `2h 45m / day`), and a colored honesty band reading *"This is a second job. Most people drop two of these by week 4."* Two buttons: `Trim something` / `I know what I'm doing`.
6. **Home — the hero screen.** Top: arc name, the Arc chart, "Day 34 of 122 · 88 left". Middle: a TODAY section with checkable goal rows — two completed "Mains" above a divider, three incomplete below — and a full-width `Log everything` button. Bottom: a THE ARC section of goal rows each with a small pace ring and a status ("−35 km", "ahead", "on track"). Three-tab bar: Today / Arc / Settings.
7. **Home — light mode.** Same screen, light palette.
8. **Log sheet.** Bottom sheet over a dimmed Home for logging a value: goal name, big number field, three quick-add chips (`+5` `+10` `+25`), a compact number pad.
9. **Goal detail — Accumulate.** Large burn-up chart hero, a status pill reading **Slipping** in amber, "Required from here: 6.4 km/day", a filtered mosaic in the goal's accent, week bars, and a recent-entries list.
10. **Goal detail — Milestone.** Checkpoint spine hero for a guitar goal: open chords ✓, barre chords ✓, first full song (current), song 3, song 5. Progress "2 of 5".
11. **Arc tab.** The full 122-cell mosaic as hero, then a momentum curve (rolling 7-day completion %, smoothed, gradient fill), then the load donut.
12. **Sunday Reset.** A calm single-screen weekly review: one row of seven mosaic cells, per-goal hit/miss list, "1 freeze earned", a prompt *"Anything to adjust?"*, and a single-line note field.
13. **The Finale.** A tall shareable poster card, dark with a rich gradient: arc name, three enormous stat numerals (`842 km`, `61 hrs`, `14 shipped`), the completed mosaic, best week, longest streak. Designed to be screenshotted into an Instagram story.
14. **Paywall.** Clean feature comparison, three pricing tiles (`$3.99/mo`, `$24.99/yr` marked *best value* with a 7-day trial, `$59.99 lifetime`). Restrained and confident — no urgency banners, no countdown timers.

### Tone of copy

Direct and warm, never corporate or preachy. Status labels are **Locked in** / **On track** / **Slipping** / **Cooked**. Anchor goals are called **Mains**. The weekly review is the **Sunday Reset**. The recap is **The Finale**. Slightly gen-z but restrained — the flavor lives in headers and status labels, never in buttons or settings.

### Do not

No gradient mesh backgrounds. No glassmorphism or frosted panels. No neon or glow effects. No emoji as UI furniture. No decorative illustrations or 3D renders. No progress bars where a ring or an arc would do. No rounded-card-with-colored-left-rail layouts. No dashboards where every tile is a different color — remember that color means *data*, and a screen with six colored panels has said nothing. No urgency copy, no exclamation marks, no motivational quotes.

The benchmark is the iOS Fitness app's Summary tab, the Health app's trend cards, and Apple's Activity rings. If a screen would look at home next to those, it's right.
