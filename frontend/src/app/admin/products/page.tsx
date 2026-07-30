"use client";

import Link from "next/link";
import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminProducts } from "@/features/admin/products/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { ProductStatus } from "@/types/product";

const statusTabs: { label: string; value: ProductStatus | undefined }[] = [
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: undefined },
];

const statusBadgeClasses: Record<ProductStatus, string> = {
  DRAFT: "bg-black/10 text-foreground/70 dark:bg-white/10",
  PENDING_REVIEW: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  ARCHIVED: "bg-black/10 text-foreground/50 dark:bg-white/10",
};

export default function AdminProductsPage() {
  const [status, setStatus] = useState<ProductStatus | undefined>("PENDING_REVIEW");
  const { data, isLoading, isError, error } = useAdminProducts({ status });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Products</h2>
        <p className="mt-1 text-sm text-foreground/60">Review and approve or reject submitted products.</p>
      </div>

      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.value
                ? "bg-foreground text-background"
                : "border border-black/15 text-foreground/70 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-3">
        {data?.products.map((product) => (
          <Link
            key={product.id}
            href={`/admin/products/${product.id}`}
            className="flex items-center justify-between rounded-md border border-black/10 p-4 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium">{product.name}</p>
              <p className="text-sm text-foreground/60">
                {product.store.name} · {product.type === "PHYSICAL" ? "Physical" : "Digital"} · ₦{product.price}
              </p>
            </div>
            <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeClasses[product.status]}`}>
              {product.status.replace("_", " ")}
            </span>
          </Link>
        ))}
        {data?.products.length === 0 && <p className="text-sm text-foreground/60">No products in this category.</p>}
      </div>
    </div>
  );
}
