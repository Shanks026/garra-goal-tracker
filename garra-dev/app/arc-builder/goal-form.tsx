import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddGoalToDraft, useDraftArc, useGoalsForArc } from '@/hooks/useArcBuilder';
import { GOAL_ICON_KEYS, GoalIcon, type GoalIconKey } from '@/components/goal/GoalIcon';
import { AccentPicker } from '@/components/goal/AccentPicker';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { useAppTheme } from '@/theme/useAppTheme';
import { ACCENT_ORDER, ACCENTS } from '@/theme/tokens';

type GoalType = 'habit' | 'accumulate' | 'ship' | 'milestone';

const CADENCE_OPTIONS: { mode: 'daily' | 'n_per_week' | 'every_n_days'; label: string }[] = [
  { mode: 'daily', label: 'Daily' },
  { mode: 'n_per_week', label: 'X× / week' },
  { mode: 'every_n_days', label: 'Every N days' },
];

// Screen 08's exact structure (header -> identity -> accent row -> type-specific block ->
// inset list group -> footer hint + primary button), extended to Habit/Ship/Milestone per
// 01-design-system.md §9 — only the Accumulate form is designed; the chrome stays identical.
export default function GoalForm() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: GoalType }>();
  const { tokens } = useAppTheme();
  const draftArc = useDraftArc();
  const goalsQuery = useGoalsForArc(draftArc.data?.id);
  const addGoal = useAddGoalToDraft();

  const usedAccents = useMemo(
    () => new Set((goalsQuery.data ?? []).map((g) => g.accent)),
    [goalsQuery.data],
  );
  const defaultAccent =
    ACCENT_ORDER.map((k) => ACCENTS[k]).find((hex) => !usedAccents.has(hex)) ?? ACCENTS.coral;

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<GoalIconKey>('bike');
  const [accent, setAccent] = useState<string>(defaultAccent);
  const [estMinutes, setEstMinutes] = useState('30');

  // Habit
  const [cadenceMode, setCadenceMode] = useState<'daily' | 'n_per_week' | 'every_n_days'>(
    'n_per_week',
  );
  const [timesPerWeek, setTimesPerWeek] = useState('4');
  const [intervalDays, setIntervalDays] = useState('2');
  const [sessionTarget, setSessionTarget] = useState('');
  const [unit, setUnit] = useState('');

  // Accumulate
  const [targetAmount, setTargetAmount] = useState('');

  // Ship
  const [itemNoun, setItemNoun] = useState('');

  // Milestone
  const [checkpoints, setCheckpoints] = useState<string[]>(['']);

  const canSubmit =
    title.trim().length > 0 &&
    (type === 'milestone' ? checkpoints.some((c) => c.trim().length > 0) : true) &&
    (type === 'accumulate' || type === 'ship' ? targetAmount.trim().length > 0 : true);

  const onSubmit = async () => {
    if (!draftArc.data || !canSubmit) return;
    await addGoal.mutateAsync({
      arcId: draftArc.data.id,
      type: type as GoalType,
      title: title.trim(),
      icon,
      estMinutes: Number(estMinutes) || undefined,
      accent, // note: useAddGoalToDraft auto-assigns if omitted, but the user picked one here
      ...(type === 'accumulate' && {
        targetAmount: Number(targetAmount),
        unit: unit || undefined,
      }),
      ...(type === 'ship' && {
        targetAmount: Number(targetAmount),
        itemNoun: itemNoun || 'things',
      }),
      ...((type === 'habit' || type === 'milestone') && {
        cadenceMode,
        timesPerWeek: cadenceMode === 'n_per_week' ? Number(timesPerWeek) : undefined,
        intervalDays: cadenceMode === 'every_n_days' ? Number(intervalDays) : undefined,
        sessionTarget: sessionTarget ? Number(sessionTarget) : undefined,
        unit: unit || undefined,
      }),
      ...(type === 'milestone' && {
        checkpoints: checkpoints.filter((c) => c.trim()).map((c) => ({ title: c.trim() })),
      }),
    });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, gap: 30 }}>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="text-[16px] text-text-secondary dark:text-text-secondary-dark">
              Cancel
            </Text>
          </Pressable>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {String(type).toUpperCase()}
          </Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 16 }}>
          <View
            className="items-center justify-center rounded-full border border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
            style={{ width: 60, height: 60 }}
          >
            <GoalIcon icon={icon} size={26} color={tokens.textPrimary} />
          </View>
          <View className="flex-1" style={{ gap: 4 }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Goal name"
              placeholderTextColor={tokens.textTertiary}
              className="text-text-primary dark:text-text-primary-dark"
              style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.84 }}
            />
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            ICON
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {GOAL_ICON_KEYS.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: icon === key }}
                className={
                  icon === key
                    ? 'items-center justify-center rounded-full bg-fill-med dark:bg-fill-med-dark'
                    : 'items-center justify-center rounded-full'
                }
                style={{ width: 40, height: 40 }}
                onPress={() => setIcon(key)}
              >
                <GoalIcon
                  icon={key}
                  size={18}
                  color={icon === key ? tokens.textPrimary : tokens.textTertiary}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            ACCENT
          </Text>
          <AccentPicker value={accent} disabledAccents={usedAccents} onChange={setAccent} />
        </View>

        {(type === 'accumulate' || type === 'ship') && (
          <View style={{ gap: 16 }}>
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              TARGET
            </Text>
            <View className="flex-row items-end" style={{ gap: 14 }}>
              <TextInput
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={tokens.textTertiary}
                className="text-text-primary dark:text-text-primary-dark"
                style={{ fontSize: 42, fontWeight: '600', letterSpacing: -1.68 }}
              />
              {type === 'accumulate' ? (
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="km"
                  placeholderTextColor={tokens.textTertiary}
                  className="text-text-primary dark:text-text-primary-dark"
                  style={{ fontSize: 16, paddingBottom: 10 }}
                />
              ) : (
                <TextInput
                  value={itemNoun}
                  onChangeText={setItemNoun}
                  placeholder="videos"
                  placeholderTextColor={tokens.textTertiary}
                  className="text-text-primary dark:text-text-primary-dark"
                  style={{ fontSize: 16, paddingBottom: 10 }}
                />
              )}
            </View>
          </View>
        )}

        {(type === 'habit' || type === 'milestone') && (
          <View style={{ gap: 16 }}>
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              CADENCE
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {CADENCE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.mode}
                  label={opt.label}
                  selected={cadenceMode === opt.mode}
                  onPress={() => setCadenceMode(opt.mode)}
                />
              ))}
            </View>
            {cadenceMode === 'n_per_week' && (
              <TextInput
                value={timesPerWeek}
                onChangeText={setTimesPerWeek}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={tokens.textTertiary}
                className="text-text-primary dark:text-text-primary-dark"
                style={{ fontSize: 16 }}
              />
            )}
            {cadenceMode === 'every_n_days' && (
              <TextInput
                value={intervalDays}
                onChangeText={setIntervalDays}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor={tokens.textTertiary}
                className="text-text-primary dark:text-text-primary-dark"
                style={{ fontSize: 16 }}
              />
            )}
            {type === 'habit' && (
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <TextInput
                  value={sessionTarget}
                  onChangeText={setSessionTarget}
                  keyboardType="number-pad"
                  placeholder="Session target (optional)"
                  placeholderTextColor={tokens.textTertiary}
                  className="flex-1 text-text-primary dark:text-text-primary-dark"
                  style={{ fontSize: 16 }}
                />
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="min / reps / pages"
                  placeholderTextColor={tokens.textTertiary}
                  className="flex-1 text-text-primary dark:text-text-primary-dark"
                  style={{ fontSize: 16 }}
                />
              </View>
            )}
          </View>
        )}

        {type === 'milestone' && (
          <View style={{ gap: 16 }}>
            <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
              CHECKPOINTS
            </Text>
            {checkpoints.map((c, i) => (
              <TextInput
                key={i}
                value={c}
                onChangeText={(v) =>
                  setCheckpoints((prev) => prev.map((p, j) => (j === i ? v : p)))
                }
                placeholder={`Checkpoint ${i + 1}`}
                placeholderTextColor={tokens.textTertiary}
                className="text-text-primary dark:text-text-primary-dark"
                style={{ fontSize: 16 }}
              />
            ))}
            <Pressable onPress={() => setCheckpoints((prev) => [...prev, ''])} hitSlop={8}>
              <Text className="text-[15px] font-medium text-text-secondary dark:text-text-secondary-dark">
                + Add checkpoint
              </Text>
            </Pressable>
          </View>
        )}

        <ListGroup>
          <View className="h-list-row-h flex-row items-center justify-between bg-surface px-4 dark:bg-surface-dark">
            <Text className="text-[16px] text-text-primary dark:text-text-primary-dark">
              Est. minutes
            </Text>
            <TextInput
              value={estMinutes}
              onChangeText={setEstMinutes}
              keyboardType="number-pad"
              textAlign="right"
              className="text-text-primary dark:text-text-primary-dark"
              style={{ fontSize: 16, fontWeight: '600' }}
            />
          </View>
          <ListRow label="Ends" value={draftArc.data?.endsAt ?? 'arc end'} />
        </ListGroup>
      </ScrollView>

      <View className="px-6 pb-3" style={{ gap: 12 }}>
        <Button
          title="Add goal"
          onPress={onSubmit}
          disabled={!canSubmit}
          style={{ width: '100%', opacity: canSubmit ? 1 : 0.4 }}
        />
      </View>
    </SafeAreaView>
  );
}
