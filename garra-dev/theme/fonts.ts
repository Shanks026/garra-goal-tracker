// The typeface layer. `rules/01-design-system.md` §2 specifies "SF Pro Display / SF Pro Text.
// System font on iOS; ship Inter Tight or Geist on Android" — this is the Android half, which had
// never been implemented, so every screen was rendering in Roboto until now.
//
// **Why Inter Tight and not Geist:** the entire type scale in tokens.ts is built on negative
// tracking (−.045em on display, −.03em on titles), and those values were extracted from a canvas
// designed against SF Pro Display. Inter Tight is cut specifically for tight tracking at large
// sizes, so it's the closest free match; on Roboto the same tracking just reads as cramped. Geist
// is the better-looking alternative but isn't on Google Fonts, so it would mean vendoring files.
//
// **Two families, matching Apple's own split:** Inter Tight for display/title sizes (SF Pro
// Display's role) and Inter for body/meta (SF Pro Text's role). Text faces are drawn with looser
// spacing and taller x-height for legibility at small sizes; display faces are tighter and more
// dramatic. Using one face for both is the most common way an app stops looking Apple-like.
//
// **Why a family per weight:** React Native has no font-weight matching for custom fonts, and
// Inter Tight ships static instances rather than a variable font — so `fontWeight: '600'` alone
// would silently synthesise a fake bold. Each weight is its own registered family, and
// `global.css` maps Tailwind's weight utilities onto them so most of the app picks this up with
// no per-component change.

/**
 * Display face — Inter Tight. Title and display sizes (28px and up).
 *
 * 700 exists here against rules/01 §2's "weight ceiling is 600", added at the user's request
 * for the arc title on Home. Recorded as a deliberate exception rather than a drift: the arc's
 * name is the single most important string in the app, and at 38px on a near-black ground 600
 * reads lighter than the rule assumed when it was written against SF Pro.
 */
export const DISPLAY = {
  400: 'InterTight_400Regular',
  500: 'InterTight_500Medium',
  600: 'InterTight_600SemiBold',
  700: 'InterTight_700Bold',
} as const;

/**
 * Text face — Inter. Body, rows, labels, meta.
 *
 * Carries a 700 for the two micro-badges rules/01 §2 permits it on. `DISPLAY` now has one too,
 * by explicit request — see its own note.
 */
export const TEXT = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
} as const;

export type FontWeightKey = keyof typeof TEXT;

/**
 * The family name for a weight, in the display or text face.
 *
 * Use this anywhere a component sets `fontWeight` in an inline style — a weight without a
 * matching family is the bug this module exists to prevent, because React Native will silently
 * synthesise a fake bold instead of failing.
 */
export function fontFor(weight: FontWeightKey, face: 'display' | 'text' = 'text'): string {
  if (face === 'text') return TEXT[weight];
  return DISPLAY[weight];
}
