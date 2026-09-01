import { Pressable, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import { ACCENT_ORDER, ACCENTS } from '@/theme/tokens';

export type AccentPickerProps = {
  value: string; // the currently-selected hex
  /** Accents already used by another goal in this arc — never selectable (01-design-system.md
      §1: "No two goals in the same arc share an accent"). */
  disabledAccents: Set<string>;
  onChange: (hex: string) => void;
};

export function AccentPicker({ value, disabledAccents, onChange }: AccentPickerProps) {
  const { tokens } = useAppTheme();

  return (
    <View className="flex-row" style={{ gap: 12 }}>
      {ACCENT_ORDER.map((key) => {
        const hex = ACCENTS[key];
        // No `hex !== value` exemption: exempting the current value meant a collision (from the
        // accent being initialised before the goals query resolved) rendered as greyed-out but
        // still selected, and submitted anyway. The form now initialises from an unused accent,
        // so a taken swatch is simply never selectable (rules/01 §1).
        const disabled = disabledAccents.has(hex);
        const selected = hex === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(hex)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.25 : 1,
              borderWidth: selected ? 2.5 : 0,
              borderColor: selected ? tokens.textPrimary : 'transparent',
            }}
          >
            <View
              style={{
                width: selected ? 24 : 32,
                height: selected ? 24 : 32,
                borderRadius: 16,
                backgroundColor: hex,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
