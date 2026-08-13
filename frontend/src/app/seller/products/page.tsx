"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useMyProducts } from "@/features/products/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { Product, ProductStatus } from "@/types/product";

const statusTabs: { label: string; value: ProductStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Archived", value: "ARCHIVED" },
];

const statusBadgeVariant: Record<ProductStatus, BadgeVariant> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ARCHIVED: "neutral",
};

// Not tied to any backend threshold — a simple, low-cost signal for the
// seller to notice a product about to sell out, not a formal inventory
// system.
const LOW_STOCK_THRESHOLD = 5;

function StockLabel({ product }: { product: Product }) {
  if (product.type !== "PHYSICAL" || product.stockQuantity === null) return null;

  const isOut = product.stockQuantity === 0;
  const isLow = !isOut && product.stockQuantity <= LOW_STOCK_THRESHOLD;

  return (
    <span className={isOut ? "text-error" : isLow ? "text-warning" : "text-muted"}>
      {" "}
      · Stock: {product.stockQuantity}
      {isOut && " (Out of stock)"}
      {isLow && " (Low stock)"}
    </span>
  );
}

function ProductThumbnail({ product }: { product: Product }) {
  const image = product.images.find((img) => img.isPrimary) ?? product.images[0];
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-alt">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[9px] text-light">No image</span>
      )}
    </div>
  );
}

export default function SellerProductsPage() {
  const [status, setStatus] = useState<ProductStatus | undefined>(undefined);
  const { data, isLoading, isError, error } = useMyProducts({ status });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-heading">Products</h2>
          <p className="mt-1 text-sm text-muted">Manage your product listings.</p>
        </div>
        <Link href="/seller/products/new">
          <Button>New Product</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.value ? "bg-primary text-white" : "border border-border text-body hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-3">
        {data?.products.map((product) => (
          <Link
            key={product.id}
            href={`/seller/products/${product.id}`}
            className="flex items-center gap-4 rounded-md border border-border p-4 hover:bg-surface-alt"
          >
            <ProductThumbnail product={product} />
            <div className="flex-1">
              <p className="text-sm font-medium text-heading">{product.name}</p>
              <p className="text-sm text-muted">
                {product.type === "PHYSICAL" ? "Physical" : "Digital"} · ₦{product.price} · {product.category.name}
                <StockLabel product={product} />
              </p>
            </div>
            <Badge variant={statusBadgeVariant[product.status]}>{product.status.replace("_", " ")}</Badge>
          </Link>
        ))}
        {data?.products.length === 0 && <p className="text-sm text-muted">No products in this category yet.</p>}
      </div>
    </div>
  );
}
