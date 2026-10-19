# RIOTOUS Project Knowledge Base & AI Agent Navigation Hub

> **Storefront Domain**: [https://riotous.store](https://riotous.store)  
> **Repository Root**: `e:\Riotus WebSite\New-File`  
> **Tech Stack**: TanStack Start (SSR) • Vite 8 • React 19 • Tailwind CSS v4 • Cloudflare Workers / D1 • Neon PostgreSQL • Razorpay • Zippyy

Welcome to the central documentation index for the RIOTOUS ecommerce application. This knowledge base serves as the durable source of truth for software engineers and AI coding agents.

Before modifying code, **locate your task in the Task-to-File Lookup Table below**, read the designated guide, inspect the referenced source files, make targeted modifications, and verify using `npm run build`.

---

## 1. Quick Task-to-File Lookup Table

Use this table to jump directly to the right files without rescanning the codebase:

| Task / Problem Area | Primary Documentation Guide | Primary Source Files to Inspect |
| :--- | :--- | :--- |
| **SEO, Canonical URLs, Sitemap, robots.txt** | [SEO_AND_GOOGLE_INDEXING.md](SEO_AND_GOOGLE_INDEXING.md) | `src/server.ts`, `src/routes/sitemap[.]xml.ts`, `src/routes/robots[.]txt.ts`, `src/routes/index.tsx`, `src/routes/shop.tsx`, `src/routes/product.$handle.tsx` |
| **Product Catalog, Sizes, Colors, Pricing** | [INVENTORY_AND_ORDERS.md](INVENTORY_AND_ORDERS.md), [ECOMMERCE_WORKFLOWS.md](ECOMMERCE_WORKFLOWS.md) | `src/lib/catalog.ts`, `src/lib/fallback-products.ts`, `src/components/admin/product-details-editor.tsx`, `src/routes/product.$handle.tsx` |
| **Inventory Stock Deductions & Low Stock** | [INVENTORY_AND_ORDERS.md](INVENTORY_AND_ORDERS.md) | `src/lib/inventory.service.ts`, `src/routes/_authenticated/admin/inventory.lazy.tsx`, `src/routes/_authenticated/admin/inventory.tsx` |
| **Shopping Cart & Checkout Flow** | [PAYMENTS_AND_CHECKOUT.md](PAYMENTS_AND_CHECKOUT.md), [ECOMMERCE_WORKFLOWS.md](ECOMMERCE_WORKFLOWS.md) | `src/stores/cart-store.ts`, `src/components/cart-drawer.tsx`, `src/routes/checkout.tsx`, `src/lib/cart.functions.ts` |
| **Razorpay Payment Gateway & Webhook** | [PAYMENTS_AND_CHECKOUT.md](PAYMENTS_AND_CHECKOUT.md) | `src/lib/razorpay.server.ts`, `src/routes/api/razorpay.webhook.ts`, `src/routes/checkout.tsx` |
| **Zippyy Courier & Shipment Tracking** | [ECOMMERCE_WORKFLOWS.md](ECOMMERCE_WORKFLOWS.md), [ZIPPYY_INTEGRATION_PRD.md](ZIPPYY_INTEGRATION_PRD.md) | `src/lib/zippyy/client.ts`, `src/lib/zippyy/shipment.service.ts`, `src/routes/tracking.webhook.ts`, `src/routes/api/zippyy.webhook.ts` |
| **Coupons, Discounts & Promo Offers** | [ECOMMERCE_WORKFLOWS.md](ECOMMERCE_WORKFLOWS.md) | `src/lib/coupons.functions.ts`, `src/components/product/product-offers-section.tsx`, `src/routes/_authenticated/admin/coupons.lazy.tsx` |
| **Product Images & Media CDN Streaming** | [PRODUCT_IMAGES_AND_STORAGE.md](PRODUCT_IMAGES_AND_STORAGE.md) | `src/lib/product-images.ts`, `src/routes/api/media.$id.ts`, `src/routes/api/public/product-image.tsx`, `src/routes/api/media.upload.ts` |
| **Database Schemas, Tables & SQL Queries** | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) | `src/lib/db.ts`, `migrations/0001_initial_d1_schema.sql`, `migrations/0004_invoices_and_tax_schema.sql` |
| **Admin Panel & Real-time Cache Sync** | [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md) | `src/routes/_authenticated/admin/route.tsx`, `src/lib/admin.functions.ts`, `src/lib/website-config.functions.ts`, `src/lib/catalog.ts` |
| **Authentication, Sign In, Roles & RBAC** | [AUTHENTICATION_AND_AUTHORIZATION.md](AUTHENTICATION_AND_AUTHORIZATION.md) | `src/lib/auth-middleware.ts`, `src/lib/auth.server.ts`, `src/lib/auth.ts`, `src/lib/auth.types.ts`, `src/routes/auth.lazy.tsx`, `src/routes/_authenticated/route.tsx` |
| **Order Processing, Invoices & Tax** | [INVENTORY_AND_ORDERS.md](INVENTORY_AND_ORDERS.md) | `src/lib/orders.functions.ts`, `src/lib/invoice.functions.ts`, `src/routes/api/invoices.$orderId.ts`, `src/routes/_authenticated/admin/orders.lazy.tsx` |
| **Customer Returns & Refund Management** | [ECOMMERCE_WORKFLOWS.md](ECOMMERCE_WORKFLOWS.md) | `src/lib/returns.functions.ts`, `src/lib/returns-shared.ts`, `src/routes/_authenticated/account.returns.lazy.tsx`, `src/routes/_authenticated/admin/returns.lazy.tsx` |
| **Product Reviews & Verified Purchases** | [ECOMMERCE_WORKFLOWS.md](ECOMMERCE_WORKFLOWS.md) | `src/lib/reviews.functions.ts`, `src/components/reviews/product-reviews.tsx`, `src/routes/_authenticated/admin/reviews.lazy.tsx` |
| **Custom 3D / 2D Design Studio** | [ECOMMERCE_WORKFLOWS.md](ECOMMERCE_WORKFLOWS.md) | `src/routes/design.lazy.tsx`, `src/lib/design-submissions.functions.ts`, `src/routes/_authenticated/admin/designs.tsx` |
| **Emails & Transactional Notifications** | [BACKEND_GUIDE.md](BACKEND_GUIDE.md) | `src/lib/email/brevo.ts`, `src/lib/email/resend.ts`, `src/lib/email-templates/order-confirmation.tsx` |
| **Cloudflare Worker Deployment & Wrangler** | [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) | `wrangler.json`, `vite.config.ts`, `src/server.ts`, `scripts/ensure-build-deps.mjs`, `scripts/copy-dist.mjs` |
| **UI Design System, Colors & Tailwind CSS** | [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md), [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) | `src/styles.css`, `src/components/ui/*`, `src/components/site-header.tsx`, `src/components/site-footer.tsx` |
| **Environment Variables & Secrets Setup** | [ENVIRONMENT_CONFIGURATION.md](ENVIRONMENT_CONFIGURATION.md) | `.env.example`, `wrangler.json`, `src/lib/db.ts` |
| **System Health & Server Logging** | [PERFORMANCE_AND_SECURITY.md](PERFORMANCE_AND_SECURITY.md) | `src/lib/server-logger.ts`, `src/lib/admin-health.functions.ts`, `src/routes/_authenticated/admin/health.tsx` |

