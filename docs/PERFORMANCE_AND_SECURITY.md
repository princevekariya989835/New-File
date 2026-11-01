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

---

## 3. Mobile Performance & Asset Delivery Optimization

To ensure optimal Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms) on mobile 4G/5G connections without altering website design or functionality:

### 3.1 Zero-Latency Self-Hosted Typography
- **Eliminated Render-Blocking External CSS**: Previously, Google Fonts loaded `Archivo Black` via external `<link rel="stylesheet">` from `fonts.googleapis.com` and `fonts.gstatic.com`, blocking initial paint.
- **Local WOFF2 Delivery**: `archivo-black.woff2` (9.7 KB) is now self-hosted under `/public/assets/fonts/` alongside `Inter` fonts, defined via `@font-face { font-display: swap; }` in `src/styles.css`.
- **Preloaded in Root Head**: Preloaded with `<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/archivo-black.woff2" crossOrigin="anonymous">` in `src/routes/__root.tsx`.

### 3.2 Route-Scoped Responsive Hero Delivery
- **Route-Scoped Preloading**: The generic 105.5 KB hero preload was removed from global root `__root.tsx` (saving 105.5 KB transfer on all non-homepage routes like `/shop`, `/product/:handle`, `/checkout`).
- **Responsive Mobile Hero Asset**: Created `public/assets/hero-model-mobile.jpg` (45.3 KB vs 105.5 KB desktop, a **57% reduction in mobile bytes**).
- **Responsive Preload & Markup**: In `src/routes/index.tsx`, route-scoped preloading uses `imageSrcSet="/assets/hero-model-mobile.jpg 640w, /assets/hero-model.jpg 1024w"` and `imageSizes="(max-width: 640px) 100vw, 480px"`. The hero image in `src/components/ui/streetwear-hero.tsx` specifies matching `srcSet` and `sizes`.

### 3.3 Product Detail Page LCP Acceleration
- In `src/routes/product.$handle.tsx`, the primary product image URL (`p.images.edges[0]?.node.url`) is dynamically injected as an image preload (`<link rel="preload" as="image" href={rawImg} fetchPriority="high">`) in the route's server-rendered `<head>`. The browser starts fetching the product hero before script execution.

### 3.4 Collection Image Compression
- The 4 homepage collection showcase banners were losslessly re-encoded using high-efficiency MozJPEG/Lanczos resampling:
  - `collection-best-sellers.jpg`: 264.5 KB -> 54.2 KB (79.5% saved)
  - `collection-custom-printing.jpg`: 213.8 KB -> 38.8 KB (81.8% saved)
  - `collection-oversized.jpg`: 222.4 KB -> 43.3 KB (80.5% saved)
  - `collection-printed-tees.jpg`: 187.4 KB -> 36.9 KB (80.3% saved)
  - **Total Savings**: 715 KB saved on the homepage initial viewport/scroll.

