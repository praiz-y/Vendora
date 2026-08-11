import type { Metadata } from "next";
import { env } from "@/config/env";
import { jsonLdScriptProps } from "@/lib/jsonLd";
import type { PublicProduct } from "@/types/product";
import { ProductDetailClient } from "./ProductDetailClient";

// Plain server-side fetch to the public marketplace endpoint — deliberately
// not the client apiClient (which depends on browser-only auth/session
// state that has no meaning during metadata generation or JSON-LD
// rendering). Next.js dedupes identical fetch() calls made during the same
// render pass, so generateMetadata and the page component below each
// calling this again is one network round trip, not two.
async function fetchProduct(slug: string): Promise<PublicProduct | null> {
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/marketplace/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: { product: PublicProduct } };
    return json.success && json.data ? json.data.product : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) return { title: "Product Not Found" };

  const description = product.description.slice(0, 160);
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      url: `/products/${product.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  return (
    <>
      {product && (
        <script
          {...jsonLdScriptProps({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            image: product.images.map((image) => image.url),
            sku: product.id,
            category: product.category.name,
            offers: {
              "@type": "Offer",
              url: `${env.siteUrl}/products/${product.slug}`,
              priceCurrency: "NGN",
              price: product.price,
              availability:
                product.type === "DIGITAL" || product.stockQuantity === null || product.stockQuantity > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              seller: { "@type": "Organization", name: product.store.name },
            },
            ...(product.rating.reviewCount > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: product.rating.averageRating,
                    reviewCount: product.rating.reviewCount,
                  },
                }
              : {}),
          })}
        />
      )}
      <ProductDetailClient slug={slug} />
    </>
  );
}
