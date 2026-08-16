"use client";

import { Suspense, useState } from "react";
import { AdminBulkBar } from "@/components/admin/AdminBulkBar";
import { AdminMasterDetail } from "@/components/admin/AdminMasterDetail";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminProducts, useBulkApproveProducts, useBulkRejectProducts } from "@/features/admin/products/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { useAdminDetailSelection } from "@/lib/useAdminDetailSelection";
import { useAdminUrlFilters } from "@/lib/useAdminUrlFilters";
import type { ProductStatus } from "@/types/product";
import { ProductDetail } from "./_components/ProductDetail";

const statusTabs: { label: string; value: ProductStatus | undefined }[] = [
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: undefined },
];

const statusVariant: Record<ProductStatus, BadgeVariant> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ARCHIVED: "neutral",
};

function ProductsList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { get, set } = useAdminUrlFilters();
  const status = (get("status", "PENDING_REVIEW") || undefined) as ProductStatus | undefined;
  const page = Number(get("page", "1"));
  const { data, isLoading, isError, error } = useAdminProducts({ status, page, limit: 20 });
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const bulkApprove = useBulkApproveProducts();
  const bulkReject = useBulkRejectProducts();
  const bulkPending = bulkApprove.isPending || bulkReject.isPending;

  function handleStatusChange(next: ProductStatus | undefined) {
    setChecked(new Set());
    set({ status: next, page: undefined });
  }

  function handlePageChange(next: number) {
    setChecked(new Set());
    set({ page: String(next) });
  }

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    setChecked((prev) => (prev.size === data.products.length ? new Set() : new Set(data.products.map((p) => p.id))));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Products</h2>
        <p className="mt-1 text-sm text-muted">Review and approve or reject submitted products.</p>
      </div>

      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleStatusChange(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.value ? "bg-primary-hover text-white" : "border border-border-admin text-body transition-colors hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {bulkApprove.isError && <FormMessage type="error">{getErrorMessage(bulkApprove.error)}</FormMessage>}
      {bulkReject.isError && <FormMessage type="error">{getErrorMessage(bulkReject.error)}</FormMessage>}

      {status === "PENDING_REVIEW" && !!data?.products.length && (
        <>
          <label className="flex items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              checked={checked.size > 0 && checked.size === data.products.length}
              onChange={toggleAll}
            />
            Select all on this page
          </label>
          <AdminBulkBar
            count={checked.size}
            approveLabel="Approve"
            approvePending={bulkApprove.isPending}
            onApprove={() =>
              bulkApprove.mutate(Array.from(checked), { onSuccess: () => setChecked(new Set()) })
            }
            rejectLabel="Reject"
            rejectPending={bulkReject.isPending}
            onReject={(reason) =>
              bulkReject.mutate({ ids: Array.from(checked), reason }, { onSuccess: () => setChecked(new Set()) })
            }
            onClear={() => setChecked(new Set())}
          />
        </>
      )}

      <div className="flex flex-col gap-3">
        {data?.products.map((product) => (
          <div
            key={product.id}
            className={`flex items-center gap-3 rounded-md border p-4 ${
              selectedId === product.id ? "border-primary" : "border-border-admin"
            }`}
          >
            {status === "PENDING_REVIEW" && (
              <input
                type="checkbox"
                aria-label={`Select ${product.name}`}
                checked={checked.has(product.id)}
                onChange={() => toggleChecked(product.id)}
                disabled={bulkPending}
              />
            )}
            <button onClick={() => onSelect(product.id)} className="flex flex-1 items-center justify-between text-left">
              <div>
                <p className="text-sm font-medium text-heading">{product.name}</p>
                <p className="text-sm text-muted">
                  {product.store.name} · {product.type === "PHYSICAL" ? "Physical" : "Digital"} · ₦{product.price}
                </p>
              </div>
              <Badge variant={statusVariant[product.status]}>{product.status.replace("_", " ")}</Badge>
            </button>
          </div>
        ))}
        {data?.products.length === 0 && <p className="text-sm text-muted">No products in this category.</p>}
      </div>

      <AdminPagination meta={data?.meta} page={page} onPageChange={handlePageChange} />
    </div>
  );
}

function AdminProductsContent() {
  const { selectedId, select, clear } = useAdminDetailSelection();

  return (
    <AdminMasterDetail
      list={<ProductsList selectedId={selectedId} onSelect={select} />}
      detail={selectedId ? <ProductDetail id={selectedId} /> : null}
      detailKey={selectedId}
      onCloseDetail={clear}
    />
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted">Loading…</p>}>
      <AdminProductsContent />
    </Suspense>
  );
}
