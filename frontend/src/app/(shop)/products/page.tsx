"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { SearchIcon } from "@/components/icons";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useActiveCategories } from "@/features/categories/hooks";
import type { ListMarketplaceProductsParams } from "@/features/marketplace/api";
import { useMarketplaceProducts } from "@/features/marketplace/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

const PAGE_SIZE = 20;

const SORT_OPTIONS: { value: NonNullable<ListMarketplaceProductsParams["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating_desc", label: "Top Rated" },
  { value: "best_selling", label: "Best Selling" },
];

const TYPE_OPTIONS: { value: ListMarketplaceProductsParams["type"] | undefined; label: string }[] = [
  { value: undefined, label: "All types" },
  { value: "PHYSICAL", label: "Physical" },
  { value: "DIGITAL", label: "Digital" },
];

const PRICE_RANGES: { label: string; minPrice?: number; maxPrice?: number }[] = [
  { label: "Under ₦5,000", maxPrice: 5000 },
  { label: "₦5,000 – ₦15,000", minPrice: 5000, maxPrice: 15000 },
  { label: "₦15,000 – ₦30,000", minPrice: 15000, maxPrice: 30000 },
  { label: "₦30,000 & above", minPrice: 30000 },
];

const RATING_TIERS = [4, 3, 2, 1];

