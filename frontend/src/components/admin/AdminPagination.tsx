import { Button } from "@/components/ui/Button";
import type { PaginationMeta } from "@/types/store";

// Same Previous/Next + "Page X of Y" shape the buyer-facing products page
// already established — reused here for the three admin lists the roadmap
// calls out by name (Users, Products, Audit Log) as having none today.
export function AdminPagination({
  meta,
  page,
  onPageChange,
}: {
  meta: PaginationMeta | undefined;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted">
        Page {meta.page} of {meta.totalPages}
      </span>
      <Button variant="secondary" disabled={page >= meta.totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}
