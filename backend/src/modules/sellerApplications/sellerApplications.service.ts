import { Prisma, type SellerApplication } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import type { SellerApplicationInput, UpdateSellerApplicationInput } from "./sellerApplications.validation";

export async function getMyApplication(userId: string): Promise<SellerApplication> {
  const application = await prisma.sellerApplication.findUnique({ where: { userId } });
  if (!application) {
    throw ApiError.notFound("You have not submitted a seller application.", "SELLER_APPLICATION_NOT_FOUND");
  }
  return application;
}

export async function submitApplication(
  userId: string,
  input: SellerApplicationInput
): Promise<SellerApplication> {
  const existingStore = await prisma.store.findUnique({ where: { sellerId: userId }, select: { id: true } });
  if (existingStore) {
    throw ApiError.conflict("You already have a store.", "ALREADY_A_SELLER");
  }

  try {
    return await prisma.sellerApplication.create({ data: { userId, ...input } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict(
        "You have already submitted a seller application.",
        "APPLICATION_ALREADY_EXISTS"
      );
    }
    throw error;
  }
}

// Editing a REJECTED application resubmits it (back to PENDING, clearing the
// prior review) per the brief: "the user can edit the application... and
// resubmit the same application." Editing a PENDING one just updates the
// fields in place. APPROVED applications are immutable — the Store created
// from them is what's edited going forward (stores.service.updateMyStore).
export async function updateMyApplication(
  userId: string,
  input: UpdateSellerApplicationInput
): Promise<SellerApplication> {
  const application = await getMyApplication(userId);

  if (application.status === "APPROVED") {
    throw ApiError.conflict("Your seller application has already been approved.", "APPLICATION_ALREADY_APPROVED");
  }

  const isResubmission = application.status === "REJECTED";

  return prisma.sellerApplication.update({
    where: { userId },
    data: {
      ...input,
      ...(isResubmission
        ? {
            status: "PENDING" as const,
            rejectionReason: null,
            reviewedById: null,
            reviewedAt: null,
            submittedAt: new Date(),
          }
        : {}),
    },
  });
}
