// Fixture-only data generators for the Phase 2.6 kitchen-sink route. The seeded pseudo-random
// generator here is copied from the canvas's DCLogic (`rnd()`), reused *only* to make these
// fixtures look plausible — it must never appear in a real chart component or lib/derive/. See
// 03-chart-set.md's Context section for the full explanation of this distinction.
import type { MosaicCellState } from '../Mosaic';
import type { WeekBarState } from '../WeekBars';
import type { CheckpointStatus } from '../CheckpointSpine';

function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function fixtureMosaicCells(total: number, day: number, seed: number): MosaicCellState[] {
  const cells: MosaicCellState[] = [];
  for (let i = 0; i < total; i++) {
    if (i >= day) {
      cells.push('future');
      continue;
    }
    const r = rnd(i * 1.7 + seed);
    if (r < 0.68) cells.push('hit');
    else if (r < 0.86) cells.push('partial');
    else cells.push('miss');
  }
  return cells;
}

export const fixtureWeekBars: { height: number; state: WeekBarState }[] = [
  { height: 54, state: 'done' },
  { height: 68, state: 'done' },
  { height: 42, state: 'missed' },
  { height: 76, state: 'done' },
  { height: 30, state: 'done' },
  { height: 60, state: 'missed' },
  { height: 0, state: 'none' },
];

/** A plausible cumulative-progress curve — for fixture use only, never real derivation. */
export function fixtureBurnUpPoints(
  day: number,
  actual: number,
  W: number,
  H: number,
  win: number,
): [number, number][] {
  const usable = H - H * 0.08;
  const yMax = (800 * win) / 122;
  const daily = actual / day;
  const points: [number, number][] = [];
  let v = 0;
  for (let i = 0; i <= day; i++) {
    if (i > 0) v += daily * (0.35 + rnd(i * 3.3 + 11) * 1.3);
    points.push([(i / win) * W, H - (Math.min(v, actual * 1.25) / yMax) * usable]);
  }
  const k = actual / v;
  return points.map(([x, y]) => [x, H - (H - y) * k]);
}

/** A plausible rolling-momentum curve — for fixture use only, never real derivation. */
export function fixtureMomentumPoints(): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= 27; i++) {
    const b = 44 + Math.sin(i / 4.1) * 20 + rnd(i + 7) * 13 + i * 0.5;
    points.push([(i / 27) * 342, 96 - (Math.min(94, b) / 100) * 88 + 4]);
  }
  return points;
}

export const fixtureLoadShares = [
  { color: '#22C7B4', hours: 6.5 },
  { color: '#4FA8FF', hours: 5.25 },
  { color: '#FF6B5A', hours: 4 },
  { color: '#9B6BFF', hours: 2.5 },
  { color: '#9BD64A', hours: 1 },
];

export const fixtureCheckpoints: { label: string; meta: string; status: CheckpointStatus }[] = [
  { label: 'Open chords', meta: 'Sep 14', status: 'done' },
  { label: 'Barre chords', meta: 'Sep 29', status: 'done' },
  { label: 'First full song', meta: 'in progress', status: 'current' },
  { label: 'Song 3', meta: 'planned', status: 'future' },
  { label: 'Song 5', meta: 'planned', status: 'future' },
];
