import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";

// Route group — doesn't affect URLs (/, /products, /cart, etc. keep their
// paths). Scopes the public marketplace header to buyer-facing pages only;
// /account, /seller, /admin keep their own dedicated layouts untouched.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      {/* pb-16 clears the fixed mobile bottom tab bar (MobileBottomNav) —
          not needed on desktop, where that bar doesn't render. */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
