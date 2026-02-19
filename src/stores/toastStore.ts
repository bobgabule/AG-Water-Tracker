import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'success' | 'error';
  show: (message: string, type?: 'success' | 'error') => void;
  hide: () => void;
}

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'success',
  show: (message, type = 'success') => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ message, type });
    dismissTimer = setTimeout(() => {
      set({ message: null });
      dismissTimer = null;
    }, 3000);
  },
  hide: () => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    set({ message: null });
  },
}));
