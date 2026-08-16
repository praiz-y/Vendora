"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Companion to useAdminDetailSelection.ts's `?id=` pattern — status/search/
// page filters live in the URL too, so leaving a filtered admin list and
// coming back (or sharing the link) doesn't silently reset to the default
// tab. All updates preserve every other param already on the URL.
export function useAdminUrlFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function get(key: string, defaultValue?: string): string | undefined {
    return searchParams.get(key) ?? defaultValue;
  }

  function set(updates: Record<string, string | undefined>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?", { scroll: false });
  }

  return { get, set };
}
