"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { ProductFieldset, type ProductFieldsetValues } from "../_components/ProductFieldset";
import type { ProductImageInput } from "@/features/products/api";
import { useArchiveProduct, useMyProduct, useSubmitProduct, useUpdateProduct } from "@/features/products/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { Product } from "@/types/product";

function toFieldsetValues(product: Product): ProductFieldsetValues {
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    price: product.price,
    stockQuantity: product.stockQuantity?.toString() ?? "",
    shippingType: product.shippingType ?? "FREE",
    shippingFee: product.shippingFee ?? "",
  };
}

const EDITABLE_STATUSES: Product["status"][] = ["DRAFT", "PENDING_REVIEW", "REJECTED"];

// Keyed by product.id from the parent, so each product gets a fresh mount —
// state is seeded once from props (no effect needed to keep it in sync).
function ProductEditForm({ id, product }: { id: string; product: Product }) {
  const updateProduct = useUpdateProduct();
  const [values, setValues] = useState<ProductFieldsetValues>(() => toFieldsetValues(product));
  const [images, setImages] = useState<ProductImageInput[]>(() =>
    product.images.map((image) => ({ url: image.url, isPrimary: image.isPrimary }))
  );

  function handleChange(field: keyof ProductFieldsetValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const cleanedImages = images.filter((image) => image.url.trim().length > 0);
    updateProduct.mutate({
      id,
      input: {
        name: values.name,
        description: values.description,
        categoryId: values.categoryId,
        price: Number(values.price),
        images: cleanedImages,
        ...(product.type === "PHYSICAL"
          ? {
              stockQuantity: Number(values.stockQuantity),
              shippingType: values.shippingType,
              shippingFee: values.shippingType === "FIXED" ? Number(values.shippingFee) : undefined,
            }
          : {}),
      },
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <ProductFieldset type={product.type} values={values} onChange={handleChange} images={images} onImagesChange={setImages} />

      {updateProduct.isError && <FormMessage type="error">{getErrorMessage(updateProduct.error)}</FormMessage>}
      {updateProduct.isSuccess && <FormMessage type="success">Product updated.</FormMessage>}

      <Button type="submit" loading={updateProduct.isPending} className="self-start">
        Save changes
      </Button>
    </form>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, isError, error } = useMyProduct(id);
  const submitProduct = useSubmitProduct();
  const archiveProduct = useArchiveProduct();

  if (isLoading) return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  if (isError || !product) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const isEditable = EDITABLE_STATUSES.includes(product.status);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Link href="/seller/products" className="text-sm text-foreground/60 hover:underline">
          ← Back to products
        </Link>
        <h2 className="mt-2 text-lg font-semibold">{product.name}</h2>
        <p className="text-sm text-foreground/60">Status: {product.status.replace("_", " ")}</p>
      </div>

      {product.status === "REJECTED" && (
        <FormMessage type="error">{product.rejectionReason ?? "No reason was given."}</FormMessage>
      )}

      <div className="flex gap-3">
        {product.status === "DRAFT" && (
          <Button onClick={() => submitProduct.mutate(id)} loading={submitProduct.isPending}>
            Submit for Review
          </Button>
        )}
        {product.status !== "ARCHIVED" && (
          <Button variant="danger" onClick={() => archiveProduct.mutate(id)} loading={archiveProduct.isPending}>
            Archive
          </Button>
        )}
      </div>
      {submitProduct.isError && <FormMessage type="error">{getErrorMessage(submitProduct.error)}</FormMessage>}
      {archiveProduct.isError && <FormMessage type="error">{getErrorMessage(archiveProduct.error)}</FormMessage>}

      {product.type === "DIGITAL" && (
        <div className="max-w-lg rounded-md border border-black/10 p-4 text-sm dark:border-white/10">
          <p className="font-medium">Digital file</p>
          <p className="mt-1 text-foreground/60">
            Latest version: {product.digitalVersions[0]?.version ?? "—"} ({product.digitalVersions[0]?.fileType})
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            Uploading new versions isn&apos;t available yet — that ships with digital entitlements/downloads
            (Phase 9).
          </p>
        </div>
      )}

      {isEditable ? (
        <ProductEditForm key={product.id} id={id} product={product} />
      ) : (
        <p className="text-sm text-foreground/60">
          This product can no longer be edited directly (status: {product.status.replace("_", " ")}).
        </p>
      )}
    </div>
  );
}
