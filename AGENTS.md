# RIOTOUS Agent Instructions & Operational Guidelines

Welcome to the **RIOTOUS** ecommerce codebase (`riotous.store`). This document is the mandatory entry point for all AI coding agents and human developers before performing any modifications.

---

## 1. Mandatory Workflow for Every Task

Whenever you receive a task or request:

1. **Check This Document (`AGENTS.md`)**: Re-confirm core project rules and architecture invariants.
2. **Consult `docs/README.md` First**: Use the **Task-to-File Lookup Table** and directory index to find the exact documentation guide matching the task.
3. **Open ONLY the Relevant Documentation**: Do NOT scan the entire repository or read all docs for narrow tasks. Read the specific guide (e.g., `docs/SEO_AND_GOOGLE_INDEXING.md` for SEO, `docs/INVENTORY_AND_ORDERS.md` for stock issues).
4. **Locate Responsible Files via `docs/REPOSITORY_MAP.md`**: Identify the exact entry points, components, server functions, or database queries involved.
5. **Inspect the Active Code Before Modifying**: The inspected code and runtime behavior are authoritative. Never assume docs are 100% up-to-date if code differs—verify line numbers and imports.
6. **Check Invariants & Dependencies**:
   - Check authentication/authorization requirements (`requireAuth` or admin role).
   - Check database compatibility (Cloudflare D1 vs Neon PostgreSQL vs fallback).
   - Check cache invalidation needs (`invalidateCatalogCache`, `invalidatePublicWebsiteConfigCache`, etc.).
7. **Make the Smallest Safe Change**: Modify only what is required to solve the problem cleanly without regression.
8. **Test & Verify**: Run `npm run build` to confirm TypeScript validation and Vite build succeed with zero errors. Run targeted test scripts in `scripts/` if applicable.
9. **Update Documentation**: If your change modifies routes, database schemas, environment variables, APIs, UI conventions, or architectural decisions, update the corresponding markdown file in `docs/` and add an entry in `docs/CHANGELOG.md` or `docs/TASK_HISTORY.md`.
10. **Report Results Clearly**: State what files were modified, why, how they were verified, and any follow-up steps.

---

## 2. Core Architectural Invariants

### A. Admin Panel Real-Time Consistency (CRITICAL)
Whatever is changed in the admin panel (products, prices, inventory, website config, banners, offers, shipping, themes, etc.) **MUST immediately reflect for ALL users**—both logged-in members and non-logged-in guest visitors.
- **Cache Invalidation**: Any admin mutation must immediately call its corresponding cache invalidation function:
  - Catalog / Products: `invalidateCatalogCache()` in `src/lib/catalog.ts`
  - Website Config / Homepage: `invalidatePublicWebsiteConfigCache()` in `src/lib/website-config.functions.ts`
  - Images / Media: `invalidateImageCache()` in `src/lib/product-images.ts`
  - Coupons: `invalidateCouponCache()` in `src/lib/coupons.functions.ts`
  - Orders / Shipments: `invalidateOrderCache()` in `src/lib/orders.functions.ts`
- Never introduce persistent in-memory caching that cannot be busted on admin update.

### B. Dual Database Runtime (Cloudflare D1 + Neon PostgreSQL)
- **Production Edge**: Powered by Cloudflare D1 binding `env.DB` (`riotous-db`).
- **PostgreSQL / Fallback**: Neon PostgreSQL via `@neondatabase/serverless` using `DATABASE_URL`.
- **Local Fallback**: In-memory mock SQL engine when running offline without credentials.
- Always use the database abstraction in `src/lib/db.ts` (`getSql()`, `isD1Active()`). Never write raw engine-specific SQL without checking compatibility.

### C. SSR & Edge Deployment
- **Framework**: TanStack Start (SSR) on Vite 8, React 19.2, TanStack Router.
- **Server Entry**: `src/server.ts` wrapped with Nitro preset `cloudflare_module`.
- **Security & Headers**: Applied automatically in `src/server.ts` (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Last-Modified, X-Robots-Tag).
- **Public vs Private Routes**: Admin (`/admin/*`), Account (`/account/*`), Checkout (`/checkout`), and Auth (`/auth`) routes MUST always carry `X-Robots-Tag: noindex, nofollow`. Public storefront routes (`/`, `/shop`, `/product/:handle`, `/design`, policies) must have indexable canonical URLs.

---

## 3. Technology Stack Reference

