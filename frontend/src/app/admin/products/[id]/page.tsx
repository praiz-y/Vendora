"use client";

import { use } from "react";
import Link from "next/link";
import { ProductDetail } from "../_components/ProductDetail";

export default function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 py-6">
      <Link href="/admin/products" className="text-sm text-muted hover:underline">
        ← Back to products
      </Link>
      <ProductDetail id={id} />
    </div>
  );
}
