export type RefundStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED";

export interface Refund {
  id: string;
  sellerOrderId: string | null;
  amount: string;
  reason: string;
  status: RefundStatus;
  requestedById: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  providerRefundReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefundWithSellerOrder extends Refund {
  sellerOrder: { id: string; orderId: string; total: string; store: { id: string; name: string } };
}

export interface AdminRefund extends RefundWithSellerOrder {
  requestedBy: { id: string; firstName: string; lastName: string; email: string };
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
}
