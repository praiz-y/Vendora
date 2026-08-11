# Vendora — Project Context

This file is the source of truth for what Vendora is, what has been built so far,
and what rules future development (including AI-assisted development) must follow.
Keep it up to date at the end of every phase.

## Purpose

Vendora is a multi-vendor e-commerce marketplace portfolio project. Key product
behaviors agreed on for V1:

- Everyone registers as a **buyer** by default. A buyer can apply to **become a
  seller**; becoming a seller does not remove buyer capabilities — a seller can
  still browse and purchase like any buyer.
- Admins verify seller applications and verify products before they go public.
- A single checkout can contain products from multiple sellers at once
  (multi-vendor cart/order).
- Payments: integrate a real NGN payment provider if feasible; otherwise simulate
  payment for portfolio purposes. The provider is not finalized yet, so the
  architecture must not be tightly coupled to one payment provider.
- Product lifecycle: `DRAFT → PENDING_REVIEW → APPROVED` (or `REJECTED`, editable
  and resubmittable) `→ ARCHIVED`.
- Order lifecycle (agreed baseline): `PENDING_PAYMENT → PAID → PROCESSING →
  SHIPPED → DELIVERED`, or `CANCELLED`.
- Seller dashboard covers: Dashboard, Products, Orders, Analytics (views, sales,
  revenue), Reviews, Profile, Payouts (future).

## Current Tech Stack

**Frontend** — `frontend/`
- Next.js (App Router), TypeScript, Tailwind CSS
- TanStack Query for server-state/data fetching (`QueryProvider` wired in root layout)
- Zustand for the in-memory auth session (`src/stores/authStore.ts` — the
  one genuinely-needed use case: cross-component access-token/user state)
- Zod available for client-side schema validation
- `src/app/(shop)/` — a route group (URLs unaffected) wrapping the public
  marketplace pages (`/`, `/products[/[slug]]`, `/stores/[slug]`, `/cart`,
  `/wishlist`) in a shared `SiteHeader` (Phase 5/6); `/account`, `/seller/*`,
  `/admin/*` keep their own separate layouts, untouched by this group
- `src/lib/currency.ts` — shared `formatNaira()`, the one place a `Decimal`
  price string becomes a display string (Phase 5)

**Backend** — `backend/`
- Node.js + Express, TypeScript
- Zod for request validation (`src/middlewares/validate.ts` — a generic
  `validate(schema, target)` factory, now used by every auth/user route)
- Layered structure: `routes → controller → service → Prisma → PostgreSQL`
  (`src/config/prisma.ts` exports the shared `PrismaClient` singleton)
- `src/modules/auth/`, `src/modules/users/`, `src/modules/sellerApplications/`
  (+ its `admin/` sub-module), `src/modules/stores/`, `src/modules/categories/`
  (+ its `admin/` sub-module), `src/modules/products/` (+ its `admin/`
  sub-module), `src/modules/marketplace/` (Phase 5 — fully public, no
  `authenticate()`), `src/modules/cart/`, `src/modules/wishlist/` (Phase 6),
  `src/modules/checkout/` (Phase 7), `src/modules/orders/` (+ its `seller/`
  sub-module, Phase 8), `src/modules/entitlements/` (Phase 9),
  `src/modules/reviews/`, `src/modules/productReports/` (+ its `admin/`
  sub-module, Phase 10), `src/modules/sellerDashboard/` (Phase 11),
  `src/modules/notifications/` (Phase 12), `src/modules/refunds/` (+ its
  `admin/` sub-module, Phase 13), `src/modules/adminDashboard/`,
  `src/modules/auditLogs/`, `src/modules/users/admin/` (Phase 14) —
  feature modules built on top of the Phase 0/1 foundation
- `src/utils/notifications.ts` — shared `notify()`, the one entry point
  for writing to `Notification` (Phase 12), mirroring `recordAuditLog()`'s
  pattern
- `src/services/paymentGateway.service.ts` — simulated payment provider
  (Phase 7), written to the interface a real provider integration would
  implement
- `src/utils/auditLog.ts` — shared `recordAuditLog()`, the one entry point
  for writing `AuditLog` rows (Phase 3)
- `src/utils/slug.ts` — shared `slugify()`, used by `Store`/`Category`/
  `Product` slug generation (Phase 4)

**Database**
- PostgreSQL
- Prisma ORM — full Phase 1 domain schema in `backend/prisma/schema.prisma`
  (see [`docs/architecture/database-architecture.md`](../docs/architecture/database-architecture.md))

**Authentication** (Phase 2 — complete)
- JWT access tokens (15m, `{ sub, role }` only) + DB-backed, hashed, rotating
  refresh tokens in an `HttpOnly` cookie. Full design in
  [`docs/architecture/authentication-architecture.md`](../docs/architecture/authentication-architecture.md).
- `bcryptjs` for password hashing, `jsonwebtoken` for access tokens,
  `express-rate-limit` on sensitive auth endpoints.

