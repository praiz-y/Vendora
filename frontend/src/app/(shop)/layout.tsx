import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
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
      {/* pb-16 clears the fixed mobile bottom tab bar (MobileBottomNav) for
          both the page content and the footer beneath it — not needed on
          desktop, where that bar doesn't render. */}
      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <main className="flex-1">{children}</main>
        {/* Site-wide, not homepage-only — Part 3 describes it as the
            homepage's last section, but every real e-commerce footer
            appears on every page; (shop)/layout.tsx is already the shared
            shell every buyer-facing page renders through. */}
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
}
