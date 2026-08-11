"use client";

import { useEffect } from "react";
import { useToastStore, type ToastItem, type ToastType } from "@/stores/toastStore";

const AUTO_DISMISS_MS = 3000;

const variantClasses: Record<ToastType, string> = {
  success: "border-success/30 bg-badge-success-bg text-badge-success-text",
  error: "border-error/30 bg-badge-error-bg text-badge-error-text",
};

function ToastRow({ id, type, message }: ToastItem) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm font-medium shadow-lg ${variantClasses[type]}`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => removeToast(id)}
        aria-label="Dismiss notification"
        className="opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <ToastRow key={t.id} {...t} />
      ))}
    </div>
  );
}
