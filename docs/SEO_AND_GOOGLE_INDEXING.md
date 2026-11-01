# RIOTOUS Technical SEO & Google Search Indexing Guide

> **Live Storefront**: [https://riotous.store](https://riotous.store)  
> **Key Files**: `src/server.ts`, `src/routes/sitemap[.]xml.ts`, `src/routes/robots[.]txt.ts`, `public/robots.txt`, `scripts/verify-seo-fixes.mjs`

This guide documents the technical SEO architecture, canonical URL rules, sitemap generation, crawler directives, and structured data implementation across the RIOTOUS codebase.

---

## 1. Google Search Console & Indexing Strategy

### 1.1 Objective
Ensure that **all important, index-worthy public storefront pages** are discovered, rendered, and indexed by Googlebot, while **private, duplicate, utility, and parameterized non-canonical pages** are strictly excluded.

### 1.2 The 10 Core Indexable Public Routes
Only the following 10 clean URL paths are eligible for search indexing:
1. `https://riotous.store/` — Homepage
2. `https://riotous.store/shop` — Streetwear Catalog & Collections
3. `https://riotous.store/product/:handle` — Individual Product Detail Pages
4. `https://riotous.store/design` — Custom T-Shirt Design Studio
5. `https://riotous.store/about` — Brand Story & Craftsmanship
6. `https://riotous.store/contact` — Customer Support & Inquiries
7. `https://riotous.store/privacy` — Privacy Policy
8. `https://riotous.store/terms` — Terms of Service
9. `https://riotous.store/shipping-policy` — Shipping & Dispatch Policy
10. `https://riotous.store/refund-policy` — 7-Day Return & Refund Policy

---

## 2. Canonical URL Management

### 2.1 Absolute HTTPS Origin Enforcement
Every public route specifies an explicit, absolute canonical link tag in its route `head` definition:
```typescript
head: () => ({
  links: [
    { rel: "canonical", href: "https://riotous.store/shop" }
  ],
  meta: [
    { title: "Shop Premium Oversized T-Shirts & Streetwear | RIOTOUS" },
    { name: "description", content: "Explore the latest RIOTOUS streetwear collection..." },
    { name: "robots", content: "index, follow" }
  ]
})
```

### 2.2 Server-Side Canonical Normalization (HTTP 301) in `src/server.ts`
To prevent Google from discovering duplicate variations of URLs:
1. **Apex Domain Redirect**:
   `www.riotous.store` -> `https://riotous.store` (301 Permanent).
2. **Catalog Legacy Alias Normalization**:
   `/products`, `/collections`, `/catalog`, `/product` -> `/shop` (301 Permanent).
3. **Auth Alias Normalization**:
   `/login` -> `/auth?mode=signin` (301 Permanent).  
   `/signup` -> `/auth?mode=signup` (301 Permanent).
4. **Trailing Slash Normalization**:
   Strips trailing slashes (`/shop/` -> `/shop`) to prevent dual-URL indexing.

---

## 3. Dynamic XML Sitemap (`src/routes/sitemap[.]xml.ts`)

- **URL**: `https://riotous.store/sitemap.xml`
- **Content-Type**: `application/xml; charset=utf-8`
- **Rules**:
  1. Contains only valid, indexable canonical URLs.
  2. Queries the `products` table for all active, published items to generate clean `/product/:handle` entries.
  3. Formats `<lastmod>` with real database `updated_at` ISO dates.
  4. Excludes all query parameter URLs (`?sort=`, `?page=`, `?size=`).
  5. Completely excludes private routes (`/admin/*`, `/account/*`, `/checkout`, `/auth`, `/api/*`).

---

## 4. Crawler Directives (`robots.txt`)

- **Files**: `src/routes/robots[.]txt.ts` (Dynamic) & `public/robots.txt` (Static fallback).
- **Directives**:
  ```text
  User-agent: Googlebot
  Allow: /
  Allow: /shop
  Allow: /product/
  Allow: /design
  Allow: /about
  Allow: /contact
  Allow: /privacy
  Allow: /terms
  Allow: /shipping-policy
  Allow: /refund-policy
  Allow: /api/media/
  Allow: /api/public/
  Disallow: /admin
  Disallow: /admin/
  Disallow: /account
  Disallow: /account/
  Disallow: /checkout
  Disallow: /checkout/
  Disallow: /auth
  Disallow: /auth/
  Disallow: /reset-password
  Disallow: /_server/
  Disallow: /_serverFn/
  Disallow: /api/

  User-agent: *
  Allow: /
  Disallow: /admin/
  Disallow: /account/
  Disallow: /checkout/
  Disallow: /auth/
  Disallow: /_server/
  Disallow: /_serverFn/
  Disallow: /api/

  Sitemap: https://riotous.store/sitemap.xml
  ```
- **Image Crawling**: Explicitly permits Googlebot to crawl `/api/media/` and `/api/public/` so product images appear in Google Image Search.

---

## 5. Structured Data (Schema.org JSON-LD)

### 5.1 Product Schema (`src/routes/product.$handle.tsx`)
Injected into the `<head>` of every product detail page:
```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "RIOTOUS Oversized Heavyweight Cotton T-Shirt",
  "image": ["https://riotous.store/api/public/product-image?id=prod_01&idx=0"],
  "description": "240 GSM 100% Super-Combed French Terry Cotton Oversized Streetwear T-Shirt.",
  "sku": "RIO-BLK-01",
  "brand": {
    "@type": "Brand",
    "name": "RIOTOUS"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://riotous.store/product/riotous-oversized-black-tee",
    "priceCurrency": "INR",
    "price": "1499",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition"
  }
}
```

### 5.2 BreadcrumbList Schema
Injected across catalog and product pages to display rich search snippet breadcrumbs:
`Home > Shop > Oversized T-Shirts > RIOTOUS Heavyweight Tee`.

---

## 6. Verification & Automated Testing

A dedicated verification script verifies all SEO rules locally or against live endpoints:
```bash
node scripts/verify-seo-fixes.mjs
```
Checks performed:
- Validates that all 10 public routes serve HTTP 200 with absolute canonical links.
- Confirms trailing slash URLs return HTTP 301 redirects to clean URLs.
- Confirms legacy catalog paths (`/products`, `/collections`) return HTTP 301 redirects to `/shop`.
- Confirms sitemap is well-formed XML without private routes or query parameters.
- Confirms `robots.txt` contains dedicated Googlebot blocks and points to `https://riotous.store/sitemap.xml`.
