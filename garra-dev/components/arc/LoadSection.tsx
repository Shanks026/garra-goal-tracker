import { Text, View } from 'react-native';

import { LoadDonut } from '@/components/charts/LoadDonut';

// Screen 15's WEEKLY LOAD section, extended with the **actual** side that
// IMPLEMENTATION.md's Phase 7 done-condition requires ("planned-vs-actual reads truthfully
// against logged entries") and the canvas doesn't draw.
//
// The donut's segments stay *planned* — that's what its geometry means, a share of the plan. The
// centre shows actual with planned beneath, and each row reads actual / planned. Two numbers side
// by side is the honest comparison; a second donut would be decoration.
//
// "logged" rather than "spent": actual is est_minutes × completions, an estimate of an estimate,
// and the copy shouldn't imply a stopwatch ran.
export function LoadSection({
  segments,
  actualTotalLabel,
  plannedTotalLabel,
  rows,
}: {
  segments: { color: string; hours: number }[];
  actualTotalLabel: string;
  plannedTotalLabel: string;
  rows: { id: string; title: string; accent: string; actualLabel: string; plannedLabel: string }[];
}) {
  if (rows.length === 0) return null;

  return (
    <View className="mt-5">
      <Text className="text-[11px] font-semibold uppercase tracking-[.16em] text-label dark:text-label-dark">
        WEEKLY LOAD
      </Text>
      <View className="mt-2.5 flex-row items-center" style={{ gap: 26 }}>
        {segments.length > 0 ? (
          <LoadDonut
            segments={segments}
            totalLabel={actualTotalLabel}
            subLabel={`OF ${plannedTotalLabel} PLANNED`}
            accessibilityLabel={`${actualTotalLabel} logged of ${plannedTotalLabel} planned per week`}
          />
        ) : null}
        <View className="flex-1" style={{ gap: 12 }}>
          {rows.map((row) => (
            <View key={row.id} className="flex-row items-center" style={{ gap: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: row.accent }} />
              <Text
                className="font-body flex-1 text-[14px] text-text-secondary dark:text-text-secondary-dark"
                numberOfLines={1}
              >
                {row.title}
              </Text>
              <Text
                className="text-[14px] font-semibold text-text-primary dark:text-text-primary-dark"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {row.actualLabel}
              </Text>
              <Text
                className="font-body text-[14px] text-text-tertiary dark:text-text-tertiary-dark"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                / {row.plannedLabel}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
