import { ACCENTS } from '@/theme/tokens';
import {
  arcSweepGeometry,
  catmullRomSmooth,
  loadDonutSegments,
  paceRingGeometry,
  windowTickMonthBoundaries,
} from './geometry';

describe('arcSweepGeometry', () => {
  const cx = 100;
  const cy = 100;
  const r = 50;
  const L = Math.PI * r;

  it('p=0: dash is [0, L+4], dot at the left end', () => {
    const g = arcSweepGeometry(0, cx, cy, r);
    expect(g.dashIntervals).toEqual([0, L + 4]);
    expect(g.dot.x).toBeCloseTo(cx - r, 5);
    expect(g.dot.y).toBeCloseTo(cy, 5);
  });

  it('p=1: dash covers the full arc, dot at the right end', () => {
    const g = arcSweepGeometry(1, cx, cy, r);
    expect(g.dashIntervals).toEqual([L, L + 4]);
    expect(g.dot.x).toBeCloseTo(cx + r, 5);
    expect(g.dot.y).toBeCloseTo(cy, 5);
  });

  it('p=0.5: dot sits at the top of the sweep', () => {
    const g = arcSweepGeometry(0.5, cx, cy, r);
    expect(g.dot.x).toBeCloseTo(cx, 5);
    expect(g.dot.y).toBeCloseTo(cy - r, 5);
  });

  it('does not auto-clamp above 1 — callers are responsible for clamping', () => {
    const g = arcSweepGeometry(1.2, cx, cy, r);
    expect(g.dashIntervals[0]).toBeCloseTo(L * 1.2, 5);
  });
});

describe('paceRingGeometry', () => {
  const r = 58;
  const sw = 14;
  const cx = 70;
  const cy = 70;
  const C = 2 * Math.PI * r;

  it('p=t: gap is invisible ([0, C+4])', () => {
    const g = paceRingGeometry(0.5, 0.5, r, sw, cx, cy);
    expect(g.gapIntervals).toEqual([0, C + 4]);
    expect(g.behind).toBe(false);
  });

  it('p>t (locked in): gap resolves to 0, not negative', () => {
    const g = paceRingGeometry(0.8, 0.5, r, sw, cx, cy);
    expect(g.gapIntervals[0]).toBe(0);
    expect(g.behind).toBe(false);
  });

  it('p<t (slipping): gap length equals C*(t-p)', () => {
    const g = paceRingGeometry(0.3, 0.6, r, sw, cx, cy);
    expect(g.gapIntervals[0]).toBeCloseTo(C * 0.3, 5);
    expect(g.behind).toBe(true);
  });

  it('both p and t clamp to 1 when given values above 1 (unlike arcSweepGeometry)', () => {
    const g = paceRingGeometry(1.5, 1.3, r, sw, cx, cy);
    expect(g.fillIntervals[0]).toBeCloseTo(C, 5);
    expect(g.gapIntervals[0]).toBe(0);
  });

  it("tick sits at the top (12 o'clock) when t=0", () => {
    const g = paceRingGeometry(0, 0, r, sw, cx, cy);
    const o = sw / 2 + 3.5;
    expect(g.tick.x1).toBeCloseTo(cx, 5);
    expect(g.tick.y1).toBeCloseTo(cy - (r - o), 5);
  });

  it('tick sits back at the top when t=1 (360° wraps to the same position as t=0)', () => {
    const g = paceRingGeometry(0, 1, r, sw, cx, cy);
    const o = sw / 2 + 3.5;
    expect(g.tick.x1).toBeCloseTo(cx, 4);
    expect(g.tick.y1).toBeCloseTo(cy - (r - o), 4);
  });
});

// A valid SVG path string for Skia.Path.MakeFromSVGString: starts with an absolute moveto,
// and every subsequent command is a recognized letter followed by numbers. Skia itself isn't
// loadable under Jest (it's a native module — confirmed this session), so this is a structural
// proxy for "would Skia accept this," not a full parse.
function isWellFormedSvgPath(d: string): boolean {
  return /^M\s*-?\d+(\.\d+)?\s+-?\d+(\.\d+)?(\s+[A-Z]\s*(-?\d+(\.\d+)?\s*)+)*$/.test(d.trim());
}

describe('catmullRomSmooth', () => {
  it('handles 2 points without crashing (degenerate — no interior curve)', () => {
    const d = catmullRomSmooth([
      [0, 0],
      [10, 10],
    ]);
    expect(isWellFormedSvgPath(d)).toBe(true);
  });

  it('handles 3 points (one interior segment)', () => {
    const d = catmullRomSmooth([
      [0, 0],
      [10, 5],
      [20, 0],
    ]);
    expect(isWellFormedSvgPath(d)).toBe(true);
  });

  it('keeps control points on a straight line of collinear points (no bulge)', () => {
    const points: [number, number][] = [
      [0, 0],
      [10, 10],
      [20, 20],
      [30, 30],
    ];
    const d = catmullRomSmooth(points);
    // Every C-command's coordinates should satisfy y=x (collinear), within rounding.
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      expect(nums[i]!).toBeCloseTo(nums[i + 1]!, 1);
    }
  });

  it('produces a string well-formed enough for Skia.Path.MakeFromSVGString', () => {
    const d = catmullRomSmooth([
      [0, 96],
      [50, 80],
      [100, 60],
      [342, 20],
    ]);
    expect(isWellFormedSvgPath(d)).toBe(true);
  });
});

describe('loadDonutSegments', () => {
  it('segment lengths plus removed gaps sum back to the circumference', () => {
    const shares = [
      { color: ACCENTS.coral, hours: 6.5 },
      { color: ACCENTS.sky, hours: 5.25 },
      { color: ACCENTS.teal, hours: 4 },
    ];
    const r = 51;
    const C = 2 * Math.PI * r;
    const segs = loadDonutSegments(shares, r);
    const totalGapRemoved = segs.length * 7;
    const totalDashLength = segs.reduce((sum, s) => sum + s.dashIntervals[0], 0);
    expect(totalDashLength + totalGapRemoved).toBeCloseTo(C, 5);
  });
});

describe('windowTickMonthBoundaries', () => {
  it('a window starting exactly on the 1st includes index 0', () => {
    expect(windowTickMonthBoundaries('2026-09-01', 30)).toContain(0);
  });

  it("a window starting mid-month finds the next month's 1st, not an anchored offset", () => {
    // Starts Sep 15 -> Oct 1 is 16 days later (index 16), not index 30/61/91.
    const boundaries = windowTickMonthBoundaries('2026-09-15', 60);
    expect(boundaries).toContain(16);
    expect(boundaries).not.toContain(30);
  });

  it('a window shorter than 30 days may return zero boundaries without crashing', () => {
    expect(() => windowTickMonthBoundaries('2026-09-05', 10)).not.toThrow();
    expect(windowTickMonthBoundaries('2026-09-05', 10)).toEqual([]);
  });

  it('matches the exact [0, 30, 61, 91] fixture it replaces (Sep 1 -> Dec 31, 122 days)', () => {
    expect(windowTickMonthBoundaries('2026-09-01', 122)).toEqual([0, 30, 61, 91]);
  });
});
