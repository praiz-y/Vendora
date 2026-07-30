import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../utils/pagination";
import { getProductRatingSummaries, getStoreRatingSummary } from "../reviews/reviews.service";
import type { ListPublicProductsQuery } from "./marketplace.validation";

// Deliberately excludes: status/rejectionReason/reviewedBy (internal
// moderation fields), digitalVersions (a digital product's fileKey must
// never be publicly reachable — Phase 9 gates it behind a real entitlement
// check), and the store's phone/email (no buyer-seller messaging exists yet,
// so there's no legitimate reason to publish direct contact info).
const publicProductSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  type: true,
  price: true,
  stockQuantity: true,
  shippingType: true,
  shippingFee: true,
  createdAt: true,
  images: { orderBy: { sortOrder: "asc" as const }, select: { id: true, url: true, isPrimary: true } },
  category: { select: { id: true, name: true, slug: true } },
  store: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;

const publicStoreSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  bannerUrl: true,
  businessCategory: true,
  location: true,
  createdAt: true,
} satisfies Prisma.StoreSelect;

export interface ListPublicProductsParams extends PaginationParams {
  search?: string;
  categorySlug?: string;
  storeSlug?: string;
  type?: ListPublicProductsQuery["type"];
  minPrice?: number;
  maxPrice?: number;
  sort?: ListPublicProductsQuery["sort"];
}

function buildPublicProductWhere(params: ListPublicProductsParams): Prisma.ProductWhereInput {
  const priceFilter: Prisma.DecimalFilter | undefined =
    params.minPrice !== undefined || params.maxPrice !== undefined
      ? {
          ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
          ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
        }
      : undefined;

  return {
    // Only ever the two conditions that make a product publicly visible —
    // every other filter below narrows within that set, never widens past it.
    status: "APPROVED",
    store: { status: "ACTIVE", ...(params.storeSlug ? { slug: params.storeSlug } : {}) },
    ...(params.categorySlug ? { category: { slug: params.categorySlug } } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(priceFilter ? { price: priceFilter } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { description: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

function resolveOrderBy(sort: ListPublicProductsParams["sort"]): Prisma.ProductOrderByWithRelationInput {
  if (sort === "price_asc") return { price: "asc" };
  if (sort === "price_desc") return { price: "desc" };
  return { createdAt: "desc" };
}

export async function listPublicProducts(params: ListPublicProductsParams) {
  const where = buildPublicProductWhere(params);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: resolveOrderBy(params.sort),
      ...toSkipTake(params),
      select: publicProductSelect,
    }),
    prisma.product.count({ where }),
  ]);

  const ratings = await getProductRatingSummaries(products.map((p) => p.id));
  const withRatings = products.map((p) => ({ ...p, rating: ratings.get(p.id)! }));

  return { products: withRatings, meta: buildPaginationMeta(params, total) };
}

export async function getPublicProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: "APPROVED", store: { status: "ACTIVE" } },
    select: publicProductSelect,
  });
  if (!product) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");

  const rating = (await getProductRatingSummaries([product.id])).get(product.id)!;
  return { ...product, rating };
}

export async function getPublicStoreBySlug(slug: string) {
  const store = await prisma.store.findFirst({ where: { slug, status: "ACTIVE" }, select: publicStoreSelect });
  if (!store) throw ApiError.notFound("Store not found.", "STORE_NOT_FOUND");

  const rating = await getStoreRatingSummary(store.id);
  return { ...store, rating };
}
