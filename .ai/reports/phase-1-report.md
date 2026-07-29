# Phase 1 Report — Database & Core Backend Architecture

Status: **Complete**. All items below were actually run/tested in this
environment, not just assumed to work.

## Before Making Changes

Reviewed the existing repo before starting: `README.md`, `.ai/project-context.md`,
`.ai/reports/phase-0-report.md`, `docs/`, `frontend/`, `backend/` (including the
Phase 0 `HealthCheck`-only `schema.prisma` and `.env`/`.env.example`). No other
prior planning documents existed beyond `thrill1.txt` (already folded into
`project-context.md` during Phase 0) — there was no conflicting older
documentation to reconcile.

## Database Models Created

Grouped by area (see `backend/prisma/schema.prisma` for exact fields and
`docs/architecture/database-architecture.md` for the full design write-up):

- **Users & auth foundation**: `User`, `RefreshToken`, `Address`
- **Sellers & stores**: `SellerApplication`, `Store`
- **Catalog**: `Category`, `Product`, `ProductImage`, `DigitalProductVersion`,
  `ProductView`
- **Cart & wishlist**: `Cart`, `CartItem`, `WishlistItem`
- **Orders (multi-vendor)**: `Order`, `SellerOrder`, `OrderItem`
- **Stock**: `StockReservation`
- **Payments**: `Payment`, `PaymentAttempt`
- **Refunds**: `Refund`
- **Digital access**: `DigitalEntitlement`
- **Reviews & moderation**: `Review`, `ProductReport`
- **System**: `Notification`, `AuditLog`

18 enums back these models (`UserRole`, `UserStatus`,
`SellerApplicationStatus`, `StoreStatus`, `CategoryStatus`, `ProductType`,
`ShippingType`, `ProductStatus`, `OrderStatus`, `SellerOrderStatus`,
`StockReservationStatus`, `PaymentStatus`, `PaymentAttemptStatus`,
`RefundStatus`, `ProductReportStatus`, `NotificationType`).

No entities beyond the requested list were added.

## Important Relationships

- `User ←1:1→ SellerApplication` (unique `userId` — same row is edited and
  resubmitted, never duplicated) and `User ←1:1→ Store` (seller capability is
  a capability, not a role — see decisions below).
- `Store →1:N→ Product`, `Category →1:N→ Product`.
- `User →1:1→ Cart →1:N→ CartItem →N:1→ Product`.
- **`Order →1:N→ SellerOrder →1:N→ OrderItem`** — the core multi-vendor
  structure. Verified directly (see "Tests Performed") that one checkout
  across 2 stores produces exactly one `Order` row with 2 `SellerOrder`
  children, not 2 separate orders.
- `Order →1:1→ Payment →1:N→ PaymentAttempt`.
- `Product →1:N→ Review`, `User →1:N→ Review`, each `Review` tied to a unique
  `OrderItem` (proof of a qualifying purchase).
- `Product →1:N→ ProductReport`, `User →1:N→ ProductReport` (as reporter).
- `User →1:N→ DigitalEntitlement ←N:1← Product`, each also referencing the
  `OrderItem` that granted it.
- `User →1:N→ Notification`, `User →1:N→ AuditLog` (as actor, nullable).

## Business Rules Enforced At The Database Level

- Globally unique `User.email` and `User.username`.
- Globally unique `Store.slug`, `Product.slug`, `Category.slug`.
- `SellerApplication.userId` unique — one application row per user, ever.
- `Store.sellerId` unique — one store per user.
- `Cart.userId` unique — one cart per user.
- `CartItem` unique on `(cartId, productId)` — no duplicate line items.
- `WishlistItem` unique on `(userId, productId)` — no duplicate saves.
- `DigitalEntitlement` unique on `(userId, productId)` — one access record per
  product regardless of version count.
- `Review.orderItemId` unique — one review per qualifying purchase line.
- `Payment.orderId` unique, `Payment.providerReference` unique.
- `DigitalProductVersion` unique on `(productId, version)`.
- **`ProductReport`: a hand-written partial unique index** —
  `(reporterId, productId) WHERE status = 'PENDING'` — enforces "one active
  report per user per product" while still allowing a new report after a
  previous one was resolved/dismissed. Added via
  `prisma/migrations/20260728093232_product_report_partial_unique/migration.sql`
  since Prisma's schema syntax can't express a conditional unique constraint.
