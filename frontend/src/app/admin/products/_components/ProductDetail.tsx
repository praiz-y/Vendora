"use client";

import { useState, type FormEvent } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailRow } from "@/components/admin/DetailRow";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminProduct, useApproveProduct, useRejectProduct } from "@/features/admin/products/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { ProductStatus } from "@/types/product";

const statusVariant: Record<ProductStatus, BadgeVariant> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ARCHIVED: "neutral",
};

// Renders every image as a real thumbnail/gallery instead of the raw
// comma-joined URL text this page used to show — the most serious fix in
// Overhaul Phase 10 (Part 14: "an admin deciding whether to approve a
// product currently can't see the product").
function ImageGallery({ images }: { images: { id: string; url: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={image.id}
          src={image.url}
          alt=""
          className="h-24 w-24 rounded-md border border-border-admin object-cover"
        />
      ))}
    </div>
  );
}

export function ProductDetail({ id }: { id: string }) {
  const { data: product, isLoading, isError, error } = useAdminProduct(id);
  const approve = useApproveProduct();
  const reject = useRejectProduct();
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  function handleReject(e: FormEvent) {
    e.preventDefault();
    reject.mutate({ id, reason });
  }

  if (isLoading) return <p className="py-6 text-sm text-muted">Loading…</p>;
  if (isError || !product) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const isPending = product.status === "PENDING_REVIEW";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">{product.name}</h2>
        <div className="mt-1">
          <Badge variant={statusVariant[product.status]}>{product.status.replace("_", " ")}</Badge>
        </div>
      </div>

      {product.images.length > 0 && <ImageGallery images={product.images} />}

      <dl className="grid grid-cols-2 gap-4 rounded-md border border-border-admin p-4">
        <DetailRow label="Store" value={product.store.name} />
        <DetailRow label="Category" value={product.category.name} />
        <DetailRow label="Type" value={product.type === "PHYSICAL" ? "Physical" : "Digital"} />
        <DetailRow label="Price" value={`₦${product.price}`} />
        {product.type === "PHYSICAL" && (
          <>
            <DetailRow label="Stock" value={product.stockQuantity} />
            <DetailRow label="Shipping" value={product.shippingType === "FIXED" ? `Fixed (₦${product.shippingFee})` : "Free"} />
          </>
        )}
        {product.type === "DIGITAL" && (
          <DetailRow label="File" value={`v${product.digitalVersions[0]?.version} · ${product.digitalVersions[0]?.fileType}`} />
        )}
        <div className="col-span-2">
          <DetailRow label="Description" value={product.description} />
        </div>
        {product.status === "REJECTED" && (
          <div className="col-span-2">
            <DetailRow label="Rejection reason" value={product.rejectionReason} />
          </div>
        )}
      </dl>

      {isPending && (
        <div className="flex flex-col gap-4">
          {approve.isError && <FormMessage type="error">{getErrorMessage(approve.error)}</FormMessage>}
          {reject.isError && <FormMessage type="error">{getErrorMessage(reject.error)}</FormMessage>}

          <div className="flex gap-3">
            <Button variant="brand" onClick={() => approve.mutate(id)} loading={approve.isPending}>
              Approve
            </Button>
            <Button variant="danger" onClick={() => setShowRejectForm((v) => !v)}>
              Reject
            </Button>
          </div>

          {showRejectForm && (
            <form className="flex max-w-lg flex-col gap-3" onSubmit={handleReject}>
              <Textarea
                label="Rejection reason"
                name="reason"
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button type="submit" variant="danger" loading={reject.isPending} className="self-start">
                Confirm rejection
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
