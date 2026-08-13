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

// Rolling 30-day window — same choice as marketplace.service.ts's Trending/
// best_selling ranking, for the same reason (not all-time, so a chart never
// grows without bound; not 7 days, too volatile at this project's scale).
const REVENUE_TREND_WINDOW_DAYS = 30;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Daily revenue buckets for the Analytics tab's trend chart (Overhaul
// Phase 9) — every day in the window is present in the result, even ones
// with zero revenue, so the chart always has a full, evenly-spaced x-axis
// instead of gaps on quiet days.
async function getRevenueTrend(storeId: string, days = REVENUE_TREND_WINDOW_DAYS) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const items = await prisma.orderItem.findMany({
    where: { sellerOrder: { storeId, order: { status: PAID_ORDER_STATUS_FILTER, placedAt: { gte: since } } } },
    select: { quantity: true, priceSnapshot: true, sellerOrder: { select: { order: { select: { placedAt: true } } } } },
  });

  const revenueByDay = new Map<string, Prisma.Decimal>();
  for (const item of items) {
    const key = dateKey(item.sellerOrder.order.placedAt);
    const lineTotal = item.priceSnapshot.mul(item.quantity);
    revenueByDay.set(key, (revenueByDay.get(key) ?? new Prisma.Decimal(0)).add(lineTotal));
  }

  const trend: { date: string; revenue: Prisma.Decimal }[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = dateKey(d);
    trend.push({ date: key, revenue: revenueByDay.get(key) ?? new Prisma.Decimal(0) });
  }
  return trend;
}

export async function getAnalytics(storeId: string) {
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "desc" },
  });
  const productIds = products.map((p) => p.id);

  const [viewCounts, items, revenueTrend] = await Promise.all([
    prisma.productView.groupBy({ by: ["productId"], where: { productId: { in: productIds } }, _count: { _all: true } }),
    prisma.orderItem.findMany({
      where: { productId: { in: productIds }, sellerOrder: { order: { status: PAID_ORDER_STATUS_FILTER } } },
      select: { productId: true, quantity: true, priceSnapshot: true },
    }),
    getRevenueTrend(storeId),
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

  return { totals, perProduct, revenueTrend };
}
