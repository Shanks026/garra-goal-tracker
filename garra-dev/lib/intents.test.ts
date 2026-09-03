import { INTENTS, type IntentKey } from './intents';

// Deliberately hand-written rather than derived from INTENTS. Deriving it would make the first
// test vacuous — its whole job is to catch a key added to the `IntentKey` union with no template
// behind it (or a template whose key isn't in the union), which types alone can't check because
// the union is erased at runtime. So this list has to be updated by hand when the catalog grows,
// and that friction is the feature.
const ALL_KEYS: IntentKey[] = [
  // The canvas's seven.
  'cycling',
  'guitar',
  'writing',
  'language',
  'strength',
  'reading',
  'sideProject',
  // Added when the catalog was broadened past the canvas's examples.
  'running',
  'walking',
  'swimming',
  'meditation',
  'yoga',
  'coding',
  'drawing',
  'photography',
  'piano',
  'drums',
  'singing',
  'cooking',
  'studying',
  'publicSpeaking',
  'content',
  'chess',
  'gardening',
  'stretching',
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

  it('every value-logged proposal carries quickAdd chips, and Accumulate carries a paceBasis', () => {
    for (const intent of INTENTS) {
      const goal = intent.buildGoal({ totalDays: 122 });
      if (goal.type === 'accumulate') {
        // pace() requires a basis; nothing else supplies one at creation time.
        expect(goal.paceBasis).toBeDefined();
      }
      if (goal.type === 'accumulate' || goal.type === 'ship' || goal.sessionTarget != null) {
        // The log sheet's +chips have no other data source.
        expect(goal.quickAdd).toBeDefined();
        expect(goal.quickAdd!.length).toBe(3);
        expect(goal.quickAdd!.every((n) => n > 0)).toBe(true);
        // Ascending, so the chips read left-to-right as small/medium/large.
        expect([...goal.quickAdd!].sort((a, b) => a - b)).toEqual(goal.quickAdd);
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
