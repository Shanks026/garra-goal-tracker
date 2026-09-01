import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white">
      <Text>Garra — Phase 0 scaffold</Text>
      <Link href="/smoke">Open smoke checks</Link>
      <StatusBar style="auto" />
    </View>
  );
}
