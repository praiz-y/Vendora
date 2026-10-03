# Vendora

Vendora is a multi-vendor e-commerce marketplace portfolio project. Buyers can shop
products from many independent sellers in a single checkout, and any buyer can apply
to become a seller and run their own store within the marketplace.

**Live demo:** https://vendora-chi-eight.vercel.app

> The API runs on a free Render instance that sleeps when idle — the first
> request after a quiet spell can take up to a minute while it wakes up.

![Browse products: filters by category, type, and price across all stores](screenshots/products.png)

| Product page | Homepage |
| --- | --- |
| ![Product page with image gallery, rating, shipping, and add to cart](screenshots/product-detail.png) | ![Homepage hero carousel and shop-by-category grid](screenshots/home.jpg) |

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Buyer | `buyer@vendora.test` | `VendoraDev123!` |
| Seller | `seller1@vendora.test` | `VendoraDev123!` |

The demo is seeded with ~120 products across 8 stores, plus buyers, orders, and
reviews. Product names, descriptions, and photos come from
[DummyJSON](https://dummyjson.com), a free fake-data API.

Payments are simulated — no real card is charged. The checkout page has a
"simulate failure" toggle to demonstrate the failed-payment and retry flow.

## Features

**Buyers**
- Browse and search products across stores, with category, rating, and price filters
- Guest cart that carries over on login; wishlist
- One checkout across multiple sellers — split into per-seller orders behind the scenes
- Stock reserved during checkout so items can't be oversold
- Physical and digital products — digital purchases land in a download library
- Order history, refund requests, reviews, product reports, and in-app notifications

**Sellers**
- Apply to sell; an admin approves the application before the store goes live
- Manage products (images via Cloudinary), orders, reviews, and store profile
- Sales analytics dashboard

**Admins**
- Review seller applications, product listings, product reports, and refunds
- Manage users, categories, homepage hero slides, and the site announcement bar
- Audit log of admin actions

## Tech Stack

**Frontend**
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query (server state / data fetching)
- Zustand (client state, used sparingly)

**Backend**
- Node.js + Express
- TypeScript
- Zod (request validation)
- JWT access tokens + database-backed refresh tokens in an `HttpOnly` cookie,
  rotated on every use with reuse detection (a replayed token invalidates the
  whole session)

**Database**
- PostgreSQL
- Prisma ORM

**Hosting**
- Vercel (frontend), Render (API), Neon (PostgreSQL)

**Planned integrations** (not yet fully wired in)
- Cloudinary (image storage — upload signing is built, needs credentials)
- A payment provider for NGN payments (provider-agnostic architecture; currently simulated)
- An email provider (password reset links are only logged today)

## Repository Structure

```text
vendora/
├── frontend/       # Next.js application
├── backend/        # Express API
├── screenshots/    # Images used in this README
├── .gitignore
├── README.md
└── package.json    # Root workspace scripts (runs frontend + backend together)
```

## Prerequisites

- Node.js 20+
- npm
- A PostgreSQL database (local install or Docker container)

## Installation

Install dependencies for the root workspace, frontend, and backend:

```bash
npm run install:all
```

Or install each individually:

```bash
npm install --prefix frontend
npm install --prefix backend
```

## Environment Variables

Copy the example env files and fill in real values for local development:

```bash
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env
```

Frontend (`frontend/.env.local`):

| Variable | Description |
| --- | --- |
| `BACKEND_URL` | Backend API URL, e.g. `http://localhost:4000`. Server-only: the browser calls `/api/*` on the frontend's own origin and Next.js rewrites it here, so auth cookies stay first-party |
| `NEXT_PUBLIC_SITE_URL` | The frontend's public URL, used for canonical URLs, `sitemap.xml` and `robots.txt` |

Backend (`backend/.env`):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `FRONTEND_URL` | Frontend origin, used to configure CORS |
| `PORT` | Port the Express server listens on (default `4000`) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets for access tokens / hashing refresh tokens — use strong random values in production |
| `JWT_ACCESS_TOKEN_TTL` | Access token lifetime (default `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token / session lifetime in days (default `30`) |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Password reset link lifetime in minutes (default `30`) |
| `COOKIE_SAME_SITE` | `SameSite` setting for the refresh cookie (default `lax`) |
| `CLOUDINARY_*` | Reserved for image storage integration |
| `PAYMENT_*` | Reserved for the payment provider integration |

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` have no fallback in production —
the backend refuses to start without them.

Never commit `.env` or `.env.local` files — only the `.example` versions are tracked.

## Running the Database (Prisma + PostgreSQL)

Point `DATABASE_URL` in `backend/.env` at any reachable PostgreSQL instance. For local
development, a disposable Docker container works well:

```bash
docker run --name vendora-postgres \
  -e POSTGRES_USER=vendora \
  -e POSTGRES_PASSWORD=vendora_dev_password \
  -e POSTGRES_DB=vendora \
  -p 5436:5432 \
  -d postgres:17
```

Choose a port that is free on your machine. If another project's PostgreSQL already
holds it, `docker run` fails to bind the port — and a container started without `-p`
at all leaves the app talking to whatever else owns that port instead.

Then, from `backend/`:

```bash
npx prisma generate      # generate the Prisma client
npx prisma migrate dev   # create/apply migrations against the database
npx tsx prisma/seed.ts   # populate with development test data (idempotent)
```

Seeding creates an admin, a buyer, and two approved sellers (with stores,
products in every lifecycle status, and sample orders). All seeded accounts
share one development-only password (`VendoraDev123!` by default, overridable
via `SEED_USER_PASSWORD`) — the seed script prints the credentials it used
when it finishes.

## Running Locally

From the repository root, start both apps together:

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:frontend   # Next.js on http://localhost:3000
npm run dev:backend    # Express on http://localhost:4000
```

Once both are running:
- Frontend: http://localhost:3000
- Backend health check: http://localhost:4000/api/v1/health
- Frontend → backend integration check: http://localhost:3000/dev/health (dev only — 404 in production builds)
- Register / log in: http://localhost:3000/register, http://localhost:3000/login
- Account (requires login): http://localhost:3000/account
- Become a seller (requires login): http://localhost:3000/account/selling
- Seller dashboard (requires an approved store): http://localhost:3000/seller
- Admin (requires an admin account — e.g. the seeded `admin@vendora.test`):
  http://localhost:3000/admin

## Running Backend Tests

The backend's automated tests (`vitest` + `supertest`) run against a second,
dedicated PostgreSQL container so they never touch dev data:

```bash
docker run --name vendora-postgres-test \
  -e POSTGRES_USER=vendora \
  -e POSTGRES_PASSWORD=vendora_test_password \
  -e POSTGRES_DB=vendora_test \
  -p 5435:5432 \
  -d postgres:17

cd backend
DATABASE_URL="postgresql://vendora:vendora_test_password@localhost:5435/vendora_test?schema=public" \
  npx prisma migrate deploy
npm test
```

`backend/.env.test` (gitignored, already configured for the container above)
supplies the test database URL and JWT secrets automatically when `npm test`
runs.

## Deployment

The live demo runs the frontend on Vercel, the API on Render, and PostgreSQL
on Neon.
The browser never calls the API directly: `next.config.ts` rewrites `/api/*` on
the frontend's origin to `BACKEND_URL`, so auth cookies stay first-party and
`SameSite=Lax` keeps working across the two domains.

**Frontend (Vercel)** — Root Directory `frontend`, with `BACKEND_URL` and
`NEXT_PUBLIC_SITE_URL` set. `BACKEND_URL` is read at build time, so redeploy
after changing it.

**Backend (Render)** — Root Directory `backend`, Build Command
`npm ci --include=dev && npm run build` (`--include=dev` keeps Prisma and
TypeScript installed under `NODE_ENV=production`), Start Command
`npm run prisma:deploy && npm start` (applies pending migrations on each
deploy), Health Check Path `/api/v1/health`. Requires
`NODE_ENV=production`, `DATABASE_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, and `FRONTEND_URL` set to the exact Vercel URL (no
trailing slash). `PORT` is provided by Render.

**Database (Neon)** — use the direct connection string (not the `-pooler`
one) as `DATABASE_URL`, keeping `?sslmode=require`.

The seed script wipes every table, so it refuses to run when
`NODE_ENV=production` unless `ALLOW_PRODUCTION_SEED=true` is set explicitly. Set `SEED_ADMIN_PASSWORD` when seeding the
public demo so the admin account doesn't share the published demo password.
