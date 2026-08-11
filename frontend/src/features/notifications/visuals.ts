import {
  BellIcon,
  CartIcon,
  CheckCircleIcon,
  RefundIcon,
  StarIcon,
  TruckIcon,
  XCircleIcon,
} from "@/components/icons";
import type { NotificationType } from "@/types/notification";

export interface NotificationVisual {
  Icon: typeof BellIcon;
  bg: string;
  fg: string;
}

// Icon + color per Part 4 of the overhaul plan: green = a positive outcome
// landed, red = a rejection, blue = a neutral order-progress update, amber =
// refund, gold = reviews (reuses the rating color), gray = fallback/generic.
export const notificationVisuals: Record<NotificationType, NotificationVisual> = {
  PAYMENT_SUCCESS: { Icon: CheckCircleIcon, bg: "bg-badge-success-bg", fg: "text-badge-success-text" },
  ORDER_DELIVERED: { Icon: CheckCircleIcon, bg: "bg-badge-success-bg", fg: "text-badge-success-text" },
  SELLER_APPLICATION_APPROVED: { Icon: CheckCircleIcon, bg: "bg-badge-success-bg", fg: "text-badge-success-text" },
  PRODUCT_APPROVED: { Icon: CheckCircleIcon, bg: "bg-badge-success-bg", fg: "text-badge-success-text" },
  SELLER_APPLICATION_REJECTED: { Icon: XCircleIcon, bg: "bg-badge-error-bg", fg: "text-badge-error-text" },
  PRODUCT_REJECTED: { Icon: XCircleIcon, bg: "bg-badge-error-bg", fg: "text-badge-error-text" },
  ORDER_PLACED: { Icon: CartIcon, bg: "bg-badge-info-bg", fg: "text-badge-info-text" },
  ORDER_SHIPPED: { Icon: TruckIcon, bg: "bg-badge-info-bg", fg: "text-badge-info-text" },
  REFUND_UPDATE: { Icon: RefundIcon, bg: "bg-badge-warning-bg", fg: "text-badge-warning-text" },
  NEW_REVIEW: { Icon: StarIcon, bg: "bg-rating-gold/15", fg: "text-rating-gold" },
  GENERIC: { Icon: BellIcon, bg: "bg-badge-neutral-bg", fg: "text-badge-neutral-text" },
};
