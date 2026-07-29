import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function Textarea(
  { label, error, id, className = "", rows = 4, ...props },
  ref
) {
  const fieldId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        className={`rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-0 ${
          error
            ? "border-red-500 focus:ring-red-400"
            : "border-black/15 focus:ring-black/20 dark:border-white/20 dark:focus:ring-white/30"
        } bg-transparent ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});
