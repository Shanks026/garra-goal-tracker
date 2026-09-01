import { Canvas, RoundedRect } from '@shopify/react-native-skia';

import { system } from '@/theme/tokens';
import { windowTickMonthBoundaries } from './geometry';

export type WindowTicksProps = {
  totalDays: number;
  width: number;
  /** 'YYYY-MM-DD' — the arc's actual start date, used to compute real month boundaries. */
  startDate: string;
};

const BASELINE_H = 44;
const GAP = 1;
const RADIUS = 2;

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function WindowTicks({ totalDays, width, startDate }: WindowTicksProps) {
  const barWidth = (width - (totalDays - 1) * GAP) / totalDays;
  const monthBoundaries = windowTickMonthBoundaries(startDate, totalDays);

  return (
    <Canvas style={{ width, height: BASELINE_H }}>
      {Array.from({ length: totalDays }, (_, i) => {
        const isMonth = monthBoundaries.includes(i);
        const isWeek = i % 7 === 0;
        const height = isMonth ? 44 : isWeek ? 26 : 15;
        const color = isMonth
          ? system.arc
          : isWeek
            ? hexToRgba(system.arc, 0.55)
            : hexToRgba(system.arc, 0.28);
        const x = i * (barWidth + GAP);
        const y = BASELINE_H - height;
        return (
          <RoundedRect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={height}
            r={RADIUS}
            color={color}
          />
        );
      })}
    </Canvas>
  );
}
