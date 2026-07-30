"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  productsApi,
  type CreateProductInput,
  type ListMyProductsParams,
  type UpdateProductInput,
} from "./api";

const LIST_KEY = ["products", "me"];

export function useMyProducts(params: ListMyProductsParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => productsApi.listMine(params),
  });
}

export function useMyProduct(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => productsApi.getMine(id),
    select: (data) => data.product,
  });
}

function invalidateProductQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: LIST_KEY });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsApi.create(input),
    onSuccess: () => invalidateProductQueries(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => productsApi.updateMine(id, input),
    onSuccess: () => invalidateProductQueries(queryClient),
  });
}

export function useSubmitProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.submit(id),
    onSuccess: () => invalidateProductQueries(queryClient),
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.archive(id),
    onSuccess: () => invalidateProductQueries(queryClient),
  });
}
