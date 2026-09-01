import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import { system } from '@/theme/tokens';
import { formatAmount } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import type { PaceStatus } from '@/lib/derive/pace';

// Not designed — built on the log-sheet shell, which is what rules/01 §9 prescribes for this
// flow. The tone comes straight from garra-index.md §7.6: state the arithmetic plainly, don't
// moralise, and **always offer "keep it anyway"** — the app never forces a rescope.
//
// This is one of only two places `system.cooked` may appear (rules/01 §9), and only when the goal
// genuinely is cooked; a merely-slipping goal gets the same words without the red.
export function RescopeSheetContent({
  goalTitle,
  unit,
  status,
  target,
  suggestion,
  requiredRateLabel,
  onRescope,
  onKeep,
}: {
  goalTitle: string;
  unit: string | null;
  status: PaceStatus;
  target: number;
  suggestion: number;
  requiredRateLabel: string | null;
  onRescope: (toTarget: number) => void;
  onKeep: () => void;
}) {
  const { tokens } = useAppTheme();
  const [custom, setCustom] = useState('');
  const [choice, setChoice] = useState<'suggested' | 'custom'>('suggested');

  const unitLabel = unit ? ` ${unit}` : '';
  const customValue = Number(custom);
  const customValid = custom !== '' && Number.isFinite(customValue) && customValue > 0;
  const chosen = choice === 'custom' && customValid ? customValue : suggestion;

  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 10 }}>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.6, lineHeight: 30 }}
        >
          {formatAmount(target)}
          {unitLabel} isn&apos;t happening.
        </Text>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: status === 'cooked' ? system.cooked : tokens.textSecondary,
          }}
        >
          {requiredRateLabel
            ? `You'd need ${requiredRateLabel} from here. That's fine. What's real?`
            : `The window has closed on this one. That's fine. What's real?`}
        </Text>
      </View>

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <Chip
          label={`${formatAmount(suggestion)}${unitLabel} · your pace`}
          variant="intent"
          selected={choice === 'suggested'}
          onPress={() => setChoice('suggested')}
        />
        <Chip
          label="Custom"
          variant="intent"
          selected={choice === 'custom'}
          onPress={() => setChoice('custom')}
        />
      </View>

      {choice === 'custom' ? (
        <View className="flex-row items-end" style={{ gap: 10 }}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
            placeholder={String(Math.round(suggestion))}
            placeholderTextColor={tokens.textTertiary}
            autoFocus
            className="text-text-primary dark:text-text-primary-dark"
            style={{ fontSize: 38, fontWeight: '600', letterSpacing: -1.33, minWidth: 120 }}
          />
          {unit ? (
            <Text
              className="text-text-secondary dark:text-text-secondary-dark"
              style={{ fontSize: 18, fontWeight: '500', paddingBottom: 8 }}
            >
              {unit}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button
          title={`Rescope to ${formatAmount(chosen)}${unitLabel}`}
          onPress={() => onRescope(chosen)}
          disabled={choice === 'custom' && !customValid}
          style={{ width: '100%', opacity: choice === 'custom' && !customValid ? 0.4 : 1 }}
        />
        {/* Never forced — garra-index.md §7.6's third option, and the one that keeps this a tool
            rather than a scold. */}
        <Button
          title="Keep it anyway"
          variant="outline"
          onPress={onKeep}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}
