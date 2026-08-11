import { create } from "zustand";

export type ToastType = "success" | "error";

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message) =>
    set((state) => ({ toasts: [...state.toasts, { id: nextId++, type, message }] })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Non-hook accessor so mutation callbacks (TanStack Query onSuccess/onError,
// fired outside React's render) can trigger a toast without being a
// component — mirrors getAccessToken()'s pattern in stores/authStore.ts.
export const toast = {
  success: (message: string) => useToastStore.getState().addToast("success", message),
  error: (message: string) => useToastStore.getState().addToast("error", message),
};
