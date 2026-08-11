import type { ReactNode } from "react";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-badge-success-bg text-badge-success-text",
  warning: "bg-badge-warning-bg text-badge-warning-text",
  error: "bg-badge-error-bg text-badge-error-text",
  info: "bg-badge-info-bg text-badge-info-text",
  neutral: "bg-badge-neutral-bg text-badge-neutral-text",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
