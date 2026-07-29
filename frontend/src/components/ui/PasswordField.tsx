"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, error, id, className = "", ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const fieldId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          type={visible ? "text" : "password"}
          className={`w-full rounded-md border px-3 py-2 pr-16 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-0 ${
            error
              ? "border-red-500 focus:ring-red-400"
              : "border-black/15 focus:ring-black/20 dark:border-white/20 dark:focus:ring-white/30"
          } bg-transparent ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground/60 hover:text-foreground"
          tabIndex={-1}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});
