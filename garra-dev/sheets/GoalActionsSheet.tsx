import { Text, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { controls } from '@/theme/tokens';

// Not designed (rules/01 §9 lists no goal-actions surface). One implementation for both
// platforms rather than iOS's native action sheet, since Android has no equivalent — built on the
// shared sheet shell so it inherits the mandatory back-handler wiring.
//
// Archive confirms via Alert (rules/02 §5); Pause does not, because it's reversible.
export function GoalActionsSheetContent({
  paused,
  onEdit,
  onRescope,
  onTogglePause,
  onArchive,
}: {
  paused: boolean;
  onEdit: () => void;
  onRescope: () => void;
  onTogglePause: () => void;
  onArchive: () => void;
}) {
  const actions: { label: string; onPress: () => void; destructive?: boolean }[] = [
    { label: 'Edit goal', onPress: onEdit },
    { label: 'Rescope target', onPress: onRescope },
    { label: paused ? 'Resume goal' : 'Pause goal', onPress: onTogglePause },
    { label: 'Archive goal', onPress: onArchive, destructive: true },
  ];

  return (
    <View style={{ gap: 2 }}>
      {actions.map((action) => (
        <PressableScale
          key={action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          className="justify-center"
          style={{ height: controls.listRowH }}
        >
          <Text
            className={
              action.destructive
                ? 'text-[17px] font-medium text-cooked'
                : 'text-[17px] font-medium text-text-primary dark:text-text-primary-dark'
            }
          >
            {action.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}
