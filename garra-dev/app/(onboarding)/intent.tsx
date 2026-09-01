import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { INTENTS, type IntentKey } from '@/lib/intents';
import { ICONS_BY_KEY, type GoalIconKey } from '@/components/goal/GoalIcon';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { StepDots } from '@/components/ui/StepDots';
import { stepIndex, stepLabel, ONBOARDING_STEP_COUNT } from '@/lib/onboardingSteps';

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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 34, gap: 36 }}>
        <View className="gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {stepLabel('intent')}
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 30, fontWeight: '600', letterSpacing: -0.9, lineHeight: 36 }}
          >
            What do you keep putting off?
          </Text>
          <Text className="text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
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

        <Text className="text-[15px] text-text-tertiary dark:text-text-tertiary-dark">
          {picked.size} picked · add up to {MAX_PICKS}
        </Text>
      </ScrollView>

      <View className="items-center gap-5 px-7 pb-3">
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
