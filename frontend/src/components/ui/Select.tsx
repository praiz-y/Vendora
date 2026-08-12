import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectFieldProps>(function Select(
  { label, error, id, className = "", children, ...props },
  ref
) {
  const fieldId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-heading">
        {label}
      </label>
      <select
        ref={ref}
        id={fieldId}
        className={`rounded-md border px-3 py-2 text-sm text-body outline-none transition-colors focus:ring-2 focus:ring-offset-0 ${
          error ? "border-error focus:ring-error/40" : "border-border focus:ring-primary/30"
        } bg-transparent ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
});
