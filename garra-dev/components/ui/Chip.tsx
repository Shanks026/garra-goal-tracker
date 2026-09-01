import { Pressable, Text, type PressableProps } from 'react-native';

export type ChipProps = PressableProps & {
  label: string;
  selected?: boolean;
  /** Filter chip (h38) by default, or the larger intent-picker variant (h42). */
  variant?: 'filter' | 'intent';
};

export function Chip({ label, selected = false, variant = 'filter', ...props }: ChipProps) {
  const height = variant === 'filter' ? 'h-chip-h' : 'h-intent-chip-h';
  const radius = variant === 'filter' ? 'rounded-chip' : 'rounded-chip-lg';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`${height} ${radius} items-center justify-center border px-4 ${
        selected
          ? 'border-text-primary bg-text-primary dark:border-text-primary-dark dark:bg-text-primary-dark'
          : 'border-border-strong bg-transparent dark:border-border-strong-dark'
      }`}
      {...props}
    >
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
