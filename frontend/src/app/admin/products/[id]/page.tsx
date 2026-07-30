"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminProduct, useApproveProduct, useRejectProduct } from "@/features/admin/products/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, isError, error } = useAdminProduct(id);
  const approve = useApproveProduct();
  const reject = useRejectProduct();
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  function handleReject(e: FormEvent) {
    e.preventDefault();
    reject.mutate({ id, reason });
  }

  if (isLoading) return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  if (isError || !product) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const isPending = product.status === "PENDING_REVIEW";

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Link href="/admin/products" className="text-sm text-foreground/60 hover:underline">
          ← Back to products
        </Link>
        <h2 className="mt-2 text-lg font-semibold">{product.name}</h2>
        <p className="text-sm text-foreground/60">Status: {product.status.replace("_", " ")}</p>
      </div>

      <dl className="grid max-w-lg grid-cols-2 gap-4 rounded-md border border-black/10 p-4 dark:border-white/10">
        <DetailRow label="Store" value={product.store.name} />
        <DetailRow label="Category" value={product.category.name} />
        <DetailRow label="Type" value={product.type === "PHYSICAL" ? "Physical" : "Digital"} />
        <DetailRow label="Price" value={`₦${product.price}`} />
        {product.type === "PHYSICAL" && (
          <>
            <DetailRow label="Stock" value={product.stockQuantity} />
            <DetailRow
              label="Shipping"
              value={product.shippingType === "FIXED" ? `Fixed (₦${product.shippingFee})` : "Free"}
            />
          </>
        )}
        {product.type === "DIGITAL" && (
          <DetailRow
            label="File"
            value={`v${product.digitalVersions[0]?.version} · ${product.digitalVersions[0]?.fileType}`}
          />
        )}
        <div className="col-span-2">
          <DetailRow label="Description" value={product.description} />
        </div>
        {product.images.length > 0 && (
          <div className="col-span-2">
            <DetailRow label="Images" value={product.images.map((image) => image.url).join(", ")} />
          </div>
        )}
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
            <Button onClick={() => approve.mutate(id)} loading={approve.isPending}>
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
