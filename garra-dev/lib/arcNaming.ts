// The fast onboarding path (canvas screens 01-05) has no "name your arc" step, unlike the
// original seven-step spec — so a seasonal default stands in, editable later (Phase 6+). Matches
// the canvas's own examples ("Autumn Arc" throughout the Home mockups).
export function seasonalArcTitle(now: Date): string {
  const month = now.getMonth(); // 0-11, local — flavor only, not a day-boundary calculation
  if (month >= 2 && month <= 4) return 'Spring Arc';
  if (month >= 5 && month <= 7) return 'Summer Arc';
  if (month >= 8 && month <= 10) return 'Autumn Arc';
  return 'Winter Arc';
}
