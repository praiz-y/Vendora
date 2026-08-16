"use client";

import { use } from "react";
import Link from "next/link";
import { UserDetail } from "../_components/UserDetail";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 py-6">
      <Link href="/admin/users" className="text-sm text-muted hover:underline">
        ← Back to users
      </Link>
      <UserDetail id={id} />
    </div>
  );
}
