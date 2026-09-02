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

// A disabled button keeps its shape and loses its weight. `textQuaternary` is the token rules/01
// §1 already annotates "captions, disabled", so this needs no new value — and deliberately no
// new color: a held capability is not a warning state.
const DISABLED_CLASSES = {
  container: 'border border-border dark:border-border-dark',
  label: 'text-text-quaternary dark:text-text-quaternary-dark',
} as const;

export function Button({ title, variant = 'primary', style, disabled, ...props }: ButtonProps) {
  const classes = disabled ? DISABLED_CLASSES : VARIANT_CLASSES[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      // Without this, VoiceOver announces an ordinary button that silently does nothing.
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
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
