import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';

import { useAppTheme } from '@/theme/useAppTheme';

export type CheckboxProps = {
  checked: boolean;
  onToggle: (next: boolean) => void;
  /** Charts/controls take accent as a prop — a checkbox never looks up a goal's color itself. */
  accent: string;
};

export function Checkbox({ checked, onToggle, accent }: CheckboxProps) {
  const { tokens } = useAppTheme();
  const scale = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    // ~250ms with slight overshoot (rules/01 §6) — dampingRatio < 1 is what produces the
    // overshoot; a plain duration-only config critically damps (no bounce) by default.
    scale.value = withSpring(checked ? 1 : 0, { duration: 250, dampingRatio: 0.65 });
  }, [checked, scale]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    // Haptic fires on tap, not on animation end (rules/01 §6).
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onToggle(!checked);
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={handlePress}
      hitSlop={10}
      style={{ width: 24, height: 24 }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? accent : 'transparent',
          borderWidth: checked ? 0 : 1.5,
          borderColor: tokens.checkboxBorder,
        }}
      >
        <Animated.View style={checkStyle}>
          {/* rules/01 §5: the glyph is bg-colored on dark but #FFFFFF on light — light `bg` is
              #FAFAF9, so reusing it here left the checkmark faintly off-white. */}
          <Check size={14} strokeWidth={3} color={tokens.checkGlyph} />
        </Animated.View>
      </View>
    </Pressable>
  );
}
