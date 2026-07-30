import { SiteHeader } from "@/components/layout/SiteHeader";

// Route group — doesn't affect URLs (/, /products, /cart, etc. keep their
// paths). Scopes the public marketplace header to buyer-facing pages only;
// /account, /seller, /admin keep their own dedicated layouts untouched.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
