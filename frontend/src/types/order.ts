import type { Address } from "./user";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PARTIALLY_PROCESSING"
  | "PARTIALLY_SHIPPED"
  | "PARTIALLY_DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type SellerOrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";
export type PaymentAttemptStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export interface OrderItem {
  id: string;
  sellerOrderId: string;
  productId: string;
  productNameSnapshot: string;
  priceSnapshot: string;
  quantity: number;
  productTypeSnapshot: "PHYSICAL" | "DIGITAL";
  shippingFeeSnapshot: string | null;
  storeNameSnapshot: string;
  createdAt: string;
}

export interface SellerOrder {
  id: string;
  orderId: string;
  storeId: string;
  status: SellerOrderStatus;
  subtotal: string;
  shippingFee: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  store: { id: string; name: string; slug: string };
  items: OrderItem[];
}

export interface SellerOrderWithBuyer extends SellerOrder {
  order: {
    id: string;
    buyerId: string;
    placedAt: string;
    status: OrderStatus;
    buyer: { id: string; firstName: string; lastName: string; username: string };
  };
}

export interface PaymentAttempt {
  id: string;
  paymentId: string;
  provider: string;
  providerReference: string | null;
  amount: string;
  status: PaymentAttemptStatus;
  attemptedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerReference: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  paidAt: string | null;
  attempts: PaymentAttempt[];
}

export interface Order {
  id: string;
  buyerId: string;
  status: OrderStatus;
  totalAmount: string;
  currency: string;
  shippingAddressId: string | null;
  placedAt: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress: Address | null;
  payment: Payment;
  sellerOrders: SellerOrder[];
}
