interface FormMessageProps {
  type: "error" | "success";
  children: React.ReactNode;
}

export function FormMessage({ type, children }: FormMessageProps) {
  const classes = type === "error" ? "border-error/30 bg-error/10 text-error" : "border-success/30 bg-success/10 text-success";

  return <div className={`rounded-md border px-3 py-2 text-sm ${classes}`}>{children}</div>;
}
