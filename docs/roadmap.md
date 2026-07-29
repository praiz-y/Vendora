# Vendora Development Roadmap

This is the authoritative phase breakdown for building Vendora. It supersedes
the phase list in [`architecture/Overview.md`](architecture/Overview.md)
section 42, which described the original 19-phase plan before two structural
conflicts were found in it (see below). Phase *numbers* are unchanged from the
original plan — only the *contents* of Phase 3 and Phase 14 were restructured
— so anything already completed under the old plan stays valid.

For what has actually been built and verified so far, see
[`.ai/project-context.md`](../.ai/project-context.md) and
[`.ai/reports/`](../.ai/reports/). This file describes what's planned, not
what's done.

## Why the original plan was restructured

The original plan put **Admin Dashboard** at Phase 12 and **Seller Dashboard +
Analytics** at Phase 11 — both long after the phases that actually *need* an
admin or seller-dashboard action:

- A seller can't be approved (Phase 3) without an admin doing something.
- A product can't go public (Phase 4) without an admin approving it.
- A report can't be resolved (Phase 10) without an admin reviewing it.
- A refund can't be issued (Phase 13) without an admin approving it.
- A store's own profile (Phase 3) and product list (Phase 4) are managed from
  a seller dashboard that, under the old plan, doesn't exist until Phase 11.

Left as-is, those earlier phases would either fake their way through (Prisma
Studio, raw API calls, no real UI) or Phase 12/11 would balloon into building
everything retroactively, all at once, at the end.

**The fix:** pull a *thin shell* of both dashboards forward into Phase 3 —
a gated `/admin` layout and a gated seller dashboard layout, each with just
enough structure (nav, a reusable list/detail/approve-reject pattern) to hang
one screen off of. Every phase that needs an admin or seller action from then
on adds **one more screen** onto the existing shell, instead of inventing its
own one-off tooling or waiting for a dedicated phase. What was "Admin
Dashboard" (old Phase 12) becomes **Admin Dashboard Polish** — the overview
page, audit log viewer, and user management screen that tie the
incrementally-built screens together, plus a Seller Dashboard, get a matching
polish pass.

No other phase's order or numbering changed. Everything else here matches
Overview.md section 42 exactly.

## Status

| Phase | Name | Status |
|---|---|---|
| 0 | Project Foundation | ✅ Complete |
| 1 | Database + Core Backend | ✅ Complete |
| 2 | Authentication + User Accounts | ✅ Complete |
| 3 | Admin Foundation + Seller Onboarding, Stores & Dashboard Shells | 🔜 Next |
| 4 | Categories + Products + Moderation | Planned |
| 5 | Marketplace + Discovery | Planned |
| 6 | Cart + Wishlist | Planned |
| 7 | Multi-Vendor Checkout + Payments | Planned |
| 8 | Orders + Fulfillment | Planned |
| 9 | Digital Products | Planned |
| 10 | Reviews + Reports | Planned |
| 11 | Seller Dashboard + Analytics | Planned |
| 12 | Notifications | Planned |
| 13 | Refunds | Planned |
| 14 | Admin Dashboard Polish | Planned |
| 15 | Security + Testing | Planned |
| 16 | UI/UX + Performance | Planned |
| 17 | SEO + Production Readiness | Planned |
| 18 | Deployment + Launch | Planned |

---

## Phase 0 — Project Foundation ✅

Monorepo scaffold, Next.js app, Express app, TypeScript everywhere, Tailwind,
API response envelope, centralized error handling, `/api/v1/health`, CORS,
Prisma wired to PostgreSQL with a throwaway verification model, root dev
scripts, env examples, docs skeleton.

## Phase 1 — Database + Core Backend ✅

Full Prisma domain schema: users/auth foundation, seller applications/stores,
categories, products (images, digital versions, views), cart/wishlist,
multi-vendor orders (Order → SellerOrder → OrderItem), payments/attempts,
stock reservations, refunds, digital entitlements, reviews, product reports,
notifications, audit logs. Two migrations applied, idempotent seed script,
layered backend utilities (`prisma.ts`, `validate.ts`, `asyncHandler.ts`,
`pagination.ts`). 28 relationship/business-rule checks verified against
seeded data.

## Phase 2 — Authentication + User Accounts ✅

Full auth system (register/login/refresh/logout/logout-all,
forgot/reset/change password), JWT access tokens + rotating hashed refresh
tokens in an `HttpOnly` cookie, reuse-detection-triggers-full-revocation,
`authenticate`/`requireAdmin`/`requireActiveSeller` middleware,
ownership-checked profile + address CRUD, rate limiting on auth endpoints, 39
automated backend tests, frontend auth pages + account section.

## Phase 3 — Admin Foundation + Seller Onboarding, Stores & Dashboard Shells

**Backend**
- `SellerApplication` submit / edit / resubmit; admin approve / reject with a
  retained rejection reason.
- `Store` CRUD (name, description, logo, banner, business category, phone,
  email, location, optional business info) for approved sellers.
- Suspension effects: suspending a store deactivates its seller-facing
  capabilities and hides its products from new buyers, while the underlying
  user keeps full buyer functionality and historical order data stays intact.

**Admin Foundation** *(new shell, built once, reused by every later
admin-touching phase)*
- `/admin` layout gated by `requireAdmin`.
- One reusable list → detail → approve/reject pattern (table, status filter,
  detail view, action buttons, reason-on-reject).
