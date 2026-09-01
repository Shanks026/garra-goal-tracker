import { Pressable, Text, View, type PressableProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAppTheme } from '@/theme/useAppTheme';

export type ChipProps = PressableProps & {
  label: string;
  selected?: boolean;
  /** Filter chip (h38) by default, or the larger intent-picker variant (h42). */
  variant?: 'filter' | 'intent';
  /** Intent chips (screen 03) carry a leading glyph; filter chips don't use this. */
  icon?: LucideIcon;
};

export function Chip({
  label,
  selected = false,
  variant = 'filter',
  icon: Icon,
  ...props
}: ChipProps) {
  const { tokens } = useAppTheme();
  const height = variant === 'filter' ? 'h-chip-h' : 'h-intent-chip-h';
  const radius = variant === 'filter' ? 'rounded-chip' : 'rounded-chip-lg';
  const labelColor = selected ? tokens.bg : tokens.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`${height} ${radius} flex-row items-center justify-center gap-2 border px-4 ${
        selected
          ? 'border-text-primary bg-text-primary dark:border-text-primary-dark dark:bg-text-primary-dark'
          : 'border-border-strong bg-transparent dark:border-border-strong-dark'
      }`}
      {...props}
    >
      {Icon ? (
        <View>
          <Icon size={16} color={labelColor} />
        </View>
      ) : null}
      <Text
        className={
          selected
            ? 'text-[14px] font-semibold text-bg dark:text-bg-dark'
            : 'text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
