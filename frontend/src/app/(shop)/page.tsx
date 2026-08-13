"use client";

import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedStoresRow } from "@/components/home/FeaturedStoresRow";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { ProductRow } from "@/components/home/ProductRow";
import { WhyShopSection } from "@/components/home/WhyShopSection";
import { useMarketplaceProducts } from "@/features/marketplace/hooks";

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

  return (
    <div className="flex flex-col gap-12 pb-12">
      <HeroCarousel />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
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