- First screen built against it: **seller application review**
  (pending/approved/rejected list, approve/reject with reason).

**Seller Dashboard Shell** *(new shell, mirrors the admin one)*
- Dashboard layout gated by `requireActiveSeller`, with nav for Dashboard /
  Products / Orders / Analytics / Reviews / Profile.
- Only **Profile** (store info edit) is implemented this phase; the other
  tabs render as placeholders until the phase that owns their data (4, 8, 10,
  11) fills them in.

**Frontend (buyer-facing)**
- "Become a Seller" entry point + application form/status view.

## Phase 4 — Categories + Products + Moderation

**Backend**
- `Category` CRUD (admin-only creation — sellers select from existing
  categories, never create their own).
- Product CRUD for both physical and digital products; `Draft → Pending
  Review → Approved/Rejected → Archived` lifecycle; inventory field on
  physical products; digital product file upload (first version).

**Admin** *(reuses the Phase 3 shell)*
- Category management screen.
- Product moderation screen (approve/reject with reason), second consumer of
  the shared list/detail/approve-reject pattern.

**Seller Dashboard** *(fills in the Products tab from Phase 3)*
- Create / edit / list products, view approval status, submit for review,
  archive.

## Phase 5 — Marketplace + Discovery

Public, buyer-facing, no dashboard work: homepage, product browsing, search,
filtering, product detail pages, store pages. Only `Approved` + public
products/stores are visible. Out-of-stock display for zero-inventory
products.

## Phase 6 — Cart + Wishlist

Persistent multi-seller cart and wishlist. Cart re-validates the entire
contents before checkout (product exists/approved/available/not
archived/not suspended, price current, stock sufficient, store active).
Wishlist respects product availability; move-to-cart.

## Phase 7 — Multi-Vendor Checkout + Payments

One checkout, one payment, one parent `Order`, split into per-seller
`SellerOrder`s at creation time. Shipping computed per seller (free / fixed
fee) and summed into the checkout total. Stock reservation during checkout;
final inventory re-check immediately before payment/order creation.

Payment integration: **Paystack** (NGN-first, matches the project's
currency). Architecture stays provider-agnostic per the Phase 1/2 groundwork
(`Payment` / `PaymentAttempt` modeled independently of any one provider), so
swapping or adding a provider later doesn't require a schema change.
Payment states: pending, successful, failed, verified via
callback/webhook.

## Phase 8 — Orders + Fulfillment

Buyer order history (parent-order view showing seller-level breakdown).
Seller Orders tab (fills in Phase 3's placeholder): view/manage
seller-specific orders, update fulfillment status independently per seller.
Parent `Order.status` derived from its `SellerOrder`s (supports partial
fulfillment: one seller shipped, another still processing).

## Phase 9 — Digital Products

On successful payment: create a `DigitalEntitlement`, grant buyer access,
enable secure download. Entitlements resolve to the **latest**
`DigitalProductVersion` dynamically (no stored "locked to purchased version"
behavior) — a new version uploaded by the seller is immediately available to
every existing buyer.

## Phase 10 — Reviews + Reports

Buyers review products only after their order reaches `Delivered`/completed;
one active report per user per product (enforced via the existing partial
unique index). Product rating aggregates from reviews; store rating
aggregates from its products' reviews.

**Admin** *(reuses the Phase 3 shell)*: report review screen
(submitted → under review → resolved).

**Seller Dashboard**: Reviews tab (fills in Phase 3's placeholder) — view
reviews associated with the seller's products.

## Phase 11 — Seller Dashboard + Analytics

Dashboard tab (overview of seller activity) and Analytics tab (product
views, sales, revenue) — the two remaining placeholders from Phase 3's
shell, now buildable because orders (Phase 8), digital sales (Phase 9), and
reviews (Phase 10) all exist to aggregate over. Payouts explicitly excluded
(deferred past V1).

## Phase 12 — Notifications

Populate and surface the `Notification` model that's existed since Phase 1:
seller application updates, product approval/rejection, order updates,
payment status, shipping/delivery updates, refund updates, new reviews.
In-app first; email/push are future scope.

## Phase 13 — Refunds

Buyer refund request → **admin review screen** (reuses the Phase 3 shell,
third consumer of the pattern) → approve/reject → payment refund. Manual
workflow per V1 scope; automated refund rules are deferred.

## Phase 14 — Admin Dashboard Polish

Ties together everything built incrementally onto the Phase 3 shell since
then: an overview/stats landing page, the audit log viewer (`AuditLog` has
existed since Phase 1; this is its first UI), and user management
(view users, suspend accounts/stores). Not a from-scratch admin build —
seller approval, product moderation, category management, report review,
and refund review screens already exist by this point.

## Phase 15 — Security + Testing

Hardening pass across everything built so far: expanded automated test
coverage, dependency/security audit, rate-limiting review, input validation
audit, auth/authorization edge cases.

## Phase 16 — UI/UX + Performance

Cross-cutting polish: responsive design audit, loading/error states,
accessibility, image optimization, query/caching performance, bundle size.

## Phase 17 — SEO + Production Readiness

Metadata, sitemaps, structured data for product/store pages, production
environment configuration, logging/monitoring readiness.

## Phase 18 — Deployment + Launch

Production deployment of frontend, backend, database, and Cloudinary/payment
provider configuration; final smoke test of the full marketplace lifecycle
end-to-end.
