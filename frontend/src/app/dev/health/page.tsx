"use client";

import { useHealthCheck } from "@/hooks/useHealthCheck";

// Development-only page to verify the Next.js -> Express -> health endpoint
// chain during setup/verification. Not linked from any production nav.
export default function HealthCheckPage() {
  const { data, error, isLoading } = useHealthCheck();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Vendora API Health Check</h1>

      {isLoading && <p>Checking backend connection...</p>}

      {error && (
        <p className="text-red-600">
          Failed to reach backend: {error instanceof Error ? error.message : "Unknown error"}
        </p>
      )}

      {data && (
        <pre className="rounded bg-black/5 p-4 text-sm dark:bg-white/10">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
