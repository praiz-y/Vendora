"use client";

import Link from "next/link";
import { useFeaturedStores } from "@/features/marketplace/hooks";
import type { PublicStore } from "@/types/product";

function StoreCard({ store }: { store: PublicStore }) {
  return (
    <Link
      href={`/stores/${store.slug}`}
      className="flex w-56 shrink-0 snap-start flex-col overflow-hidden rounded-md border border-border bg-surface hover:border-border-strong"
    >
      <div className="relative flex h-24 items-center justify-center bg-surface-alt">
        {store.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.bannerUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute -bottom-6 left-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface-alt">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-light">{store.name.charAt(0)}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 p-3 pt-8">
        <p className="text-sm font-medium text-heading">{store.name}</p>
        <p className="text-xs text-muted">{store.businessCategory}</p>
        {store.rating.averageRating !== null && (
          <p className="text-xs text-muted">★ {store.rating.averageRating.toFixed(1)}</p>
        )}
      </div>
    </Link>
  );
}

// Same horizontal-scroll shell as ProductRow, but no "view all" tile —
// unlike the five product rows, there's no /stores browse page in this app
// to link to (marketplace.routes.ts only ever exposed per-store lookups),
// and building one is well outside this phase's scope.
export function FeaturedStoresRow() {
  const { data: stores, isLoading } = useFeaturedStores(12);

  if (!isLoading && (!stores || stores.length === 0)) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="px-4 text-lg font-semibold text-heading sm:px-0">Featured Stores</h2>
      <div className="flex snap-x snap-proximity gap-4 overflow-x-auto px-4 pb-2 sm:px-0">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 w-56 shrink-0 animate-pulse rounded-md bg-surface-alt" />
            ))
          : stores!.map((store) => <StoreCard key={store.id} store={store} />)}
      </div>
    </section>
  );
}
