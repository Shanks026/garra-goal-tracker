import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

// @gorhom/bottom-sheet v5 ships no Android hardware-back handling. Without this, back with a
// sheet open falls through to expo-router, and since Home is the root there's nothing to pop —
// the OS exits the app. Mandatory on every sheet, no exceptions (02-ui-components.md §3).
// Originally proven by the Phase 0.2 native smoke check (its throwaway route is long gone);
// `sheets/Sheet.tsx` wires this for every sheet built on the shared shell.
export function useSheetBackHandler(modalRef: React.RefObject<BottomSheetModal | null>) {
  const isOpen = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isOpen.current) return false;
      modalRef.current?.dismiss();
      return true;
    });
    return () => sub.remove();
  }, [modalRef]);

  const handleSheetChange = useCallback((index: number) => {
    isOpen.current = index >= 0;
  }, []);

  return { handleSheetChange };
}
