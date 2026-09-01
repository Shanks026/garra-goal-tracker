import { useEffect } from 'react';
import { View } from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  LinearGradient,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/theme/useAppTheme';
import { system } from '@/theme/tokens';
import { timing } from '@/theme/motion';
import { burnUpGeometry } from './geometry';

export type BurnUpProps = {
  /** Already-computed cumulative points, one per day — never a random walk (see feature doc). */
  points: [number, number][];
  W?: number;
  H?: number;
  win: number;
  day: number;
  accent: string;
};

export function BurnUp({ points, W = 342, H = 112, win, day, accent }: BurnUpProps) {
  const { tokens } = useAppTheme();
  const geo = burnUpGeometry(points, W, H, win, day);
  const linePath = Skia.Path.MakeFromSVGString(geo.linePath);
  const fillPath = Skia.Path.MakeFromSVGString(geo.fillPath);
  const reqPath = Skia.Path.MakeFromSVGString(geo.requiredLinePath);
  const deficitPath = Skia.Path.MakeFromSVGString(geo.deficitAreaPath);

  const opacity = useSharedValue(0);
  useEffect(() => {
    // Reduce-motion comes from the preset (ReduceMotion.System), on the UI thread — not from an
    // async AccessibilityInfo lookup that races the first frame (see theme/motion.ts).
    opacity.value = withTiming(1, timing.chart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!linePath || !fillPath || !reqPath || !deficitPath) return null;

  return (
    <View style={{ width: W, height: H }}>
      <Canvas style={{ width: W, height: H }}>
        {/* Deficit area — the region where actual falls behind required. */}
        <Path path={deficitPath} color={system.slippingArea} />
        {/* Fill under the actual line. */}
        <Path path={fillPath} opacity={opacity}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: H }}
            colors={[withAlpha(accent, 0.38), withAlpha(accent, 0)]}
          />
        </Path>
        {/* Required-rate line — dashed, always straight. */}
        <Path
          path={reqPath}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          color={tokens.requiredLine}
        >
          <DashPathEffect intervals={[2, 7]} />
        </Path>
        {/* Actual line. */}
        <Path
          path={linePath}
          style="stroke"
          strokeWidth={6}
          strokeCap="round"
          strokeJoin="round"
          color={accent}
          opacity={opacity}
        />
        {/* Head dot. */}
        <Circle cx={geo.dot.x} cy={geo.dot.y} r={10} color={tokens.bg} />
        <Circle cx={geo.dot.x} cy={geo.dot.y} r={6} color={accent} />
      </Canvas>
    </View>
  );
}

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
