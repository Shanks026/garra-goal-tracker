import { View } from 'react-native';

import { Mosaic } from '@/components/charts/Mosaic';
import { system } from '@/theme/tokens';
import type { MosaicCellState } from '@/lib/derive/mosaic';

// Screen 15's mosaic: **14 columns**, arc-tinted indigo (the arc's own color, never a goal's —
// rules/01 §4.3). Goal detail's is 20 columns; using the wrong variant is a real mistake.
//
// One Skia canvas, not 122 Views (rules/01 §4.3, rules/06 §7) — and unlike goal detail, there's
// no gesture overlay here, so it stays a single canvas with nothing layered on top.
const COLUMNS = 14;
const WIDTH = 342;

export function ArcMosaicSection({ cells }: { cells: MosaicCellState[] }) {
  const hits = cells.filter((c) => c === 'hit').length;
  const misses = cells.filter((c) => c === 'miss').length;

  return (
    <View className="mt-6">
      <Mosaic
        cells={cells}
        accent={system.arc}
        columns={COLUMNS}
        width={WIDTH}
        accessibilityLabel={`Arc history: ${hits} full days, ${misses} missed`}
      />
    </View>
  );
}
