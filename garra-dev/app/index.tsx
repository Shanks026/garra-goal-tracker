import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text>Garra — Phase 0 scaffold</Text>
      <StatusBar style="auto" />
    </View>
  );
}
