import type { ReactNode } from "react";

interface AdminMasterDetailProps {
  list: ReactNode;
  detail: ReactNode | null;
  detailKey?: string | null;
  onCloseDetail: () => void;
}

// Shared master-detail shell (Overhaul Phase 10, Part 14) — clicking a row
// opens its detail inline instead of navigating to a disconnected page.
// Desktop: list narrows and stays visible beside the detail panel, so
// picking another row doesn't require backing out first. Mobile: the list
// hides entirely while a detail is open (no room for both), replaced by a
// "Back to list" action. The underlying [id]/page.tsx route for each
// section still works standalone (same detail component, no master list)
// as a direct-link fallback — this component only changes the *list* page's
// own row-click behavior.
export function AdminMasterDetail({ list, detail, detailKey, onCloseDetail }: AdminMasterDetailProps) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className={detail ? "hidden md:block md:w-[360px] md:shrink-0" : "flex-1"}>{list}</div>
      {detail && (
        <div key={detailKey} className="min-w-0 flex-1 animate-admin-panel-in">
          <button type="button" onClick={onCloseDetail} className="mb-4 text-sm text-muted hover:underline md:hidden">
            ← Back to list
          </button>
          {detail}
        </div>
      )}
    </div>
  );
}
