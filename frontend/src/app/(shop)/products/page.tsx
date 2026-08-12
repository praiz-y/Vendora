"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
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

  // Every filter is read straight from the URL every render, never copied
  // into local state — this is also what fixes the page-reset bug: there is
  // no local `page` state to go stale when `search` changes via the header,
  // since `page` itself comes from the URL too.
  const search = searchParams.get("search") ?? undefined;
  const categorySlug = searchParams.get("categorySlug") ?? undefined;
  const type = (searchParams.get("type") as ListMarketplaceProductsParams["type"]) ?? undefined;
  const sort = (searchParams.get("sort") as ListMarketplaceProductsParams["sort"]) ?? undefined;
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isLoading, isError, error } = useMarketplaceProducts({
    search,
    categorySlug,
    type,
    sort,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    page,
    limit: PAGE_SIZE,
  });

  // Any filter change writes straight to the URL (replace, not push — a
  // filter row shouldn't fill up browser history one keystroke at a time)
  // and always resets back to page 1, since the previous page number is
  // almost never still valid against a new filter's result set.
  function updateFilter(key: string, value: string | undefined) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(next.toString() ? `/products?${next.toString()}` : "/products");
  }

  function goToPage(newPage: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (newPage > 1) next.set("page", String(newPage));
    else next.delete("page");
    router.replace(next.toString() ? `/products?${next.toString()}` : "/products");
  }

  function clearFilters() {
    setMobileFiltersOpen(false);
    router.replace("/products");
  }

  // Rendered twice (desktop row + mobile sheet, one always CSS-hidden rather
  // than unmounted) — idPrefix keeps every field's DOM id unique between the
  // two copies so each <label htmlFor> only ever associates with its own
  // instance, not the other one.
  function renderFilterControls(idPrefix: string) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label="Category"
          name="categorySlug"
          id={`${idPrefix}-categorySlug`}
          value={categorySlug ?? ""}
          onChange={(e) => updateFilter("categorySlug", e.target.value || undefined)}
        >
          <option value="">All categories</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          label="Type"
          name="type"
          id={`${idPrefix}-type`}
          value={type ?? ""}
          onChange={(e) => updateFilter("type", e.target.value || undefined)}
        >
          <option value="">All types</option>
          <option value="PHYSICAL">Physical</option>
          <option value="DIGITAL">Digital</option>
        </Select>
        <TextField
          label="Min price (₦)"
          name="minPrice"
          id={`${idPrefix}-minPrice`}
          type="number"
          min="0"
          value={minPrice}
          onChange={(e) => updateFilter("minPrice", e.target.value || undefined)}
        />
        <TextField
          label="Max price (₦)"
          name="maxPrice"
          id={`${idPrefix}-maxPrice`}
          type="number"
          min="0"
          value={maxPrice}
          onChange={(e) => updateFilter("maxPrice", e.target.value || undefined)}
        />
        <Select
          label="Sort by"
          name="sort"
          id={`${idPrefix}-sort`}
          value={sort ?? "newest"}
          onChange={(e) => updateFilter("sort", e.target.value)}
          className="col-span-2 sm:col-span-1"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-heading">{search ? `Results for "${search}"` : "Browse Products"}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" className="md:hidden" onClick={() => setMobileFiltersOpen(true)}>
            Filters
          </Button>
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>

      <div className="hidden md:block">{renderFilterControls("desktop")}</div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <button aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)} className="absolute inset-0 bg-heading/40" />
          <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 pb-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-heading">Filters</span>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close" className="text-muted">
                ✕
              </button>
            </div>
            {renderFilterControls("mobile")}
            <Button className="mt-4 w-full" onClick={() => setMobileFiltersOpen(false)}>
              Show results
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {data?.products.length === 0 && <p className="text-sm text-muted">No products match your filters.</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {data?.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
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
  );
}
