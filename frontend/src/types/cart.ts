import type { ProductType, ShippingType } from "./product";

export type AvailabilityIssue = "PRODUCT_UNAVAILABLE" | "STORE_UNAVAILABLE" | "INSUFFICIENT_STOCK" | "OUT_OF_STOCK";

interface CartWishlistProductSnapshot {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  status: string;
  price: string;
  stockQuantity: number | null;
  images: { url: string }[];
  store: { id: string; name: string; slug: string; status: string };
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  isAvailable: boolean;
  issue?: AvailabilityIssue;
  product: CartWishlistProductSnapshot & { shippingType: ShippingType | null; shippingFee: string | null };
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  isAvailable: boolean;
  issue?: AvailabilityIssue;
  product: CartWishlistProductSnapshot;
}
