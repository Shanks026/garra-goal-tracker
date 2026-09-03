import { Text, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';

export type GoalTypeCardProps = {
  glyph: string; // ◉ ▲ ✦ ⬢ — text, not icons (01-design-system.md §6)
  name: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

const SYMBOL_FONT_STACK =
  "'Apple Symbols','Segoe UI Symbol','Noto Sans Symbols 2','DejaVu Sans',sans-serif";

export function GoalTypeCard({ glyph, name, description, selected, onPress }: GoalTypeCardProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-card border bg-surface p-5 dark:bg-surface-dark ${
        selected
          ? 'border-border-selected dark:border-border-selected-dark'
          : 'border-border dark:border-border-dark'
      }`}
      style={{ height: 164, justifyContent: 'space-between' }}
    >
      <Text
        className="text-text-primary dark:text-text-primary-dark"
        style={{ fontFamily: SYMBOL_FONT_STACK, fontSize: 26, lineHeight: 26 }}
      >
        {glyph}
      </Text>
      <View style={{ gap: 5 }}>
        <Text className="text-[18px] font-semibold text-text-primary dark:text-text-primary-dark">
          {name}
        </Text>
        <Text className="font-body text-[14px] text-text-secondary dark:text-text-secondary-dark">
          {description}
        </Text>
      </View>
    </PressableScale>
  );
}
