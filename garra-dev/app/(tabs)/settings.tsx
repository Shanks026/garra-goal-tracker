import { Text, View } from 'react-native';

// Phase 12 builds this (not designed — a standard inset grouped list, per rules/01 §9).
export default function SettingsTab() {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-6 dark:bg-bg-dark">
      <Text className="text-center text-[15px] text-text-secondary dark:text-text-secondary-dark">
        Settings lands in Phase 12.
      </Text>
    </View>
  );
}
