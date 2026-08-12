import { Prisma } from "@prisma/client";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../utils/pagination";
import { getProductRatingSummaries, getStoreRatingSummary } from "../reviews/reviews.service";
import type { ListPublicProductsQuery, RecordProductViewInput } from "./marketplace.validation";

// Mirrors sellerDashboard.service.ts's own PAID_ORDER_STATUS_FILTER —
// duplicated rather than imported across these two otherwise-unrelated
// modules; a SellerOrder exists as soon as checkout builds the order graph,
// before payment succeeds, so "sales"/"order volume" must only count Orders
// that actually got paid.
const PAID_ORDER_STATUS_FILTER = {
  notIn: ["PENDING_PAYMENT", "CANCELLED"] as OrderStatus[],
};

// Rolling 30-day window (not all-time, so early winners don't get
// permanently locked in; not 7 days, too volatile/thin at this marketplace's
// scale) — Overhaul Phase 4/Part 3 of the plan. Shared by this module's own
// `best_selling` sort and Phase 5's Trending/Digital Products homepage rows.
const RECENT_ORDER_WINDOW_DAYS = 30;

// Overhaul Part 3's Top Rated eligibility rule: the review-count floor
// exists specifically so a single lucky 5-star review can't outrank a
// product with hundreds of reviews averaging 4.8.
const TOP_RATED_MIN_RATING = 4;
const TOP_RATED_MIN_REVIEWS = 5;

export async function getRecentOrderVolumeByProduct(
  productIds: string[],
  days = RECENT_ORDER_WINDOW_DAYS
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      sellerOrder: { order: { status: PAID_ORDER_STATUS_FILTER, placedAt: { gte: since } } },
    },
    _sum: { quantity: true },
  });

  return new Map(grouped.map((g) => [g.productId, g._sum.quantity ?? 0]));
}

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

type PublicProductRow = Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>;

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

// `rating_desc` and `best_selling` aren't columns on Product — both are
// computed from other tables (Review, OrderItem), so neither can be a
// Prisma `orderBy` the database can apply before paginating. Instead: pull
// every id the filters match (this marketplace's scale makes that cheap),
// rank/filter them in application code, then paginate that ranked list and
// fetch full product rows for just the requested page.
async function listPublicProductsByComputedSort(
  params: ListPublicProductsParams,
  where: Prisma.ProductWhereInput,
  sort: "rating_desc" | "best_selling"
): Promise<{ products: PublicProductRow[]; total: number }> {
  const candidates = await prisma.product.findMany({ where, select: { id: true, createdAt: true } });
  const candidateIds = candidates.map((c) => c.id);

  let rankedIds: string[];

  if (sort === "rating_desc") {
    const ratings = await getProductRatingSummaries(candidateIds);
    rankedIds = candidates
      .map((c) => ({ ...c, rating: ratings.get(c.id)! }))
      .filter((c) => c.rating.averageRating !== null && c.rating.averageRating >= TOP_RATED_MIN_RATING)
      .filter((c) => c.rating.reviewCount >= TOP_RATED_MIN_REVIEWS)
      .sort(
        (a, b) =>
          b.rating.averageRating! - a.rating.averageRating! ||
          b.rating.reviewCount - a.rating.reviewCount ||
          b.createdAt.getTime() - a.createdAt.getTime()
      )
      .map((c) => c.id);
  } else {
    const volumes = await getRecentOrderVolumeByProduct(candidateIds);
    rankedIds = candidates
      .map((c) => ({ ...c, volume: volumes.get(c.id) ?? 0 }))
      .filter((c) => c.volume > 0)
      .sort((a, b) => b.volume - a.volume || b.createdAt.getTime() - a.createdAt.getTime())
      .map((c) => c.id);
  }

  const total = rankedIds.length;
  const { skip, take } = toSkipTake(params);
  const pageIds = rankedIds.slice(skip, skip + take);

  const rows = await prisma.product.findMany({ where: { id: { in: pageIds } }, select: publicProductSelect });
  const rowsById = new Map(rows.map((r) => [r.id, r]));
  const products = pageIds.map((id) => rowsById.get(id)!);

  return { products, total };
}

export async function listPublicProducts(params: ListPublicProductsParams) {
  const where = buildPublicProductWhere(params);

  let products: PublicProductRow[];
  let total: number;

  if (params.sort === "rating_desc" || params.sort === "best_selling") {
    ({ products, total } = await listPublicProductsByComputedSort(params, where, params.sort));
  } else {
    [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: resolveOrderBy(params.sort),
        ...toSkipTake(params),
        select: publicProductSelect,
      }),
      prisma.product.count({ where }),
    ]);
  }

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

// Phase 11 analytics: the only writer of ProductView (the model has existed
// since Phase 1). One row per page visit — the frontend calls this once on
// product-page mount, separately from the data-fetching query, so React
// Query refetches (refocus, retries) never inflate the count. userId and
// visitorId are mutually exclusive per row (see the model's own comment):
// a logged-in view always records userId, never visitorId, even if the
// client happened to send one.
export async function recordProductView(slug: string, viewerId: string | undefined, input: RecordProductViewInput) {
  const product = await prisma.product.findFirst({
    where: { slug, status: "APPROVED", store: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!product) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");

  await prisma.productView.create({
    data: {
      productId: product.id,
      userId: viewerId ?? null,
      visitorId: viewerId ? null : input.visitorId ?? null,
    },
  });
}
