import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { copy } from '@/lib/copy';
import { Button } from '@/components/ui/Button';
import { explainer, spring, timing } from '@/theme/motion';
import { fontFor } from '@/theme/fonts';
import { controls, system } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

// Not in the canvas. Added because the flow asked the user to build an Arc before it had ever
// said what one is — the single most important concept in the product was left implicit.
//
// **The explainer is the metaphor, not a list.** The four beats hang off a vertical spine that
// draws itself downward as each beat lands, so the user watches an arc run its course while
// reading what an arc is. That reuses the visual language of `CheckpointSpine` (rules/01 §4.8 —
// nodes on a connector, 18×18 circles in a 22px column) rather than inventing a new one, and
// the colour is `system.arc` indigo because this *is* the Arc — §1 reserves indigo for exactly
// that, so it's data, not decoration.
//
// Built with Views rather than Skia on purpose: §7's one-canvas rule targets the 122-cell
// mosaic, and four nodes are nowhere near that. Skia here would buy nothing and cost the
// ability to lay text out beside each node.
//
// Not a numbered step — see `lib/onboardingSteps.ts`. It asks for nothing, so it shows no dots.

const NODE = 18;
const COLUMN = 22;

function Beat({
  index,
  total,
  label,
  body,
}: {
  index: number;
  total: number;
  label: string;
  body: string;
}) {
  const { tokens } = useAppTheme();
  const enter = useSharedValue(0);
  const node = useSharedValue<number>(explainer.nodeFrom);
  const spine = useSharedValue(0);

  useEffect(() => {
    const at = explainer.leadIn + index * explainer.beatStagger;
    enter.value = withDelay(at, withTiming(1, { duration: explainer.beatFade }));
    // The node keeps a spring — it's the one thing here that should feel like it *lands*, and a
    // slower fade around it makes that punctuation clearer rather than less.
    node.value = withDelay(at, withSpring(1, spring.gentle));
    // The connector grows *after* its own node lands, so the line always appears to travel from
    // this beat down toward the next rather than arriving with it.
    spine.value = withDelay(
      at + explainer.spineDelay,
      withTiming(1, { duration: explainer.spineDraw }),
    );
  }, [index, enter, node, spine]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * explainer.rise }],
  }));

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: node.value }],
    opacity: enter.value,
  }));

  const spineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: spine.value }],
  }));

  const isLast = index === total - 1;

  return (
    <Animated.View className="flex-row" style={[rowStyle, { gap: 16 }]}>
      <View style={{ width: COLUMN, alignItems: 'center' }}>
        <Animated.View
          style={[
            nodeStyle,
            {
              width: NODE,
              height: NODE,
              borderRadius: NODE / 2,
              backgroundColor: system.arc,
            },
          ]}
        />
        {/* Last node has no connector — §4.8's "last node: spine transparent". */}
        {isLast ? null : (
          <Animated.View
            style={[
              spineStyle,
              {
                flex: 1,
                width: 2,
                marginTop: 6,
                marginBottom: -6,
                backgroundColor: system.arc,
                // Grows from the top down, toward the next beat.
                transformOrigin: 'top',
              },
            ]}
          />
        )}
      </View>

      <View className="flex-1" style={{ gap: 4, paddingBottom: isLast ? 0 : 30 }}>
        <Text
          className="text-text-primary dark:text-text-primary-dark"
          style={{
            fontSize: 22,
            fontFamily: fontFor(600, 'display'),
            fontWeight: '600',
            letterSpacing: -0.55,
            lineHeight: 26,
          }}
        >
          {label}
        </Text>
        <Text
          className="font-body text-[15px] leading-[22px]"
          style={{ color: tokens.textSecondary }}
        >
          {body}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function HowItWorks() {
  const router = useRouter();
  const beats = copy.onboarding.howBeats;

  const title = useSharedValue(0);
  useEffect(() => {
    title.value = withTiming(1, timing.base);
  }, [title]);
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value }));

  return (
    <SafeAreaView className="flex-1 bg-bg px-7 dark:bg-bg-dark">
      {/* Vertically centred as one block, with the title sitting directly on top of the beats
          rather than pinned to the top of the screen — the title and the spine are one
          composition, and separating them left a dead gap between them. */}
      <View className="flex-1 justify-center">
        <Animated.Text
          className="text-text-primary dark:text-text-primary-dark"
          style={[
            titleStyle,
            {
              fontSize: 38,
              fontFamily: fontFor(600, 'display'),
              fontWeight: '600',
              letterSpacing: -1.33,
              lineHeight: 42,
              marginBottom: 34,
            },
          ]}
        >
          {copy.onboarding.howTitle}
        </Animated.Text>

        {beats.map((beat, index) => (
          <Beat
            key={beat.label}
            index={index}
            total={beats.length}
            label={beat.label}
            body={beat.body}
          />
        ))}
      </View>

      <View className="items-center pb-screen-bottom">
        {/* No StepDots: this screen isn't a step. "Build my arc" now lives here — after the
            explanation instead of before it, which was the whole problem. */}
        <Button
          title={copy.onboarding.buildCta}
          onPress={() => router.push('/name')}
          style={{ width: '100%', height: controls.buttonPrimaryH }}
        />
      </View>
    </SafeAreaView>
  );
}
