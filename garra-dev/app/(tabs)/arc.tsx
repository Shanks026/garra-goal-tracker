import { Text, View } from 'react-native';

// Phase 7 builds this (screen 15: the full 122-cell mosaic, momentum curve, load donut, and
// all-goal pace summary). Plain centred textSecondary copy, no illustration — the empty-state
// pattern from rules/01 §9, so a placeholder reads as deliberate rather than broken.
export default function ArcTab() {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-6 dark:bg-bg-dark">
      <Text className="text-center text-[15px] text-text-secondary dark:text-text-secondary-dark">
        The whole run at a glance — mosaic, momentum, and load — lands in Phase 7.
      </Text>
    </View>
  );
}
