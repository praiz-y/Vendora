import type { Metadata } from "next";

// A plain server layout, sibling to the client-rendered listing page.tsx —
// gives /products real metadata without needing "use client" there. The
// dynamic [slug] route below overrides this per-product via its own
// generateMetadata (Next.js merges child metadata over the parent layout's).
//
// title.template is re-declared here, not just inherited from the root
// layout — a plain string `title` at this level would otherwise stop the
// root template from reaching /products/[slug]'s own generateMetadata,
// leaving product page titles without the " | Vendora" suffix. Confirmed
// by direct testing, not assumed from docs.
export const metadata: Metadata = {
  title: {
    default: "Shop All Products",
    template: "%s | Vendora",
  },
  description: "Browse physical and digital products from every seller on Vendora.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
