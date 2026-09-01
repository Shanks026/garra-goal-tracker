// Every value here is extracted verbatim from .claude/rules/01-design-system.md §1-3,
// which was itself extracted from the approved design canvas. Do not "improve" or round
// anything here — if a value is wrong, fix the rule file first, then this file to match.

export const dark = {
  bg: '#0A0A0B',
  surface: '#141416',
  scrim: 'rgba(0,0,0,.62)',

  textPrimary: '#F5F5F7',
  textSecondary: 'rgba(255,255,255,.45)',
  textTertiary: 'rgba(255,255,255,.35)',
  textQuaternary: 'rgba(255,255,255,.30)',
  label: 'rgba(255,255,255,.40)',

  hairline: 'rgba(255,255,255,.06)',
  border: 'rgba(255,255,255,.08)',
  borderStrong: 'rgba(255,255,255,.12)',
  borderControl: 'rgba(255,255,255,.14)',
  borderSelected: 'rgba(255,255,255,.28)',
  borderSelectedHi: 'rgba(255,255,255,.32)',

  fill: 'rgba(255,255,255,.05)',
  fillMed: 'rgba(255,255,255,.08)',
  fillStrong: 'rgba(255,255,255,.11)',

  track: 'rgba(255,255,255,.09)',
  mosaicMiss: 'rgba(255,255,255,.16)',
  barMiss: 'rgba(255,255,255,.18)',
  tabInactive: 'rgba(255,255,255,.32)',
  handle: 'rgba(255,255,255,.18)',
  homeIndicator: 'rgba(255,255,255,.28)',
  requiredLine: 'rgba(255,255,255,.3)', // BurnUp's required-rate dashed line — rules/01 §4.4
  donutGhost: 'rgba(255,255,255,.07)', // LoadDonut's ghost ring — rules/01 §4.7
  spineIdle: 'rgba(255,255,255,.1)', // CheckpointSpine's non-done spine connector — rules/01 §4.8
  checkboxBorder: 'rgba(255,255,255,.22)', // unchecked checkbox border — rules/01 §7
  pillText: 'rgba(255,255,255,.7)', // StatusPill's default (non-slipping) text color — rules/01 §7
} as const;

export const light = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  scrim: 'rgba(0,0,0,.45)',

  textPrimary: '#0A0A0B',
  textSecondary: 'rgba(10,10,11,.45)',
  textTertiary: 'rgba(10,10,11,.40)',
  textQuaternary: 'rgba(10,10,11,.30)',
  label: 'rgba(10,10,11,.45)',

  hairline: 'rgba(10,10,11,.06)',
  border: 'rgba(10,10,11,.08)',
  borderStrong: 'rgba(10,10,11,.12)',
  borderControl: 'rgba(10,10,11,.14)',
  borderSelected: 'rgba(10,10,11,.25)',

  fill: 'rgba(10,10,11,.05)',
  fillMed: 'rgba(10,10,11,.06)',
  track: 'rgba(10,10,11,.08)',
  mosaicMiss: 'rgba(10,10,11,.16)',
  barMiss: 'rgba(10,10,11,.18)',
  tabInactive: 'rgba(10,10,11,.30)',
  homeIndicator: 'rgba(10,10,11,.25)',
  requiredLine: 'rgba(10,10,11,.3)', // dark equivalent not spec'd beyond alpha; same pattern as every other dark/light pair
  // `handle` (sheet grab handle) is genuinely needed in light mode too — Sheet.tsx (Phase 2.5)
  // is the first real component to use it. rules/01 §1 originally listed it dark-only; adding
  // the light value now with the same alpha-preserved conversion every other pair uses.
  handle: 'rgba(10,10,11,.18)',
  donutGhost: 'rgba(10,10,11,.07)', // not spec'd beyond alpha; same dark/light pattern
  spineIdle: 'rgba(10,10,11,.1)', // not spec'd beyond alpha; same dark/light pattern
  checkboxBorder: 'rgba(10,10,11,.22)', // not spec'd beyond alpha; same dark/light pattern
  pillText: 'rgba(10,10,11,.7)', // not spec'd beyond alpha; same dark/light pattern

  // Light mode uses shadow where dark mode uses fill — see rules/01 §5.
  cardShadow: '0 1px 3px rgba(10,10,11,.08), 0 6px 20px rgba(10,10,11,.06)',
} as const;

