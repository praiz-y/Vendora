"use client";

import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// Only appears when requests have been in flight for a while — normal page
// loads finish well under this, so it never flashes on a warm server.
const SHOW_AFTER_MS = 4000;

// Explains the wait when the demo API is cold-starting (free hosting sleeps
// when idle), instead of leaving visitors staring at skeletons with no idea
// whether the site is broken. QueryProvider keeps retrying meanwhile.
export function ServerWakeNotice() {
  const isFetching = useIsFetching() > 0;
  const [slow, setSlow] = useState(false);

  // Fetching: mark slow once the threshold passes. Idle: reset right away
  // (the notice is already hidden by the isFetching check below).
  useEffect(() => {
    const timer = setTimeout(() => setSlow(isFetching), isFetching ? SHOW_AFTER_MS : 0);
    return () => clearTimeout(timer);
  }, [isFetching]);

  if (!isFetching || !slow) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm text-body shadow-lg md:bottom-6"
    >
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
      <p>
        <span className="font-medium text-heading">Waking up the demo server…</span> The free host sleeps when idle, so
        the first load can take up to a minute.
      </p>
    </div>
  );
}