---

## 2. Master Table of Contents

1. [Architecture & System Foundation](ARCHITECTURE.md) — Request lifecycle, SSR, hydration, security pipeline
2. [Project Overview](PROJECT_OVERVIEW.md) — Business context, customer & admin feature matrix
3. [Repository Map](REPOSITORY_MAP.md) — Exhaustive directory and file catalog with exports and dependencies
4. [Routes & Pages](ROUTES_AND_PAGES.md) — Routing table covering storefront, admin, auth, and API routes
5. [Frontend Guide](FRONTEND_GUIDE.md) — React 19 component design, hooks, and Zustand store management
6. [Backend Guide](BACKEND_GUIDE.md) — TanStack Start server functions, middleware, logging, and error handling
7. [Database Schema](DATABASE_SCHEMA.md) — Comprehensive guide to all 36 database tables and fields
8. [Database Migrations](DATABASE_MIGRATIONS.md) — SQL migrations, execution order, and D1 instructions
9. [API Reference](API_REFERENCE.md) — REST APIs, webhooks, and `createServerFn` catalog
10. [Authentication & Authorization](AUTHENTICATION_AND_AUTHORIZATION.md) — Token authentication, JWT verification, and staff RBAC
11. [Ecommerce Workflows](ECOMMERCE_WORKFLOWS.md) — End-to-end user journeys (Shopping, Checkout, Zippyy, Returns)
12. [Admin Dashboard](ADMIN_DASHBOARD.md) — 19 management modules and real-time cache invalidation
13. [Inventory & Orders](INVENTORY_AND_ORDERS.md) — Stock synchronization, audit logging, and order lifecycle
14. [Payments & Checkout](PAYMENTS_AND_CHECKOUT.md) — Razorpay integration, checkout validation, and webhook security
15. [Product Images & Storage](PRODUCT_IMAGES_AND_STORAGE.md) — In-database media storage, binary streaming, and caching
16. [SEO & Google Indexing](SEO_AND_GOOGLE_INDEXING.md) — Canonical URLs, sitemap, robots.txt, and Schema.org metadata
17. [Cloudflare Deployment](CLOUDFLARE_DEPLOYMENT.md) — Wrangler configuration, D1 bindings, Nitro preset, build pipeline
18. [Environment Configuration](ENVIRONMENT_CONFIGURATION.md) — Environment variables, secrets, and Cloudflare vars
19. [Performance & Security](PERFORMANCE_AND_SECURITY.md) — Security headers, CSP policy, caching layers, and rate limiting
20. [UI Design System](UI_DESIGN_SYSTEM.md) — Dark mode streetwear aesthetic, typography, and component styling
21. [Testing & Debugging](TESTING_AND_DEBUGGING.md) — Build verification, live testing scripts, common issues
22. [Known Issues](KNOWN_ISSUES.md) — Active and resolved issues log with fixes and remaining risks
23. [Changelog](CHANGELOG.md) — Historical log of significant releases and system changes
24. [Decisions (ADRs)](DECISIONS.md) — Architecture Decision Records explaining core technical choices
25. [Task History](TASK_HISTORY.md) — Chronological log of recent development tasks and outcomes

