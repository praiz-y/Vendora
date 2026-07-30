import { apiClient } from "@/lib/api/client";
import type { Category } from "@/types/product";

export const categoriesApi = {
  listActive: () => apiClient.get<{ categories: Category[] }>("/api/v1/categories"),
};
