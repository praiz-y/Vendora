import { Prisma, type Product } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../utils/pagination";
import { slugify } from "../../utils/slug";
import type { CreateProductInput, UpdateProductInput } from "./products.validation";

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  digitalVersions: { orderBy: { version: "desc" as const } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

// DigitalProductVersion.fileSize is a BigInt column — JSON.stringify throws
// on a raw BigInt, so every response that can include one goes through this
// first (mirrors toSafeUser's role for auth: the one serialization seam).
function serializeProduct(product: ProductWithRelations) {
  return {
    ...product,
    digitalVersions: product.digitalVersions.map((v) => ({ ...v, fileSize: v.fileSize.toString() })),
  };
}
export type SafeProduct = ReturnType<typeof serializeProduct>;

async function generateUniqueProductSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;

  while (await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

async function ensureCategoryActive(categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { status: true } });
  if (!category || category.status !== "ACTIVE") {
    throw ApiError.badRequest("Selected category is not available.", "CATEGORY_NOT_AVAILABLE");
  }
}

async function getOwnedProductOrThrow(storeId: string, productId: string): Promise<ProductWithRelations> {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: productInclude });
  if (!product || product.storeId !== storeId) {
    throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
  }
  return product;
}

export async function createProduct(storeId: string, input: CreateProductInput): Promise<SafeProduct> {
  await ensureCategoryActive(input.categoryId);
  const slug = await generateUniqueProductSlug(input.name);

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        storeId,
        categoryId: input.categoryId,
        name: input.name,
        slug,
        description: input.description,
        type: input.type,
        price: input.price,
        ...(input.type === "PHYSICAL"
          ? { stockQuantity: input.stockQuantity, shippingType: input.shippingType, shippingFee: input.shippingFee ?? null }
          : {}),
      },
    });

    if (input.images?.length) {
      await tx.productImage.createMany({
        data: input.images.map((image, index) => ({
          productId: created.id,
          url: image.url,
          publicId: `manual-${created.id}-${index}`,
          sortOrder: index,
          isPrimary: image.isPrimary ?? index === 0,
        })),
      });
    }

    if (input.type === "DIGITAL") {
      await tx.digitalProductVersion.create({
        data: {
          productId: created.id,
          version: 1,
          fileKey: input.file.fileKey,
          fileType: input.file.fileType,
          fileSize: BigInt(input.file.fileSize),
        },
      });
    }

    return created;
  });

  return serializeProduct(await getOwnedProductOrThrow(storeId, product.id));
}

export interface ListMyProductsParams extends PaginationParams {
  status?: Product["status"];
}

export async function listMyProducts(
  storeId: string,
  params: ListMyProductsParams
): Promise<{ products: SafeProduct[]; meta: PaginationMeta }> {
  const where = { storeId, ...(params.status ? { status: params.status } : {}) };

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(params), include: productInclude }),
    prisma.product.count({ where }),
  ]);

  return { products: products.map(serializeProduct), meta: buildPaginationMeta(params, total) };
}

export async function getMyProduct(storeId: string, productId: string): Promise<SafeProduct> {
  return serializeProduct(await getOwnedProductOrThrow(storeId, productId));
}

const EDITABLE_STATUSES: Product["status"][] = ["DRAFT", "PENDING_REVIEW", "REJECTED"];

