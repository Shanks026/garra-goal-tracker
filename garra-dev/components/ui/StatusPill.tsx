import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import { system } from '@/theme/tokens';

export type StatusPillProps = {
  label: string;
  /**
   * Only `'slipping'` gets amber and only `'cooked'` gets red — everything else (locked in, on
   * track) is neutral, because success is the absence of warning, not a color (rules/01 §0).
   *
   * `'cooked'` is the app's **only sanctioned use of red**, along with the rescope prompt
   * (rules/01 §9: "Use it only in the status pill and the rescope prompt; never as a chart
   * series"). Home deliberately renders cooked *neutral* for this reason — a Home row is neither
   * of those two surfaces, and the whole point is that the calm screen stays calm.
   */
  status: 'slipping' | 'cooked' | 'neutral';
};

export function StatusPill({ label, status }: StatusPillProps) {
  const { tokens, colorScheme } = useAppTheme();

  const backgroundColor =
    status === 'slipping'
      ? system.slippingBg
      : status === 'cooked'
        ? system.cookedBg
        : tokens.fillMed;

  const textColor =
    status === 'slipping'
      ? // Amber is illegible on the light background — swap to slippingLight (rules/01 §5).
        colorScheme === 'light'
        ? system.slippingLight
        : system.slipping
      : status === 'cooked'
        ? system.cooked
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
