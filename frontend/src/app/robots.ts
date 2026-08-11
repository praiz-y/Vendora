import type { MetadataRoute } from "next";
import { env } from "@/config/env";

// Everything genuinely public and content-bearing (/, /products,
// /products/*, /stores/*) is allowed by default — only the
// personalized/private/utility routes below are disallowed. Mirrors the
// noindex meta tags on the admin/seller/account layouts (defense in depth:
// this keeps crawlers from spending budget on these paths at all, the meta
// tag keeps an already-indexed or externally-linked page out of results
// even if it gets requested anyway).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/seller",
        "/account",
        "/cart",
        "/checkout",
        "/orders",
        "/wishlist",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/dev",
      ],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
