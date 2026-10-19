# RIOTOUS Project Overview

> **Storefront URL**: [https://riotous.store](https://riotous.store)  
> **Brand**: RIOTOUS — Premium Streetwear & Oversized Apparel  
> **Target Audience**: D2C Indian Streetwear Fashion & Custom Apparel Enthusiasts

---

## 1. What RIOTOUS Does

RIOTOUS is a modern, high-performance direct-to-consumer (D2C) streetwear ecommerce brand based in India. The application serves two core purposes:
1. **Curated Streetwear Fashion Retail**: Selling premium 240+ GSM oversized cotton t-shirts, hoodies, and graphic apparel with custom sizing, detailed garment specifications, and real-time inventory management.
2. **Interactive Custom Design Studio**: Enabling customers to design personalized streetwear on a digital canvas (Fabric.js) with custom typography, clipart, image uploads, and live 2D/3D mockups, submitting designs directly into the fulfillment queue.

---

## 2. Customer-Facing Features

- **High-Performance SSR Storefront**: Server-side rendered with TanStack Start for sub-second first contentful paint (FCP) and optimal SEO discoverability.
- **Dynamic Catalog & Shop**:
  - Filter by category, price, size, and availability.
  - Interactive product detail pages (`/product/:handle`) with multi-angle image galleries, color variant swatches, size pickers, garment measurement tables, care instructions, and manufacturing details.
  - Promotional offers engine displaying tiered quantity discounts, festival sale tags, and promo badges directly on product pages.
- **Custom Design Studio (`/design`)**:
  - Interactive canvas powered by `fabric.js` (v7.4).
  - Front and back garment design switching.
  - Image upload, text placement, color selection, scale/rotation handles, and real-time visual previews.
  - One-click submission into the admin queue.
- **Shopping Cart & Checkout**:
  - Fast slide-out cart drawer with optimistic item adjustments powered by Zustand (`src/stores/cart-store.ts`).
  - Seamless checkout (`/checkout`) supporting shipping address collection, coupon code validation, automated shipping charge rules, and subtotal calculation.
- **Payment Processing**:
  - Seamless Razorpay checkout modal supporting UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and Wallets.
  - Cryptographically verified payments with HMAC SHA-256 signatures and automated fallback via Razorpay webhook.
- **Logistics & Order Tracking**:
  - Integrated with Zippyy courier logistics gateway.
  - Real-time shipment status tracking and webhook ingestion for status updates (`DISPATCHED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`).
- **Customer Account Portal (`/account/*`)**:
  - Customer order history with detailed line-item views, tracking links, and downloadable PDF/HTML tax invoices.
  - Hassle-free return request submissions with photo attachment and reason selection.
  - Favorites/wishlist management.
  - Customer review submission with verified-purchase checks and star ratings.
- **Global Search & Discovery**:
  - Instant keyboard-accessible search modal (`Cmd+K` or search icon) with real-time debounced product matching.

---

## 3. Administrator Features

The management console resides under `/_authenticated/admin` (`/admin/*`) with 19 specialized operational modules:

1. **Dashboard (`/admin`)**: High-level store metrics, sales revenue cards, recent orders, inventory alerts, and quick actions.
2. **Orders (`/admin/orders`)**: Complete order lifecycle manager, filtering by payment and shipping status, line item inspection, customer communication, address modification, and status updates.
3. **Products (`/admin/products`)**: Rich product management system supporting multi-image uploads, size/color variant matrices, promotional offers, highlights, and garment specifications.
4. **Inventory (`/admin/inventory`)**: Real-time stock counts across sizes and colors, low-stock threshold triggers, reserved stock tracking, and audit-logged manual adjustments.
5. **Returns (`/admin/returns`)**: Customer return workflow manager—approve, inspect, reject, or issue refunds for returned items.
6. **Reviews (`/admin/reviews`)**: Customer feedback moderation, verified buyer badges, and approval toggles.
7. **Customers (`/admin/customers`)**: Customer directory, total spend, order count, and profile details.
8. **Coupons (`/admin/coupons`)**: Discount engine supporting percentage and flat discounts, usage limits, minimum order amounts, maximum caps, and date validity.
9. **Offers (`/admin/offers`)**: Flash sale and bundle discount banner management displayed on product pages.
10. **Design Studio Queue (`/admin/designs`)**: Inspection and fulfillment approval for customer-submitted custom tee designs.
11. **Storefront Visual Editor (`/admin/storefront`)**: Live customization of announcement bars, hero banners, curated collections, and navigation menus.
12. **Marketing (`/admin/marketing`)**: Promotional campaigns, email blasts, and banner coordination.
13. **Shipping (`/admin/shipping`)**: Courier gateway settings, warehouse pickup configurations, Zippyy logistics authentication, and live serviceability checks.
14. **Payments (`/admin/payments`)**: Transaction records, Razorpay payment ID lookups, and manual reconciliation tools.
15. **Analytics (`/admin/analytics`)**: Detailed sales charts, category breakdown, conversion statistics, and average order value (AOV) tracking.
16. **Settings (`/admin/settings`)**: Store details, currency, tax rates (GST), invoice prefix, contact information, and policies.
17. **Staff & RBAC (`/admin/staff`)**: Team management with role-based access control (`Super Admin`, `Admin`, `Manager`, `Staff`).
18. **System Health (`/admin/health`)**: Server ping, database query latency, memory consumption, cache health, and external API connectivity status.
19. **Activity Log (`/admin/activity`)**: Real-time audit log tracking all administrative changes across products, inventory, orders, and configurations.

---

## 4. Technology Stack & Frameworks

| Layer | Technology / Package | Purpose |
| :--- | :--- | :--- |
| **Framework** | TanStack Start (`@tanstack/react-start` v1.168.26) | Full-stack React framework with SSR and type-safe server functions |
| **Routing** | TanStack Router (`@tanstack/react-router` v1.170.16) | File-based type-safe client & server routing with code-splitting |
| **Data Fetching** | TanStack Query (`@tanstack/react-query` v5.101.1) | Client-side async state caching, background refetching, and mutations |
| **UI Library** | React 19 (`react` & `react-dom` v19.2.0) | Core component model with React 19 concurrent features |
| **Styling** | Tailwind CSS v4 (`tailwindcss` & `@tailwindcss/vite` v4.2.1) | Modern utility-first CSS styling with `@theme` token definitions |
| **UI Primitives** | Radix UI primitives (`@radix-ui/*`) | Accessible unstyled dialogs, dropdowns, tooltips, tabs, and selects |
| **Icons** | Lucide React (`lucide-react` v0.575.0) | Cohesive icon set across customer storefront and admin dashboard |
| **Canvas / 2D** | Fabric.js (`fabric` v7.4.0) | Interactive custom t-shirt design canvas manipulation |
| **State Management** | Zustand (`zustand` v5.0.14) | Lightweight persistent client state for cart, search, and UI state |
| **Notifications** | Sonner (`sonner` v2.0.7) | Modern stacked toast notification system |
| **Charts** | Recharts (`recharts` v2.15.4) | SVG charts for admin revenue, sales volume, and customer analytics |
| **Server Engine** | Nitro (`nitro` v3.0.260603-beta) | Universal web server engine compiling to Cloudflare Workers module |
| **Edge Hosting** | Cloudflare Workers (`wrangler.json`) | Global edge compute deployment with sub-10ms TTFB across India |
| **Database (Prod)**| Cloudflare D1 (`riotous-db`) | SQLite edge database running native in Cloudflare Workers |
| **Database (Alt)** | Neon PostgreSQL (`@neondatabase/serverless` v1.1.0) | Serverless PostgreSQL via HTTP/WebSocket connection pool |
| **Payments** | Razorpay Node SDK / Webhook | Payment gateway for UPI, credit/debit cards, and automated capture |
| **Shipping** | Zippyy API Gateway | Multi-courier logistics aggregator for automated shipment creation & tracking |
| **Email** | Brevo API & Resend API | Transactional emails with React Email templates (`@react-email/*`) |

---

## 5. Architectural Communication & Data Flow

```text
Visitor Browser / Admin Client
         │
         ▼  (HTTPS / Edge CDN)
Cloudflare Workers Edge Network
         │
         ├── Assets Binding (ASSETS) ──> Static JS, CSS, Media (.output/public)
         │
         ▼
src/server.ts (Security Headers, Canonical Redirects, Error Normalization)
         │
         ▼
TanStack Start / Nitro SSR Server Entry (.output/server/index.mjs)
         │
         ├── Server Functions (createServerFn in src/lib/*)
         │       │
         │       ├── requireAuth Middleware (JWT Signature Verification & Role Check)
         │       │
         │       ├── In-Memory Burst Caches (Catalog 2s TTL, Website Config 60s TTL)
         │       │
         │       └── Database Layer (src/lib/db.ts)
         │               ├── Cloudflare D1 Binding (env.DB) [Production Default]
         │               ├── Neon PostgreSQL Pool (@neondatabase/serverless)
         │               └── Local In-Memory SQL Mock Engine [Offline Dev]
         │
         └── External Integrations
                 ├── Razorpay API (Order creation, signature verification, webhooks)
                 ├── Zippyy API (Shipment creation, label generation, tracking webhooks)
                 └── Brevo / Resend APIs (Transactional order & status emails)
```

---

## 6. Core Architectural Constraints

1. **Admin Mutation Real-Time Propagation**: Any update in `/admin/*` must invalidate the relevant server cache instantly (`invalidateCatalogCache()`, `invalidatePublicWebsiteConfigCache()`, etc.) so all users see changes immediately without delay.
2. **Dual Database Compatibility**: All database migrations and queries in `src/lib/db.ts` must maintain compatibility across Cloudflare D1 (SQLite dialect) and Neon PostgreSQL (PostgreSQL dialect).
3. **Edge Execution Limits**: Cloudflare Workers enforce CPU execution time limits (50ms on free, 30s on paid) and memory constraints (128MB). Heavy computations and image processing must avoid long-running synchronous loops.
4. **Zero Hardcoded Secrets**: All sensitive secrets (Razorpay keys, Zippyy credentials, email API tokens, JWT secrets) are loaded dynamically from environment variables or Cloudflare runtime bindings.
