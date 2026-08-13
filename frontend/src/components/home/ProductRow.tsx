import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ProductCard } from "@/components/marketplace/ProductCard";
import type { PublicProduct } from "@/types/product";

interface ProductRowProps {
  title: string;
  products: PublicProduct[] | undefined;
  isLoading: boolean;
  viewAllHref: string;
}

// Shared shell for all five homepage product rows (Trending, Featured
// Stores reuses its own StoreRow instead, Featured Stores excluded — see
// FeaturedStoresRow). Hides entirely once loaded with zero qualifying
// items (not just "under 8-12") — several of these rows will be thin on
// data at launch for a new marketplace.
export function ProductRow({ title, products, isLoading, viewAllHref }: ProductRowProps) {
  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="px-4 text-lg font-semibold text-heading sm:px-0">{title}</h2>

      <div className="flex snap-x snap-proximity gap-4 overflow-x-auto px-4 pb-2 sm:px-0">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-40 shrink-0 animate-pulse rounded-md bg-surface-alt sm:w-48" />
            ))
          : products!.map((product) => (
              <div key={product.id} className="w-40 shrink-0 snap-start sm:w-48">
                <ProductCard product={product} />
              </div>
            ))}
        {!isLoading && (
          <Link
            href={viewAllHref}
            className="flex w-40 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-md border border-border text-sm font-medium text-muted hover:border-border-strong hover:text-heading sm:w-48"
          >
            <ArrowRightIcon className="h-6 w-6" />
            View all
          </Link>
        )}
      </div>
    </section>
  );
}
