"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

// Utility/app-like pages (can legitimately be empty — an empty cart, no
// notifications yet) don't get the marketing footer at all, rather than
// having it crowd right underneath sparse content. `<main>` already has
// `flex-1` in a `flex min-h-screen flex-col` chain (see (shop)/layout.tsx),
// so omitting Footer here is enough on its own for main to fill the
// remaining viewport height — no extra height rule needed.
const NO_FOOTER_PREFIXES = ["/wishlist", "/cart", "/notifications", "/account", "/orders"];

export function ConditionalFooter() {
  const pathname = usePathname();
  const hideFooter = NO_FOOTER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (hideFooter) return null;
  return <Footer />;
}
