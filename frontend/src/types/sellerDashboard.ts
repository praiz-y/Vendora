import type { ProductStatus } from "./product";
import type { SellerOrderStatus } from "./order";

export interface SellerOverview {
  products: { total: number; byStatus: Partial<Record<ProductStatus, number>> };
  orders: { total: number; byStatus: Partial<Record<SellerOrderStatus, number>> };
  totalRevenue: string;
  rating: { averageRating: number | null; reviewedProductCount: number };
  recentOrders: {
    id: string;
    status: SellerOrderStatus;
    total: string;
    createdAt: string;
    order: { placedAt: string; buyer: { firstName: string; lastName: string } };
  }[];
}

export interface SellerAnalyticsProductEntry {
  productId: string;
  name: string;
  slug: string;
  views: number;
  unitsSold: number;
  revenue: string;
}

export interface SellerRevenueTrendPoint {
  date: string;
  revenue: string;
}

export interface SellerAnalytics {
  totals: { views: number; unitsSold: number; revenue: string };
  perProduct: SellerAnalyticsProductEntry[];
  // 30 daily buckets, oldest first, every day present even at zero revenue.
  revenueTrend: SellerRevenueTrendPoint[];
}
