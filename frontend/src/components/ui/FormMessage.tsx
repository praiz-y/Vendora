interface FormMessageProps {
  type: "error" | "success";
  children: React.ReactNode;
}

export function FormMessage({ type, children }: FormMessageProps) {
  const classes =
    type === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
      : "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400";

  return <div className={`rounded-md border px-3 py-2 text-sm ${classes}`}>{children}</div>;
}
