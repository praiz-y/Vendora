import { Prisma, type OrderStatus, type ProductStatus, type SellerOrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { getStoreRatingSummary } from "../reviews/reviews.service";

// A SellerOrder exists as soon as checkout creates the order graph — even
// before payment succeeds (Phase 7) — so "revenue"/"sales" must only count
// SellerOrders whose parent Order actually got paid, not every SellerOrder
// row that exists.
const PAID_ORDER_STATUS_FILTER = {
  notIn: ["PENDING_PAYMENT", "CANCELLED"] as OrderStatus[],
};

export async function getOverview(storeId: string) {
  const [productCounts, sellerOrderCounts, revenueAgg, rating, recentSellerOrders] = await Promise.all([
    prisma.product.groupBy({ by: ["status"], where: { storeId }, _count: { _all: true } }),
    prisma.sellerOrder.groupBy({ by: ["status"], where: { storeId }, _count: { _all: true } }),
    prisma.sellerOrder.aggregate({
      where: { storeId, order: { status: PAID_ORDER_STATUS_FILTER } },
      _sum: { total: true },
    }),
    getStoreRatingSummary(storeId),
    prisma.sellerOrder.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        order: { select: { placedAt: true, buyer: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  return {
    products: {
      total: productCounts.reduce((sum, p) => sum + p._count._all, 0),
      byStatus: Object.fromEntries(productCounts.map((p) => [p.status, p._count._all])) as Partial<
        Record<ProductStatus, number>
      >,
    },
    orders: {
      total: sellerOrderCounts.reduce((sum, o) => sum + o._count._all, 0),
      byStatus: Object.fromEntries(sellerOrderCounts.map((o) => [o.status, o._count._all])) as Partial<
        Record<SellerOrderStatus, number>
      >,
    },
    totalRevenue: revenueAgg._sum.total ?? new Prisma.Decimal(0),
    rating,
    recentOrders: recentSellerOrders,
  };
}

export async function getAnalytics(storeId: string) {
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "desc" },
  });
  const productIds = products.map((p) => p.id);

  const [viewCounts, items] = await Promise.all([
    prisma.productView.groupBy({ by: ["productId"], where: { productId: { in: productIds } }, _count: { _all: true } }),
    prisma.orderItem.findMany({
      where: { productId: { in: productIds }, sellerOrder: { order: { status: PAID_ORDER_STATUS_FILTER } } },
      select: { productId: true, quantity: true, priceSnapshot: true },
    }),
  ]);

  const viewsByProduct = new Map(viewCounts.map((v) => [v.productId, v._count._all]));

  // Prisma's groupBy _sum can total one column, not a product of two
  // (quantity * priceSnapshot) — reducing the raw rows in JS is simplest
  // and entirely reasonable at this project's scale.
  const salesByProduct = new Map<string, { unitsSold: number; revenue: Prisma.Decimal }>();
  for (const item of items) {
    const existing = salesByProduct.get(item.productId) ?? { unitsSold: 0, revenue: new Prisma.Decimal(0) };
    existing.unitsSold += item.quantity;
    existing.revenue = existing.revenue.add(item.priceSnapshot.mul(item.quantity));
    salesByProduct.set(item.productId, existing);
  }

  const perProduct = products.map((product) => {
    const sales = salesByProduct.get(product.id) ?? { unitsSold: 0, revenue: new Prisma.Decimal(0) };
    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      views: viewsByProduct.get(product.id) ?? 0,
      unitsSold: sales.unitsSold,
      revenue: sales.revenue,
    };
  });

  const totals = perProduct.reduce(
    (acc, p) => ({
      views: acc.views + p.views,
      unitsSold: acc.unitsSold + p.unitsSold,
      revenue: acc.revenue.add(p.revenue),
    }),
    { views: 0, unitsSold: 0, revenue: new Prisma.Decimal(0) }
  );

  return { totals, perProduct };
}