// Editing a REJECTED product resubmits it in place (back to PENDING_REVIEW,
// clearing the prior rejection) — the same pattern Phase 3 established for
// seller applications. Editing a PENDING_REVIEW one just updates fields.
// APPROVED/ARCHIVED products are not editable through this endpoint in V1 —
// keeps the moderation model unambiguous (no "does editing a live product
// require re-review" question to answer).
export async function updateMyProduct(
  storeId: string,
  productId: string,
  input: UpdateProductInput
): Promise<SafeProduct> {
  const product = await getOwnedProductOrThrow(storeId, productId);

  if (!EDITABLE_STATUSES.includes(product.status)) {
    throw ApiError.conflict("This product can no longer be edited.", "PRODUCT_NOT_EDITABLE");
  }

  if (input.categoryId) await ensureCategoryActive(input.categoryId);

  if (product.type === "DIGITAL") {
    if (input.stockQuantity !== undefined || input.shippingType !== undefined || input.shippingFee !== undefined) {
      throw ApiError.badRequest(
        "Digital products do not support stock or shipping fields.",
        "INVALID_FIELD_FOR_PRODUCT_TYPE"
      );
    }
  } else {
    const finalShippingType = input.shippingType ?? product.shippingType;
    const finalShippingFee = input.shippingFee ?? product.shippingFee;
    if (finalShippingType === "FIXED" && (finalShippingFee === null || finalShippingFee === undefined)) {
      throw ApiError.badRequest("shippingFee is required when shippingType is FIXED.", "SHIPPING_FEE_REQUIRED");
    }
  }

  const isResubmission = product.status === "REJECTED";
  const { images, ...fields } = input;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        ...fields,
        ...(isResubmission
          ? {
              status: "PENDING_REVIEW" as const,
              rejectionReason: null,
              reviewedById: null,
              reviewedAt: null,
              submittedAt: new Date(),
            }
          : {}),
      },
    });

    if (images) {
      await tx.productImage.deleteMany({ where: { productId } });
      if (images.length) {
        await tx.productImage.createMany({
          data: images.map((image, index) => ({
            productId,
            url: image.url,
            publicId: `manual-${productId}-${index}-${Date.now()}`,
            sortOrder: index,
            isPrimary: image.isPrimary ?? index === 0,
          })),
        });
      }
    }
  });

  return serializeProduct(await getOwnedProductOrThrow(storeId, productId));
}

export async function submitProduct(storeId: string, productId: string): Promise<SafeProduct> {
  const product = await getOwnedProductOrThrow(storeId, productId);

  if (product.status !== "DRAFT") {
    throw ApiError.conflict("Only draft products can be submitted for review.", "PRODUCT_NOT_DRAFT");
  }

  await prisma.product.update({ where: { id: productId }, data: { status: "PENDING_REVIEW", submittedAt: new Date() } });
  return serializeProduct(await getOwnedProductOrThrow(storeId, productId));
}

export async function archiveProduct(storeId: string, productId: string): Promise<SafeProduct> {
  const product = await getOwnedProductOrThrow(storeId, productId);

  if (product.status === "ARCHIVED") {
    throw ApiError.conflict("This product is already archived.", "PRODUCT_ALREADY_ARCHIVED");
  }

  await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
  return serializeProduct(await getOwnedProductOrThrow(storeId, productId));
}

// Covers two cases with one rule: fixing the file on a not-yet-approved
// product (DRAFT/PENDING_REVIEW/REJECTED — PATCH deliberately has no `file`
// field, see updateMyProduct) and uploading a genuinely new version once
// live (APPROVED) so existing buyers' entitlements resolve to it (Phase 9,
// Overview §21). Only ARCHIVED is blocked — a retired product gets no more
// versions. Uploading against a REJECTED product resubmits it for review,
// exactly like editing one does.
export async function addDigitalVersion(
  storeId: string,
  productId: string,
  input: { fileKey: string; fileType: string; fileSize: number }
): Promise<SafeProduct> {
  const product = await getOwnedProductOrThrow(storeId, productId);

  if (product.type !== "DIGITAL") {
    throw ApiError.badRequest("Only digital products can have file versions.", "NOT_A_DIGITAL_PRODUCT");
  }
  if (product.status === "ARCHIVED") {
    throw ApiError.conflict("This product is archived and can no longer be updated.", "PRODUCT_ARCHIVED");
  }

  const latest = await prisma.digitalProductVersion.findFirst({ where: { productId }, orderBy: { version: "desc" } });
  const nextVersion = (latest?.version ?? 0) + 1;
  const isResubmission = product.status === "REJECTED";

  await prisma.$transaction(async (tx) => {
    await tx.digitalProductVersion.create({
      data: {
        productId,
        version: nextVersion,
        fileKey: input.fileKey,
        fileType: input.fileType,
        fileSize: BigInt(input.fileSize),
      },
    });

    if (isResubmission) {
      await tx.product.update({
        where: { id: productId },
        data: {
          status: "PENDING_REVIEW",
          rejectionReason: null,
          reviewedById: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
      });
    }
  });

  return serializeProduct(await getOwnedProductOrThrow(storeId, productId));
}
