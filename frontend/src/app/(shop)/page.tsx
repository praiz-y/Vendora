"use client";

import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedStoresRow } from "@/components/home/FeaturedStoresRow";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { ProductRow } from "@/components/home/ProductRow";
import { WhyShopSection } from "@/components/home/WhyShopSection";
import { Button } from "@/components/ui/Button";
import { useMarketplaceProducts } from "@/features/marketplace/hooks";
import { useQueryClient } from "@tanstack/react-query";

const ROW_LIMIT = 12;

// Section order (Part 3) — same on mobile, nothing hidden/reordered:
// Hero -> Category -> Trending -> Featured Stores -> New Arrivals ->
// Why Shop on Vendora -> Digital Products -> Top Rated -> Footer (Footer
// itself lives in (shop)/layout.tsx, rendered site-wide, not just here).
export default function HomePage() {
  const trending = useMarketplaceProducts({ sort: "best_selling", limit: ROW_LIMIT });
  const newArrivals = useMarketplaceProducts({ sort: "newest", limit: ROW_LIMIT });
  const digitalProducts = useMarketplaceProducts({ sort: "best_selling", type: "DIGITAL", limit: ROW_LIMIT });
  const topRated = useMarketplaceProducts({ sort: "rating_desc", limit: ROW_LIMIT });
  const queryClient = useQueryClient();

  // Every row hides itself when it has nothing to show, so if the API stays
  // unreachable past QueryProvider's retries the page would otherwise just
  // look empty. Say so, and offer a retry.
  const rows = [trending, newArrivals, digitalProducts, topRated];
  const apiUnavailable = rows.every((row) => row.isError);
  const retrying = rows.some((row) => row.isFetching);

  return (
    <div className="flex flex-col gap-12 pb-12">
      <HeroCarousel />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        {apiUnavailable && (
          <section className="mx-4 flex flex-col items-center gap-3 rounded-md border border-border bg-surface-alt px-6 py-10 text-center sm:mx-0">
            <h2 className="text-lg font-semibold text-heading">Products are taking a while to load</h2>
            <p className="max-w-md text-sm text-muted">
              The demo server may still be starting up. It usually takes under a minute.
            </p>
            <Button loading={retrying} onClick={() => queryClient.refetchQueries({ type: "active" })}>
              Try again
            </Button>
          </section>
        )}

        <CategoryGrid />

        <ProductRow
          title="Trending Products"
          products={trending.data?.products}
          isLoading={trending.isLoading}
          viewAllHref="/products?sort=best_selling"
        />

        <FeaturedStoresRow />

        <ProductRow
          title="New Arrivals"
          products={newArrivals.data?.products}
          isLoading={newArrivals.isLoading}
          viewAllHref="/products?sort=newest"
        />

        <WhyShopSection />

        <ProductRow
          title="Digital Products"
          products={digitalProducts.data?.products}
          isLoading={digitalProducts.isLoading}
          viewAllHref="/products?type=DIGITAL&sort=best_selling"
        />

        <ProductRow
          title="Top Rated"
          products={topRated.data?.products}
          isLoading={topRated.isLoading}
          viewAllHref="/products?sort=rating_desc"
        />
      </div>
    </div>
  );
}
