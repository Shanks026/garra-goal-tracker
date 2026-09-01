import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { Sheet, type SheetRef } from '@/sheets/Sheet';
import { LogSheetContent } from '@/sheets/LogSheet';
import type { TodayItem } from '@/hooks/useHomeData';

// The Provider + Context + imperative-opener pattern from rules/02 §3: mounted once at the app
// root so any screen can open the sheet without prop-drilling, and opened with `openLog(goal)`
// rather than by navigating. `sheets/Sheet.tsx` supplies the chrome and the mandatory
// useSheetBackHandler wiring.

type LogSubmit = (item: TodayItem, value: number | null) => void;

type LogSheetContextValue = {
  openLog: (item: TodayItem) => void;
  /** Walks several value goals in one sheet pass — "Log everything" (rules/02 §4). */
  openLogQueue: (items: TodayItem[]) => void;
};

const LogSheetContext = createContext<LogSheetContextValue | null>(null);

export function useLogSheet(): LogSheetContextValue {
  const context = useContext(LogSheetContext);
  if (!context) throw new Error('useLogSheet must be used inside LogSheetProvider');
  return context;
}

export function LogSheetProvider({
  children,
  onSubmit,
  progressLabelFor,
}: {
  children: React.ReactNode;
  /** Supplied by the app root so the provider itself owns no data-layer concerns. */
  onSubmit: LogSubmit;
  progressLabelFor?: (item: TodayItem) => string | null;
}) {
  const sheetRef = useRef<SheetRef>(null);
  const [queue, setQueue] = useState<TodayItem[]>([]);
  const [index, setIndex] = useState(0);

  const openLog = useCallback((item: TodayItem) => {
    setQueue([item]);
    setIndex(0);
    sheetRef.current?.present();
  }, []);

  const openLogQueue = useCallback((items: TodayItem[]) => {
    if (items.length === 0) return;
    setQueue(items);
    setIndex(0);
    sheetRef.current?.present();
  }, []);

  const current = queue[index] ?? null;

  const handleSubmit = useCallback(
    (value: number | null) => {
      if (!current) return;
      onSubmit(current, value);
      // Advance through a queue; dismiss once it's exhausted (auto-dismiss on submit, per
      // rules/02 §4 — the user never taps a close button on the happy path).
      if (index + 1 < queue.length) {
        setIndex((i) => i + 1);
      } else {
        sheetRef.current?.dismiss();
        setQueue([]);
        setIndex(0);
      }
    },
    [current, index, queue.length, onSubmit],
  );

  const value = useMemo(() => ({ openLog, openLogQueue }), [openLog, openLogQueue]);

  return (
    <LogSheetContext.Provider value={value}>
      {children}
      <Sheet ref={sheetRef} snapPoints={['78%']}>
        {current ? (
          <LogSheetContent
            item={current}
            progressLabel={progressLabelFor?.(current) ?? null}
            onSubmit={handleSubmit}
            queuePosition={queue.length > 1 ? { index, total: queue.length } : undefined}
          />
        ) : null}
      </Sheet>
    </LogSheetContext.Provider>
  );
}
