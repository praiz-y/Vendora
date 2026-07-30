"use client";

import Link from "next/link";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { FormMessage } from "@/components/ui/FormMessage";
import { useActiveCategories } from "@/features/categories/hooks";
import { useMarketplaceProducts } from "@/features/marketplace/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

export default function HomePage() {
  const { data: categories } = useActiveCategories();
  const { data, isLoading, isError, error } = useMarketplaceProducts({ sort: "newest", limit: 12 });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8">
      <section>
        <h1 className="text-2xl font-semibold">Welcome to Vendora</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Shop products from independent sellers across one marketplace, one checkout.
        </p>
      </section>

      {categories && categories.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?categorySlug=${category.slug}`}
              className="rounded-full border border-black/15 px-3 py-1.5 text-sm text-foreground/70 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              {category.name}
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Newest Products</h2>
          <Link href="/products" className="text-sm text-foreground/60 hover:underline">
            Browse all →
          </Link>
        </div>

        {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
        {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
        {data?.products.length === 0 && <p className="text-sm text-foreground/60">No products yet — check back soon.</p>}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {data?.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
