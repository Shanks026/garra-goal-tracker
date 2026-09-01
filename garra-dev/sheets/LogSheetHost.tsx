import { useCallback } from 'react';

import { LogSheetProvider } from '@/sheets/LogSheetProvider';
import { useHomeData, type TodayItem } from '@/hooks/useHomeData';
import { useLogEntry, useUndoEntry } from '@/hooks/useLogEntry';
import { useToastStore } from '@/lib/stores/toast';
import { copy } from '@/lib/copy';

// Sits between the app root and LogSheetProvider so the provider itself stays free of data-layer
// concerns (it owns the sheet's presentation and queue, nothing else). Lives inside the query
// provider, which is why it can't just be inlined in app/_layout.tsx's tree above it.
export function LogSheetHost({ children }: { children: React.ReactNode }) {
  const { arc, todayKey } = useHomeData();
  const logEntry = useLogEntry();
  const undoEntry = useUndoEntry();
  const pushToast = useToastStore((s) => s.push);

  const onSubmit = useCallback(
    async (item: TodayItem, value: number | null) => {
      if (!arc || !todayKey) return;
      const entryId = await logEntry.mutateAsync({
        goalId: item.goalId,
        arcId: arc.id,
        dayKey: todayKey,
        todayKey,
        value,
        // An Accumulate goal logged twice in a day adds (a second ride), rather than replacing.
        mode: 'add',
      });
      pushToast({
        message: `${copy.log.logged} · ${item.title}`,
        actionLabel: copy.log.undo,
        onAction: () => undoEntry.mutate({ entryId, arcId: arc.id }),
      });
    },
    [arc, todayKey, logEntry, undoEntry, pushToast],
  );

  return <LogSheetProvider onSubmit={onSubmit}>{children}</LogSheetProvider>;
}
