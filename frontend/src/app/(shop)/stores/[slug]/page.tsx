import type { Metadata } from "next";
import { env } from "@/config/env";
import { jsonLdScriptProps } from "@/lib/jsonLd";
import type { PublicStore } from "@/types/product";
import { StoreDetailClient } from "./StoreDetailClient";

// See products/[slug]/page.tsx for why this is a plain server-side fetch
// rather than the client apiClient.
async function fetchStore(slug: string): Promise<PublicStore | null> {
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/marketplace/stores/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: { store: PublicStore } };
    return json.success && json.data ? json.data.store : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await fetchStore(slug);
  if (!store) return { title: "Store Not Found" };

  const description = store.description.slice(0, 160);

  return {
    title: store.name,
    description,
    alternates: { canonical: `/stores/${store.slug}` },
    openGraph: {
      title: store.name,
      description,
      type: "website",
      url: `/stores/${store.slug}`,
      images: store.logoUrl ? [{ url: store.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: store.name,
      description,
      images: store.logoUrl ? [store.logoUrl] : undefined,
    },
  };
}

export default async function StoreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await fetchStore(slug);

  return (
    <>
      {store && (
        <script
          {...jsonLdScriptProps({
            "@context": "https://schema.org",
            "@type": "Store",
            name: store.name,
            description: store.description,
            image: store.logoUrl ?? undefined,
            url: `${env.siteUrl}/stores/${store.slug}`,
            ...(store.rating.averageRating !== null
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: store.rating.averageRating,
                    reviewCount: store.rating.reviewedProductCount,
                  },
                }
              : {}),
          })}
        />
      )}
      <StoreDetailClient slug={slug} />
    </>
  );
}
