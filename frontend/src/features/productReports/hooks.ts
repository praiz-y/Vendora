"use client";

import { useMutation } from "@tanstack/react-query";
import { productReportsApi, type CreateProductReportInput } from "./api";

export function useSubmitProductReport() {
  return useMutation({
    mutationFn: (input: CreateProductReportInput) => productReportsApi.create(input),
  });
}
