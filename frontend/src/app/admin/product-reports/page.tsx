"use client";

import Link from "next/link";
import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminProductReports } from "@/features/admin/productReports/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { reportReasonLabels } from "@/types/productReport";
import type { ProductReportStatus } from "@/types/productReport";

const statusTabs: { label: string; value: ProductReportStatus | undefined }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Dismissed", value: "DISMISSED" },
  { label: "All", value: undefined },
];

const statusBadgeClasses: Record<ProductReportStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  RESOLVED: "bg-green-500/10 text-green-700 dark:text-green-400",
  DISMISSED: "bg-black/10 text-foreground/50 dark:bg-white/10",
};

export default function AdminProductReportsPage() {
  const [status, setStatus] = useState<ProductReportStatus | undefined>("PENDING");
  const { data, isLoading, isError, error } = useAdminProductReports({ status });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Product Reports</h2>
        <p className="mt-1 text-sm text-foreground/60">Review reports submitted by buyers and resolve or dismiss them.</p>
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
        {data?.reports.map((report) => (
          <Link
            key={report.id}
            href={`/admin/product-reports/${report.id}`}
            className="flex items-center justify-between rounded-md border border-black/10 p-4 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium">{report.product.name}</p>
              <p className="text-sm text-foreground/60">
                {reportReasonLabels[report.reason as keyof typeof reportReasonLabels] ?? report.reason} · reported by{" "}
                {report.reporter.firstName} {report.reporter.lastName}
              </p>
            </div>
            <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeClasses[report.status]}`}>
              {report.status}
            </span>
          </Link>
        ))}
        {data?.reports.length === 0 && <p className="text-sm text-foreground/60">No reports in this category.</p>}
      </div>
    </div>
  );
}
