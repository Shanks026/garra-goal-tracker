import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { motion, spring } from '@/theme/motion';

// Press feedback, applied through one component so every tappable surface in the app agrees on
// what a press feels like. This is the highest-leverage motion in the product: it's the only
// animation the user triggers dozens of times a day, and it's what makes a tap feel *received*
// rather than merely registered.
//
// Runs entirely on the UI thread — a press must never be waiting behind a JS-thread render, which
// is precisely the failure mode on the log path (rules/02 §4's 10-second rule).

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = PressableProps & {
  /** Opt out where a scale would be wrong — a full-width row inside a swipeable, say. */
  scaleOnPress?: boolean;
  style?: ViewStyle;
};

export function PressableScale({
  scaleOnPress = true,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - motion.pressScale) }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        if (scaleOnPress) pressed.value = withSpring(1, spring.press);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (scaleOnPress) pressed.value = withSpring(0, spring.press);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
