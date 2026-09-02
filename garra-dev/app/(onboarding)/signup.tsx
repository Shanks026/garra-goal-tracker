import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mosaicCells } from '@/lib/derive/mosaic';
import { useActivateArc, useDraftArc } from '@/hooks/useArcBuilder';
import { Mosaic } from '@/components/charts/Mosaic';
import { Button } from '@/components/ui/Button';
import { StepDots } from '@/components/ui/StepDots';
import { Sheet, type SheetRef } from '@/sheets/Sheet';
import { SignInSheetContent } from '@/sheets/SignInSheetContent';
import { stepIndex, stepLabel, ONBOARDING_STEP_COUNT } from '@/lib/onboardingSteps';
import { system } from '@/theme/tokens';

// Screen 05. Phase 4 wired all three auth CTAs to the same local-activation handler because auth
// didn't exist yet; Phase 8 ends that shortcut.
//
// "Continue with email" now opens the real OTP sheet. Google and Apple are **on hold by user
// decision** (10-auth-and-sync.md §8.6) and render disabled: they keep their place so the layout
// is final, but pressing one must do *nothing* — silently activating a local arc from a button
// labelled "Google" would be worse than the button being visibly unavailable.
export default function SignUp() {
  const router = useRouter();
  const draftArc = useDraftArc();
  const activateArc = useActivateArc();
  const sheetRef = useRef<SheetRef>(null);
  const [sheetMounted, setSheetMounted] = useState(false);

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

  // "Keep it on this phone" — unchanged from Phase 4, and it must stay that way. The arc goes
  // live with no account and no network (IMPLEMENTATION.md: signing up is skippable by design).
  const onSkip = async () => {
    await activateArc.mutateAsync();
    router.replace('/');
  };

  const onEmail = () => {
    setSheetMounted(true);
    requestAnimationFrame(() => sheetRef.current?.present());
  };

  // Sign-in succeeded: activate the arc and go home. The outbox already holds every row created
  // during onboarding, and useVerifyCode's syncNow() pushed them — so this account now owns the
  // arc that was built before it existed.
  const onSignedIn = async () => {
    sheetRef.current?.dismiss();
    await activateArc.mutateAsync();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-7 dark:bg-bg-dark">
      <View className="flex-1 justify-center gap-10">
        <View className="gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {stepLabel('signup')}
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
        <StepDots total={ONBOARDING_STEP_COUNT} current={stepIndex('signup')} />
        <Button
          title="Continue with email"
          onPress={onEmail}
          style={{ width: '100%', flexDirection: 'row', gap: 9 }}
        />
        <View className="flex-row gap-2.5" style={{ width: '100%' }}>
          <Button title="Google" variant="outline" disabled style={{ flex: 1 }} />
          <Button title="Apple" variant="outline" disabled style={{ flex: 1 }} />
        </View>
        <Pressable onPress={onSkip} hitSlop={8}>
          <Text className="text-[15px] text-text-tertiary dark:text-text-tertiary-dark">
            Keep it on this phone
          </Text>
        </Pressable>
      </View>

      {sheetMounted ? (
        <Sheet ref={sheetRef} snapPoints={['62%']}>
          <SignInSheetContent onDone={onSignedIn} />
        </Sheet>
      ) : null}
    </SafeAreaView>
  );
}