**Payments** (Phase 7 — simulated, per explicit user direction)
- `src/services/paymentGateway.service.ts` stands in for a real provider —
  resolves synchronously/deterministically, no real money, no network
  call. Written to the interface a real provider (Paystack, per the
  user's stated leaning) would implement, so swapping it in later touches
  only that one module, not `checkout.service.ts`.

**Planned, not yet integrated**
- Cloudinary (image storage)
- A real payment provider (NGN) — architecture stays provider-agnostic;
  Paystack was the user's stated leaning when this becomes real
- A real email provider (password reset currently uses a dev-only console-log stand-in)

## High-Level Architecture

```text
Next.js Frontend (frontend/)
        │  HTTP API (fetch via src/lib/api/client.ts)
        ▼
Express Backend (backend/)
        │
        ▼
Prisma ORM (backend/prisma/schema.prisma)
        │
        ▼
PostgreSQL
```

All backend endpoints are versioned under `/api/v1`. All API responses follow a
consistent envelope (see "API Response Format" below).

## Current Development Phase

**Phase 17: SEO + Production Readiness — complete.** Every feature phase
(0-14) plus Phases 15-17's hardening/polish/readiness passes are done;
only Phase 18 (Deployment + Launch) remains. See
[`.ai/reports/phase-17-report.md`](reports/phase-17-report.md),
[`phase-16-report.md`](reports/phase-16-report.md),
[`phase-15-report.md`](reports/phase-15-report.md),
[`phase-14-report.md`](reports/phase-14-report.md),
[`phase-13-report.md`](reports/phase-13-report.md),
[`phase-12-report.md`](reports/phase-12-report.md),
[`phase-11-report.md`](reports/phase-11-report.md),
[`phase-10-report.md`](reports/phase-10-report.md),
[`phase-9-report.md`](reports/phase-9-report.md),
[`phase-8-report.md`](reports/phase-8-report.md), and
[`phase-7-report.md`](reports/phase-7-report.md) for what was actually
built and verified (Phase 0: `phase-0-report.md` through Phase 6:
`phase-6-report.md` for everything earlier). Phase 18 starts next.

**Full phase breakdown**: see
[`docs/roadmap.md`](../docs/roadmap.md) — the authoritative phase-by-phase
plan (supersedes the phase list in `docs/architecture/Overview.md` section
42). Phase 3 was restructured there to pull a thin Admin Foundation and
Seller Dashboard shell forward, since seller/product/report/refund approval
all need an admin actor well before the old plan's Phase 12 "Admin
Dashboard." Phase *numbers* elsewhere are unchanged.

## Important Architectural Decisions

- **Monorepo, two independent apps.** `frontend/` and `backend/` have their own
  `package.json`/`node_modules`/`tsconfig.json`. The root `package.json` only
  orchestrates running both together (`concurrently`) — it is not an npm
  workspaces setup, since that wasn't needed for two independent apps.
- **API response envelope** (`backend/src/utils/apiResponse.ts`):
  - Success: `{ success: true, message, data }`
  - Error: `{ success: false, message, error: { code, details? } }`
  - Errors are raised as `ApiError` (`backend/src/utils/ApiError.ts`) and handled
    by one centralized `errorHandler` middleware — controllers/services should
    throw `ApiError`, not build responses by hand.
- **CORS** is driven by `FRONTEND_URL` env var, not a hardcoded origin.
- **Backend port is 4000**, not the Express default 5000 — port 5000 was already
  occupied by an unrelated local process during setup. Reflected in
  `backend/.env(.example)`, `frontend/.env.local(.example)`, and README.
- **Local Postgres runs in a dedicated Docker container** `vendora-postgres` on
  host port `5434` (ports 5432/5433 were already in use by other local projects'
  Postgres containers). This is a local dev convenience, not a production
  decision — `DATABASE_URL` is fully configurable.
- **No path aliases in the backend.** The frontend uses `@/*` (works fine — Next
  resolves it via SWC/webpack/Turbopack). The backend uses plain relative
  imports instead of `@/*`, because `tsx`/ts-node-style runtners resolving
  tsconfig `paths` at runtime is an added point of failure that wasn't worth it
  for a thin Express app.
- **Frontend API client** (`frontend/src/lib/api/client.ts`) is a single fetch
  wrapper (`apiClient.get/post/put/patch/delete`) that always sends
  `credentials: "include"` (needed later for the HttpOnly refresh-token cookie)
  and unwraps the backend's response envelope, throwing a typed `ApiError` on
  failure. It does not yet implement auth/refresh-token retry logic — that's a
  Phase 2+ concern once auth exists.
- **`frontend/src/app/dev/health`** is an intentionally-kept development page
  (not linked from any nav) that exercises the full
  `browser → Next.js → Express → /api/v1/health → response` path via TanStack
  Query. Useful for verifying the stack still talks to itself after future
  changes; not part of the production marketplace UI.
- **Prisma schema is being built in phases.** Phase 0 shipped a throwaway
  `HealthCheck` model purely to prove Prisma ↔ PostgreSQL connectivity
  (migration `init_health_check`). Phase 1 replaced it entirely with the real
  domain schema (migrations `init_domain_schema` +
  `product_report_partial_unique`) — see
  [`docs/architecture/database-architecture.md`](../docs/architecture/database-architecture.md)
  for the full design and reasoning.
- **Seller status is a capability, not a role.** `User.role` is only
  `USER`/`ADMIN`. An approved seller is a `User` with a 1:1 `Store` — nothing
  about their role changes, so they keep buying like any other user. See the
  architecture doc's "Users, roles, and seller status" section.
- **Multi-vendor orders**: one `Order` → many `SellerOrder` (one per
  seller involved) → many `OrderItem`. `Order.status` is a coarser enum with
  `PARTIALLY_*` states than `SellerOrder.status`, specifically to represent
  "one seller shipped, another is still processing" at the aggregate level.
  Verified in Phase 1 testing that a multi-vendor checkout is one `Order` row,
  not duplicated per seller.
- **Order line items are fully snapshotted** (`OrderItem.productNameSnapshot`,
  `priceSnapshot`, etc.) so editing a `Product` later never changes historical
  order data — verified directly in Phase 1 testing.
- **Digital entitlements resolve to the latest version dynamically** (query
  `MAX(version)` on `DigitalProductVersion`), not via a stored `isLatest` flag
  or a per-version entitlement row.
- **"One active product report per user per product"** is enforced with a
  hand-written partial unique index (`WHERE status = 'PENDING'`) since Prisma's
  schema syntax can't express conditional uniqueness — see migration
  `product_report_partial_unique`.
- **Every historically-significant relation has a deliberately chosen
  `onDelete`** (`Restrict` for anything tied to orders/payments/entitlements,
  `SetNull` for admin-reviewer references, `Cascade` only for genuinely
  ephemeral/structural-child data). Full table in the architecture doc.
- **Seed data is fully idempotent** (`backend/prisma/seed.ts` wipes and
  re-inserts) and uses one shared dev-only password (`VendoraDev123!` by
  default, overridable via `SEED_USER_PASSWORD`) hashed with `bcryptjs`.
- **`PasswordResetToken` (Phase 2 schema addition)** — the only schema change
  made this phase. Phase 1 modeled session tokens (`RefreshToken`) but not
  reset tokens; a reset token is genuinely different (much shorter lifetime,
  strictly single-use, no rotation), so it's its own table rather than
  overloading `RefreshToken`. Migration: `add_password_reset_token`.
- **Seller status stays a capability, not a role** (confirmed/finalized in
  Phase 2). `hasActiveSellerCapability(userId)` always queries `Store.status`
  live from the database — it is never read from or cached in the JWT, since
  a store can be suspended at any moment and a stale token shouldn't be able
  to out-live that.
- **Access token delivery: JSON body → in-memory Zustand store → `Authorization: Bearer` header.**
  Not a cookie, and not `localStorage`/`sessionStorage`. Full reasoning in
  the authentication architecture doc's "Access Token Delivery" section.
- **Refresh cookie `Path` is `/`, not `/api/v1/auth`.** Originally scoped
  narrowly to the backend's own auth routes to minimize exposure, but that
  broke the Next.js proxy's ability to see the cookie when deciding whether
  to gate `/account/*` (cookie `Path` matching is based on the request path,
  independent of host/port — a `/api/v1/auth`-scoped cookie is never sent on
  a request to `/account/profile`). Found via testing with a shared cookie
  jar across both origins, not by testing each origin in isolation. `HttpOnly`
  still keeps the value unreadable by JS either way.
- **`middleware.ts` → `src/proxy.ts`.** Two corrections to Phase 0's
  placeholder: (1) with a `src/` layout, Next.js expects the file at
  `src/middleware.ts`, not the project root — the Phase 0 file was in the
  wrong place and silently did nothing since it was a no-op anyway; (2)
  Next.js 16 has renamed the convention from `middleware.ts`
  (deprecated, still works but warns) to `proxy.ts` with an exported
  function named `proxy`, not `middleware`. Both were only discovered once
  the file needed to do real work in Phase 2.
- **Refresh-token reuse is treated as theft**: presenting an
  already-rotated-away refresh token revokes every refresh token for that
  user (not just the reused one), forcing re-login on every device. Verified
  directly in `backend/tests/auth.test.ts`.
- **A password reset or change-password revokes every session for that
  user**, including the one making the change-password request — the safer
  default the phase spec asked for, over preserving the current session.
- **Validation errors return `422`**, not `400` (`backend/src/middlewares/validate.ts`,
  via `ApiError.unprocessable`) — matches this phase's expected status-code
  list. `400` is reserved for non-schema request problems (e.g. an invalid
  password-reset token).
- **Ownership violations return `404`, not `403`** (e.g. acting on another
  user's address by id) — doesn't confirm the resource exists under someone
  else's account.
- **Automated backend tests run against a second, dedicated Postgres
  container** (`vendora-postgres-test`, port 5435) — not the dev database —
  via `backend/.env.test` and `vitest` + `supertest`. `npm test` from
  `backend/` runs the suite (208 tests as of Phase 15).
- **Store slugs are generated once, at approval, and never regenerated on
  rename** (`stores.service.generateUniqueStoreSlug`, called only from the
  admin approve flow). Marketplace/store URLs (Phase 5) will depend on slug
  stability — regenerating it on every rename would silently break links.
- **`SellerApplication` and `Store` intentionally keep separate field names**
  (`storeName` vs `name`, `storeDescription` vs `description`, etc.) — this
  was already how Phase 1 modeled the two tables. Approval copies the
  application's fields across; the two don't share a validation schema.
- **Editing a `REJECTED` seller application resubmits it in place** (back to
  `PENDING`, clearing `rejectionReason`/`reviewedById`/`reviewedAt`) rather
  than creating a new row — there's only ever one `SellerApplication` per
  user (`@unique` on `userId`, from Phase 1). Editing a `PENDING` one just
  updates fields; an `APPROVED` one is immutable (its `Store` is what gets
  edited from then on).
- **`recordAuditLog(client, input)` (`backend/src/utils/auditLog.ts`) is the
  one entry point for writing to `AuditLog`.** Accepts either the shared
  Prisma client or an active transaction client, so the audit entry commits
  atomically with the state change it records (used by seller-application
  approve/reject). Every later admin action (product moderation, refunds,
  suspensions, ...) should call this rather than writing to `AuditLog` by
  hand.
- **The Admin Foundation (`/admin`) and Seller Dashboard (`/seller`) shells
  are deliberately thin as of Phase 3**: gated layout + nav, and (for admin)
  one reusable list/detail/approve-reject pattern, first built against
  seller-application review. Every later phase that needs an admin or seller
  screen (product moderation, seller Orders/Reviews/Analytics tabs, report
  review, refund review) adds one more entry onto these existing shells —
  see `docs/roadmap.md` — instead of building its own one-off tooling.
- **A product's `type` (`PHYSICAL`/`DIGITAL`) is immutable after creation**
  (Phase 4) — the create schema is a Zod discriminated union on `type`; the
  update schema has no `type` field at all.
- **`APPROVED`/`ARCHIVED` products cannot be edited** via
  `PATCH /products/me/:id` (Phase 4) — keeps the moderation model
  unambiguous for V1; no "does editing a live product require re-review"
  question to answer. Editing a `REJECTED` product resubmits it to
  `PENDING_REVIEW` in place, exactly like `SellerApplication` resubmission.
- **Only a product's first `DigitalProductVersion` is created this phase**
  (at product creation). Uploading additional versions is deferred to Phase
  9, once entitlements/downloads exist to make versioning meaningful.
- **`DigitalProductVersion.fileSize` (a `BigInt` column) is serialized to a
  string before any response** (`products.service.ts`'s `serializeProduct`)
  — raw `BigInt` makes `JSON.stringify` throw. Every product-returning
  service function goes through this one seam, mirroring `toSafeUser` for
  auth responses.
- **Category names are not unique; slugs are, and are generated once** —
  same precedent as `Store` slugs. No unique constraint on `Category.name`
  in the schema, so duplicate names get distinct auto-suffixed slugs.
- **`GET /categories` is public (Phase 5)**, relaxed from Phase 3/4's
  `authenticate()`-gated version — anonymous marketplace browsing needs
  category names too, and nothing about a category name is sensitive. Full
  CRUD (including archived categories) stays admin-only.
- **The public marketplace (`src/modules/marketplace/`) is a separate
  module, not a relaxed version of `/products`/`/stores`.** Those are
  seller self-service routes shaped around ownership and internal fields;
  public browsing needed different response shapes (narrower — see next
  point) and different visibility rules (`status: APPROVED` **and**
  `store.status: ACTIVE`, not "belongs to me").
- **Public product/store responses never include**: moderation internals
  (`status`/`rejectionReason`/`reviewedBy`), `digitalVersions` at all (a
  digital product's `fileKey` must stay unreachable until Phase 9 gates it
  behind a real entitlement check), or a store's `phone`/`email` (no
  buyer-seller messaging exists yet). All three are deliberate defaults,
  not requirements pulled from Overview.md — worth revisiting if a real
  need shows up later.
- **Out-of-stock products are shown, never hidden** — visible in listings
  and detail pages with `stockQuantity: 0`; the frontend renders an "Out of
  Stock" badge instead of filtering the product out.
- **Cart/wishlist availability is never snapshotted or cached.** Every
  `GET /cart` and `GET /wishlist` recomputes `isAvailable`/`issue`
  (`PRODUCT_UNAVAILABLE` / `STORE_UNAVAILABLE` / `INSUFFICIENT_STOCK` /
  `OUT_OF_STOCK`) from the live `Product`/`Store` state at request time —
  same "always query live, never trust a cached value" principle as
  `hasActiveSellerCapability` (Phase 2). Phase 7's checkout is expected to
  reuse this same logic rather than re-inventing it.
- **A digital product in the cart is always quantity 1.** Re-adding an
  already-present digital item is `409 ALREADY_IN_CART`, not an increment
  — one purchase is one entitlement, not a stackable quantity.
- **`wishlist.service.moveToCart` calls `cart.service.addToCart` directly**
  (no duplicated validation) and only deletes the wishlist row after that
  call succeeds, so a failed move (e.g. now out of stock) leaves the
  wishlist item in place instead of silently losing it.
- **Every registered user must have exactly one `Cart` row** (created by
  `auth.service.ts`'s `register()`, not a DB trigger). `prisma/seed.ts` was
  missing this for `admin`/`sellerOneUser`/`sellerTwoUser` (only `buyer`
  had one) — a latent Phase 1 gap that Phase 6 was the first phase to
  actually surface. Fixed; re-seed after pulling this change if working
  against an older dev database.
- **Real-browser verification: use Playwright with `channel: "msedge"`,
  not the default Chromium.** `npx playwright install chromium` stalls
  indefinitely in this sandbox (no apparent outbound access to Playwright's
  CDN) — this blocked Phases 3/4 to API-only verification. Windows ships
  Edge (Chromium-based) already, and `chromium.launch({ channel: "msedge" })`
  needs no download at all. Resolved starting Phase 5/6; use this for every
  future phase's browser verification instead of re-attempting the
  Chromium download.
- **Payments are simulated in V1** (`src/services/paymentGateway.service.ts`,
  Phase 7) — confirmed explicitly with the user (no Paystack test
  credentials available). Written to the exact interface a real provider
  module would implement; `Payment.provider` (already a plain string per
  Phase 1) stores `"simulated"`.
- **Checkout does cart-validation, order-graph creation, and the payment
  call in one synchronous request** (Phase 7) — defensible specifically
  because the gateway is simulated and resolves instantly. A real
  (redirect/webhook) provider would split this into "create order, redirect
  buyer" and "webhook confirms, finalize" — the schema (`PENDING_PAYMENT`,
  `PaymentStatus.PENDING`, `StockReservation`) already supports that split,
  Phase 7 just doesn't need the async half yet.
- **Never `create()` + `catch(P2002)` inside an interactive Prisma
  transaction to treat a conflict as a no-op** — a Postgres statement error
  aborts the *entire* transaction; every later statement fails with
  `25P02` even though the JS error was caught. Use `upsert()` instead.
  Found the hard way in `checkout.service.ts`'s digital-entitlement
  creation (Phase 7) via real-browser testing against the dev database;
  fixed and covered by a regression test. Worth remembering for any future
  transactional code, not just this one call site.
- **`apiClient`'s 401 handler retries-after-refresh on *any* 401, not only
  when a token was attached to the failed request** (Phase 8,
  `frontend/src/lib/api/client.ts`). The narrower original version left
  pages using an authenticated query hook that isn't explicitly gated by
  auth status (most of them aren't — `useCart`/`useWishlist`/
  `useMyEntitlements` are the exceptions) permanently stuck on
  "Authentication required" if that hook's request fired before
  `AuthProvider`'s own bootstrap refresh resolved on a hard page load.
  Found via `/orders` in real-browser testing.
- **Never call `router.replace()` (or any store-mutating call) directly in
  a component's render body** — it updates the Router while a different
  component is mid-render, which React throws on. Always wrap in a
  `useEffect`. Found on `/checkout` (Phase 8) exactly when a successful
  payment emptied the cart and should have shown the success screen
  instead of crashing into Next's dev error overlay.
- **A `useQuery` gated with `enabled: someCondition` reports `isLoading:
  false` while disabled** — not "still loading," genuinely "hasn't started."
  Any "is this actually empty" check built on `!isLoading && !data` must
  also account for whether the query has even been allowed to run yet
  (e.g. `authStatus === "authenticated"` for anything gated on auth), or it
  reads a not-yet-started query as confidently empty. Found on `/checkout`
  (Phase 8) causing a bogus redirect away from a checkout that had real
  items, in the split-second before auth resolved.
- **Order/SellerOrder status derivation is a pure function, recomputed on
  demand, not stored redundantly** (`orders.service.deriveAndUpdateOrderStatus`,
  Phase 8) — called after every `SellerOrder` status mutation; a no-op
  while `PENDING_PAYMENT` or once `CANCELLED`.
- **A buyer can only self-cancel an order while `PENDING_PAYMENT`** (Phase
  8) — once paid, cancellation becomes a refund request (Phase 13), never
  a direct status flip, since a paid order has already reserved real
  stock/entitlements a refund flow needs to unwind deliberately.
- **Shipping fee is a flat per-listing charge, not multiplied by
  quantity** (Phase 7 checkout math) — a `FIXED`-shipping product
  contributes its fee once per seller-order regardless of how many units
  were purchased.
- **All checkout money math uses `Prisma.Decimal`, never `Number`** — to
  avoid floating-point error accumulating across subtotal/shipping/total
  sums (Phase 7).
- **"Secure download" (Phase 9) means access control, not file serving.**
  `GET /entitlements/:productId/download` refuses non-entitled buyers
  unconditionally; it does not stream a file, since no Cloudinary/storage
  integration exists yet — same "plain reference for now" pattern as
  everywhere else.
- **Digital-version upload is allowed for any non-`ARCHIVED` product
  status** (Phase 9, extends Phase 4's products module), covering both
  "fix the file before approval" (`PATCH /products/me/:id` deliberately
  has no `file` field) and "ship v2 of a live product" with one rule.
- **The cart (not checkout) is where "you already own this digital
  product" gets rejected** (Phase 9, `cart.service.addToCart`) — catches
  the double-purchase problem at the natural point of prevention.
  Checkout's `digitalEntitlement.upsert()` is a second, defensive layer
  for the residual race a concurrent second checkout could still hit.
- **This sandbox's dev servers degrade significantly over a very long
  session** — by late Phase 8/9, Next.js logged "Slow filesystem
  detected" and a `npm test` run that normally takes 40-70s took 400s+.
  If browser verification starts timing out on page compiles/navigation
  (not application errors — check the dev-server log for genuine slow 200s
  vs. real 4xx/5xx), restart both dev servers fresh before concluding
  something is actually broken.
- **A review's proof-of-purchase is "this specific `OrderItem`'s
  `SellerOrder` is `DELIVERED`"** (Phase 10) — the only thing this project
  can actually verify. `Review.orderItemId` (unique, Phase 1) is the unit
  of "one purchase, one review," not `productId` — a buyer with two
  separate delivered purchases of the same product can leave two reviews.
- **Store rating is the average of each reviewed product's own average
  rating, not a single average across every raw review** (Phase 10,
  `reviews.service.getStoreRatingSummary`) — matches Overview §23's
  wording and stops one high-review-volume product from dominating a
  store's rating.
- **Product report reasons are a fixed Zod enum validated at the request
  layer only** (Phase 10) — the `ProductReport.reason` column stays the
  plain string it was in Phase 1, so new reasons can be added later
  without a migration.
- **Report resolution targets the schema's real `PENDING/RESOLVED/DISMISSED`
  enum** (Phase 10), not Overview §24's hedged "Submitted → Under Review →
  Resolved" wording — that wording was explicitly marked as a "potential"
  lifecycle with the real rules deferred to this phase, and Phase 1 had
  already fixed the enum without an "under review" state.
- **`orders.service.ts`'s shared `orderInclude` carries each `OrderItem`'s
  `review` (`{id}` or `null`)** (Phase 10) rather than a separate
  "has this been reviewed" endpoint — the buyer's order-detail page uses
  it directly to decide whether to show "leave a review".
- **The backend's in-memory auth rate limiter (20 req/15 min) is easy to
  exhaust from repeated Playwright runs, not just repeated manual login
  attempts** — every hard page navigation (`page.goto`, not an in-app
  `Link`) re-triggers `AuthProvider`'s bootstrap `POST /auth/refresh`; a
  script with a dozen-plus navigations across a few browser contexts can
  cross the limit on its own. Restarting the backend dev process resets
  the in-memory counter; this happened repeatedly during Phase 10's
  verification pass and is expected, not a bug.
- **`ProductView` gets its first (and only) writer in Phase 11**:
  `POST /marketplace/products/:slug/view`, deliberately a separate endpoint
  from the product-fetch `GET`, and deliberately not a TanStack Query
  query/mutation on the frontend (`useRecordProductView`) — a query would
  re-fire on every refetch/window-refocus and inflate the exact count it's
  supposed to measure. `userId`/`visitorId` stay mutually exclusive per row
  (the model's own Phase 1 comment): a logged-in request's `visitorId` is
  discarded server-side even if the client sends one.
- **Seller-dashboard revenue/sales figures filter on the parent `Order`'s
  status, not mere `SellerOrder` existence** (Phase 11) — a `SellerOrder`
  row exists as soon as checkout builds the order graph (Phase 7), before
  the payment attempt runs, so counting every row would inflate revenue
  with failed/still-`PENDING_PAYMENT` checkouts.
- **Per-product analytics revenue is computed by reducing raw `OrderItem`
  rows in application code, not a Prisma `groupBy._sum`** (Phase 11) —
  revenue is `quantity × priceSnapshot`, a product of two columns, which
  `groupBy`'s single-column `_sum` can't express in one aggregate call.
- **`notify()` (`src/utils/notifications.ts`, Phase 12) mirrors
  `recordAuditLog()`'s exact shape** — accepts either the shared Prisma
  client or an active transaction client, so a notification commits
  atomically with the state change that triggered it. Wired into every
  existing flow the `NotificationType` enum already covers (seller
  application approve/reject, product approve/reject, checkout payment
  success + order placed, seller-order shipped/delivered, review
  creation); `REFUND_UPDATE` has no trigger yet — that's wired in when
  Phase 13 builds refunds.
- **The notification bell polls every 30s rather than pushing** — this
  project has no websocket/push infrastructure, and Overview §33 scopes
  Phase 12 to "in-app first" only.
- **Hard navigations (`page.goto`/`page.reload`) re-trigger
  `AuthProvider`'s bootstrap `/auth/refresh`, which counts against the
  same rate limiter as login/register** — confirmed as the actual cause of
  repeated rate-limit exhaustion in Phase 10/11/12's browser verification.
  Routing Playwright scripts through in-app `<Link>` clicks (SPA
  navigation) instead of `page.goto` wherever possible avoids this;
  worth doing by default in any future browser verification, not just
  when a script has already started failing.
- **A refund always covers a whole `SellerOrder`, at its full total**
  (Phase 13) — no partial-item or custom-amount refunds in V1, matching
  Overview §25's "basic refunds" and every other per-seller operation this
  project already has. `Refund.amount` is always derived from
  `SellerOrder.total`, never client-supplied.
- **Approving a refund goes straight to `PROCESSED`, skipping a lingering
  `APPROVED` state** (Phase 13) — the payment gateway is
  simulated/synchronous, same precedent as checkout (Phase 7).
  `RefundStatus.APPROVED` exists in the schema for a real, asynchronous
  provider to use later.
- **List endpoints for a schema field with more scope options than the
  current phase actually uses should filter to the scope that's
  actually supported** (Phase 13, `refunds.service.ts`/
  `refunds.admin.service.ts`: `sellerOrderId: { not: null }`) — found the
  hard way when a Phase-1-era seed row scoped to `orderItemId` (written
  before this phase decided the real scope) crashed the admin refunds
  screen, which only knows how to render a SellerOrder-scoped refund.
- **Prisma's 5s default interactive-transaction timeout isn't always
  enough under this sandbox's occasional slowdowns** — checkout's three
  `$transaction` calls now pass an explicit 15s timeout
  (`TRANSACTION_OPTIONS`, Phase 13) after a live "transaction already
  closed" error that the (unaffected, still-green) automated test suite
  never hit. The transactions themselves aren't inherently slow; the
  environment sometimes is.
- **Suspending a user's account and suspending their store are two
  independent admin actions** (Phase 14) — reaffirms Phase 3's "seller
  status is a capability, not a role": a store suspension never touches
  the underlying account's buyer capabilities, and an account suspension
  (which blocks login entirely) is separate from whatever the store's own
  status is.
- **An admin account can never be suspended** (Phase 14,
  `users.admin.service.ts`) — enforced server-side (`400
  CANNOT_SUSPEND_ADMIN`), not just hidden in the UI.
- **Suspending a user revokes every refresh token they currently hold**
  (Phase 14) — the same "revoke every session" precedent as a Phase 2
  password reset, just admin-triggered instead of self-triggered.
- **Two rate limiters, not one** (Phase 15): `authRateLimiter` (20/15min)
  for credential-stuffing-prone endpoints, `writeRateLimiter` (60/15min,
  `src/middlewares/rateLimiter.ts`) for authenticated write-heavy ones
  (checkout, refunds, reviews, product reports, change-password) — the
  two have different abuse profiles, so one shared threshold would be
  wrong for at least one of them.
- **Password-adjacent fields that get compared against an existing hash
  are bounded too, not just newly-chosen passwords** (Phase 15,
  `auth.validation.ts`) — an unbounded string sent into
  `bcrypt.compare` is a real DoS vector regardless of whether it's a
  login attempt or a change-password's `currentPassword`.
- **`httpUrlSchema` (`src/utils/validation.ts`, Phase 15) replaces bare
  Zod `.url()` everywhere an image/logo/banner URL is accepted** — plain
  `.url()` accepts any WHATWG-valid scheme, including `javascript:`/
  `data:`, which a URL field has no legitimate reason to hold.
- **Unhandled (non-`ApiError`) error messages are generic in production,
  detailed elsewhere** (Phase 15, `errorHandler.ts`) — the real message is
  always logged server-side either way; sending it to the client in
  production is exactly the kind of internal detail (e.g. a Prisma error
  naming a real column) an attacker shouldn't get for free.
- **No raw SQL (`$queryRaw`/`$executeRaw`) and no `.passthrough()` Zod
  schema anywhere in the codebase** (confirmed, Phase 15) — SQL injection
  and mass-assignment are structurally impossible here, not merely
  avoided by convention. Keep it that way: reach for Prisma's query
  builder and plain `z.object()` even when a raw query or a passthrough
  schema would be less code.
- **Frontend security headers live in `next.config.ts`'s `headers()`**
  (Phase 15) — `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`. No CSP yet (see What Should Not
  Be Implemented Yet) — a config change here requires a dev-server
  restart to take effect, unlike most frontend edits.
- **`aria-label` over adding a visible `<label>`, for compact inputs that
  already shipped with only placeholder text as identification** (Phase
  16: site search, inline quantity inputs, filter selects) — gets the
  same accessible-name result without a layout change to already-shipped
  pages. A field that already had a visible `<label>` needed no change;
  this pattern is specifically for the placeholder-only gaps this phase's
  audit found.
- **`loading="lazy"` is applied per-image, not globally** (Phase 16) —
  every grid/thumbnail/list-item image gets it, but a page's likely
  Largest Contentful Paint candidate (the product detail page's main
  photo) deliberately keeps default eager loading. Apply this same
  hero-vs-thumbnail judgment to any future image addition rather than
  reaching for a blanket rule.
- **Un-breakpointed `grid-cols-3`+ is the one responsive anti-pattern to
  grep for** (Phase 16 audit: `grep` for `grid-cols-[3-9]` without an
  accompanying `sm:`/`md:`/`lg:` on the same class list) — found exactly
  one real instance app-wide (seller analytics' stat cards) across
  Phases 0-14's entire UI, so this is a narrow, specific check, not a
  sign of a systemic layout problem.
- **`NEXT_PUBLIC_SITE_URL` (Phase 17) is a separate env var from
  `NEXT_PUBLIC_API_URL`** — the frontend's own public origin
  (`metadataBase`, canonical URLs, sitemap/robots URLs) is not the same
  thing as the backend API's origin; conflating them breaks the moment
  frontend and backend live on different domains in production.
- **`/products/[slug]` and `/stores/[slug]` are Server Component
  `page.tsx` files wrapping a client `*DetailClient.tsx` (Phase 17)** —
  Next.js's Metadata API (`generateMetadata`) only works in Server
  Components, and every page in this app was `"use client"` before this
  phase. The server wrapper does its own plain `fetch()` to the public
  marketplace API (never the client `apiClient`, which depends on
  browser-only auth state) to build metadata and JSON-LD, then renders
  the untouched client component for the actual interactive page. A
  failed server-side fetch falls back to generic metadata rather than
  calling `notFound()`, so the client component's existing "not found" UI
  stays the actual source of truth for that state.
- **A layout that sets its own `title` must re-declare `title.template`
  too, not rely on inheriting the root's** (Phase 17,
  `/products/layout.tsx`) — a plain-string title at an intermediate
  layout silently stops the root template from reaching routes nested
  below it. Found via live-browser testing (the product page's `<title>`
  was missing the " | Vendora" suffix the listing page correctly had),
  not assumed from documentation. Worth remembering for any future
  layout that sets its own title.
- **JSON-LD is embedded via one shared `jsonLdScriptProps()` helper**
  (`frontend/src/lib/jsonLd.ts`, Phase 17) that escapes `<` before
  `dangerouslySetInnerHTML` — `JSON.stringify` alone does not escape a
  literal `</script>` sequence, so an unescaped embed of seller-provided
  text (a product/store description) could let the browser's HTML parser
  close the script tag early. Any future JSON-LD embed should go through
  this helper, not a raw `JSON.stringify` + `dangerouslySetInnerHTML`.
- **`sitemap.ts`'s product/store fetch must never throw** (Phase 17) — it
  runs during the production build and again on every ISR revalidation;
  a transient backend outage at that moment must degrade to "just the
  static routes," not fail the entire frontend build. Found the hard way:
  the first version crashed `next build` with `ECONNREFUSED` when the
  backend happened to be down: wrapped in try/catch, falls back to an
  empty product list.
- **Store slugs for the sitemap are derived from the product listing, not
  a new backend endpoint** (Phase 17) — no public "list stores" endpoint
  exists (`marketplace.routes.ts` only exposes `GET /stores/:slug`), and
  adding one solely for the sitemap would be unrequested backend scope.
- **`noindex` on `admin`/`seller`/`account` (Phase 17) is a `<meta>` tag
  rendered directly in each `"use client"` layout's JSX**, not a Server
  Component rewrite — React/Next.js hoist `<meta>`/`<title>`/`<link>`
  tags rendered anywhere in the tree into `<head>` automatically, which
  avoids extracting `useRequireAdmin`/`useRequireActiveSeller`/
  `useRequireAuth`'s gating logic out of the layout just for this one
  tag. In practice `proxy.ts`'s middleware already redirects
  unauthenticated requests to these routes with a server-side `307`
  before any HTML renders, so the tag's real audience is an
  **authenticated** render that got indexed or linked some other way —
  defense in depth, not the primary exclusion mechanism (that's
  robots.txt).
- **`/api/v1/health` verifies database connectivity and returns `503` if
  unreachable** (Phase 17), rather than unconditionally returning `200`
  — a liveness/readiness probe that can't detect a DB outage isn't
  checking the thing that actually matters for whether the app can serve
  traffic.
- **No process-level `uncaughtException`/`unhandledRejection` handlers
  were added** (Phase 17, deliberate) — the standard Node.js production
  model is to let the process crash and have a supervisor restart it, not
  swallow an exception and keep running in a possibly-corrupted state.
  This project has no process supervisor yet (Phase 18); adding
  catch-all handlers now would work against that eventual setup, not
  with it.

## Development Rules

- Do not build feature UI (Admin Dashboard Polish's overview/audit-log/
  user-management screens — Phase 14) until the phase that owns it — see
  `docs/roadmap.md`. Every other planned admin/seller screen now exists.
- Payments are simulated (Phase 7); do not integrate a real provider
  without the user explicitly providing credentials and re-confirming —
  keep the schema/architecture provider-agnostic regardless.
- Prefer archival/status fields over destructive deletes for anything involved
  in historical transactions (products, orders, order items, payments, refunds,
  digital entitlements).
- Keep controllers thin; business logic belongs in services, DB access in Prisma.
- All new backend input handling should go through Zod validation middleware,
  not ad hoc checks in controllers.
- Seller/admin authorization: use `requireAdmin`/`requireActiveSeller`
  (`backend/src/middlewares/authorize.ts`) or the underlying
  `isAdmin`/`hasActiveSellerCapability`/`ownsResource` helpers
  (`backend/src/utils/authz.ts`) — never re-derive these checks ad hoc, and
  never decide seller access from `User.role` or from JWT contents.
- Any new authenticated route goes through `authenticate`
  (`backend/src/middlewares/authenticate.ts`) first; authorization is always a
  separate, composed step after it, never folded into it.
- New resource endpoints that belong to a specific user must re-verify
  ownership server-side after loading the resource (see
  `backend/src/modules/users/addresses.service.ts`'s
  `getOwnedAddressOrThrow` for the pattern) — never trust an id from the URL.

## What Has Been Completed

- **Phase 0**: monorepo scaffold, Next.js app, Express app, API response
  envelope, centralized error handling, `/api/v1/health`, CORS, Prisma wired to
  Postgres with a minimal verification model/migration, root dev scripts, env
  examples, docs. Full details in `.ai/reports/phase-0-report.md`.
- **Phase 1**: complete Prisma domain schema (users/auth foundation, seller
  applications/stores, categories, products incl. images/digital
  versions/views, cart/wishlist, multi-vendor orders, payments/attempts, stock
  reservations, refunds, digital entitlements, reviews, product reports,
  notifications, audit logs); two migrations applied against the dev
  database; idempotent seed script; layered backend utilities
  (`prisma.ts` singleton, `validate.ts` Zod middleware, `asyncHandler.ts`,
  `pagination.ts`); 28 relationship/business-rule checks verified against the
  seeded data. Full details in `.ai/reports/phase-1-report.md`.
- **Phase 2**: full auth system (register/login/refresh/logout/logout-all,
  forgot/reset/change password), JWT + rotating hashed refresh tokens in an
  `HttpOnly` cookie, `authenticate`/`requireAdmin`/`requireActiveSeller`
  middleware, ownership-checked user profile + address CRUD, rate limiting on
  auth endpoints, `PasswordResetToken` schema addition, 39 automated backend
  tests (vitest + supertest against a dedicated test database), and the
  frontend register/login/forgot-password/reset-password/account pages with
  in-memory-token session handling. Full details in
  `.ai/reports/phase-2-report.md`.
- **Phase 3**: Admin Foundation (shared `recordAuditLog` util, gated `/admin`
  shell, reusable list/detail/approve-reject pattern) and Seller Dashboard
  shell (gated `/seller` layout with Dashboard/Products/Orders/Analytics/
  Reviews/Profile nav, only Profile implemented); full seller-application
  lifecycle (submit/edit/resubmit, admin list/filter/detail/approve/reject);
  `Store` CRUD for approved sellers with a slug generated once at approval;
  the buyer-facing `/account/selling` "Become a Seller" flow covering all
  four application states; `proxy.ts` extended to gate `/seller/*` and
  `/admin/*`; 19 new automated backend tests (58 total). Full details in
  `.ai/reports/phase-3-report.md`, including a flagged gap: the new UI was
  verified via API calls and page-render checks, not a full browser
  click-through (Playwright's Chromium download stalled in this sandbox).
- **Phase 4**: admin-managed `Category` CRUD (+ one `GET /categories` any
  authenticated user can reach, active-only); full seller `Product` CRUD for
  both physical and digital products (create/list/get/edit/submit/archive),
  editing following the same resubmit-on-`REJECTED` pattern as seller
  applications; admin product moderation (list/filter/detail/approve/reject)
  as the second consumer of the Phase 3 admin shell; the seller dashboard's
  Products tab is now real (was a placeholder); `/admin/categories` and
  `/admin/products[/[id]]` added to the admin shell; shared `slugify()`
  extracted to `backend/src/utils/slug.ts`; 25 new automated backend tests
  (83 total). Full details in `.ai/reports/phase-4-report.md` — same
  browser-click-through gap noted as Phase 3 (verified via API calls,
  automated tests, and page-render checks instead; resolved in Phase 5/6,
  see below).
- **Phase 5**: fully public `marketplace` module (`GET /marketplace/products`
  with search/category/store/type/price/sort filters + pagination,
  `GET /marketplace/products/:slug`, `GET /marketplace/stores/:slug`) —
  the first part of the API reachable with no `authenticate()` at all;
  `GET /categories` relaxed to public; a new `(shop)` route-group layout
  with a shared `SiteHeader`; homepage (replacing the untouched
  create-next-app scaffold), `/products` browse/search/filter,
  `/products/[slug]` detail, `/stores/[slug]`; 11 new automated backend
  tests (94 total). Full details in `.ai/reports/phase-5-report.md`.
- **Phase 6**: `Cart` (add/list/update-quantity/remove, live
  availability flags) and `Wishlist` (add/list/remove/move-to-cart) built
  directly on Phase 5's pages in the same session; Add to Cart / Add to
  Wishlist wired into the product detail page; `/cart` (multi-vendor,
  grouped by seller, disabled "Proceed to Checkout") and `/wishlist`
  pages; fixed a real Phase-1-era gap where seeded non-buyer users had no
  `Cart` row; 22 new automated backend tests (116 total). **First phase
  verified with a real browser** (Playwright via Edge's `msedge` channel,
  resolving the Chromium-download blocker noted in Phases 3–5) — 12/12
  scripted UI checks passed against the live dev servers and re-seeded
  database. Full details in `.ai/reports/phase-6-report.md`.
- **Phase 7**: simulated payment gateway; `POST /checkout` (cart
  re-validation, per-seller order splitting, stock reservation, a final
  live re-check, the simulated charge, and finalization — entitlements,
  stock decrement, cart clearing) plus `POST /checkout/:orderId/retry-payment`;
  `/checkout` page with a "simulate failure" test toggle wired to the
  real "Proceed to Checkout" button on `/cart`. Full details in
  `.ai/reports/phase-7-report.md`.
- **Phase 8**: buyer order history (`GET /orders[/:id]`,
  `POST /orders/:id/cancel`) and seller order management
  (`GET /seller-orders[/:id]`, `PATCH /seller-orders/:id/status` with a
  fixed transition table); `Order.status` derivation from its
  `SellerOrder`s; `/orders[/[id]]` and `/seller/orders[/[id]]` (the latter
  replacing a Phase 3 placeholder). Full details in
  `.ai/reports/phase-8-report.md`.
- **Phase 9**: digital entitlements (`GET /entitlements`,
  `GET /entitlements/:productId/download`) resolving dynamically to the
  latest `DigitalProductVersion`; seller digital-version upload
  (`POST /products/me/:id/digital-versions`); cart blocks re-buying an
  owned digital product; `/account/library` + "already owned" state on
  the product page. Full details in `.ai/reports/phase-9-report.md`.
  Phases 7-9 together: 34 new automated backend tests (150 total); found
  and fixed 4 real bugs via real-browser testing (a transaction-abort bug
  in checkout finalization, a 401-retry gap in `apiClient`, a
  render-body `router.replace()` crash, and a disabled-query
  `isLoading`-timing bug) — see the phase reports and the Architectural
  Decisions above for each. Phase 9's own new pages
  (`/account/library`, the product page's "already owned" state) were not
  given a completed live browser click-through in Phase 9's own session
  (dev environment had degraded too far by that point) — **this gap was
  closed in Phase 10's verification pass**, confirmed live with a freshly
  registered buyer account.
- **Phase 10**: buyer reviews (`POST /reviews`, `GET /reviews`,
  `GET /reviews/me/store`) gated on the reviewed `OrderItem`'s
  `SellerOrder` being `DELIVERED`; product/store rating aggregation wired
  into the public marketplace endpoints; product reports
  (`POST /product-reports`) with one active report per user per product;
  admin report review (`GET/POST /admin/product-reports...`, the third
  consumer of the Phase 3 admin shell's list/detail/approve-reject
  pattern); the seller dashboard's Reviews tab is now real (was a Phase 3
  placeholder — only Dashboard/Analytics remain, both Phase 11). 15 new
  automated backend tests (165 total). Full details in
  `.ai/reports/phase-10-report.md`, including the Phase 9 browser-gap
  closure and an honest account of auth-rate-limiter flakiness hit during
  this phase's own verification pass (resolved each time by restarting
  the backend dev process; not a product defect).
- **Phase 11**: `ProductView`'s first writer (`POST
  /marketplace/products/:slug/view`, optional auth, mutually-exclusive
  `userId`/`visitorId`); `GET /seller-dashboard/overview` (product/order
  counts, total revenue, rating, recent orders) and `GET
  /seller-dashboard/analytics` (views/units-sold/revenue, total and
  per-product); `/seller` (Dashboard) and `/seller/analytics` are now real
  — every Seller Dashboard tab from Phase 3's shell is now filled in.
  12 new automated backend tests (172 total). Full details in
  `.ai/reports/phase-11-report.md`; verification was a single clean
  live-browser pass with no rate-limiter friction (kept the anonymous half
  of the check auth-free specifically to conserve that budget after
  Phase 10's pass exhausted it repeatedly).
- **Phase 12**: `notify()` shared util wired into every existing flow the
  `NotificationType` enum already covers (seller application
  approve/reject, product approve/reject, checkout payment success +
  order placed, seller-order shipped/delivered, review creation);
  `GET /notifications`, `POST /notifications/:id/read`,
  `POST /notifications/read-all`; `NotificationBell` mounted in
  `SiteHeader`, `/account`, and `/seller`'s layouts, polling every 30s.
  10 new automated backend tests (182 total). Full details in
  `.ai/reports/phase-12-report.md`; live-browser verification deliberately
  routed through in-app link clicks instead of hard navigations to avoid
  the rate-limiter exhaustion Phase 10/11 hit repeatedly — confirmed both
  a real checkout producing live notifications for buyer and seller, and
  both mark-as-read and mark-all-as-read correctly updating the unread
  badge.
- **Phase 13**: `POST /refunds` (SellerOrder-scoped, full-total-only,
  gated on the order actually being paid) and `GET /refunds/me`;
  `GET/POST /admin/refunds/...` (list/detail/approve→`PROCESSED`/reject),
  the admin shell's next consumer; `Payment.status` derivation
  (`REFUNDED`/`PARTIALLY_REFUNDED`) recomputed on every approval;
  `REFUND_UPDATE` notifications (Phase 12's one unwired enum value) now
  fire on approve/reject; `/orders/[id]` gained a "Request a refund"
  control per SellerOrder, and `/admin/refunds[/[id]]` are new. 12 new
  automated backend tests (191 total). Full details in
  `.ai/reports/phase-13-report.md`, including two real bugs found and
  fixed via this phase's own browser verification: a pre-existing Phase 1
  seed row scoped to `orderItemId` (predating this phase's real
  sellerOrderId-only scope decision) crashed the admin refunds screen —
  fixed the seed row, added a defensive query filter, and re-seeded the
  dev database; and a genuine "transaction already closed" error under
  sandbox load (not the automated suite, which stayed green throughout)
  led to raising checkout's interactive-transaction timeout to 15s.
- **Phase 14** (the last roadmap phase before cross-cutting
  hardening/polish, 15-18): `GET /admin-dashboard/overview` (platform-wide
  stats + a pending-actions list linking into every existing admin
  queue); `GET /admin/audit-logs` (the first real UI for `AuditLog`,
  Phase 1); `GET/POST /admin/users/...` (list/detail/suspend-reactivate
  account/suspend-reactivate store — the actual gap, since nothing
  before this phase ever *set* a user or store to `SUSPENDED`, only
  enforced it once set). `/admin` replaced its Phase 3 redirect stub with
  a real overview page; `/admin/audit-logs` and `/admin/users[/[id]]` are
  new. 12 new automated backend tests (203 total). Full details in
  `.ai/reports/phase-14-report.md`.
- **Phase 15** (hardening pass, no new feature): `npm audit` clean on
  backend, frontend's 12 findings triaged and accepted as upstream-blocked
  (nested in `next`'s own `postcss`/`sharp`, no non-major fix exists); a
  second rate limiter (`writeRateLimiter`) extended to checkout, refunds,
  reviews, product reports, and change-password; bounded
  password-adjacent fields that feed `bcrypt.compare`; a shared
  `httpUrlSchema` closing a `javascript:`/`data:`-URI gap in every
  image/logo/banner field; a real information-disclosure fix in
  `errorHandler.ts` (production no longer echoes raw internal error
  messages); systematic (not sampled) confirmation that every ownership
  check and every admin/seller route gate is correctly in place; baseline
  security headers added to the frontend (`next.config.ts`). 10 new
  automated backend tests (208 total). Full details in
  `.ai/reports/phase-15-report.md`.
- **Phase 16** (polish pass, no new feature): fixed the one
  un-breakpointed responsive grid found app-wide (seller analytics' stat
  cards, now stacking to one column below `sm`); added accessible names
  (`aria-label`) to 7 previously placeholder-only inputs/buttons across 6
  files (site search, cart/product quantity inputs, admin filters/search,
  product-form image URL fields), plus `aria-current` on the product
  page's thumbnail carousel; added `loading="lazy"` to every grid/
  thumbnail/list-item image across 5 files, deliberately leaving each
  page's LCP-candidate hero image at eager loading; confirmed
  loading/error states already comprehensive (192 `isLoading`/
  `isPending`/`isError` occurrences across 42 route files, all from
  Phases 0-14) and TanStack Query caching defaults and bundle size (1.3MB
  JS, 6 runtime dependencies) already reasonable — both audited and left
  unchanged rather than modified for their own sake. Full details in
  `.ai/reports/phase-16-report.md`.
- **Phase 17** (SEO + production readiness, no new user-facing feature):
  `/products/[slug]` and `/stores/[slug]` split into Server Component
  wrappers (`generateMetadata` + `schema.org` JSON-LD via the new
  `frontend/src/lib/jsonLd.ts` helper) around their existing client
  components, unchanged; root layout gained `metadataBase`/title
  template/Open Graph/Twitter defaults; `frontend/src/app/sitemap.ts` and
  `robots.ts` (new); `noindex` meta tags on the three private dashboard
  layouts; `backend/src/config/env.ts`'s `DATABASE_URL` now fails fast
  like every other required env var; `/api/v1/health` now verifies real
  database connectivity (`503` if unreachable, was an unconditional
  `200`); `poweredByHeader: false` added to `next.config.ts`. One new
  backend test (`health.test.ts`, 209 total). Full details in
  `.ai/reports/phase-17-report.md`, including a real bug found and fixed
  via this phase's own live-browser verification (a title-template
  inheritance gap on `/products/[slug]`) and a real robustness fix (the
  sitemap generator no longer crashes the production build if the
  backend is briefly unreachable).

## What Should Not Be Implemented Yet

- Real payment provider integration (Paystack or otherwise) — the
  simulated gateway (Phase 7) stands in until real credentials are
  provided
- Partial-item or custom-amount refunds, automated refund
  rules/policies, and stock restocking on refund — Phase 13 is
  whole-SellerOrder-at-full-total, manual-only, money-only
- Review editing/deletion, and seller responses to reviews — Overview §23
  describes one-time creation only; both are unrequested scope beyond it
- Payouts, and date-range filtering on analytics — both explicitly future
  scope/unrequested per Overview §26; analytics figures are all-time
- Bulk admin user actions and general user-profile editing from the admin
  side — Phase 14 is status management (suspend/reactivate) only
- A frontend Content-Security-Policy — Phase 15 deliberately left this out
  pending a dedicated per-page verification pass; the other four security
  headers are live, this one specifically is not
- Fixing the frontend's nested `postcss`/`sharp` `npm audit` findings
  directly (downgrading `next` is not a real fix) — blocked on upstream;
  see `.ai/reports/phase-15-report.md`
- Two-factor auth, CAPTCHA, IP-reputation blocking — not requested by
  Overview.md/roadmap; the two rate limiters are this project's V1 ceiling
- `next/image` adoption and a UI component library — Phase 16 confirmed
  the hand-built Tailwind + manual `loading="lazy"` approach is already
  lean (1.3MB JS, 6 runtime deps); `next/image` also needs the
  Cloudinary/image-loader decision this project hasn't made yet
- Error-tracking/APM integration (Sentry or similar) — needs real
  credentials/a chosen provider, same precedent as Cloudinary/a real
  payment provider/a real email provider (Phase 17)
- Process-level crash handlers (`uncaughtException`/`unhandledRejection`)
  — the correct model is "crash, let a supervisor restart," which
  Phase 18's deployment setup should provide (Phase 17)
- Splitting the sitemap via Next's `generateSitemaps()` — only worth it
  once the product catalog is large enough that one sitemap response is
  slow to generate, which it isn't at this project's scale (Phase 17)
- Every feature phase (0-14) plus Phases 15-17's hardening/polish/
  readiness passes are complete. What remains is Phase 18: production
  deployment of frontend, backend, database, and Cloudinary/payment
  provider configuration
- Email/push notification delivery, and real-time (websocket/SSE)
  delivery — Phase 12 is explicitly in-app-only, polling-based
- Cloudinary image upload — store/seller-application logo/banner and product
  images/digital files are plain URL/reference text inputs for now, not real
  uploads; digital "downloads" return a file reference, not an actual file
  stream
- Email verification for email address changes (email changes aren't
  implemented at all yet — see the authentication architecture doc)
- A real email provider integration (password reset uses a dev-only
  console-log stand-in — see `backend/src/services/email.service.ts`)
- Anything beyond what the current phase's report says is done
