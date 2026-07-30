import { apiClient } from "@/lib/api/client";
import type { Cart } from "@/types/cart";

export const cartApi = {
  get: () => apiClient.get<{ cart: Cart }>("/api/v1/cart"),
  addItem: (productId: string, quantity = 1) =>
    apiClient.post<{ cart: Cart }>("/api/v1/cart/items", { productId, quantity }),
  updateItem: (id: string, quantity: number) =>
    apiClient.patch<{ cart: Cart }>(`/api/v1/cart/items/${id}`, { quantity }),
  removeItem: (id: string) => apiClient.delete<{ cart: Cart }>(`/api/v1/cart/items/${id}`),
};
