# Vendora

Vendora is a multi-vendor e-commerce marketplace portfolio project. Buyers can shop
products from many independent sellers in a single checkout, and any buyer can apply
to become a seller and run their own store within the marketplace.

This repository is being built incrementally, phase by phase. See
[`.ai/project-context.md`](.ai/project-context.md) for the current development phase
and architectural decisions, and [`.ai/reports/`](.ai/reports/) for a per-phase log of
what has actually been implemented and verified.

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
- JWT access tokens + database-backed, rotating refresh tokens in an
  `HttpOnly` cookie (see [`docs/architecture/authentication-architecture.md`](docs/architecture/authentication-architecture.md))

**Database**
- PostgreSQL
- Prisma ORM

**Planned integrations** (not yet fully wired in)
- Cloudinary (image storage)
- A payment provider for NGN payments (provider-agnostic architecture)
- An email provider

## Repository Structure

```text
vendora/
├── frontend/       # Next.js application
├── backend/        # Express API
├── docs/           # Project documentation
├── .ai/            # AI development context and phase reports
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
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API, e.g. `http://localhost:4000` |

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

See [`docs/architecture/authentication-architecture.md`](docs/architecture/authentication-architecture.md)
for how these are used.

Never commit `.env` or `.env.local` files — only the `.example` versions are tracked.

## Running the Database (Prisma + PostgreSQL)

Point `DATABASE_URL` in `backend/.env` at any reachable PostgreSQL instance. For local
development, a disposable Docker container works well:

```bash
docker run --name vendora-postgres \
  -e POSTGRES_USER=vendora \
  -e POSTGRES_PASSWORD=vendora_dev_password \
  -e POSTGRES_DB=vendora \
  -p 5434:5432 \
  -d postgres:17
```

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
- Frontend → backend integration check: http://localhost:3000/dev/health
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
