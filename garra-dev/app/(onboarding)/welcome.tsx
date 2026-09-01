import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArcSweep } from '@/components/charts/ArcSweep';
import { Button } from '@/components/ui/Button';
import { StepDots } from '@/components/ui/StepDots';

// Screen 01. The arc's fraction here is illustrative only (0.28, matching the canvas's own
// demo) — no real arc exists yet at this point in the flow, so there's nothing real to show.
const ILLUSTRATIVE_FRACTION = 0.28;

export default function Welcome() {
  const router = useRouter();

  // Both CTAs proceed identically for now — "I already have an account" has nothing to sign
  // into until Phase 8 wires real auth (feature doc gap #3).
  const proceed = () => router.push('/name');

  return (
    <SafeAreaView className="flex-1 bg-bg px-7 dark:bg-bg-dark">
      <View className="flex-1 items-center justify-center gap-14">
        <View className="items-center gap-3">
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 56, fontWeight: '600', letterSpacing: -2.5, lineHeight: 56 }}
          >
            hello.
          </Text>
          <Text className="text-[17px] text-text-secondary dark:text-text-secondary-dark">
            let&apos;s make this one count
          </Text>
        </View>

        <View className="items-center" style={{ gap: 52 }}>
          <ArcSweep p={ILLUSTRATIVE_FRACTION} size="onboarding" />
          <View className="items-center gap-4">
            <Text
              className="text-center text-text-primary dark:text-text-primary-dark"
              style={{ fontSize: 30, fontWeight: '600', letterSpacing: -0.9, lineHeight: 36 }}
            >
              Every good run has a finish line.
            </Text>
            <Text className="text-center text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
              Garra puts each goal inside an Arc — a window with a real end date — then tells you
              whether you&apos;ll make it. No streaks to protect forever.
            </Text>
          </View>
        </View>
      </View>

      <View className="items-center gap-6 pb-3">
        <StepDots total={5} current={0} />
        <Button title="Build my arc" onPress={proceed} style={{ width: '100%' }} />
        <Pressable onPress={proceed} hitSlop={8}>
          <Text className="text-[15px] text-text-tertiary dark:text-text-tertiary-dark">
            I already have an account
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
