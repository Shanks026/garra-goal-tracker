import { useEffect } from 'react';
import { View } from 'react-native';
import { Canvas, Circle, DashPathEffect, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/theme/useAppTheme';
import { system } from '@/theme/tokens';
import { timing } from '@/theme/motion';
import { arcSweepGeometry } from './geometry';

export type ArcSweepProps = {
  /** Fraction of the arc elapsed, 0-1. */
  p: number;
  size?: 'home' | 'onboarding' | 'builder';
  /** The value in words — e.g. "Day 34 of 122, 88 days left" (rules/02 §8). */
  accessibilityLabel?: string;
};

// rules/01-design-system.md §4.1
const SIZES = {
  home: { cx: 171, cy: 146, r: 140, sw: 14 },
  onboarding: { cx: 171, cy: 180, r: 150, sw: 14 },
  builder: { cx: 155, cy: 150, r: 132, sw: 14 },
} as const;

export function ArcSweep({ p, size = 'home', accessibilityLabel }: ArcSweepProps) {
  const { tokens } = useAppTheme();
  const { cx, cy, r, sw } = SIZES[size];
  const geo = arcSweepGeometry(p, cx, cy, r);
  const skPath = Skia.Path.MakeFromSVGString(geo.path);

  // Draws on once per mount. The arc's own fraction only changes at the 04:00 rollover, so
  // unlike PaceRing there's nothing here worth springing between. Reduce-motion is handled by
  // the preset (ReduceMotion.System) rather than an async AccessibilityInfo check.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, timing.chart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dashIntervals = useDerivedValue(() => [
    geo.dashIntervals[0] * progress.value,
    geo.dashIntervals[1],
  ]);

  const height = size === 'onboarding' ? cy + r + 20 : cy + 20;

  if (!skPath) return null;

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={{ width: cx * 2, height }}
    >
      <Canvas style={{ width: cx * 2, height }}>
        <Path path={skPath} style="stroke" strokeWidth={sw} color={tokens.track} />
        <Path path={skPath} style="stroke" strokeWidth={sw} strokeCap="round" color={system.arc}>
          <DashPathEffect intervals={dashIntervals} />
        </Path>
        {/* Dot: bg-colored circle punches a hole so the accent dot reads as riding on the stroke */}
        <Circle cx={geo.dot.x} cy={geo.dot.y} r={11} color={tokens.bg} />
        <Circle cx={geo.dot.x} cy={geo.dot.y} r={7} color={system.arc} />
      </Canvas>
    </View>
  );
}
