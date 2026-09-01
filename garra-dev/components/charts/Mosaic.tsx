import { Canvas, RoundedRect } from '@shopify/react-native-skia';

import { useAppTheme } from '@/theme/useAppTheme';

export type MosaicCellState = 'future' | 'hit' | 'partial' | 'miss';

export type MosaicProps = {
  cells: MosaicCellState[];
  accent: string;
  columns: 14 | 20 | 7;
  width: number;
};

// rules/01-design-system.md §4.3 — gap/radius/inset vary by where the mosaic appears.
const LAYOUT = {
  14: { gap: 5, radius: 5, inset: 0 },
  20: { gap: 4, radius: 4, inset: 0 },
  7: { gap: 8, radius: 8, inset: 1.5 },
} as const;

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function Mosaic({ cells, accent, columns, width }: MosaicProps) {
  const { tokens } = useAppTheme();
  const { gap, radius, inset } = LAYOUT[columns];
  const rows = Math.ceil(cells.length / columns);
  const cellSize = (width - (columns - 1) * gap) / columns;
  const height = rows * cellSize + (rows - 1) * gap;

  return (
    <Canvas style={{ width, height }}>
      {cells.map((state, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = col * (cellSize + gap);
        const y = row * (cellSize + gap);

        if (state === 'future') {
          return (
            <RoundedRect
              key={i}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              r={radius}
              color={tokens.fill}
            />
          );
        }
        if (state === 'hit') {
          return (
            <RoundedRect
              key={i}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              r={radius}
              color={accent}
            />
          );
        }
        if (state === 'partial') {
          return (
            <RoundedRect
              key={i}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              r={radius}
              color={hexToRgba(accent, 0.42)}
            />
          );
        }
        // 'miss' — hollow, inset stroke only.
        const sw = inset > 0 ? inset : 1;
        return (
          <RoundedRect
            key={i}
            x={x + sw / 2}
            y={y + sw / 2}
            width={cellSize - sw}
            height={cellSize - sw}
            r={radius}
            style="stroke"
            strokeWidth={sw}
            color={tokens.mosaicMiss}
          />
        );
      })}
    </Canvas>
  );
}
