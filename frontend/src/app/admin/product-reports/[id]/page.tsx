"use client";

import { use } from "react";
import Link from "next/link";
import { ProductReportDetail } from "../_components/ProductReportDetail";

export default function AdminProductReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 py-6">
      <Link href="/admin/product-reports" className="text-sm text-muted hover:underline">
        ← Back to reports
      </Link>
      <ProductReportDetail id={id} />
    </div>
  );
}
