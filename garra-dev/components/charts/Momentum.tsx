import { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient, Path, Skia, Canvas as SkiaCanvas } from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { system } from '@/theme/tokens';
import { timing } from '@/theme/motion';
import { catmullRomSmooth } from './geometry';

export type MomentumProps = {
  /** Already-computed rolling 7-day completion %, one point per day. */
  points: [number, number][];
  accent?: string;
};

const W = 342;
const H = 96;

export function Momentum({ points, accent = system.arc }: MomentumProps) {
  const last = points[points.length - 1];
  const linePath = last ? Skia.Path.MakeFromSVGString(catmullRomSmooth(points)) : null;
  const fillPath =
    linePath && last
      ? Skia.Path.MakeFromSVGString(
          `${catmullRomSmooth(points)} L ${last[0].toFixed(1)} ${H} L 0 ${H} Z`,
        )
      : null;

  const opacity = useSharedValue(0);
  useEffect(() => {
    // Reduce-motion comes from the preset (ReduceMotion.System), on the UI thread — not from an
    // async AccessibilityInfo lookup that races the first frame (see theme/motion.ts).
    opacity.value = withTiming(1, timing.chart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!linePath || !fillPath) return null;

  return (
    <View style={{ width: W, height: H }}>
      <SkiaCanvas style={{ width: W, height: H }}>
        <Path path={fillPath} opacity={opacity}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: H }}
            colors={[withAlpha(accent, 0.38), withAlpha(accent, 0)]}
          />
        </Path>
        <Path
          path={linePath}
          style="stroke"
          strokeWidth={6}
          strokeCap="round"
          strokeJoin="round"
          color={accent}
          opacity={opacity}
        />
      </SkiaCanvas>
    </View>
  );
}

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
