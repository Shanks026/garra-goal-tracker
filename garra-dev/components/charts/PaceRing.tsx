import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { Canvas, Circle, DashPathEffect, Line } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/theme/useAppTheme';
import { system } from '@/theme/tokens';
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

  // Fills animate once on mount, not on every re-render (rules/01 §6).
  const progress = useSharedValue(0);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      progress.value = reduced ? 1 : withTiming(1, { duration: 600 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillIntervals = useDerivedValue(() => [
    geo.fillIntervals[0] * progress.value,
    geo.fillIntervals[1],
  ]);
  const gapIntervals = useDerivedValue(() => [
    geo.gapIntervals[0] * progress.value,
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
