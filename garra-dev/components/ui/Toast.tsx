import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';
import { layout } from '@/theme/tokens';
import { useToastStore } from '@/lib/stores/toast';

// Undo is a 5-second toast, never a confirm dialog (02-ui-components.md §4). Not designed in the
// canvas; this extends the surface/border card pattern from rules/01 §7 rather than inventing a
// new visual language, and carries no color — it's chrome, not data.
export function Toast() {
  const { tokens } = useAppTheme();
  const toasts = useToastStore((s) => s.toasts);
  const act = useToastStore((s) => s.act);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: layout.screenX,
        right: layout.screenX,
        bottom: layout.tabBarH + 16,
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <View
          key={toast.id}
          accessibilityLiveRegion="polite"
          className="flex-row items-center justify-between rounded-card border border-border bg-surface px-4 dark:border-border-dark dark:bg-surface-dark"
          style={{ minHeight: 48, gap: 12 }}
        >
          <Text
            className="flex-1 text-[15px] text-text-primary dark:text-text-primary-dark"
            numberOfLines={2}
          >
            {toast.message}
          </Text>
          {toast.actionLabel ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => act(toast.id)}
              hitSlop={12}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text
                className="text-[15px] font-semibold text-text-primary dark:text-text-primary-dark"
                style={{ color: tokens.textPrimary }}
              >
                {toast.actionLabel}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              onPress={() => dismiss(toast.id)}
              hitSlop={12}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text className="text-[15px] text-text-tertiary dark:text-text-tertiary-dark">✕</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}