// Fixed order, never reordered — a new goal takes the next unused accent in
// ACCENT_ORDER. No two goals in the same arc share an accent.
export const ACCENTS = {
  coral: '#FF6B5A',
  amber: '#FFB020',
  lime: '#9BD64A',
  teal: '#22C7B4',
  sky: '#4FA8FF',
  indigo: '#5B6CFF',
  violet: '#9B6BFF',
  rose: '#FF5C8A',
} as const;

export const ACCENT_ORDER = [
  'coral',
  'amber',
  'lime',
  'teal',
  'sky',
  'indigo',
  'violet',
  'rose',
] as const;

export const system = {
  arc: '#5B6CFF',
  slipping: '#FFB020',
  slippingLight: '#B87400', // amber is illegible on light bg; use this instead
  slippingBg: 'rgba(255,176,32,.12)',
  slippingArea: 'rgba(255,176,32,.14)',
  slippingPanel: 'rgba(255,176,32,.10)',
  cooked: '#FF453A', // NOT IN THE CANVAS — see rules/01 §9. Status pill + rescope prompt only.
} as const;

// Typography scale — rules/01 §2. Weight ceiling is 600 everywhere in this table;
// never 700 for a heading, never 800 anywhere. Tracking is em-relative (multiply by
// fontSize to get a pixel letterSpacing). Every tabular numeral role gets
// fontVariant: ['tabular-nums'] at the call site, not baked in here.
export const typography = {
  displayXL: { size: 60, weight: '600', tracking: -0.045, lineHeight: 1.05 },
  displayL: { size: 52, weight: '600', tracking: -0.04, lineHeight: 1.05 },
  displayM: { size: 46, weight: '600', tracking: -0.045, lineHeight: 1.05 },
  displayS: { size: 44, weight: '600', tracking: -0.04, lineHeight: 1.05 },
  numeric: { size: 42, weight: '600', tracking: -0.04, lineHeight: 1.05 },
  statL: { size: 38, weight: '600', tracking: -0.04, lineHeight: 1.05 },
  statM: { size: 34, weight: '600', tracking: -0.035, lineHeight: 1.05 },
  titleXL: { size: 32, weight: '600', tracking: -0.035, lineHeight: 1.2 },
  titleL: { size: 30, weight: '600', tracking: -0.03, lineHeight: 1.2 },
  titleM: { size: 28, weight: '600', tracking: -0.03, lineHeight: 1.2 },
  statS: { size: 26, weight: '600', tracking: -0.03, lineHeight: 1.05 },
  titleS: { size: 24, weight: '600', tracking: -0.025, lineHeight: 1.2 },
  heading: { size: 22, weight: '600', tracking: -0.025, lineHeight: 1.2 },
  nodeLabel: { size: 19, weight: '600', tracking: -0.02, lineHeight: 1.2 },
  cardTitle: { size: 18, weight: '600', tracking: -0.02, lineHeight: 1.2 },
  row: { size: 17, weight: '500', tracking: -0.01, lineHeight: 1.45 },
  button: { size: 17, weight: '600', tracking: -0.01, lineHeight: 1.2 },
  listRow: { size: 16, weight: '400', tracking: 0, lineHeight: 1.45 },
  body: { size: 15, weight: '400', tracking: 0, lineHeight: 1.45 },
  meta: { size: 14, weight: '400', tracking: 0, lineHeight: 1.45 },
  metaS: { size: 13, weight: '400', tracking: 0, lineHeight: 1.45 },
  label: { size: 11, weight: '600', tracking: 0.14, lineHeight: 1.2 }, // .16em on Home/detail
  tab: { size: 10, weight: '500', tracking: 0, lineHeight: 1.2 },
} as const;

export const layout = {
  screenX: 24,
  screenXWide: 28,
  screenXFinale: 30,
  statusBarH: 56,
  tabBarH: 64,
  homeIndicatorH: 26,
} as const;

export const radii = {
  key: 6,
  cell: 4,
  cellLg: 5,
  numKey: 12,
  unit: 16,
  card: 16,
  pill: 15,
  chip: 19,
  chipLg: 21,
  button: 26,
  buttonLg: 28,
  phone: 46,
} as const;

export const controls = {
  buttonPrimaryH: 54,
  buttonInlineH: 48,
  listRowH: 56,
  listRowHAlt: 58,
  chipH: 38,
  intentChipH: 42,
  unitChipH: 32,
  numKeyH: 50,
  keyboardKeyH: 42,
  checkbox: 24,
  statusPillH: 30,
  entryRowH: 42,
  todayRowH: 36,
  dotSm: 8,
  dotMd: 10,
  sheetHandle: [36, 5] as const,
  homeIndicatorBar: [132, 5] as const,
} as const;
