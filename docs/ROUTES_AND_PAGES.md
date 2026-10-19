# RIOTOUS Routes & Pages Inventory

> **Router**: TanStack Router (`@tanstack/react-router` v1.170.16)  
> **Route Definition Directory**: `src/routes/`

This document provides a verified, complete inventory of all routes in the RIOTOUS application, categorized by customer storefront, administrative console, customer account, authentication, SEO utilities, and API endpoints.

---

## 1. Customer Storefront Routes (Public)

All public storefront routes are server-side rendered (SSR) and configured with canonical URLs pointing to `https://riotous.store`.

| URL Pattern | Source Route File | Lazy Component | Auth Req? | SEO Indexing | DB / API Dependencies | Key Related Components |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `src/routes/index.tsx` | N/A (Direct) | No | `index, follow` (Canonical: `https://riotous.store/`) | `website_published`, `products`, `store_settings` | `website-homepage-content.tsx`, `streetwear-hero.tsx` |
| `/shop` | `src/routes/shop.tsx` | N/A (Direct) | No | `index, follow` (Canonical: `https://riotous.store/shop`) | `products`, `product_variants`, `categories` | `product-card.tsx`, `search-dialog.tsx` |
| `/product/$handle` | `src/routes/product.$handle.tsx` | N/A (Direct) | No | `index, follow` (Canonical: `https://riotous.store/product/:handle`) | `products`, `product_variants`, `product_highlights`, `product_specifications`, `product_offers`, `reviews` | `product-details-unified.tsx`, `product-offers-section.tsx`, `product-size-guide-modal.tsx` |
| `/design` | `src/routes/design.tsx` | `src/routes/design.lazy.tsx` | No | `index, follow` (Canonical: `https://riotous.store/design`) | `design_submissions` | Fabric.js canvas editor, 3D t-shirt mockup preview |
| `/checkout` | `src/routes/checkout.tsx` | N/A (Direct) | No (Guest/User) | `noindex, nofollow` | `orders`, `order_items`, `coupons`, `profiles`, Razorpay API | `cart-store.ts`, Razorpay modal launcher |
| `/about` | `src/routes/about.tsx` | `src/routes/about.lazy.tsx` | No | `index, follow` (Canonical: `https://riotous.store/about`) | Static Content | Brand mission statement, craftsmanship details |
| `/contact` | `src/routes/contact.tsx` | `src/routes/contact.lazy.tsx` | No | `index, follow` (Canonical: `https://riotous.store/contact`) | Support email / `email_logs` | Contact form, customer support channels |
| `/privacy` | `src/routes/privacy.tsx` | N/A (Direct) | No | `index, follow` (Canonical: `https://riotous.store/privacy`) | Static Policy | Legal privacy notice |
| `/terms` | `src/routes/terms.tsx` | N/A (Direct) | No | `index, follow` (Canonical: `https://riotous.store/terms`) | Static Policy | Terms of service |
| `/shipping-policy` | `src/routes/shipping-policy.tsx` | N/A (Direct) | No | `index, follow` (Canonical: `https://riotous.store/shipping-policy`) | Static Policy | Shipping timelines & courier dispatch rules |
| `/refund-policy` | `src/routes/refund-policy.tsx` | N/A (Direct) | No | `index, follow` (Canonical: `https://riotous.store/refund-policy`) | Static Policy | 7-day return policy and refund guidelines |

---

## 2. Authentication & Account Access Routes

| URL Pattern | Source Route File | Lazy Component | Auth Req? | Role / Guard | Notes & Redirects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/auth` | `src/routes/auth.tsx` | `src/routes/auth.lazy.tsx` | No | Any | Unified login / signup modal with email OTP support |
| `/login` | `src/routes/login.tsx` | N/A | No | Any | HTTP 301 Permanent Redirect to `/auth?mode=signin` |
| `/signup` | `src/routes/signup.tsx` | N/A | No | Any | HTTP 301 Permanent Redirect to `/auth?mode=signup` |
| `/reset-password` | `src/routes/reset-password.tsx` | N/A | No | Any | Token-based password reset interface (`X-Robots-Tag: noindex`) |
| `/auth/callback` | `src/routes/auth_.callback.tsx`| N/A | No | Any | OAuth / session callback handler |

---

## 3. Customer Account Routes (`/_authenticated/account.*`)

Protected by `src/routes/_authenticated/route.tsx`. Redirects unauthenticated visitors to `/auth`. All account routes carry `X-Robots-Tag: noindex, nofollow`.

| URL Pattern | Source Route File | Lazy Component | Auth Req? | Role | DB Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/account/orders` | `src/routes/_authenticated/account.orders.tsx` | `account.orders.lazy.tsx` | Yes | Customer / Staff | `orders`, `order_items`, `shipments`, `invoices` |
| `/account/returns` | `src/routes/_authenticated/account.returns.tsx` | `account.returns.lazy.tsx` | Yes | Customer / Staff | `returns`, `orders`, `return_notifications` |
| `/account/favorites`| `src/routes/_authenticated/account.favorites.tsx` | `account.favorites.lazy.tsx` | Yes | Customer / Staff | `favorites`, `products` |
| `/account/reviews` | `src/routes/_authenticated/account.reviews.tsx` | `account.reviews.lazy.tsx` | Yes | Customer / Staff | `reviews`, `orders` |

---

## 4. Administrative Console Routes (`/_authenticated/admin/*`)

