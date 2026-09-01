import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import { system } from '@/theme/tokens';

export type StatusPillProps = {
  label: string;
  /** Only 'slipping' gets amber — everything else (locked in, on track, cooked's own pill
   * treatment elsewhere) renders neutral. Success is the absence of warning, not a color. */
  status: 'slipping' | 'neutral';
};

export function StatusPill({ label, status }: StatusPillProps) {
  const { tokens, colorScheme } = useAppTheme();
  const isSlipping = status === 'slipping';

  const backgroundColor = isSlipping ? system.slippingBg : tokens.fillMed;
  // Amber is illegible on the light background — swap to slippingLight (rules/01 §5).
  const textColor = isSlipping
    ? colorScheme === 'light'
      ? system.slippingLight
      : system.slipping
    : tokens.pillText;

  return (
    <View
      className="h-status-pill-h flex-row items-center justify-center rounded-pill px-3.5"
      style={{ backgroundColor }}
    >
      <Text style={{ color: textColor, fontSize: 14, fontWeight: '600', letterSpacing: -0.14 }}>
        {label}
      </Text>
    </View>
  );
}
