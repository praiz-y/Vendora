"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { toast } from "@/stores/toastStore";
import {
  adminCategoriesApi,
  type AdminCategoriesListParams,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "./api";

const LIST_KEY = ["admin", "categories"];

export function useAdminCategories(params: AdminCategoriesListParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => adminCategoriesApi.list(params),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => adminCategoriesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Category created.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) => adminCategoriesApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Category updated.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminCategoriesApi.archive(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Category archived.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useActivateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCategoriesApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Category activated.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
