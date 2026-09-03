import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  ReduceMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/theme/useAppTheme';
import { fontFor } from '@/theme/fonts';

export type CheckpointStatus = 'done' | 'current' | 'future';

export type CheckpointSpineProps = {
  checkpoints: { label: string; meta: string; status: CheckpointStatus }[];
  accent: string;
};

const NODE_BOX = 22;
const NODE_R = 9; // 18x18 circle

function PulseRing({ accent }: { accent: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // The one deliberately ambient animation in the app (rules/01 §4.8, §6.2) — it marks *where
    // you are* in a sequence, which is data. `ReduceMotion.System` in the config stops it on the
    // UI thread when the OS asks, replacing the async AccessibilityInfo check this used to do.
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2400,
        easing: Easing.out(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radius = useDerivedValue(() => NODE_R + progress.value * (NODE_R * 1.1));
  const opacity = useDerivedValue(() => 0.55 * (1 - progress.value));

  return <Circle cx={NODE_BOX / 2} cy={NODE_BOX / 2} r={radius} color={accent} opacity={opacity} />;
}

export function CheckpointSpine({ checkpoints, accent }: CheckpointSpineProps) {
  const { tokens } = useAppTheme();

  return (
    <View>
      {checkpoints.map((cp, i) => {
        const isLast = i === checkpoints.length - 1;
        const spineColor =
          cp.status === 'done'
            ? accent
            : cp.status === 'current' || cp.status === 'future'
              ? tokens.spineIdle
              : 'transparent';

        return (
          <View key={i} style={{ flexDirection: 'row', paddingBottom: isLast ? 0 : 38 }}>
            <View style={{ width: NODE_BOX, alignItems: 'center' }}>
              <Canvas style={{ width: NODE_BOX, height: NODE_BOX }}>
                {cp.status === 'current' && <PulseRing accent={accent} />}
                {cp.status === 'done' && (
                  <Circle cx={NODE_BOX / 2} cy={NODE_BOX / 2} r={NODE_R} color={accent} />
                )}
                {cp.status === 'current' && (
                  <Circle
                    cx={NODE_BOX / 2}
                    cy={NODE_BOX / 2}
                    r={NODE_R - 1}
                    style="stroke"
                    strokeWidth={2}
                    color={accent}
                  />
                )}
                {cp.status === 'future' && (
                  <Circle
                    cx={NODE_BOX / 2}
                    cy={NODE_BOX / 2}
                    r={NODE_R - 1}
                    style="stroke"
                    strokeWidth={2}
                    color={tokens.barMiss}
                  />
                )}
              </Canvas>
              {!isLast && (
                <View style={{ flex: 1, width: 2, backgroundColor: spineColor, marginTop: 4 }} />
              )}
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                className={
                  cp.status === 'future'
                    ? 'text-text-tertiary dark:text-text-tertiary-dark'
                    : 'text-text-primary dark:text-text-primary-dark'
                }
                style={{ fontSize: 19, fontFamily: fontFor(600, 'text'), fontWeight: '600', letterSpacing: -0.02 * 19 }}
              >
                {cp.label}
              </Text>
              <Text
                className="font-body text-text-tertiary dark:text-text-tertiary-dark"
                style={{ fontSize: 13 }}
              >
                {cp.meta}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
