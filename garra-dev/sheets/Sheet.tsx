import { forwardRef, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { useAppTheme } from '@/theme/useAppTheme';
import { useSheetBackHandler } from '@/hooks/useSheetBackHandler';

function scrimAlpha(rgba: string): number {
  const match = rgba.match(/[\d.]+\)$/);
  return match ? parseFloat(match[0]) : 0.5;
}

export type SheetRef = {
  present: () => void;
  dismiss: () => void;
};

export type SheetProps = {
  children: ReactNode;
  snapPoints?: (string | number)[];
};

// The shell every real sheet (LogSheet, RescopeSheet, GoalFormSheet — Phase 4+) builds on:
// standard chrome (rules/01-design-system.md §7) plus the mandatory back-handler wiring
// (rules/02-ui-components.md §3), so neither has to be reimplemented per sheet.
export const Sheet = forwardRef<SheetRef, SheetProps>(function Sheet(
  { children, snapPoints },
  ref,
) {
  const { tokens } = useAppTheme();
  const modalRef = useRef<BottomSheetModal>(null);
  const { handleSheetChange } = useSheetBackHandler(modalRef);

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const points = useMemo(() => snapPoints ?? ['50%'], [snapPoints]);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={points}
      onChange={handleSheetChange}
      backgroundStyle={{
        backgroundColor: tokens.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
      handleIndicatorStyle={{ backgroundColor: tokens.handle, width: 36, height: 5 }}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
          // The backdrop's `opacity` prop is the target alpha its animation interpolates to
          // (not a static multiplier) — extracting scrim's own alpha here, rather than baking
          // it into `style.backgroundColor`, is what makes the fully-open scrim exactly match
          // the token instead of double-applying opacity.
          opacity={scrimAlpha(tokens.scrim)}
          style={[props.style, { backgroundColor: 'black' }]}
        />
      )}
    >
      <BottomSheetView style={{ padding: 24 }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});
