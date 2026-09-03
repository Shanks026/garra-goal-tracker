import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { copy } from '@/lib/copy';
import { INTENTS, type IntentKey } from '@/lib/intents';
import { ICONS_BY_KEY, type GoalIconKey } from '@/components/goal/GoalIcon';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { StepDots } from '@/components/ui/StepDots';
import { stepIndex, ONBOARDING_STEP_COUNT } from '@/lib/onboardingSteps';
import { fontFor } from '@/theme/fonts';
import { layout } from '@/theme/tokens';

const MAX_PICKS = 5;

export default function Intent() {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<IntentKey>>(new Set());

  const toggle = (key: IntentKey) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < MAX_PICKS) {
        next.add(key);
      }
      return next;
    });
  };

  const canContinue = picked.size > 0;

  const onContinue = () => {
    if (!canContinue) return;
    router.push({ pathname: '/recommended', params: { intents: [...picked].join(',') } });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 28,
          paddingTop: layout.screenTop,
          paddingBottom: layout.contentBottom,
          gap: 36,
        }}
      >
        <View className="gap-3">
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 38, fontFamily: fontFor(600, 'display'), fontWeight: '600', letterSpacing: -1.33, lineHeight: 42 }}
          >
            What do you keep putting off?
          </Text>
          <Text className="font-body text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
            Pick a few. We&apos;ll shape them into goals with real numbers.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2.5">
          {INTENTS.map((intent) => (
            <Chip
              key={intent.key}
              label={intent.label}
              variant="intent"
              selected={picked.has(intent.key)}
              icon={ICONS_BY_KEY[intent.icon as GoalIconKey]}
              onPress={() => toggle(intent.key)}
            />
          ))}
        </View>

        <View style={{ gap: 4 }}>
          <Text className="font-body text-[15px] text-text-tertiary dark:text-text-tertiary-dark">
            {picked.size} picked · add up to {MAX_PICKS}
          </Text>
          {/* The cap belongs to this screen, not to the arc — without saying so, "add up to 5"
              reads as a hard limit on how many goals an Arc can ever hold. */}
          <Text className="font-body text-[14px] text-text-quaternary dark:text-text-quaternary-dark">
            {copy.onboarding.intentAddMoreLater}
          </Text>
        </View>
      </ScrollView>

      <View className="items-center gap-5 px-7 pb-screen-bottom">
        <StepDots total={ONBOARDING_STEP_COUNT} current={stepIndex('intent')} />
        <Button
          title="Continue"
          onPress={onContinue}
          disabled={!canContinue}
          style={{ width: '100%', opacity: canContinue ? 1 : 0.4 }}
        />
      </View>
    </SafeAreaView>
  );
}
