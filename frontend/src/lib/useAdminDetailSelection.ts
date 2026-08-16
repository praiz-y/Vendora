"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Backs every admin list page's master-detail behavior (Overhaul Phase 10)
// — the selected row's id lives in `?id=`, not local state, so the drill-
// down is shareable/refreshable and other filters (e.g. `?status=`) on the
// same page are preserved rather than clobbered.
export function useAdminDetailSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?", { scroll: false });
  }

  return { selectedId, select, clear };
}
