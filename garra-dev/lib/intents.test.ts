import { INTENTS, type IntentKey } from './intents';

const ALL_KEYS: IntentKey[] = [
  'cycling',
  'guitar',
  'writing',
  'language',
  'strength',
  'reading',
  'sideProject',
];

describe('INTENTS', () => {
  it('has exactly one entry per IntentKey', () => {
    const keys = INTENTS.map((i) => i.key);
    expect(keys.sort()).toEqual([...ALL_KEYS].sort());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('scales a proportional target with totalDays rather than returning a fixed number', () => {
    const cycling = INTENTS.find((i) => i.key === 'cycling')!;
    const full = cycling.buildGoal({ totalDays: 122 });
    const half = cycling.buildGoal({ totalDays: 61 });
    expect(full.targetAmount).toBe(800);
    expect(half.targetAmount).toBeCloseTo(400, 0);
    expect(half.targetAmount).not.toBe(full.targetAmount);
  });

  it('every proposal has a shape valid for its own type', () => {
    for (const intent of INTENTS) {
      const goal = intent.buildGoal({ totalDays: 90 });
      if (goal.type === 'accumulate') {
        expect(goal.targetAmount).toBeDefined();
        expect(goal.unit).toBeDefined();
      }
      if (goal.type === 'ship') {
        expect(goal.targetAmount).toBeDefined();
        expect(goal.itemNoun).toBeDefined();
      }
      if (goal.type === 'milestone') {
        expect(goal.checkpoints).toBeDefined();
        expect(goal.checkpoints!.length).toBeGreaterThan(0);
      }
      if (goal.type === 'habit') {
        expect(goal.cadenceMode).toBeDefined();
      }
    }
  });

  it('estMinutes is always a positive integer', () => {
    for (const intent of INTENTS) {
      const goal = intent.buildGoal({ totalDays: 122 });
      expect(goal.estMinutes).toBeGreaterThan(0);
      expect(Number.isInteger(goal.estMinutes)).toBe(true);
    }
  });
});