---

## 3. Core Development Commands

All commands are executed from the repository root:

```bash
# 1. Start local dev server with hot module reloading
npm run dev

# 2. Compile full production build (Vite + TanStack Start + Nitro)
npm run build

# 3. Preview production server locally
npm run start

# 4. Run linting & code formatting checks
npm run lint
npm run format

# 5. Targeted test scripts in scripts/
node scripts/test-live.mjs
node scripts/test-zippyy-live.mjs
node scripts/verify-seo-fixes.mjs
```

---

## 4. Key Architectural Constraints

1. **Strict Admin Real-Time Consistency**:
   Whenever an admin updates products, stock, banners, theme, or settings in `/admin/*`, changes must immediately be visible to all users (both guest visitors and signed-in customers). In-memory server micro-caches must be purged via their respective invalidation helpers (`invalidateCatalogCache()`, `invalidatePublicWebsiteConfigCache()`, etc.).
2. **Dual Database Architecture**:
   The application communicates with Cloudflare D1 (`riotous-db`) in production workers, with full fallback compatibility for Neon PostgreSQL (`DATABASE_URL`) and an in-memory SQL mock for offline development. Always use `getSql()` from `src/lib/db.ts`.
3. **Canonical URLs & Search Indexing**:
   All public storefront routes must specify canonical absolute URLs with `https://riotous.store`. Private administrative and customer account routes must return `X-Robots-Tag: noindex, nofollow` headers and meta tags.
4. **Zero Live Credentials in Code**:
   Never commit API keys, database connection strings, or JWT secrets to documentation or code files. All configuration is loaded from environment variables and Cloudflare bindings.

---

## 5. Documentation Maintenance Rules

- Whenever an architectural change is made, update the relevant file in `docs/`.
- Document verified code and actual runtime behavior, not hypothetical designs.
- All internal Markdown links must use relative paths (e.g., `[ARCHITECTURE.md](ARCHITECTURE.md)`).
- When a task is completed, record a concise entry in [docs/TASK_HISTORY.md](TASK_HISTORY.md).
