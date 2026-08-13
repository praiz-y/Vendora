"use client";

import Link from "next/link";
import { useActiveCategories } from "@/features/categories/hooks";

// Static grid, not a horizontal scroll — categories are a small, fairly
// fixed set, browsed as a quick-overview pick-one grid (Part 3). No
// dedicated category page exists; tiles reuse /products?categorySlug=slug,
// the same destination the products page's own category filter reads.
export function CategoryGrid() {
  const { data: categories } = useActiveCategories();

  if (!categories || categories.length === 0) return null;

  return (
    <section id="categories" className="flex scroll-mt-20 flex-col gap-4">
      <h2 className="px-4 text-lg font-semibold text-heading sm:px-0">Shop by Category</h2>
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:px-0 md:grid-cols-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?categorySlug=${category.slug}`}
            className="flex items-center justify-center rounded-md border border-border bg-surface-alt px-4 py-6 text-center text-sm font-medium text-body hover:border-border-strong hover:text-heading"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
