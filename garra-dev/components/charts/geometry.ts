// Chart path/geometry math, ported verbatim from the design canvas's DCLogic class
// (design-system/garra-design-system-sixteenscreens/Garra UI Kit.dc.html, `arc()`/`ring()`).
// Pure functions — no React, no Skia imports — so they're testable without rendering.

// Day-indices (0-based, within [0, totalDays)) that land on the 1st of a calendar month, given
// the arc starts on startDate — replaces WindowTicks' old hardcoded [0, 30, 61, 91], which was
// only ever correct for the canvas's own Sep 1 -> Dec 31 example (found while building Phase
// 4.3's real Window screen, where the start date is whatever the user picked).
export function windowTickMonthBoundaries(startDate: string, totalDays: number): number[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const boundaries: number[] = [];
  for (let i = 0; i < totalDays; i++) {
    const day = new Date(start.getTime() + i * 86_400_000);
    if (day.getUTCDate() === 1) boundaries.push(i);
  }
  return boundaries;
}

export function arcSweepGeometry(p: number, cx: number, cy: number, r: number) {
  const L = Math.PI * r;
  const ph = Math.PI * (1 - p);
  return {
    path: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`,
    dashIntervals: [L * p, L + 4] as [number, number],
    dot: { x: cx + r * Math.cos(ph), y: cy - r * Math.sin(ph) },
  };
}

export function paceRingGeometry(
  p: number,
  t: number,
  r: number,
  sw: number,
  cx: number,
  cy: number,
) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  p = clamp(p);
  t = clamp(t);
  const C = 2 * Math.PI * r;
  const angle = ((t * 360 - 90) * Math.PI) / 180;
  const o = sw / 2 + 3.5;
  return {
    C,
    fillIntervals: [C * p, C + 4] as [number, number],
    gapIntervals: [C * Math.max(0, t - p), C + 4] as [number, number],
    gapOffset: -(C * p),
    tick: {
      x1: cx + (r - o) * Math.cos(angle),
      y1: cy + (r - o) * Math.sin(angle),
      x2: cx + (r + o) * Math.cos(angle),
      y2: cy + (r + o) * Math.sin(angle),
    },
    behind: p < t,
  };
}

// Catmull-Rom → cubic Bézier, ported verbatim from DCLogic.smooth(). Control points sit at
// ±1/6 of the neighbour delta. Shared by BurnUp and Momentum.
export function catmullRomSmooth(points: [number, number][]): string {
  const first = points[0];
  if (!first) throw new Error('catmullRomSmooth: points must not be empty');
  let d = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function burnUpGeometry(
  points: [number, number][],
  W: number,
  H: number,
  win: number,
  day: number,
) {
  const last = points[points.length - 1];
  if (!last) throw new Error('burnUpGeometry: points must not be empty');
  const usable = H - H * 0.08;
  const reqEndY = H - usable;
  const reqAtDay = H - (day / win) * usable;
  const linePath = catmullRomSmooth(points);
  return {
    linePath,
    fillPath: `${linePath} L ${last[0].toFixed(1)} ${H} L 0 ${H} Z`,
    requiredLinePath: `M 0 ${H} L ${W} ${reqEndY.toFixed(1)}`,
    deficitAreaPath: `${linePath} L ${last[0].toFixed(1)} ${reqAtDay.toFixed(1)} L 0 ${H} Z`,
    dot: { x: last[0], y: last[1] },
  };
}

export function loadDonutSegments(shares: { color: string; hours: number }[], innerRadius: number) {
  const total = shares.reduce((sum, s) => sum + s.hours, 0);
  const C = 2 * Math.PI * innerRadius;
  let cumulative = 0;
  return shares.map((s) => {
    const share = s.hours / total;
    const len = C * share - 7; // the -7 creates the visible gap between segments
    const seg = {
      color: s.color,
      dashIntervals: [len, C + 4] as [number, number],
      offset: -cumulative,
    };
    cumulative += C * share;
    return seg;
  });
}
