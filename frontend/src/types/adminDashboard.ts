export interface AdminOverview {
  users: { total: number; suspended: number };
  stores: { active: number };
  products: { approved: number };
  orders: { total: number };
  totalRevenue: string;
  pendingActions: {
    sellerApplications: number;
    products: number;
    productReports: number;
    refunds: number;
  };
}
