import { Prisma, type ProductReportStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { recordAuditLog } from "../../../utils/auditLog";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../../utils/pagination";

const reportInclude = {
  product: { select: { id: true, name: true, slug: true, storeId: true } },
  reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
  resolvedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ProductReportInclude;

export interface ListReportsParams extends PaginationParams {
  status?: ProductReportStatus;
}

export async function listReports(
  params: ListReportsParams
): Promise<{ reports: unknown[]; meta: PaginationMeta }> {
  const where = params.status ? { status: params.status } : {};

  const [reports, total] = await Promise.all([
    prisma.productReport.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(params), include: reportInclude }),
    prisma.productReport.count({ where }),
  ]);

  return { reports, meta: buildPaginationMeta(params, total) };
}

async function getReportOrThrow(id: string) {
  const report = await prisma.productReport.findUnique({ where: { id }, include: reportInclude });
  if (!report) throw ApiError.notFound("Report not found.", "REPORT_NOT_FOUND");
  return report;
}

export async function getReportById(id: string) {
  return getReportOrThrow(id);
}

// Third consumer of the Admin Foundation's list/detail/approve-reject
// pattern (docs/roadmap.md Phase 3), after seller-application review and
// product moderation. "Approve/reject" here is "resolve/dismiss" — the
// schema's own ProductReportStatus (Phase 1) is PENDING/RESOLVED/DISMISSED,
// not the "Submitted -> Under Review -> Resolved" wording Overview §24
// floats as a "potential" lifecycle; both terminal states are reachable
// directly from PENDING, with no separate "under review" state to
// transition through.
async function finalizeReport(adminId: string, id: string, status: "RESOLVED" | "DISMISSED", resolutionNote?: string) {
  const report = await getReportOrThrow(id);
  if (report.status !== "PENDING") {
    throw ApiError.conflict("Only pending reports can be reviewed.", "REPORT_NOT_PENDING");
  }

  await prisma.$transaction(async (tx) => {
    await tx.productReport.update({
      where: { id },
      data: { status, resolvedById: adminId, resolvedAt: new Date(), resolutionNote },
    });
    await recordAuditLog(tx, {
      actorId: adminId,
      action: status === "RESOLVED" ? "PRODUCT_REPORT_RESOLVED" : "PRODUCT_REPORT_DISMISSED",
      entityType: "ProductReport",
      entityId: id,
      metadata: resolutionNote ? { resolutionNote } : undefined,
    });
  });

  return getReportOrThrow(id);
}

export async function resolveReport(adminId: string, id: string, resolutionNote?: string) {
  return finalizeReport(adminId, id, "RESOLVED", resolutionNote);
}

export async function dismissReport(adminId: string, id: string, resolutionNote?: string) {
  return finalizeReport(adminId, id, "DISMISSED", resolutionNote);
}