Protected by `src/routes/_authenticated/admin/route.tsx`. Requires staff role (`hasAdminPanelAccess`: `Super Admin`, `Admin`, `Manager`, `Staff`). All admin routes carry `X-Robots-Tag: noindex, nofollow`.

| URL Pattern | Route File | Lazy Component | Main Module Functionality |
| :--- | :--- | :--- | :--- |
| `/admin` | `src/routes/_authenticated/admin/index.tsx` | `index.lazy.tsx` | Executive dashboard, revenue statistics, live order feed |
| `/admin/orders` | `src/routes/_authenticated/admin/orders.tsx` | `orders.lazy.tsx` | Order dispatch, Zippyy shipping labels, order status updates |
| `/admin/products` | `src/routes/_authenticated/admin/products.tsx` | N/A (Direct) | Product creation/editing, variant matrices, highlights, offers |
| `/admin/inventory` | `src/routes/_authenticated/admin/inventory.tsx` | `inventory.lazy.tsx` | Real-time stock counts, reservation release, restocking |
| `/admin/returns` | `src/routes/_authenticated/admin/returns.tsx` | `returns.lazy.tsx` | Return request inspection, refund approvals |
| `/admin/reviews` | `src/routes/_authenticated/admin/reviews.tsx` | `reviews.lazy.tsx` | Product review moderation, verified badges |
| `/admin/customers` | `src/routes/_authenticated/admin/customers.tsx` | `customers.lazy.tsx` | Customer spend analytics, user profiles |
| `/admin/coupons` | `src/routes/_authenticated/admin/coupons.tsx` | `coupons.lazy.tsx` | Promo code creation, usage caps, discount validation |
| `/admin/offers` | `src/routes/_authenticated/admin/offers.tsx` | `offers.lazy.tsx` | Product-level promotional deal cards |
| `/admin/designs` | `src/routes/_authenticated/admin/designs.tsx` | N/A (Direct) | Inspection of custom design submissions from `/design` |
| `/admin/storefront`| `src/routes/_authenticated/admin/storefront.tsx` | `storefront.lazy.tsx` | Homepage content, hero banners, curated collections |
| `/admin/marketing` | `src/routes/_authenticated/admin/marketing.tsx` | `marketing.lazy.tsx` | Marketing campaigns, banner schedules |
| `/admin/shipping` | `src/routes/_authenticated/admin/shipping.tsx` | `shipping.lazy.tsx` | Zippyy courier credentials, warehouse pickup configurations |
| `/admin/payments` | `src/routes/_authenticated/admin/payments.tsx` | `payments.lazy.tsx` | Razorpay payment reconciliation, transaction history |
| `/admin/analytics` | `src/routes/_authenticated/admin/analytics.tsx` | `analytics.lazy.tsx` | Sales revenue charts, category performance, conversion rate |
| `/admin/settings` | `src/routes/_authenticated/admin/settings.tsx` | `settings.lazy.tsx` | Store config, GST tax rules, invoice sequences, policies |
| `/admin/staff` | `src/routes/_authenticated/admin/staff.tsx` | `staff.lazy.tsx` | Staff accounts, password resets, role assignment |
| `/admin/health` | `src/routes/_authenticated/admin/health.tsx` | N/A (Direct) | Database ping, memory usage, cache health, API connectivity |
| `/admin/activity` | `src/routes/_authenticated/admin/activity.tsx` | N/A (Direct) | Store audit log tracking administrative modifications |

---

## 5. REST & Webhook API Routes (`src/routes/api/`)

| URL Pattern | Handler File | Method | Auth Req? | Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| `/api/media/:id` | `src/routes/api/media.$id.ts` | `GET` | No | Streams media from `website_media` table with Range requests & 1-year CDN cache |
| `/api/media/upload` | `src/routes/api/media.upload.ts` | `POST` | Yes (Admin) | Ingests base64/binary image uploads into `website_media` table |
| `/api/public/product-image` | `src/routes/api/public/product-image.tsx` | `GET` | No | Ultra-fast binary streaming endpoint for product color variant photos |
| `/api/invoices/:orderId` | `src/routes/api/invoices.$orderId.ts` | `GET` | Yes (Customer/Staff)| Generates GST tax invoice HTML/PDF |
| `/api/razorpay/webhook` | `src/routes/api/razorpay.webhook.ts` | `POST` | Signature | Ingests Razorpay webhook events (`payment.captured`, `payment.failed`) |
| `/api/zippyy/webhook` | `src/routes/api/zippyy.webhook.ts` | `POST` | Signature | Ingests Zippyy logistics courier status updates |
| `/tracking/webhook` | `src/routes/tracking.webhook.ts` | `POST` | Signature | Fallback webhook endpoint for shipment tracking events |
| `/api/products` | `src/routes/api/products.ts` | `GET` | No | Public JSON catalog feed |

---

## 6. SEO & Crawler Directives

| URL Pattern | Handler File | Output Content Type | Purpose |
| :--- | :--- | :--- | :--- |
| `/sitemap.xml` | `src/routes/sitemap[.]xml.ts` | `application/xml` | XML sitemap listing all public indexable storefront routes |
| `/robots.txt` | `src/routes/robots[.]txt.ts` | `text/plain` | Crawler directives allowing storefront and blocking private routes |
| `/llms.txt` | `src/routes/llms[.]txt.ts` | `text/plain` | Clean markdown summary of store catalog for AI search engines |
