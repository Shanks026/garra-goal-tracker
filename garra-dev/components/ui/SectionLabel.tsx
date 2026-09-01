import { Text } from 'react-native';

export type SectionLabelProps = {
  label: string;
  /** +.14em in forms (default), +.16em on Home/detail (rules/01-design-system.md §2). */
  context?: 'form' | 'detail';
};

export function SectionLabel({ label, context = 'form' }: SectionLabelProps) {
  return (
    <Text
      className="uppercase text-label dark:text-label-dark"
      style={{
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: (context === 'form' ? 0.14 : 0.16) * 11,
      }}
    >
      {label}
    </Text>
  );
}
