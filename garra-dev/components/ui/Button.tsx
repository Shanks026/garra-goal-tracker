import { Text, type PressableProps, type ViewStyle } from 'react-native';

import { PressableScale } from './PressableScale';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
};

// rules/01-design-system.md §7. Primary is NEVER accent-colored — the governing law.
const VARIANT_CLASSES = {
  primary: {
    container: 'bg-text-primary dark:bg-text-primary-dark',
    label: 'text-bg dark:text-bg-dark',
  },
  secondary: {
    container: 'bg-fill-med dark:bg-fill-med-dark',
    label: 'text-text-primary dark:text-text-primary-dark',
  },
  outline: {
    container: 'border border-border-control dark:border-border-control-dark',
    label: 'text-text-secondary dark:text-text-secondary-dark',
  },
} as const;

export function Button({ title, variant = 'primary', style, ...props }: ButtonProps) {
  const classes = VARIANT_CLASSES[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      className={`h-button-primary-h items-center justify-center rounded-button-lg px-6 ${classes.container}`}
      style={style}
      {...props}
    >
      <Text
        className={`text-[17px] font-semibold ${classes.label}`}
        style={{ letterSpacing: -0.17 }}
      >
        {title}
      </Text>
    </PressableScale>
  );
}
