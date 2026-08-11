import type { MetadataRoute } from "next";
import { env } from "@/config/env";
import type { PublicProduct } from "@/types/product";
import type { PaginationMeta } from "@/types/store";

// Regenerate at most once an hour (ISR) rather than only at build time —
// new approved products/stores should show up in the sitemap without a
// full redeploy.
export const revalidate = 3600;

// The public marketplace list endpoint caps at 100/page (backend
// MAX_LIMIT), so a full-catalog sitemap has to page through it — there is
// no single "give me everything" call. Fine at this project's current
// catalog size; a genuinely large marketplace would want Next's
// generateSitemaps() to split this into multiple sitemap files instead of
// one growing response.
//
// Must never throw: this runs during the production build (and again on
// each ISR revalidation, see `revalidate` below), and a transient backend
// outage at that moment must degrade to "just the static routes," not
// take down the entire frontend build. A network-level failure (backend
// not reachable at all) throws before `fetch` even resolves a response,
// unlike a non-2xx status — both are handled the same way here.
async function fetchAllProducts(): Promise<PublicProduct[]> {
  const all: PublicProduct[] = [];
  let page = 1;
  let totalPages = 1;

  try {
    do {
      const res = await fetch(`${env.apiUrl}/api/v1/marketplace/products?page=${page}&limit=100`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const json = (await res.json()) as {
        success: boolean;
        data?: { products: PublicProduct[]; meta: PaginationMeta };
      };
      if (!json.success || !json.data) break;
      all.push(...json.data.products);
      totalPages = json.data.meta.totalPages;
      page += 1;
    } while (page <= totalPages);
  } catch (err) {
    console.error("sitemap: failed to fetch products, falling back to static routes only", err);
  }

  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchAllProducts();

  // Stores have no public list endpoint (marketplace only exposes
  // GET /stores/:slug — see marketplace.routes.ts) — deriving distinct,
  // currently-active store slugs from the product listing avoids adding a
  // backend endpoint that would exist only for the sitemap.
  const storeLastModified = new Map<string, Date>();
  for (const product of products) {
    const createdAt = new Date(product.createdAt);
    const existing = storeLastModified.get(product.store.slug);
    if (!existing || createdAt > existing) storeLastModified.set(product.store.slug, createdAt);
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: env.siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${env.siteUrl}/products`, changeFrequency: "daily", priority: 0.9 },
  ];

  // PublicProduct has no updatedAt (the backend's publicProductSelect
  // deliberately narrows the response — see marketplace.service.ts);
  // createdAt is the only timestamp available and stands in for
  // lastModified rather than omitting it entirely.
  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${env.siteUrl}/products/${product.slug}`,
    lastModified: new Date(product.createdAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const storeRoutes: MetadataRoute.Sitemap = Array.from(storeLastModified.entries()).map(([slug, lastModified]) => ({
    url: `${env.siteUrl}/stores/${slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...storeRoutes];
}
