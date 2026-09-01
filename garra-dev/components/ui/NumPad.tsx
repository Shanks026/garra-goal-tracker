import { Pressable, Text, View } from 'react-native';
import { Delete } from 'lucide-react-native';

import { useAppTheme } from '@/theme/useAppTheme';

export type NumPadProps = {
  onKeyPress: (key: string) => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

// The custom 12-key numpad — never the OS keyboard for value entry (rules/01-design-system.md
// §7, rules/02-ui-components.md §4): the OS keyboard costs a tap and breaks the 10s rule.
export function NumPad({ onKeyPress }: NumPadProps) {
  const { tokens } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {KEYS.map((key) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={key === '⌫' ? 'Delete' : key}
          onPress={() => onKeyPress(key)}
          className="h-num-key-h items-center justify-center rounded-num-key bg-fill dark:bg-fill-dark"
          style={{ width: '31%' }}
        >
          {key === '⌫' ? (
            <Delete size={20} color={tokens.textPrimary} />
          ) : (
            <Text
              className="text-text-primary dark:text-text-primary-dark"
              style={{ fontSize: 24, fontWeight: '500' }}
            >
              {key}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