// useSearchParams() opts a page out of static prerendering unless wrapped in
// Suspense — this boundary is what the build needs, not a real loading state
// (the fallback is only ever visible for a frame during client navigation).
export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">Loading…</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: categories } = useActiveCategories();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const search = searchParams.get("search") ?? undefined;
  const [searchInput, setSearchInput] = useState(search ?? "");
  const categorySlug = searchParams.get("categorySlug") ?? undefined;
  const type = (searchParams.get("type") as ListMarketplaceProductsParams["type"]) ?? undefined;
  const sort = (searchParams.get("sort") as ListMarketplaceProductsParams["sort"]) ?? undefined;
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const minRating = searchParams.get("minRating") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isLoading, isError, error } = useMarketplaceProducts({
    search,
    categorySlug,
    type,
    sort,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    page,
    limit: PAGE_SIZE,
  });

  // Every filter writes straight to the URL (replace, not push) and always
  // resets back to page 1 — the previous page number is almost never still
  // valid against a new filter's result set. `undefined` in `updates`
  // clears that key rather than setting the literal string "undefined".
  function updateFilters(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    router.replace(next.toString() ? `/products?${next.toString()}` : "/products");
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() || undefined });
  }

  function goToPage(newPage: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (newPage > 1) next.set("page", String(newPage));
    else next.delete("page");
    router.replace(next.toString() ? `/products?${next.toString()}` : "/products");
  }

  function clearFilters() {
    setSearchInput("");
    setMobileFiltersOpen(false);
    router.replace("/products");
  }

  const activeFilterCount = [categorySlug, type, minPrice || maxPrice ? "price" : undefined, minRating].filter(
    Boolean
  ).length;

  // Static grouped radio lists, not dropdowns — every group here is
  // single-select because the underlying filter is (the API only accepts
  // one categorySlug/type/price-range/rating floor/sort at a time), so
  // radios are the honest input, not checkboxes. Rendered twice (desktop
  // sidebar + mobile sheet, one always CSS-hidden rather than unmounted) —
  // idPrefix keeps each group's radio `name` unique between the two
  // copies so selecting one never fights the other's selection state.
  function renderFilterGroups(idPrefix: string) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-heading">Category</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="radio"
                name={`${idPrefix}-category`}
                checked={!categorySlug}
                onChange={() => updateFilters({ categorySlug: undefined })}
                className="accent-primary"
              />
              All categories
            </label>
            {categories?.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm text-body">
                <input
                  type="radio"
                  name={`${idPrefix}-category`}
                  checked={categorySlug === category.slug}
                  onChange={() => updateFilters({ categorySlug: category.slug })}
                  className="accent-primary"
                />
                {category.name}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-heading">Type</h3>
          <div className="flex flex-col gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <label key={opt.label} className="flex items-center gap-2 text-sm text-body">
                <input
                  type="radio"
                  name={`${idPrefix}-type`}
                  checked={type === opt.value}
                  onChange={() => updateFilters({ type: opt.value })}
                  className="accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-heading">Price Range</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="radio"
                name={`${idPrefix}-price`}
                checked={!minPrice && !maxPrice}
                onChange={() => updateFilters({ minPrice: undefined, maxPrice: undefined })}
                className="accent-primary"
              />
              Any price
            </label>
            {PRICE_RANGES.map((range) => {
              const active =
                minPrice === String(range.minPrice ?? "") && maxPrice === String(range.maxPrice ?? "");
              return (
                <label key={range.label} className="flex items-center gap-2 text-sm text-body">
                  <input
                    type="radio"
                    name={`${idPrefix}-price`}
                    checked={active}
                    onChange={() =>
                      updateFilters({
                        minPrice: range.minPrice ? String(range.minPrice) : undefined,
                        maxPrice: range.maxPrice ? String(range.maxPrice) : undefined,
                      })
                    }
                    className="accent-primary"
                  />
                  {range.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-heading">Rating</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="radio"
                name={`${idPrefix}-rating`}
                checked={!minRating}
                onChange={() => updateFilters({ minRating: undefined })}
                className="accent-primary"
              />
              Any rating
            </label>
            {RATING_TIERS.map((tier) => (
              <label key={tier} className="flex items-center gap-2 text-sm text-body">
                <input
                  type="radio"
                  name={`${idPrefix}-rating`}
                  checked={minRating === String(tier)}
                  onChange={() => updateFilters({ minRating: String(tier) })}
                  className="accent-primary"
                />
                <span className="text-rating-gold">{"★".repeat(tier)}</span>
                <span className="text-light">{"☆".repeat(5 - tier)}</span>
                <span>&amp; above</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-heading">Sort By</h3>
          <div className="flex flex-col gap-2">
            {SORT_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-body">
                <input
                  type="radio"
                  name={`${idPrefix}-sort`}
                  checked={(sort ?? "newest") === opt.value}
                  onChange={() => updateFilters({ sort: opt.value })}
                  className="accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold text-heading">{search ? `Results for "${search}"` : "Browse Products"}</h1>

      <form onSubmit={handleSearchSubmit} className="mt-4 flex overflow-hidden rounded-lg border border-border bg-surface">
        <span className="flex items-center pl-4 text-muted">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products, stores, or categories…"
          className="flex-1 bg-transparent px-3 py-3 text-sm text-heading outline-none placeholder:text-light"
        />
        <button type="submit" className="bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover">
          Search
        </button>
      </form>

      <div className="mt-6 flex gap-8">
        <aside className="hidden w-56 flex-shrink-0 md:block">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-heading">Filters</h2>
            <button type="button" onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">
              Clear all
            </button>
          </div>
          {renderFilterGroups("desktop")}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="secondary" className="md:hidden" onClick={() => setMobileFiltersOpen(true)}>
              Filters &amp; Sort{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            <p className="ml-auto text-sm text-muted">{data ? `Showing ${data.meta.total} products` : ""}</p>
          </div>

          {isLoading && <p className="text-sm text-muted">Loading…</p>}
          {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
          {data?.products.length === 0 && <p className="text-sm text-muted">No products match your filters.</p>}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {data?.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {data && data.meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted">
                Page {data.meta.page} of {data.meta.totalPages}
              </span>
              <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => goToPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <button aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)} className="absolute inset-0 bg-heading/40" />
          <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 pb-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-heading">Filters &amp; Sort</span>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close" className="text-muted">
                ✕
              </button>
            </div>
            {renderFilterGroups("mobile")}
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={clearFilters}>
                Clear all
              </Button>
              <Button className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                Show results
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
