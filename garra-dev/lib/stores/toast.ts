import { create } from 'zustand';

// Zustand's first use in the app: ephemeral UI state only (03-state-and-data.md §2 — it never
// holds anything that must survive a cold start). Undo lives in a 5-second toast and never a
// confirm dialog: "confirming a log is a tax on the 99% case to protect the 1%"
// (02-ui-components.md §4).

export const TOAST_DURATION_MS = 5000;

export type Toast = {
  id: string;
  message: string;
  /** Present when the toast carries an action, e.g. "Undo". */
  actionLabel?: string;
  onAction?: () => void;
};

type ToastState = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  /** Runs the toast's action and dismisses it — a tapped Undo shouldn't linger. */
  act: (id: string) => void;
  clear: () => void;
};

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (toast) => {
    const id = `toast-${++counter}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Self-expiring: the caller doesn't have to remember to clean up, and a log path that fires
    // toasts rapidly (Log everything) can't leak them.
    setTimeout(() => get().dismiss(id), TOAST_DURATION_MS);
    return id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  act: (id) => {
    const toast = get().toasts.find((t) => t.id === id);
    toast?.onAction?.();
    get().dismiss(id);
  },

  clear: () => set({ toasts: [] }),
}));
