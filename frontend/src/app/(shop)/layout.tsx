import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
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
        {/* Site-wide by default (Part 3 describes it as the homepage's last
            section, but most pages through this shared shell show it too) —
            except utility/app-like pages that can legitimately be near-empty
            (Wishlist, Cart, Notifications, Account), which skip it entirely
            rather than have it crowd sparse content (Overhaul Phase 16). */}
        <ConditionalFooter />
      </div>
      <MobileBottomNav />
    </div>
  );
}
