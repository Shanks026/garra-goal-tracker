import { Canvas, Circle, DashPathEffect } from '@shopify/react-native-skia';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import { loadDonutSegments } from './geometry';

export type LoadDonutProps = {
  segments: { color: string; hours: number }[];
  totalLabel: string;
  /**
   * The line under the total. Defaults to `PER WEEK` (the canvas's own label, screen 15); the Arc
   * tab passes `OF 19h PLANNED` so the centre carries the planned-vs-actual comparison.
   */
  subLabel?: string;
  /** The value in words (rules/02 §8). */
  accessibilityLabel?: string;
};

const VIEWBOX = 148;
const CENTER = VIEWBOX / 2;
const GHOST_R = 64;
const TRACK_R = 51;

export function LoadDonut({
  segments,
  totalLabel,
  subLabel = 'PER WEEK',
  accessibilityLabel,
}: LoadDonutProps) {
  const { tokens } = useAppTheme();
  const segs = loadDonutSegments(segments, TRACK_R);

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={{ width: VIEWBOX, height: VIEWBOX }}
    >
      <Canvas style={{ width: VIEWBOX, height: VIEWBOX }}>
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={GHOST_R}
          style="stroke"
          strokeWidth={6}
          color={tokens.donutGhost}
        />
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={TRACK_R}
          style="stroke"
          strokeWidth={14}
          color={tokens.fill}
        />
        {segs.map((seg, i) => (
          <Circle
            key={i}
            cx={CENTER}
            cy={CENTER}
            r={TRACK_R}
            style="stroke"
            strokeWidth={14}
            strokeCap="round"
            color={seg.color}
            transform={[{ rotate: -Math.PI / 2 }]}
            origin={{ x: CENTER, y: CENTER }}
          >
            <DashPathEffect intervals={seg.dashIntervals} phase={seg.offset} />
          </Circle>
        ))}
      </Canvas>
      <View
        style={{
          position: 'absolute',
          width: VIEWBOX,
          height: VIEWBOX,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{ fontSize: 22, fontWeight: '600' }}
        >
          {totalLabel}
        </Text>
        <Text
          className="text-label dark:text-label-dark"
          style={{ fontSize: 10, fontWeight: '600', letterSpacing: 1.4, marginTop: 2 }}
        >
          {subLabel}
        </Text>
      </View>
    </View>
  );
}
