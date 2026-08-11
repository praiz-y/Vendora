export type NotificationType =
  | "SELLER_APPLICATION_APPROVED"
  | "SELLER_APPLICATION_REJECTED"
  | "PRODUCT_APPROVED"
  | "PRODUCT_REJECTED"
  | "ORDER_PLACED"
  | "PAYMENT_SUCCESS"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "REFUND_UPDATE"
  | "NEW_REVIEW"
  | "GENERIC";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}
