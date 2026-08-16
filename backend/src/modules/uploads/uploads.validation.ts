import { z } from "zod";

export const UPLOAD_FOLDERS = ["stores", "products", "seller-applications", "hero-slides"] as const;

export const signUploadSchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS),
});
export type SignUploadInput = z.infer<typeof signUploadSchema>;
