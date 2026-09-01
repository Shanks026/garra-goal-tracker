import { shouldOfferRescope, suggestedTarget } from './rescope';

describe('shouldOfferRescope', () => {
  it('always offers once a goal is cooked', () => {
    expect(shouldOfferRescope({ status: 'cooked', requiredRate: 0, bestDailyRate: 12 })).toBe(true);
  });

  it('offers when the required rate exceeds twice the goal’s own best day', () => {
    expect(shouldOfferRescope({ status: 'slipping', requiredRate: 30, bestDailyRate: 12 })).toBe(
      true,
    );
  });

  it('does not offer when the required rate is merely demanding', () => {
    // 20 against a best of 12 is hard but demonstrably within reach — not the app's call to make.
    expect(shouldOfferRescope({ status: 'slipping', requiredRate: 20, bestDailyRate: 12 })).toBe(
      false,
    );
  });

  it('never offers to a goal with no history — nothing has been demonstrated yet', () => {
    // Day one of an 800km goal needs ~6.5km/day and the user has done nothing. Prompting them to
    // lower a target they haven't started would be absurd.
    expect(shouldOfferRescope({ status: 'slipping', requiredRate: 6.5, bestDailyRate: 0 })).toBe(
      false,
    );
  });

  it('does not offer to a goal that is on track or locked in', () => {
    expect(shouldOfferRescope({ status: 'on_track', requiredRate: 5, bestDailyRate: 12 })).toBe(
      false,
    );
    expect(shouldOfferRescope({ status: 'locked_in', requiredRate: 2, bestDailyRate: 12 })).toBe(
      false,
    );
  });

  it('does not offer when nothing more is required (target already met)', () => {
    expect(shouldOfferRescope({ status: 'on_track', requiredRate: 0, bestDailyRate: 12 })).toBe(
      false,
    );
  });
});

describe('suggestedTarget', () => {
  it('extrapolates the current pace across the full window', () => {
    // 188km in 34 days ≈ 5.53/day × 122 days ≈ 674 → rounded to the nearest 10.
    const suggestion = suggestedTarget({
      current: 188,
      daysElapsed: 34,
      daysTotal: 122,
      originalTarget: 800,
    });
    expect(suggestion).toBe(670);
  });

  it('never suggests more than the original target', () => {
    // A goal running ahead shouldn't be told to aim higher by a flow meant to make plans real.
    const suggestion = suggestedTarget({
      current: 400,
      daysElapsed: 34,
      daysTotal: 122,
      originalTarget: 800,
    });
    expect(suggestion).toBeLessThanOrEqual(800);
  });

  it('never suggests less than what has already been achieved', () => {
    const suggestion = suggestedTarget({
      current: 500,
      daysElapsed: 120,
      daysTotal: 122,
      originalTarget: 800,
    });
    expect(suggestion).toBeGreaterThanOrEqual(500);
  });

  it('returns the original target on day zero rather than dividing by zero', () => {
    const suggestion = suggestedTarget({
      current: 0,
      daysElapsed: 0,
      daysTotal: 122,
      originalTarget: 800,
    });
    expect(suggestion).toBe(800);
    expect(Number.isNaN(suggestion)).toBe(false);
  });

  it('rounds small targets to whole numbers rather than tens', () => {
    // A 16-video goal shouldn't be told to aim for "10" when 12 is the real projection.
    const suggestion = suggestedTarget({
      current: 5,
      daysElapsed: 40,
      daysTotal: 100,
      originalTarget: 16,
    });
    expect(suggestion).toBe(13);
  });
});
