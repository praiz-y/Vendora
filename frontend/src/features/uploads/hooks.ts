"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadsApi, type UploadFolder } from "./api";

export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: UploadFolder }) => {
      const signature = await uploadsApi.sign(folder);
      return uploadsApi.uploadToCloudinary(file, signature);
    },
  });
}
