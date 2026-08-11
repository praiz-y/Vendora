import type { SellerApplication, SellerApplicationStatus, Store } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { recordAuditLog } from "../../../utils/auditLog";
import { notify } from "../../../utils/notifications";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../../utils/pagination";
import { generateUniqueStoreSlug } from "../../stores/stores.service";

const applicantSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
} as const;

export interface ListSellerApplicationsParams extends PaginationParams {
  status?: SellerApplicationStatus;
}

export async function listApplications(
  params: ListSellerApplicationsParams
): Promise<{ applications: unknown[]; meta: PaginationMeta }> {
  const where = params.status ? { status: params.status } : {};

  const [applications, total] = await Promise.all([
    prisma.sellerApplication.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      ...toSkipTake(params),
      include: { applicant: { select: applicantSelect } },
    }),
    prisma.sellerApplication.count({ where }),
  ]);

  return { applications, meta: buildPaginationMeta(params, total) };
}

export async function getApplicationById(id: string) {
  const application = await prisma.sellerApplication.findUnique({
    where: { id },
    include: { applicant: { select: applicantSelect } },
  });
  if (!application) {
    throw ApiError.notFound("Seller application not found.", "SELLER_APPLICATION_NOT_FOUND");
  }
  return application;
}

async function getApplicationOrThrow(id: string): Promise<SellerApplication> {
  const application = await prisma.sellerApplication.findUnique({ where: { id } });
  if (!application) {
    throw ApiError.notFound("Seller application not found.", "SELLER_APPLICATION_NOT_FOUND");
  }
  return application;
}

export async function approveApplication(
  adminId: string,
  applicationId: string
): Promise<{ application: SellerApplication; store: Store }> {
  const application = await getApplicationOrThrow(applicationId);

  if (application.status !== "PENDING") {
    throw ApiError.conflict("Only pending applications can be approved.", "APPLICATION_NOT_PENDING");
  }

  const slug = await generateUniqueStoreSlug(application.storeName);

  return prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.sellerApplication.update({
      where: { id: applicationId },
      data: { status: "APPROVED", reviewedById: adminId, reviewedAt: new Date() },
    });

    const store = await tx.store.create({
      data: {
        sellerId: application.userId,
        name: application.storeName,
        slug,
        description: application.storeDescription,
        logoUrl: application.storeLogoUrl,
        bannerUrl: application.storeBannerUrl,
        businessCategory: application.businessCategory,
        phone: application.phone,
        email: application.email,
        location: application.location,
        businessRegistration: application.businessRegistration,
      },
    });

    await recordAuditLog(tx, {
      actorId: adminId,
      action: "SELLER_APPLICATION_APPROVED",
      entityType: "SellerApplication",
      entityId: applicationId,
      metadata: { storeId: store.id },
    });

    await notify(tx, {
      userId: application.userId,
      type: "SELLER_APPLICATION_APPROVED",
      title: "Your seller application was approved",
      message: `Congratulations — "${store.name}" is now live on Vendora.`,
      relatedEntityType: "Store",
      relatedEntityId: store.id,
    });

    return { application: updatedApplication, store };
  });
}

export async function rejectApplication(
  adminId: string,
  applicationId: string,
  reason: string
): Promise<SellerApplication> {
  const application = await getApplicationOrThrow(applicationId);

  if (application.status !== "PENDING") {
    throw ApiError.conflict("Only pending applications can be rejected.", "APPLICATION_NOT_PENDING");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.sellerApplication.update({
      where: { id: applicationId },
      data: { status: "REJECTED", rejectionReason: reason, reviewedById: adminId, reviewedAt: new Date() },
    });

    await recordAuditLog(tx, {
      actorId: adminId,
      action: "SELLER_APPLICATION_REJECTED",
      entityType: "SellerApplication",
      entityId: applicationId,
      metadata: { reason },
    });

    await notify(tx, {
      userId: application.userId,
      type: "SELLER_APPLICATION_REJECTED",
      title: "Your seller application was rejected",
      message: reason,
      relatedEntityType: "SellerApplication",
      relatedEntityId: applicationId,
    });

    return updated;
  });
}
