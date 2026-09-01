import { Text, View } from 'react-native';

import { WeekBars, type WeekBarState } from '@/components/charts/WeekBars';

// Screen 13's THIS WEEK section. The chart takes heights in 0–1; the derivation
// (lib/derive/series.ts) already decided which days are done, missed, or nothing.
export function GoalWeekSection({
  bars,
  accent,
}: {
  bars: { height: number; state: WeekBarState }[];
  accent: string;
}) {
  return (
    <View className="mt-[18px]">
      <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
        THIS WEEK
      </Text>
      <View className="mt-3">
        <WeekBars bars={bars} accent={accent} />
      </View>
    </View>
  );
}
