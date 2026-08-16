"use client";

import { use } from "react";
import Link from "next/link";
import { RefundDetail } from "../_components/RefundDetail";

export default function AdminRefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 py-6">
      <Link href="/admin/refunds" className="text-sm text-muted hover:underline">
        ← Back to refunds
      </Link>
      <RefundDetail id={id} />
    </div>
  );
}
