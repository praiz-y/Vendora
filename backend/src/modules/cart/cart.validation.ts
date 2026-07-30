import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive().default(1),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive(),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
