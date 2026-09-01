import { motion, spring, staggerDelay, timing } from './motion';

describe('staggerDelay', () => {
  it('steps by one interval per item', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBe(motion.staggerStep);
    expect(staggerDelay(3)).toBe(3 * motion.staggerStep);
  });

  it('clamps, so a long list’s last row is not seconds late', () => {
    const capped = motion.staggerMaxItems * motion.staggerStep;
    expect(staggerDelay(motion.staggerMaxItems)).toBe(capped);
    expect(staggerDelay(40)).toBe(capped);
  });
});

describe('motion presets', () => {
  it('every animation stays under 400ms except the one deliberate flourish and the chart draw', () => {
    // rules/01 §6: motion is felt, not watched. A slow animation on the log path is a bug.
    expect(spring.press.duration).toBeLessThan(200);
    expect(spring.snappy.duration).toBeLessThan(300);
    expect(spring.gentle.duration).toBeLessThanOrEqual(400);
    expect(spring.bouncy.duration).toBeLessThanOrEqual(420);
    expect(timing.chart.duration).toBe(600);
  });

  it('press feedback settles faster than any state change, so taps never feel laggy', () => {
    expect(spring.press.duration).toBeLessThan(spring.snappy.duration);
  });

  it('every preset opts into the OS reduce-motion setting', () => {
    for (const preset of [...Object.values(spring), ...Object.values(timing)]) {
      expect(preset.reduceMotion).toBe('system');
    }
  });

  it('springs overshoot (dampingRatio < 1) — that is what reads as physical', () => {
    for (const preset of Object.values(spring)) {
      expect(preset.dampingRatio).toBeLessThan(1);
      expect(preset.dampingRatio).toBeGreaterThan(0);
    }
  });

  it('the press scale is subtle enough to read as feedback, not as a toy', () => {
    expect(motion.pressScale).toBeGreaterThan(0.93);
    expect(motion.pressScale).toBeLessThan(1);
  });
});
