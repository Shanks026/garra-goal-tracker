import { Pressable, Text, View } from 'react-native';

import { copy } from '@/lib/copy';
import { controls } from '@/theme/tokens';

// The pre-10:00 backfill affordance (rules/02 §4: "the 'Yesterday' row shown before 10:00").
// The other backfill path — long-pressing a mosaic cell — needs a mosaic, which Home doesn't
// have; that lands with the Arc tab (Phase 7).
//
// Not designed: this is a Today row with a metaS "Yesterday" label, not a new pattern.
export function YesterdayRow({
  unloggedCount,
  onPress,
}: {
  unloggedCount: number;
  onPress: () => void;
}) {
  if (unloggedCount === 0) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.home.yesterday}: ${unloggedCount} unlogged`}
      onPress={onPress}
      className="flex-row items-center justify-between"
      style={{ height: controls.todayRowH, minHeight: 44 }}
    >
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <Text className="text-[13px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
          {copy.home.yesterday}
        </Text>
        <Text className="font-body text-[14px] text-text-tertiary dark:text-text-tertiary-dark">
          {unloggedCount} unlogged
        </Text>
      </View>
      <Text className="font-body text-[14px] text-text-secondary dark:text-text-secondary-dark">
        Backfill
      </Text>
    </Pressable>
  );
}
