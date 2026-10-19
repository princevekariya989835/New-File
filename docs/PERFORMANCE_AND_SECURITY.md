# RIOTOUS Performance & Security Guide

> **Security Baseline**: Strict CSP • 1-Year HSTS • Edge Header Ingestion • Instant Invalidation Micro-Caching  
> **Key Implementation Files**: `src/server.ts`, `vite.config.ts`, `src/lib/catalog.ts`, `src/lib/product-images.ts`

This guide explains the performance optimization strategies, HTTP security headers, Content Security Policy (CSP), and caching architectures governing the RIOTOUS codebase.

---

## 1. Global Security Headers (`src/server.ts`)

Every HTTP response processed by `src/server.ts` is routed through `applySecurityHeaders()`:

### 1.1 Content-Security-Policy (CSP)
A production-hardened CSP is applied to all HTML document responses:
```text
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://cdn.jsdelivr.net https://www.googletagmanager.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https: http:;
media-src 'self' data: blob: https:;
connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://api.zippyy.in https://sellingpartnerapi-in.zippyy.ai https://api.brevo.com https://*.neon.tech https://*.workers.dev https://www.google-analytics.com https://analytics.google.com data: blob:;
frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com;
object-src 'none';
base-uri 'self';
form-action 'self';
```
- **Razorpay Checkout Support**: Explicitly allows `checkout.razorpay.com` and `api.razorpay.com` for secure payment frames and metric reporting.
- **Analytics & Fonts**: Allows Google Tag Manager and Google Fonts while banning unauthorized third-party scripts.
- **Object Lockdown**: Enforces `object-src 'none'` to block Flash and legacy plugin injection.

### 1.2 Additional Security Headers
- **`Strict-Transport-Security`**: `max-age=31536000; includeSubDomains` (Enforces HTTPS across all subdomains for 1 year).
- **`X-Frame-Options`**: `SAMEORIGIN` (Blocks framing by external domains to prevent clickjacking).
- **`X-Content-Type-Options`**: `nosniff` (Prevents MIME-sniffing attacks).
- **`Referrer-Policy`**: `strict-origin-when-cross-origin` (Protects sensitive path info when navigating off-site).
- **`Permissions-Policy`**: `camera=(), microphone=(), geolocation=(), payment=(self 'https://checkout.razorpay.com')` (Disables unused device hardware while authorizing payment frames).
- **`X-Robots-Tag`**: `noindex, nofollow` automatically attached to all responses under `/admin`, `/account`, `/checkout`, `/auth`, `/reset-password`, and private `/api/*`.

---

## 2. Edge Performance & Caching Strategy

The application leverages a hybrid multi-tier caching model designed for ultra-low latency and immediate consistency:

### 2.1 Tier 1: Static Asset Edge CDN Caching (`vite.config.ts`)
Nitro route rules configure Cloudflare's edge cache with immutable directives:
- `/assets/**`: `Cache-Control: public, max-age=31536000, immutable`
- `/products/**`: `Cache-Control: public, max-age=31536000, immutable`
- `/api/media/**`: `Cache-Control: public, max-age=31536000, immutable`
- `/api/public/**`: `Cache-Control: public, max-age=31536000, immutable`
- `/favicon*`: `Cache-Control: public, max-age=86400`
- `/_server/**` & `/_serverFn/**`: `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`
- `/api/**`: `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`

### 2.2 Tier 2: In-Memory Micro-Caching (Burst Protection)
Short-lived in-memory caches protect the database from query storms while ensuring fresh reads:
- **Product Catalog (`src/lib/catalog.ts`)**: 2-second burst debounce (`_productsCache`, `_productHandleCache`).
- **Storefront Config (`src/lib/website-config.functions.ts`)**: 60-second TTL (`_publicWebsiteConfigCache`).
- **Image LRU Buffer (`src/lib/product-images.ts`)**: 200-image LRU in-memory map.

### 2.3 Tier 3: Instant Admin Invalidation Protocol
Whenever a product, price, inventory count, banner, or coupon is mutated in `/admin/*`, the server function immediately purges the corresponding in-memory micro-cache:
```typescript
invalidateCatalogCache();
invalidatePublicWebsiteConfigCache();
invalidateImageCache();
invalidateCouponCache();
```
This guarantees that changes are immediately reflected across all visitor sessions.
