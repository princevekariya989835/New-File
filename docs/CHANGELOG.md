# RIOTOUS Architecture & Release Changelog

All notable architecture, database, and system modifications are recorded in this document.

---

## [Current Release] — 2026-10-19

### Mobile Performance & Asset Delivery Optimization
- **Eliminated Render-Blocking External Typography**: Self-hosted `Archivo Black` woff2 (9.7 KB) locally in `public/assets/fonts/` with `@font-face` and `font-display: swap` in `src/styles.css`. Removed external Google Fonts CSS and preconnect links from `src/routes/__root.tsx`.
- **Eliminated Global Preload Waste & Optimized Mobile LCP**: Removed wasteful 105.5 KB global `/assets/hero-model.jpg` preload from `src/routes/__root.tsx`. Generated mobile-optimized hero asset `public/assets/hero-model-mobile.jpg` (45.3 KB vs 105.5 KB, 57% savings). Added route-scoped responsive preload in `src/routes/index.tsx` and responsive `srcSet`/`sizes` in `src/components/ui/streetwear-hero.tsx`.
- **Accelerated Product Detail Page LCP**: Added dynamic `<link rel="preload" as="image" fetchPriority="high">` in `src/routes/product.$handle.tsx` for immediate above-the-fold product image discovery.
- **Compressed Collection Card Assets**: Re-encoded 4 collection images in `public/assets/collections/`, saving 715 KB (888 KB -> 173 KB) with zero visual quality or cropping degradation.

### Technical SEO & Google Search Console Optimization
- **Added**: Absolute HTTPS canonical link tags across all 10 public storefront routes (`/`, `/shop`, `/product/:handle`, `/design`, `/about`, `/contact`, `/privacy`, `/terms`, `/shipping-policy`, `/refund-policy`).
- **Added**: Server-level HTTP 301 permanent redirects in `src/server.ts` for apex domain normalization (`www.riotous.store` -> `riotous.store`), trailing slash removal (`/shop/` -> `/shop`), and legacy catalog paths (`/products`, `/collections`, `/catalog`, `/product` -> `/shop`).
- **Updated**: `src/routes/sitemap[.]xml.ts` to exclude all parameterized URLs, include dynamic `<lastmod>` timestamps from the database, and attach `X-Robots-Tag: noindex`.
- **Updated**: `src/routes/robots[.]txt.ts` and `public/robots.txt` with dedicated `Googlebot` directives and explicit allowance for `/api/media/` and `/api/public/` image streaming.
- **Added**: Schema.org JSON-LD structured data (`Product`, `BreadcrumbList`, `Organization`) across product and catalog pages.
- **Verified**: Created and executed `scripts/verify-seo-fixes.mjs`.

### Permanent AI Agent Knowledge Base
- **Added**: Comprehensive 26-document knowledge base under `docs/` and updated root `AGENTS.md`.
- **Added**: Task-to-File Lookup Table in `docs/README.md` enabling instant navigation for future coding sessions.

---

## [Pre-Release] — 2026-09-15

### GST Tax Invoicing System
- **Added**: Database migration `0004_invoices_and_tax_schema.sql` creating `invoices` and `invoice_sequences` tables.
- **Added**: Database migration `0005_add_invoice_fields_to_orders.sql` adding `invoice_number` and `invoice_date` to the `orders` table.
- **Added**: `src/lib/invoice.functions.ts` calculating CGST (9%), SGST (9%), or IGST (18%) and generating sequential invoice references.
- **Added**: Endpoint `GET /api/invoices/:orderId` supporting both HTML and PDF formats.

### Zippyy Courier Logistics Integration
- **Added**: Full client and service integration in `src/lib/zippyy/*`.
- **Added**: Multi-courier dispatch workflow in `/admin/orders` assigning AWBs and generating shipping labels.
- **Added**: Webhook listeners in `src/routes/api/zippyy.webhook.ts` and `src/routes/tracking.webhook.ts` for real-time tracking ingestion.

### Real-Time Admin Consistency Protocol
- **Added**: Instant cache invalidation hooks (`invalidateCatalogCache()`, `invalidatePublicWebsiteConfigCache()`, `invalidateImageCache()`, `invalidateCouponCache()`) triggered on every administrative mutation.
- **Refactored**: Replaced static long-lived caching with 2-second burst debouncing in `src/lib/catalog.ts`.

### Cloudflare D1 Native Database Binding
- **Added**: Native `d1_databases` binding `DB` (`riotous-db`) in `wrangler.json`.
- **Added**: Multi-engine abstraction in `src/lib/db.ts` seamlessly selecting D1 at the edge, Neon PostgreSQL in Node environments, or offline in-memory mocks.

### Interactive Custom Design Studio
- **Added**: Fabric.js canvas editor at `/design` (`src/routes/design.lazy.tsx`) supporting front/back t-shirt artwork creation.
- **Added**: Queue management view at `/admin/designs` and `design_submissions` table.
