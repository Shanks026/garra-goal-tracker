import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg dark:bg-bg-dark">
      <Text className="text-text-primary dark:text-text-primary-dark">
        Garra — Phase 2 chart set
      </Text>
      <Link href="/_dev-charts" className="text-text-primary dark:text-text-primary-dark">
        Open chart & UI kitchen sink
      </Link>
      <StatusBar style="auto" />
    </View>
  );
}