- Deliberate `onDelete` on every relation touching historical data —
  `Restrict` for anything tied to orders/payments/entitlements/reviews,
  `SetNull` for admin-reviewer references, `Cascade` only for genuinely
  ephemeral or structural-child data. Full table in
  `docs/architecture/database-architecture.md`.

## Migration Status

Two migrations, both applied against the local `vendora-postgres` dev
container and confirmed in sync (`prisma migrate dev` reports "Your database
is now in sync with your schema"):

1. `20260728093140_init_domain_schema` — the full schema replacing Phase 0's
   throwaway `HealthCheck` model.
2. `20260728093232_product_report_partial_unique` — the hand-written partial
   unique index described above.

Getting to migration 1 required a database reset (`prisma migrate reset
--force`), since the Phase 0 `HealthCheck` table had one row in it and
`prisma migrate dev` refuses non-interactive destructive confirmations. **This
required explicit user consent**, which was requested and given before
running the reset (the container is a disposable local dev database created
in Phase 0 specifically for this project, holding only a Phase 0 test row —
not a shared or production database).

## Seed Data Created

`backend/prisma/seed.ts` — deletes all data (child-first, FK-safe order) and
re-inserts, so it's safe to re-run. Confirmed idempotent by running it twice
in a row. Creates:

- **Users**: 1 admin (`admin@vendora.test`), 1 buyer (`buyer@vendora.test`),
  2 approved sellers (`seller1@vendora.test`, `seller2@vendora.test` — two,
  not one, specifically so the multi-vendor order scenario has two real
  stores to split across). All share one dev-only password
  (`VendoraDev123!` by default, overridable via `SEED_USER_PASSWORD`),
  bcrypt-hashed — never stored or logged in plaintext except the intentional
  console message telling a developer what it is.
- **Stores**: "Aria Electronics" and "Nkem Books & Prints", both approved.
- **Categories**: Electronics, Home & Living, Digital Downloads, Fashion,
  Books & Media.
- **Products**: 1 approved physical (earbuds), 1 approved digital (e-book,
  with 2 `DigitalProductVersion` rows to exercise "latest version"
  resolution), 1 draft, 1 pending-review, 1 rejected (with a
  `rejectionReason`), 1 archived, plus 1 additional approved physical product
  (tote bag) used for cart/wishlist data.
- **Orders**: 1 completed single-vendor order (paid, delivered, reviewed, and
  a refund request logged against it) and 1 multi-vendor order spanning both
  stores with independent `SellerOrder` statuses (`SHIPPED` vs. `DELIVERED`)
  under one `PARTIALLY_SHIPPED` parent order — plus its `Payment`, a
  `DigitalEntitlement` from the digital line item, and a `StockReservation`.
- Supporting data: one `CartItem`, one `WishlistItem`, `ProductView` rows
  (both authenticated and anonymous), one `ProductReport`, several
  `Notification` rows, and three `AuditLog` rows.

No fake payment records claim a real payment occurred — `Payment.provider` is
literally `"simulated"` for all seeded payments.

## Backend Core Architecture

- `src/config/prisma.ts` — shared `PrismaClient` singleton; `server.ts` now
  disconnects it (and closes the HTTP server) on `SIGINT`/`SIGTERM`.
- `src/middlewares/validate.ts` — generic `validate(schema, target)` Zod
  middleware factory (`body`/`query`/`params`), parses-and-replaces the
  request part or forwards a 400 `ApiError` with `.flatten()`ed issues.
  Verified against zod v4's actual error shape before relying on `.flatten()`.
- `src/utils/asyncHandler.ts` — wraps async controllers so rejected promises
  reach the centralized error handler.
- `src/utils/pagination.ts` — `parsePagination`/`toSkipTake`/
  `buildPaginationMeta` helpers (page/limit parsing with sane caps, no feature
  wired to them yet).
- No new feature modules/routes were added — Phase 1 explicitly scopes this
  to schema + reusable architecture, not new endpoints.

## Tests Performed

All of the following were actually executed against the seeded database, not
assumed:

- `npx prisma format` / `validate` / `generate` — all clean.
- `npx tsc --noEmit` on the backend — clean after adding the new utilities.
- **28 targeted checks** (written as a temporary script, run, and then
  deleted) covering every relationship the phase spec asked for:
  `User → SellerApplication`, `User → Store`, `Store → Products`,
  `Product → Category`, `User → Cart`, `Cart → CartItems`,
  `Order → SellerOrders`, `SellerOrder → OrderItems`, `Order → Payment`,
  `Product → Reviews`, `User → Reviews`, `Product → ProductReports`,
  `User → Notifications`, `User → DigitalEntitlements` — all passed.
- **Multi-vendor order check**: confirmed the seeded multi-vendor order is
  exactly **one** `Order` row with **two** `SellerOrder` children pointing at
  two distinct stores, both referencing the same single parent order id (not
  duplicated).
- **Digital product chain check**: walked
  `User → DigitalEntitlement → OrderItem → SellerOrder → Order → buyer` and
  confirmed it resolves back to the same user; confirmed the entitlement
  resolves to the product's version 2 (latest, via `MAX(version)`) even
  though the purchase happened when only version 1 existed at write time in
  the narrative.
- **Historical integrity check**: updated the seeded earbuds product's
  `price` and `name`, re-read the existing `OrderItem`, and confirmed
  `priceSnapshot`/`productNameSnapshot` were unchanged — then reverted the
  product back to its original values.
- **Constraint checks**: confirmed a duplicate `WishlistItem(userId,
  productId)` is rejected by the unique constraint, and confirmed a second
  `PENDING` `ProductReport` from the same user on the same product is
  rejected by the partial unique index.
- Backend health check (`GET /api/v1/health`) re-confirmed working after all
  schema/server.ts changes.

## Issues Encountered

1. **`prisma migrate dev` refused to run non-interactively** once it detected
   a destructive change (dropping the non-empty Phase 0 `HealthCheck` table).
   Resolved by using `prisma migrate reset --force` instead — which itself
   required explicit user consent per Prisma's AI-agent safety guard (see
   "Migration Status" above). This was the correct outcome, not a workaround
   to route around: irreversible database actions should require a human to
   say yes.
