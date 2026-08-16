"use client";

import { use } from "react";
import Link from "next/link";
import { SellerApplicationDetail } from "../_components/SellerApplicationDetail";

// Direct-link fallback (e.g. a bookmarked URL) — the list page's own
// master-detail panel is the primary way this gets viewed now.
export default function AdminSellerApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 py-6">
      <Link href="/admin/seller-applications" className="text-sm text-muted hover:underline">
        ← Back to applications
      </Link>
      <SellerApplicationDetail id={id} />
    </div>
  );
}
