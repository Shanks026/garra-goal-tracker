import { useEffect } from 'react';
import { View } from 'react-native';
import { Canvas, Circle, DashPathEffect, Line } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/theme/useAppTheme';
import { system } from '@/theme/tokens';
import { spring, timing } from '@/theme/motion';
import { paceRingGeometry } from './geometry';

export type PaceRingProps = {
  /** Actual fraction complete, 0-1+. */
  p: number;
  /** Fraction you should be at today, 0-1+. */
  t: number;
  /** The goal's accent color — charts never look up a color themselves (rules/02 §2). */
  accent: string;
  /** Hero size (r:58, sw:14) by default, or the compact Home-row variant (r:13, sw:6, 32x32). */
  size?: 'default' | 'row';
  /**
   * The value in words — e.g. "Cycling, 188 of 800 kilometres, 35 behind pace". Required by
   * rules/02 §8: "A ring with no label is unusable on VoiceOver." The caller supplies it
   * because only the caller knows the goal's name, unit, and deficit.
   */
  accessibilityLabel: string;
};

const SIZES = {
  default: { r: 58, sw: 14, box: 148 },
  row: { r: 13, sw: 6, box: 32 },
} as const;

export function PaceRing({ p, t, accent, size = 'default', accessibilityLabel }: PaceRingProps) {
  const { tokens } = useAppTheme();
  const { r, sw, box } = SIZES[size];
  const cx = box / 2;
  const cy = box / 2;
  const geo = paceRingGeometry(p, t, r, sw, cx, cy);

  // Two separate animations, which is the refinement Phase 5.5 made to rules/01 §6:
  //
  // 1. `progress` is the one-time draw-on when the ring first mounts.
  // 2. `fill`/`gap` track p and t, and **spring to a new value when the underlying number
  //    changes** — a log should visibly move the ring. The original rule ("animate once on
  //    mount, never on re-render") was guarding against re-animating on *unrelated* renders;
  //    these are driven by the values themselves, so an unrelated render animates nothing.
  //
  // Reduce-motion is handled inside the presets via ReduceMotion.System, on the UI thread —
  // no async AccessibilityInfo lookup racing the first frame.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, timing.chart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillLength = useSharedValue(geo.fillIntervals[0]);
  const gapLength = useSharedValue(geo.gapIntervals[0]);
  useEffect(() => {
    fillLength.value = withSpring(geo.fillIntervals[0], spring.gentle);
    gapLength.value = withSpring(geo.gapIntervals[0], spring.gentle);
  }, [geo.fillIntervals, geo.gapIntervals, fillLength, gapLength]);

  const fillIntervals = useDerivedValue(() => [
    fillLength.value * progress.value,
    geo.fillIntervals[1],
  ]);
  const gapIntervals = useDerivedValue(() => [
    gapLength.value * progress.value,
    geo.gapIntervals[1],
  ]);

  const tickColor = tokens.textPrimary;
  const gapColor = geo.behind ? system.slipping : 'transparent';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: box, height: box }}
    >
      <Canvas style={{ width: box, height: box }}>
        {/* 1. Track */}
        <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={sw} color={tokens.track} />
        {/* 2. Gap — the deficit, rendered as the literal shape of "behind" */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          style="stroke"
          strokeWidth={sw}
          color={gapColor}
          transform={[{ rotate: -Math.PI / 2 }]}
          origin={{ x: cx, y: cy }}
        >
          <DashPathEffect intervals={gapIntervals} phase={geo.gapOffset} />
        </Circle>
        {/* 3. Fill */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          style="stroke"
          strokeWidth={sw}
          strokeCap="round"
          color={accent}
          transform={[{ rotate: -Math.PI / 2 }]}
          origin={{ x: cx, y: cy }}
        >
          <DashPathEffect intervals={fillIntervals} />
        </Circle>
        {/* 4. Tick — textPrimary resolves to the correct per-theme value already
            (#F5F5F7 dark / #0A0A0B light matches the spec exactly). */}
        <Line
          p1={{ x: geo.tick.x1, y: geo.tick.y1 }}
          p2={{ x: geo.tick.x2, y: geo.tick.y2 }}
          strokeWidth={2}
          strokeCap="round"
          color={tickColor}
        />
      </Canvas>
    </View>
  );
}
