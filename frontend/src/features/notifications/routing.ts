import type { Notification } from "@/types/notification";

// Maps a notification's own `type` (not just relatedEntityType) to the
// route it should open on click. `type` is what actually disambiguates who
// receives it: ORDER_PLACED and ORDER_SHIPPED/DELIVERED both carry
// relatedEntityType "SellerOrder", but the former goes to the seller (whose
// detail page really is keyed by that SellerOrder id) and the latter goes to
// the buyer (whose order detail page is keyed by the parent Order id, which
// isn't derivable from a SellerOrder id without an extra lookup) — so those
// two fall back to the buyer's order list instead of guessing a detail URL.
export function resolveNotificationHref(notification: Notification): string | null {
  const id = notification.relatedEntityId;

  switch (notification.type) {
    case "PAYMENT_SUCCESS":
      return id ? `/orders/${id}` : "/orders";
    case "ORDER_SHIPPED":
    case "ORDER_DELIVERED":
    case "REFUND_UPDATE":
      return "/orders";
    case "ORDER_PLACED":
      return id ? `/seller/orders/${id}` : "/seller/orders";
    case "SELLER_APPLICATION_APPROVED":
      return "/seller";
    case "SELLER_APPLICATION_REJECTED":
      return "/account/selling";
    case "PRODUCT_APPROVED":
    case "PRODUCT_REJECTED":
      return id ? `/seller/products/${id}` : "/seller/products";
    case "NEW_REVIEW":
      return "/seller/reviews";
    case "GENERIC":
    default:
      return null;
  }
}
