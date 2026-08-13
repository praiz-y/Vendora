import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { notify } from "../../utils/notifications";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../utils/pagination";
import type { CreateReviewInput } from "./reviews.validation";

const reviewInclude = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ReviewInclude;

// Overview §23: "prevent users from falsely reviewing products they have
// not purchased" — the only proof of purchase this project has is a
// delivered OrderItem, so that (not a standalone "did they ever buy this
// product" check) is the gate. One review per OrderItem, enforced by the
// schema's unique constraint (Phase 1) and surfaced here as a friendly 409
// instead of a raw P2002.
export async function createReview(userId: string, input: CreateReviewInput) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: input.orderItemId },
    include: {
      sellerOrder: { include: { order: { select: { buyerId: true } } } },
      product: { select: { name: true, store: { select: { sellerId: true } } } },
    },
  });
  if (!orderItem) throw ApiError.notFound("Order item not found.", "ORDER_ITEM_NOT_FOUND");

  // Same "don't confirm someone else's data exists" pattern as orders/addresses.
  if (orderItem.sellerOrder.order.buyerId !== userId) {
    throw ApiError.notFound("Order item not found.", "ORDER_ITEM_NOT_FOUND");
  }

  if (orderItem.sellerOrder.status !== "DELIVERED") {
    throw ApiError.conflict("You can only review an item after it has been delivered.", "ORDER_ITEM_NOT_DELIVERED");
  }

  let review;
  try {
    review = await prisma.review.create({
      data: {
        userId,
        productId: orderItem.productId,
        orderItemId: orderItem.id,
        rating: input.rating,
        comment: input.comment,
      },
      include: reviewInclude,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("This item has already been reviewed.", "ALREADY_REVIEWED");
    }
    throw error;
  }

  await notify(prisma, {
    userId: orderItem.product.store.sellerId,
    type: "NEW_REVIEW",
    title: "New review on your product",
    message: `"${orderItem.product.name}" received a new ${input.rating}-star review.`,
    relatedEntityType: "Review",
    relatedEntityId: review.id,
  });

  return review;
}

export interface ListProductReviewsParams extends PaginationParams {
  productId: string;
}

export async function listProductReviews(
  params: ListProductReviewsParams
): Promise<{ reviews: unknown[]; meta: PaginationMeta; summary: { averageRating: number | null; reviewCount: number } }> {
  const where = { productId: params.productId };

  const [reviews, total, aggregate] = await Promise.all([
    prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(params), include: reviewInclude }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
  ]);

  return {
    reviews,
    meta: buildPaginationMeta(params, total),
    summary: { averageRating: aggregate._avg.rating, reviewCount: total },
  };
}

// Seller Dashboard's Reviews tab — every review across every product in the
// seller's own store, not scoped to one product. `summary` (Overhaul Phase
// 9) is computed over the *entire* matching set, not just the current page
// — the tab's aggregate rating + star-distribution bars would otherwise be
// wrong for any store with more reviews than fit on one page.
export async function listMyStoreReviews(storeId: string, params: PaginationParams) {
  const where = { product: { storeId } };

  const [reviews, total, aggregate, grouped] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(params),
      include: { ...reviewInclude, product: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
    prisma.review.groupBy({ by: ["rating"], where, _count: { _all: true } }),
  ]);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of grouped) {
    distribution[g.rating as 1 | 2 | 3 | 4 | 5] = g._count._all;
  }

  return {
    reviews,
    meta: buildPaginationMeta(params, total),
    summary: { averageRating: aggregate._avg.rating, reviewCount: total, distribution },
  };
}

export interface ProductRatingSummary {
  averageRating: number | null;
  reviewCount: number;
}

// Bulk variant for product listings — one groupBy instead of N per-product
// aggregate queries.
export async function getProductRatingSummaries(productIds: string[]): Promise<Map<string, ProductRatingSummary>> {
  const map = new Map<string, ProductRatingSummary>(productIds.map((id) => [id, { averageRating: null, reviewCount: 0 }]));
  if (productIds.length === 0) return map;

  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const g of grouped) {
    map.set(g.productId, { averageRating: g._avg.rating, reviewCount: g._count._all });
  }
  return map;
}

export async function getProductRatingSummary(productId: string): Promise<ProductRatingSummary> {
  const map = await getProductRatingSummaries([productId]);
  return map.get(productId) ?? { averageRating: null, reviewCount: 0 };
}

export interface StoreRatingSummary {
  averageRating: number | null;
  reviewedProductCount: number;
}

// Overview §23: "Store ratings can be calculated from the average ratings
// of products associated with the seller" — an average of each reviewed
// product's own average, not a single average across every raw review
// (which would let one high-volume product dominate the store's rating).
export async function getStoreRatingSummary(storeId: string): Promise<StoreRatingSummary> {
  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { product: { storeId } },
    _avg: { rating: true },
  });

  if (grouped.length === 0) return { averageRating: null, reviewedProductCount: 0 };

  const sum = grouped.reduce((acc, g) => acc + (g._avg.rating ?? 0), 0);
  return { averageRating: Math.round((sum / grouped.length) * 10) / 10, reviewedProductCount: grouped.length };
}
