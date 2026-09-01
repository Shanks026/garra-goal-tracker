import { Pressable, Text, View } from 'react-native';

import { Mosaic } from '@/components/charts/Mosaic';
import { addDaysToKey } from '@/lib/date';
import type { MosaicCellState } from '@/lib/derive/mosaic';

// Screen 13's EVERY DAY section. Goal-detail mosaics are **20 columns** (rules/01 §4.3) — the
// Arc tab's is 14; using the wrong variant is a real mistake, not a cosmetic one.
//
// Long-pressing a cell backfills that day — the second backfill path from rules/02 §4, and the
// one Phase 5 couldn't build because Home has no mosaic. The 2-day window is enforced inside
// `useLogEntry`, so an old cell simply refuses rather than needing a check here.
const COLUMNS = 20;
const WIDTH = 342;
const GAP = 4;

export function GoalMosaicSection({
  cells,
  accent,
  startKey,
  onBackfill,
}: {
  cells: MosaicCellState[];
  accent: string;
  startKey: string;
  onBackfill: (dayKey: string) => void;
}) {
  const cellSize = (WIDTH - (COLUMNS - 1) * GAP) / COLUMNS;
  const rows = Math.ceil(cells.length / COLUMNS);

  return (
    <View className="mt-6">
      <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
        EVERY DAY
      </Text>
      <View className="mt-3.5">
        <Mosaic cells={cells} accent={accent} columns={COLUMNS} width={WIDTH} />
        {/* The mosaic is one Skia canvas for performance (rules/01 §4.3 — 122 Views would jank
            the scroll), so the long-press targets sit in a transparent grid layered over it
            rather than being per-cell components. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: WIDTH,
            height: rows * cellSize + (rows - 1) * GAP,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: GAP,
          }}
        >
          {cells.map((_, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Backfill ${addDaysToKey(startKey, i)}`}
              onLongPress={() => onBackfill(addDaysToKey(startKey, i))}
              style={{ width: cellSize, height: cellSize }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
