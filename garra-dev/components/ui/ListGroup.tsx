import { View, type ViewProps } from 'react-native';

// Inset grouped list, the iOS way (rules/01-design-system.md §3): a container with
// background:border and gap:1 — the 1px gaps *are* the separators. Children (ListRow) must
// each carry their own bg-surface; do not add a border-bottom anywhere in this pattern.
export function ListGroup({ style, children, ...props }: ViewProps) {
  return (
    <View
      className="overflow-hidden rounded-card bg-border dark:bg-border-dark"
      style={[{ gap: 1 }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
