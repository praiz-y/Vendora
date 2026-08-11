import { z } from "zod";
import { httpUrlSchema } from "../../utils/validation";

// Cloudinary isn't integrated yet (see .ai/project-context.md) — images are
// plain URLs for now, same pattern as Store logo/banner in Phase 3.
const productImageSchema = z.object({
  url: httpUrlSchema,
  isPrimary: z.boolean().optional(),
});
export type ProductImageInput = z.infer<typeof productImageSchema>;

// Likewise, a digital product's file is a manual reference (not a real
// upload/storage integration yet) — fileKey/fileType/fileSize describe
// whatever the seller provides, validated for shape only.
export const digitalFileSchema = z.object({
  fileKey: z.string().trim().min(1).max(500),
  fileType: z.string().trim().min(1).max(100),
  fileSize: z.coerce.number().int().positive(),
});
export type DigitalFileInput = z.infer<typeof digitalFileSchema>;

const baseProductFields = {
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(5000),
  categoryId: z.string().trim().min(1),
  price: z.coerce.number().positive(),
  images: z.array(productImageSchema).max(8).optional(),
};

const physicalProductSchema = z.object({
  type: z.literal("PHYSICAL"),
  ...baseProductFields,
  stockQuantity: z.coerce.number().int().min(0),
  shippingType: z.enum(["FREE", "FIXED"]),
  shippingFee: z.coerce.number().min(0).optional(),
});

const digitalProductSchema = z.object({
  type: z.literal("DIGITAL"),
  ...baseProductFields,
  file: digitalFileSchema,
});

// A discriminated union (not a plain object with optional fields) so a
// PHYSICAL product can't smuggle in a `file`, and a DIGITAL one can't
// smuggle in stock/shipping fields — Zod enforces the shape per type.
export const createProductSchema = z
  .discriminatedUnion("type", [physicalProductSchema, digitalProductSchema])
  .superRefine((data, ctx) => {
    if (data.type === "PHYSICAL" && data.shippingType === "FIXED" && data.shippingFee === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "shippingFee is required when shippingType is FIXED",
        path: ["shippingFee"],
      });
    }
  });
export type CreateProductInput = z.infer<typeof createProductSchema>;

// Updates don't carry `type` (immutable after creation — see
// products.service.ts) or `file` (uploading new digital versions is a
// Phase 9 concern, once entitlements/downloads exist to make versioning
// meaningful). Cross-field checks (e.g. shippingFee-required-when-FIXED,
// rejecting physical-only fields on a digital product) are done in the
// service layer against the product's existing type, not here.
export const updateProductSchema = z
  .object({
    name: baseProductFields.name.optional(),
    description: baseProductFields.description.optional(),
    categoryId: baseProductFields.categoryId.optional(),
    price: baseProductFields.price.optional(),
    images: baseProductFields.images,
    stockQuantity: z.coerce.number().int().min(0).optional(),
    shippingType: z.enum(["FREE", "FIXED"]).optional(),
    shippingFee: z.coerce.number().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const rejectProductSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});
export type RejectProductInput = z.infer<typeof rejectProductSchema>;
