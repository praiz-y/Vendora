import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import type { CreateProductReportInput } from "./productReports.validation";

// One active (PENDING) report per user per product is enforced by the
// partial unique index added in Phase 1
// (ProductReport_reporterId_productId_active_unique) — surfaced here as a
// friendly 409 instead of a raw P2002. Not wrapped in a transaction, so
// (unlike the Phase 7 checkout bug) catching P2002 here is safe: this is a
// single standalone insert, nothing else to abort.
export async function submitReport(userId: string, input: CreateProductReportInput) {
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
  if (!product) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");

  try {
    return await prisma.productReport.create({
      data: {
        reporterId: userId,
        productId: input.productId,
        reason: input.reason,
        description: input.description,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("You already have an active report for this product.", "ALREADY_REPORTED");
    }
    throw error;
  }
}
