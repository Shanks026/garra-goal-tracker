import { seasonalArcTitle } from './arcNaming';

describe('seasonalArcTitle', () => {
  it('returns the matching season for each month', () => {
    expect(seasonalArcTitle(new Date(2026, 0, 15))).toBe('Winter Arc'); // Jan
    expect(seasonalArcTitle(new Date(2026, 3, 15))).toBe('Spring Arc'); // Apr
    expect(seasonalArcTitle(new Date(2026, 6, 15))).toBe('Summer Arc'); // Jul
    expect(seasonalArcTitle(new Date(2026, 9, 15))).toBe('Autumn Arc'); // Oct
    expect(seasonalArcTitle(new Date(2026, 11, 15))).toBe('Winter Arc'); // Dec
  });
});