2. **Prisma can't express a partial (conditional) unique index** in
   `schema.prisma` for the "one active report" rule. Resolved by generating an
   empty migration with `--create-only` and hand-writing the `CREATE UNIQUE
   INDEX ... WHERE` SQL into it, then applying normally.
3. Minor schema-authoring mistake caught before running anything: initially
   swapped the relation field names in `ProductReport` (had `Product`'s field
   named `reporter` and the reporting `User`'s field named `reportedBy`).
   Caught and fixed via a second edit pass before validating/generating.

## Architectural Decisions Made

- **Seller status is a capability granted by an approved `Store`, not a
  `User.role` value.** `UserRole` is only `USER`/`ADMIN`. This was the
  specific judgment call the phase spec asked for regarding "should seller
  status be a role" — chosen because it directly and simply supports "an
  approved seller can still behave as a buyer" without any conditional logic
  based on role.
- **`Order.status` and `SellerOrder.status` are separate enums**, with
  `PARTIALLY_*` states only on the parent `Order`, to represent one seller
  shipping while another is still processing without forcing every
  `SellerOrder` to understand the concept of "partially" (a `SellerOrder`'s
  own items always move together).
- **No `isLatest` flag on `DigitalProductVersion` and no per-version
  `DigitalEntitlement`.** Latest version is resolved by querying
  `MAX(version)`, avoiding a redundant flag that could drift.
- **No `isAvailable`/out-of-stock flag on `Product`.** Availability is derived
  from `stockQuantity`, per the phase spec's explicit guidance against
  redundant availability flags.
- **Categories are flat** (no parent/child) — not needed for V1 per the phase
  spec, and adding it now would be speculative.
- **`bcryptjs` added as a real dependency** (not a placeholder), since seed
  data needed realistic password hashes and Phase 2's auth service will need
  the exact same library — installing it now avoids a wasted extra decision
  later.

## Anything Intentionally Deferred

Everything the phase spec explicitly disallowed: login/register UI, seller
onboarding UI, marketplace pages, cart/checkout UI, real payment integration,
admin dashboard, seller dashboard, and the actual authentication flow (only
the `RefreshToken`/`Address` schema foundation exists — no login/refresh
endpoints). Also deferred, as noted in the Phase 0 report and still true:
the Prisma 6 → 7 major upgrade.

## Decisions For The User Before Phase 2

- Confirm the **seller-status-as-capability** design (approved `Store` rather
  than a `SELLER` role value) matches intent — this affects how Phase 2's
  auth/authorization checks will need to read "is this user allowed to act as
  a seller" (check for an active `Store`, not a role).
- Confirm the **`Order`/`SellerOrder` status enum split** is the right shape
  before any order-processing logic is built on top of it in a later phase.
- No other open questions — schema, migrations, and seed data are all in a
  tested, working state.
