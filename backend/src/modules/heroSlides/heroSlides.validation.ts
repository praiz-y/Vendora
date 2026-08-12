import { z } from "zod";
import { httpUrlSchema } from "../../utils/validation";

// ctaUrl is deliberately NOT run through httpUrlSchema — Part 3 of the
// overhaul plan calls this out explicitly as a freeform field (an admin
// might link to an internal path like /products?categorySlug=electronics,
// not just an external http(s) resource), accepting the trade-off that a
// typo can produce a dead link.
export const updateHeroSlideSchema = z.object({
  imageUrl: httpUrlSchema,
  headline: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1).max(300),
  ctaLabel: z.string().trim().min(1).max(40),
  ctaUrl: z.string().trim().min(1).max(500),
  enabled: z.boolean(),
});
export type UpdateHeroSlideInput = z.infer<typeof updateHeroSlideSchema>;
