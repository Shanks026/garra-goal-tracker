import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

export type WeekBarState = 'done' | 'missed' | 'none';

export type WeekBarsProps = {
  bars: { height: number; state: WeekBarState }[];
  accent: string;
  dayLetters?: string[];
};

const VIEWBOX_W = 342;
const VIEWBOX_H = 86;
const BASELINE_Y = 80;
const BAR_WIDTH = 14;
const BAR_RADIUS = 7;

export function WeekBars({
  bars,
  accent,
  dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
}: WeekBarsProps) {
  const { tokens } = useAppTheme();

  return (
    <View>
      <Canvas style={{ width: VIEWBOX_W, height: VIEWBOX_H }}>
        {bars.map((bar, i) => {
          if (bar.state === 'none' || bar.height <= 0) return null;
          const x = 17.4 + i * 48.86;
          const y = BASELINE_Y - bar.height;
          if (bar.state === 'done') {
            return (
              <RoundedRect
                key={i}
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={bar.height}
                r={BAR_RADIUS}
                color={accent}
              />
            );
          }
          // 'missed' — hollow stub, honest without being an accusation.
          return (
            <RoundedRect
              key={i}
              x={x + 1}
              y={y + 1}
              width={BAR_WIDTH - 2}
              height={Math.max(0, bar.height - 2)}
              r={BAR_RADIUS}
              style="stroke"
              strokeWidth={2}
              color={tokens.barMiss}
            />
          );
        })}
      </Canvas>
      <View style={{ flexDirection: 'row', width: VIEWBOX_W }}>
        {dayLetters.map((letter, i) => (
          <Text
            key={i}
            className="text-text-quaternary dark:text-text-quaternary-dark"
            style={{
              width: 48.86,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1.1,
            }}
          >
            {letter}
          </Text>
        ))}
      </View>
    </View>
  );
}
