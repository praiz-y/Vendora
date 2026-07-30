import { Prisma, type ProductStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { recordAuditLog } from "../../../utils/auditLog";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../../utils/pagination";

const adminProductInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  digitalVersions: { orderBy: { version: "desc" as const } },
  category: { select: { id: true, name: true, slug: true } },
  store: { select: { id: true, name: true, slug: true, sellerId: true } },
} satisfies Prisma.ProductInclude;

type AdminProduct = Prisma.ProductGetPayload<{ include: typeof adminProductInclude }>;

function serialize(product: AdminProduct) {
  return { ...product, digitalVersions: product.digitalVersions.map((v) => ({ ...v, fileSize: v.fileSize.toString() })) };
}

export interface ListProductsParams extends PaginationParams {
  status?: ProductStatus;
}

export async function listProducts(params: ListProductsParams) {
  const where = params.status ? { status: params.status } : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(params),
      include: adminProductInclude,
    }),
    prisma.product.count({ where }),
  ]);

  return { products: products.map(serialize), meta: buildPaginationMeta(params, total) };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: adminProductInclude });
  if (!product) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
  return serialize(product);
}

async function getProductOrThrow(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
  return product;
}

export async function approveProduct(adminId: string, productId: string) {
  const product = await getProductOrThrow(productId);
  if (product.status !== "PENDING_REVIEW") {
    throw ApiError.conflict("Only products pending review can be approved.", "PRODUCT_NOT_PENDING_REVIEW");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { status: "APPROVED", reviewedById: adminId, reviewedAt: new Date() },
    });
    await recordAuditLog(tx, {
      actorId: adminId,
      action: "PRODUCT_APPROVED",
      entityType: "Product",
      entityId: productId,
    });
  });

  return getProductById(productId);
}

export async function rejectProduct(adminId: string, productId: string, reason: string) {
  const product = await getProductOrThrow(productId);
  if (product.status !== "PENDING_REVIEW") {
    throw ApiError.conflict("Only products pending review can be rejected.", "PRODUCT_NOT_PENDING_REVIEW");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { status: "REJECTED", rejectionReason: reason, reviewedById: adminId, reviewedAt: new Date() },
    });
    await recordAuditLog(tx, {
      actorId: adminId,
      action: "PRODUCT_REJECTED",
      entityType: "Product",
      entityId: productId,
      metadata: { reason },
    });
  });

  return getProductById(productId);
}
