import { apiClient } from "@/lib/api/client";
import type { Cart, WishlistItem } from "@/types/cart";

export const wishlistApi = {
  get: () => apiClient.get<{ wishlist: WishlistItem[] }>("/api/v1/wishlist"),
  addItem: (productId: string) => apiClient.post<{ wishlist: WishlistItem[] }>("/api/v1/wishlist/items", { productId }),
  removeItem: (id: string) => apiClient.delete<{ wishlist: WishlistItem[] }>(`/api/v1/wishlist/items/${id}`),
  moveToCart: (id: string) => apiClient.post<{ cart: Cart }>(`/api/v1/wishlist/items/${id}/move-to-cart`),
};
