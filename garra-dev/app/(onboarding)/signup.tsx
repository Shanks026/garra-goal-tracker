import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mosaicCells } from '@/lib/derive/mosaic';
import { useActivateArc, useDraftArc } from '@/hooks/useArcBuilder';
import { Mosaic } from '@/components/charts/Mosaic';
import { Button } from '@/components/ui/Button';
import { StepDots } from '@/components/ui/StepDots';
import { system } from '@/theme/tokens';

// Screen 05. Supabase Auth doesn't exist until Phase 8 (IMPLEMENTATION.md's ordering is
// deliberate), so every button here — the three auth CTAs and "Keep it on this phone" — does
// the same thing for now: activate the local-only draft arc (feature doc gap #3). Only the
// *handler* is unified; Phase 8 gives the auth buttons their real behavior.
export default function SignUp() {
  const router = useRouter();
  const draftArc = useDraftArc();
  const activateArc = useActivateArc();

  const cells =
    draftArc.data &&
    mosaicCells({
      cadence: null,
      entries: [],
      startDate: draftArc.data.startsAt,
      totalDays:
        Math.round(
          (Date.parse(`${draftArc.data.endsAt}T00:00:00.000Z`) -
            Date.parse(`${draftArc.data.startsAt}T00:00:00.000Z`)) /
            86_400_000,
        ) + 1,
      // Before the arc has started, every cell is 'future' regardless of timezone — see the
      // feature doc's gap #4 (this replaces the canvas's fabricated fade with the real, honest
      // day-zero reading instead of fake progress data).
      now: new Date(`${draftArc.data.startsAt}T00:00:00.000Z`),
      timezone: 'UTC',
    });

  const onProceed = async () => {
    await activateArc.mutateAsync();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-7 dark:bg-bg-dark">
      <View className="flex-1 justify-center gap-10">
        <View className="gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            STEP 4 OF 4
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 30, fontWeight: '600', letterSpacing: -0.9, lineHeight: 36 }}
          >
            Right now, this arc lives on one phone.
          </Text>
          <Text className="text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
            Lose it and this run&apos;s history goes with it. An account keeps the run — and the
            Finale at the end of it.
          </Text>
        </View>

        <View className="gap-3">
          {cells ? <Mosaic cells={cells} accent={system.arc} columns={14} width={342} /> : null}
          <Text className="text-[13px] text-text-quaternary dark:text-text-quaternary-dark">
            Saved on device only
          </Text>
        </View>
      </View>

      <View className="items-center gap-3 pb-3">
        <StepDots total={5} current={4} />
        <Button
          title="Continue with email"
          onPress={onProceed}
          style={{ width: '100%', flexDirection: 'row', gap: 9 }}
        />
        <View className="flex-row gap-2.5" style={{ width: '100%' }}>
          <Button title="Google" variant="outline" onPress={onProceed} style={{ flex: 1 }} />
          <Button title="Apple" variant="outline" onPress={onProceed} style={{ flex: 1 }} />
        </View>
        <Pressable onPress={onProceed} hitSlop={8}>
          <Text className="text-[15px] text-text-tertiary dark:text-text-tertiary-dark">
            Keep it on this phone
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
