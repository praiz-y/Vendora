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

// useSearchParams() opts a page out of static prerendering unless wrapped in
// Suspense — this boundary is what the build needs, not a real loading state
// (the fallback is only ever visible for a frame during client navigation).
export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-sm text-foreground/60">Loading…</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Derived straight from the URL every render (not copied into state) so
  // the header's search form — which just navigates to /products?search=… —
  // is reflected here with no effect/sync needed.
  const search = searchParams.get("search") ?? undefined;
  const { data: categories } = useActiveCategories();

  const [categorySlug, setCategorySlug] = useState<string | undefined>(searchParams.get("categorySlug") ?? undefined);
  const [type, setType] = useState<ListMarketplaceProductsParams["type"]>(
    (searchParams.get("type") as ListMarketplaceProductsParams["type"]) ?? undefined
  );
  const [sort, setSort] = useState<ListMarketplaceProductsParams["sort"]>(
    (searchParams.get("sort") as ListMarketplaceProductsParams["sort"]) ?? undefined
  );
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

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

  function clearFilters() {
    setCategorySlug(undefined);
    setType(undefined);
    setSort(undefined);
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
    router.push("/products");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold">{search ? `Results for "${search}"` : "Browse Products"}</h1>
        <Button variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label="Category"
          name="categorySlug"
          value={categorySlug ?? ""}
          onChange={(e) => {
            setCategorySlug(e.target.value || undefined);
            setPage(1);
          }}
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
          value={type ?? ""}
          onChange={(e) => {
            setType((e.target.value || undefined) as ListMarketplaceProductsParams["type"]);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="PHYSICAL">Physical</option>
          <option value="DIGITAL">Digital</option>
        </Select>
        <TextField
          label="Min price (₦)"
          name="minPrice"
          type="number"
          min="0"
          value={minPrice}
          onChange={(e) => {
            setMinPrice(e.target.value);
            setPage(1);
          }}
        />
        <TextField
          label="Max price (₦)"
          name="maxPrice"
          type="number"
          min="0"
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Sort by"
          name="sort"
          value={sort ?? "newest"}
          onChange={(e) => {
            setSort(e.target.value as ListMarketplaceProductsParams["sort"]);
            setPage(1);
          }}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {data?.products.length === 0 && <p className="text-sm text-foreground/60">No products match your filters.</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {data?.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-foreground/60">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
