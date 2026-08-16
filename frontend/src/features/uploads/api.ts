import { apiClient } from "@/lib/api/client";

export type UploadFolder = "stores" | "products" | "seller-applications" | "hero-slides";

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
}

interface CloudinaryErrorResponse {
  error?: { message?: string };
}

export const uploadsApi = {
  sign: (folder: UploadFolder) => apiClient.post<UploadSignature>("/api/v1/uploads/sign", { folder }),

  async uploadToCloudinary(file: File, signature: UploadSignature): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.apiKey);
    formData.append("timestamp", String(signature.timestamp));
    formData.append("signature", signature.signature);
    formData.append("folder", signature.folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const json = (await response.json().catch(() => null)) as (CloudinaryUploadResponse & CloudinaryErrorResponse) | null;

    if (!response.ok || !json?.secure_url) {
      throw new Error(json?.error?.message ?? "Image upload failed. Please try again.");
    }

    return json.secure_url;
  },
};