- **Frontend**: React 19.2.0, TanStack Router 1.170.x, TanStack Query 5.101.x, Tailwind CSS v4.2.x, Radix UI primitives, Lucide React, Zustand 5, Sonner toast.
- **Backend / SSR**: TanStack Start 1.168.x server functions (`createServerFn`), Nitro 3.x, Cloudflare Workers runtime.
- **Database**: Cloudflare D1 (`riotous-db`, ID `7487ac0f-706e-4560-baf8-e79031b2dd5e`) and Neon PostgreSQL.
- **Payments**: Razorpay (`src/lib/razorpay.server.ts`, Webhook at `src/routes/api/razorpay.webhook.ts`).
- **Shipping & Tracking**: Zippyy API (`src/lib/zippyy/*`, Webhook at `src/routes/tracking.webhook.ts`).
- **Emails**: Brevo API & Resend (`src/lib/email/*`).
- **Media Storage**: `website_media` database table served via streaming endpoint `/api/media/:id` and `/api/public/product-image`.

---

## 4. Key Commands

```bash
# Start local development server (port 3000)
npm run dev

# Full production build check (mandatory before completing tasks)
npm run build

# Start production server bundle locally
npm run start

# Code formatting & linting
npm run lint
npm run format
```

---

## 5. Documentation Map Index

The comprehensive knowledge base is located in `docs/`:

- [docs/README.md](docs/README.md) — Master navigation hub & task-to-file lookup table
- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) — Vision, business model, features, and constraints
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Request lifecycle, SSR, hydration, edge worker layout
- [docs/REPOSITORY_MAP.md](docs/REPOSITORY_MAP.md) — Complete file & directory index with dependencies
- [docs/ROUTES_AND_PAGES.md](docs/ROUTES_AND_PAGES.md) — Inventory of all storefront, admin, auth, and API routes
- [docs/FRONTEND_GUIDE.md](docs/FRONTEND_GUIDE.md) — Components, hooks, state stores, and rendering rules
- [docs/BACKEND_GUIDE.md](docs/BACKEND_GUIDE.md) — Server functions, middleware, error handling, and server entry
- [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) — All 36 database tables, schemas, relations, and types
- [docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md) — Migration history, execution order, and D1 instructions
- [docs/API_REFERENCE.md](docs/API_REFERENCE.md) — REST endpoints, webhooks, and `createServerFn` catalog
- [docs/AUTHENTICATION_AND_AUTHORIZATION.md](docs/AUTHENTICATION_AND_AUTHORIZATION.md) — Sessions, JWT parsing, and staff RBAC
- [docs/ECOMMERCE_WORKFLOWS.md](docs/ECOMMERCE_WORKFLOWS.md) — Cart, checkout, Razorpay, Zippyy fulfillment, returns
- [docs/ADMIN_DASHBOARD.md](docs/ADMIN_DASHBOARD.md) — Admin tabs, permissions, and real-time synchronization
- [docs/INVENTORY_AND_ORDERS.md](docs/INVENTORY_AND_ORDERS.md) — Stock deduction, reservation, audit logging
- [docs/PAYMENTS_AND_CHECKOUT.md](docs/PAYMENTS_AND_CHECKOUT.md) — Razorpay order creation, verification, and webhook
- [docs/PRODUCT_IMAGES_AND_STORAGE.md](docs/PRODUCT_IMAGES_AND_STORAGE.md) — Media storage, upload pipeline, image streaming
- [docs/SEO_AND_GOOGLE_INDEXING.md](docs/SEO_AND_GOOGLE_INDEXING.md) — Sitemap, robots.txt, canonicals, Schema.org JSON-LD
- [docs/CLOUDFLARE_DEPLOYMENT.md](docs/CLOUDFLARE_DEPLOYMENT.md) — Wrangler configuration, Cloudflare Workers, bindings
- [docs/ENVIRONMENT_CONFIGURATION.md](docs/ENVIRONMENT_CONFIGURATION.md) — All environment variable keys and descriptions
- [docs/PERFORMANCE_AND_SECURITY.md](docs/PERFORMANCE_AND_SECURITY.md) — CSP, security headers, caching strategy
- [docs/UI_DESIGN_SYSTEM.md](docs/UI_DESIGN_SYSTEM.md) — Colors, typography, brand assets, component conventions
- [docs/TESTING_AND_DEBUGGING.md](docs/TESTING_AND_DEBUGGING.md) — Verification workflows, test scripts, common fixes
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — Confirmed issues, status, resolutions, and active work
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Chronological history of major updates
- [docs/DECISIONS.md](docs/DECISIONS.md) — Architecture Decision Records (ADRs)
- [docs/TASK_HISTORY.md](docs/TASK_HISTORY.md) — Tracked development tasks and outcomes
