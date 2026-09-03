import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { copy } from '@/lib/copy';
import { ArcSweep } from '@/components/charts/ArcSweep';
import { Button } from '@/components/ui/Button';
import { StepDots } from '@/components/ui/StepDots';
import { stepIndex, ONBOARDING_STEP_COUNT } from '@/lib/onboardingSteps';
import { fontFor } from '@/theme/fonts';

// Screen 01. Opens directly on the arc and the hook, as the canvas does.
//
// The typewriter cold-open ("one day / or / Day ONE.") was removed by user decision: a title
// card the user sits through before the app will talk to them is a cost paid on every fresh
// install, and it delayed the one thing that actually explains the product. `WelcomeIntro`,
// the `intro` motion block and the three intro copy strings all went with it rather than being
// left as dead code.
//
// The arc's fraction is illustrative only (0.28, matching the canvas's own demo): no real arc
// exists this early in the flow, so there is nothing true to show.
const ILLUSTRATIVE_FRACTION = 0.28;

export default function Welcome() {
  const router = useRouter();

  // Both CTAs proceed identically for now — "I already have an account" has nothing to sign
  // into until the sign-in sheet is reachable from onboarding (feature doc gap #3).
  const proceed = () => router.push('/how-it-works');

  return (
    <SafeAreaView className="flex-1 bg-bg px-7 dark:bg-bg-dark">
      {/* The wordmark, in the `label` style (11/600/+.16em) at textQuaternary — the tracked-out
          uppercase treatment rules/01 §2 already defines for section labels. Quiet and
          editorial: brand and structure without adding colour, which §0 forbids. */}
      <View className="items-center pt-screen-top">
        <Text
          className="font-semibold uppercase text-text-quaternary dark:text-text-quaternary-dark"
          style={{ fontSize: 11, letterSpacing: 11 * 0.16 }}
        >
          {copy.brand}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <View className="items-center" style={{ gap: 52 }}>
          <ArcSweep p={ILLUSTRATIVE_FRACTION} size="onboarding" />
          <View className="items-center gap-4">
            <Text
              className="text-center text-text-primary dark:text-text-primary-dark"
              // Display face (Inter Tight) — the tracking in the type scale was cut for a display
              // face, and reads as merely cramped on a text face.
              style={{
                fontSize: 30,
                fontFamily: fontFor(600, 'display'),
                letterSpacing: -0.9,
                lineHeight: 36,
              }}
            >
              {copy.onboarding.hookTitle}
            </Text>
            <Text className="text-center font-body text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
              {copy.onboarding.hookBody}
            </Text>
          </View>
        </View>
      </View>

      {/* pb-screen-bottom (layout.screenBottom): the safe-area inset alone leaves the footer
          sitting on top of an Android nav bar. Applied to every onboarding/builder footer. */}
      <View className="items-center gap-6 pb-screen-bottom">
        <StepDots total={ONBOARDING_STEP_COUNT} current={stepIndex('welcome')} />
        <Button title={copy.onboarding.continueCta} onPress={proceed} style={{ width: '100%' }} />
        <Pressable onPress={proceed} hitSlop={8}>
          <Text className="font-body text-[15px] text-text-tertiary dark:text-text-tertiary-dark">
            {copy.onboarding.haveAccount}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
