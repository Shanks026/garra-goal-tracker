import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { controls, radii } from '@/theme/tokens';
import { formatAmount } from '@/lib/format';
import { NumPad } from '@/components/ui/NumPad';
import { Button } from '@/components/ui/Button';
import type { TodayItem } from '@/hooks/useHomeData';

// Screen 12's content. Value entry uses the custom 12-key numpad, never the OS keyboard — it
// costs a tap and breaks the 10-second rule (rules/01 §7, rules/02 §4).
export type LogSheetContentProps = {
  item: TodayItem;
  /** Where the goal stands overall, for the "188 / 800 km" line. */
  progressLabel: string | null;
  onSubmit: (value: number | null) => void;
  /** Present when a queue is being walked (Log everything) — advances without dismissing. */
  queuePosition?: { index: number; total: number };
};

export function LogSheetContent({
  item,
  progressLabel,
  onSubmit,
  queuePosition,
}: LogSheetContentProps) {
  const [raw, setRaw] = useState('');

  // A queued sheet reuses one mounted instance, so the pad has to clear between goals.
  useEffect(() => setRaw(''), [item.goalId]);

  const parsed = raw === '' ? null : Number(raw);
  const valid = parsed != null && Number.isFinite(parsed) && parsed > 0;

  const onKeyPress = (key: string) => {
    setRaw((prev) => {
      if (key === '⌫') return prev.slice(0, -1);
      if (key === '.') return prev.includes('.') ? prev : prev === '' ? '0.' : prev + '.';
      // Guard against a runaway value from a stuck key; nothing legitimate needs 9 digits.
      return prev.length >= 9 ? prev : prev + key;
    });
  };

  const unitLabel = item.type === 'ship' ? (item.itemNoun ?? '') : (item.unit ?? '');

  return (
    <View style={{ gap: 26 }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: item.accent }} />
        <Text
          className="text-[17px] font-medium text-text-primary dark:text-text-primary-dark"
          style={{ letterSpacing: -0.17 }}
        >
          {item.title}
        </Text>
        <View style={{ flex: 1 }} />
        <Text className="text-[14px] text-text-tertiary dark:text-text-tertiary-dark">
          {queuePosition
            ? `${queuePosition.index + 1} of ${queuePosition.total}`
            : (progressLabel ?? '')}
        </Text>
      </View>

      <View className="flex-row items-end justify-center" style={{ gap: 10 }}>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{
            fontSize: 52,
            fontWeight: '600',
            letterSpacing: -2.08,
            lineHeight: 52,
            fontVariant: ['tabular-nums'],
          }}
        >
          {raw === '' ? '0' : raw}
        </Text>
        {unitLabel ? (
          <Text
            className="text-text-secondary dark:text-text-secondary-dark"
            style={{ fontSize: 20, fontWeight: '500', paddingBottom: 12 }}
          >
            {unitLabel}
          </Text>
        ) : null}
      </View>

      {item.quickAdd && item.quickAdd.length > 0 ? (
        <View className="flex-row" style={{ gap: 10 }}>
          {item.quickAdd.map((amount) => (
            <Pressable
              key={amount}
              accessibilityRole="button"
              accessibilityLabel={`Add ${amount}`}
              onPress={() => setRaw((prev) => String((prev === '' ? 0 : Number(prev)) + amount))}
              className="flex-1 items-center justify-center border border-border-strong dark:border-border-strong-dark"
              style={{ height: 40, borderRadius: 20 }}
            >
              <Text
                className="text-[15px] font-medium text-text-secondary dark:text-text-secondary-dark"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                +{amount}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <NumPad onKeyPress={onKeyPress} />

      <Button
        title={valid ? `Log ${formatAmount(parsed)}${unitLabel ? ` ${unitLabel}` : ''}` : 'Log'}
        onPress={() => onSubmit(valid ? parsed : null)}
        disabled={!valid}
        style={{ width: '100%', opacity: valid ? 1 : 0.4 }}
      />
      <View style={{ height: controls.entryRowH - radii.cell }} />
    </View>
  );
}
