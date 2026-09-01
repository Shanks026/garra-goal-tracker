import { formatAmount, formatGoalValue, formatMinutes, formatSigned } from './format';

describe('formatAmount', () => {
  it('drops a trailing .0 but keeps a real decimal', () => {
    expect(formatAmount(44)).toBe('44');
    expect(formatAmount(44.0)).toBe('44');
    expect(formatAmount(12.4)).toBe('12.4');
    expect(formatAmount(12.44)).toBe('12.4');
  });
});

describe('formatSigned', () => {
  it('uses a real minus sign for negatives and + for positives', () => {
    expect(formatSigned(-35, 'km')).toBe('−35 km');
    expect(formatSigned(2, 'sessions')).toBe('+2 sessions');
  });

  it('renders zero without a stray sign', () => {
    expect(formatSigned(0, 'km')).toBe('0 km');
  });

  it('works without a unit', () => {
    expect(formatSigned(-3)).toBe('−3');
  });
});

describe('formatMinutes', () => {
  it('formats hours and minutes, omitting empty parts', () => {
    expect(formatMinutes(390)).toBe('6h 30m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(0)).toBe('0m');
  });
});

describe('formatGoalValue', () => {
  it('an Accumulate goal behind pace shows a signed negative in its unit', () => {
    const label = formatGoalValue({
      type: 'accumulate',
      current: 188,
      expected: 223,
      target: 800,
      unit: 'km',
    });
    expect(label).toBe('−35 km');
  });

  it('an Accumulate goal ahead of pace shows a signed positive', () => {
    const label = formatGoalValue({
      type: 'accumulate',
      current: 250,
      expected: 223,
      target: 800,
      unit: 'km',
    });
    expect(label).toBe('+27 km');
  });

  it('exactly on pace shows the position, not "+0"', () => {
    const label = formatGoalValue({
      type: 'accumulate',
      current: 223,
      expected: 223,
      target: 800,
      unit: 'km',
    });
    expect(label).toBe('223 km');
  });

  it('a Habit shows its hit ratio out of the days actually due', () => {
    const label = formatGoalValue({
      type: 'habit',
      current: 5,
      expected: 7,
      target: 40,
      dueSoFar: 7,
    });
    expect(label).toBe('5 / 7 days');
  });

  it('a Ship uses its item noun', () => {
    const label = formatGoalValue({
      type: 'ship',
      current: 5,
      expected: 3,
      target: 16,
      itemNoun: 'videos',
    });
    expect(label).toBe('+2 videos');
  });

  it('a Milestone shows checkpoints hit of total', () => {
    const label = formatGoalValue({
      type: 'milestone',
      current: 3,
      expected: 2,
      target: 5,
    });
    expect(label).toBe('3 of 5');
  });

  it('never emits NaN or undefined for a goal with no unit or noun', () => {
    const label = formatGoalValue({ type: 'accumulate', current: 10, expected: 4, target: 100 });
    expect(label).toBe('+6');
    expect(label).not.toContain('NaN');
    expect(label).not.toContain('undefined');
  });
});
