import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/useAppTheme';
import { useSetLocalProfileName } from '@/hooks/useArcBuilder';
import { Button } from '@/components/ui/Button';
import { StepDots } from '@/components/ui/StepDots';

// Screen 02. Free-text entry uses the OS keyboard — the custom numpad is reserved for the
// logging path's numeric value entry (rules/02-ui-components.md §4), not name capture.
export default function Name() {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const setName = useSetLocalProfileName();
  const [name, setLocalName] = useState('');

  const canContinue = name.trim().length > 0;

  const onContinue = () => {
    if (!canContinue) return;
    setName.mutate(name.trim());
    router.push('/intent');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-7 dark:bg-bg-dark">
      <View className="flex-1 justify-center gap-10">
        <View className="gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            STEP 1 OF 4
          </Text>
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 30, fontWeight: '600', letterSpacing: -0.9, lineHeight: 36 }}
          >
            What should we call you?
          </Text>
          <Text className="text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
            Only shows up in your Sunday Reset and your Finale.
          </Text>
        </View>

        <View className="gap-4">
          <TextInput
            value={name}
            onChangeText={setLocalName}
            placeholder="Your name"
            placeholderTextColor={tokens.textTertiary}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={onContinue}
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 36, fontWeight: '600', letterSpacing: -1.26 }}
          />
          <View className="h-px bg-border-control dark:bg-border-control-dark" />
        </View>
      </View>

      <View className="items-center gap-5 pb-3">
        <StepDots total={5} current={1} />
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
