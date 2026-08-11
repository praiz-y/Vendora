"use client";

import { ProductCard } from "@/components/marketplace/ProductCard";
import { FormMessage } from "@/components/ui/FormMessage";
import { useMarketplaceProducts, useMarketplaceStore } from "@/features/marketplace/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

export function StoreDetailClient({ slug }: { slug: string }) {
  const { data: store, isLoading, isError, error } = useMarketplaceStore(slug);
  const { data: products } = useMarketplaceProducts({ storeSlug: slug, limit: 24 });

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-foreground/60">Loading…</div>;
  if (isError || !store) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <FormMessage type="error">{getErrorMessage(error) || "Store not found."}</FormMessage>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {store.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.bannerUrl} alt="" className="h-40 w-full object-cover sm:h-56" />
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center gap-4">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt={store.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/10 text-lg font-semibold dark:bg-white/10">
              {store.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold">{store.name}</h1>
            <p className="text-sm text-foreground/60">
              {store.businessCategory} · {store.location}
            </p>
            {store.rating.averageRating !== null && (
              <p className="text-sm text-foreground/70">
                ★ {store.rating.averageRating.toFixed(1)} · {store.rating.reviewedProductCount} product
                {store.rating.reviewedProductCount === 1 ? "" : "s"} reviewed
              </p>
            )}
          </div>
        </div>

        <p className="max-w-2xl text-sm text-foreground/70">{store.description}</p>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products?.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {products?.products.length === 0 && (
            <p className="text-sm text-foreground/60">This store hasn&apos;t published any products yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
