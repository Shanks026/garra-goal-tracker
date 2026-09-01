import { View } from 'react-native';

export type StepDotsProps = {
  total: number;
  /** 0-indexed. */
  current: number;
};

// The 5-dot progress row under every onboarding screen (canvas 01-05).
export function StepDots({ total, current }: StepDotsProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={i === current ? 'bg-text-primary dark:bg-text-primary-dark' : 'bg-fill-strong'}
          style={{ width: 7, height: 7, borderRadius: 4 }}
        />
      ))}
    </View>
  );
}
