import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

// A SellerOrder exists as soon as checkout builds the order graph, before
// payment succeeds (Phase 7) — same reasoning as sellerDashboard's revenue
// filter (Phase 11): only count SellerOrders whose parent Order actually
// got paid.
const PAID_ORDER_STATUS_FILTER = {
  notIn: ["PENDING_PAYMENT", "CANCELLED"] as OrderStatus[],
};

// Ties together everything built incrementally onto the Phase 3 admin
// shell — one stat per screen that already exists by Phase 14, plus the
// platform-wide totals nothing else surfaces yet.
export async function getOverview() {
  const [
    totalUsers,
    suspendedUsers,
    activeStores,
    approvedProducts,
    pendingApplications,
    pendingProducts,
    pendingReports,
    pendingRefunds,
    totalOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "APPROVED" } }),
    prisma.sellerApplication.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.productReport.count({ where: { status: "PENDING" } }),
    prisma.refund.count({ where: { status: "REQUESTED" } }),
    prisma.order.count({ where: { status: PAID_ORDER_STATUS_FILTER } }),
  ]);

  const revenueAgg = await prisma.sellerOrder.aggregate({
    where: { order: { status: PAID_ORDER_STATUS_FILTER } },
    _sum: { total: true },
  });

  return {
    users: { total: totalUsers, suspended: suspendedUsers },
    stores: { active: activeStores },
    products: { approved: approvedProducts },
    orders: { total: totalOrders },
    totalRevenue: revenueAgg._sum.total ?? new Prisma.Decimal(0),
    pendingActions: {
      sellerApplications: pendingApplications,
      products: pendingProducts,
      productReports: pendingReports,
      refunds: pendingRefunds,
    },
  };
}
