import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { copy } from '@/lib/copy';
import { seasonalArcTitle } from '@/lib/arcNaming';
import { useSetArcWindow } from '@/hooks/useArcBuilder';
import {
  addDaysToKey,
  dayKey,
  daysBetweenKeysInclusive,
  deviceTimezone,
  endOfYearKey,
} from '@/lib/date';
import { WindowTicks } from '@/components/charts/WindowTicks';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { StepDots } from '@/components/ui/StepDots';
import { stepIndex, ONBOARDING_STEP_COUNT } from '@/lib/onboardingSteps';
import { formatDayKeyLong } from '@/lib/format';
import { fontFor } from '@/theme/fonts';
import { layout } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

// The screen that was missing. Before this, the arc was created by a `useEffect` on the
// recommended-goals screen with a default 90-day window and a title from `seasonalArcTitle()` —
// so the central object in the product came into being without the user ever seeing it, let
// alone naming it. This is where the commitment is actually made.
//
// Folds in the 30/60/90 preset picker from `arc-builder/window.tsx`, which stays on as the
// "change an existing arc's dates" surface rather than being deleted (Phase 12 needs it).
//
// Not designed — rules/01 §9. Built from the goal form's structure (screen 08): header →
// identity fields → inset list group → footer hint + primary button.

const PRESETS: { label: string; days: number | 'endOfYear' }[] = [
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: 'End of year', days: 'endOfYear' },
];

// Day keys throughout, moved with day-key arithmetic, so the window agrees with the 04:00
// rollover every entry's own day_key uses (rules/03 §5). Arcs start *tomorrow* by design — it
// creates anticipation and avoids a half-day miss on day 1 (garra-index.md §7.2 step 2).
function computeWindow(days: number | 'endOfYear') {
  const startsAt = addDaysToKey(dayKey(new Date(), deviceTimezone()), 1);
  const endsAt = days === 'endOfYear' ? endOfYearKey(startsAt) : addDaysToKey(startsAt, days - 1);
  return { startsAt, endsAt };
}

export default function ArcNew() {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const setWindow = useSetArcWindow();

  // The seasonal name is now a *suggestion* shown as placeholder text. Submitting an empty field
  // still falls back to it, so the arc always has a name — but it's the user's choice either way.
  const suggested = useMemo(() => seasonalArcTitle(new Date()), []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // No pre-selected window. The name and the length are both mandatory, so neither may arrive
  // pre-filled — a default 90d chip would be the user "choosing" a length by not noticing it,
  // which is the same silent-decision problem this whole screen exists to fix.
  const [window_, setWindow_] = useState<{ startsAt: string; endsAt: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const totalDays = window_ ? daysBetweenKeysInclusive(window_.startsAt, window_.endsAt) : 0;
  const canStart = title.trim().length > 0 && window_ !== null && !saving;

  const onNext = async () => {
    if (!window_ || !canStart) return;
    setSaving(true);
    try {
      await setWindow.mutateAsync({
        startsAt: window_.startsAt,
        endsAt: window_.endsAt,
        // `|| suggested` is now unreachable via the UI (the button gates on a non-empty name) but
        // kept as a guard: `arcs.title` is NOT NULL, so an empty title must never reach the insert.
        title: title.trim() || suggested,
        description: description.trim() || null,
      });
      router.navigate('/intent');
    } finally {
      // Always clears, even on a failed write. Leaving it true left the button permanently
      // disabled with no way forward — the same dead end this screen used to produce.
      setSaving(false);
    }
  };

  const fieldStyle = {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: tokens.fill,
  } as const;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 28,
          paddingTop: layout.screenTop,
          paddingBottom: layout.contentBottom,
          gap: 28,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <Text
            className="text-text-primary dark:text-text-primary-dark"
            style={{
              fontSize: 38,
              fontFamily: fontFor(600, 'display'),
              fontWeight: '600',
              letterSpacing: -1.33,
              lineHeight: 42,
            }}
          >
            {copy.onboarding.arcNewTitle}
          </Text>
          <Text className="font-body text-[16px] leading-6 text-text-secondary dark:text-text-secondary-dark">
            {copy.onboarding.arcNewBody}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {copy.onboarding.arcNameLabel}
          </Text>
          <TextInput
            className="font-body text-[17px] text-text-primary dark:text-text-primary-dark"
            style={fieldStyle}
            value={title}
            onChangeText={setTitle}
            placeholder={suggested}
            placeholderTextColor={tokens.textQuaternary}
            maxLength={60}
            returnKeyType="next"
          />
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {copy.onboarding.arcDescLabel}
          </Text>
          <TextInput
            className="font-body text-[17px] text-text-primary dark:text-text-primary-dark"
            style={[fieldStyle, { minHeight: 88, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder={copy.onboarding.arcDescPlaceholder}
            placeholderTextColor={tokens.textQuaternary}
            multiline
            maxLength={200}
          />
        </View>

        <View className="gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-[.14em] text-label dark:text-label-dark">
            {copy.onboarding.arcWindowLabel}
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {PRESETS.map((preset) => {
              const candidate = computeWindow(preset.days);
              return (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  selected={window_?.endsAt === candidate.endsAt}
                  onPress={() => setWindow_(candidate)}
                />
              );
            })}
          </View>
          {/* The chart and the date line only exist once a length is chosen — drawing a
              122-tick window for a range the user hasn't picked would state a commitment that
              hasn't been made. The length is data (rules/01 §4.9), so it's drawn, not stated. */}
          {window_ ? (
            <>
              <WindowTicks totalDays={totalDays} width={342} startDate={window_.startsAt} />
              <Text
                className="font-body text-[15px] text-text-tertiary dark:text-text-tertiary-dark"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {totalDays} days · {formatDayKeyLong(window_.startsAt)} →{' '}
                {formatDayKeyLong(window_.endsAt)}
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View className="items-center gap-6 px-7 pb-screen-bottom">
        <StepDots total={ONBOARDING_STEP_COUNT} current={stepIndex('arcNew')} />
        {/* Gated on both mandatory fields: a name and a length. `disabled` gives the button the
            textQuaternary treatment and blocks the press (see components/ui/Button.tsx). */}
        <Button
          title={saving ? 'Starting…' : copy.onboarding.arcNewCta}
          onPress={onNext}
          disabled={!canStart}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}
