import Link from "next/link";
import { CheckCircleIcon, SocialCameraIcon, SocialFlagIcon, SocialXIcon } from "@/components/icons";

const SHOP_LINKS = [
  { label: "Browse Products", href: "/products" },
  { label: "Categories", href: "/#categories" },
  { label: "New Arrivals", href: "/products?sort=newest" },
  { label: "Trending", href: "/products?sort=best_selling" },
];

// About Vendora / Help Center / Contact Us and the Terms/Privacy bottom-bar
// links have no real destination page yet — building them isn't this
// phase's job, and a real <Link> to a 404 or to an unrelated page is worse
// than an honest, deliberately inert placeholder (same "illustrative,
// filled in later" treatment the plan already gives the Address block and
// trust badge below).
const COMPANY_LINK_LABELS = ["About Vendora", "Help Center", "Contact Us"];

// Deliberately dark (#1D1D1D — the Heading token) on an otherwise light
// site: a one-off contrast section, not a reintroduction of app-wide dark
// mode (Part 1's removal of that stands; this is a single styled section).
export function Footer() {
  return (
    <footer className="bg-heading text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Shop</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/80">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Company</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/50">
              {COMPANY_LINK_LABELS.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Sell on Vendora</p>
            <Link
              href="/account/selling"
              className="mt-3 inline-block text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Become a Seller →
            </Link>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Address</p>
              {/* Illustrative placeholder — Vendora has no confirmed
                  physical address yet. */}
              <p className="mt-3 text-sm text-white/80">
                Vendora HQ
                <br />
                12 Marina Street, Lagos, Nigeria
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Follow Us</p>
              <div className="mt-3 flex gap-3">
                {[SocialXIcon, SocialCameraIcon, SocialFlagIcon].map((Icon, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/60"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Illustrative placeholder — no real certification exists to point
            to yet (no payment provider finalized), so this reuses the one
            claim that's actually true today rather than overclaiming. */}
        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs text-white/70">
          <CheckCircleIcon className="h-4 w-4" />
          Vetted Sellers Marketplace
        </div>
      </div>

      {/* Full-bleed on purpose — sized off the viewport, not the max-w-6xl
          content column above, so it reads as the closing brand moment
          rather than another constrained content row. */}
      <p
        aria-hidden="true"
        className="mt-10 select-none overflow-hidden whitespace-nowrap px-4 text-center text-[22vw] font-bold leading-none text-primary sm:text-[18vw]"
        style={{ transform: "translateY(18%)" }}
      >
        Vendora
      </p>

      <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-8">
        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Vendora. All rights reserved.</p>
          <p className="flex gap-4">
            <span>Terms &amp; Conditions</span>
            <span>Privacy Policy</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
