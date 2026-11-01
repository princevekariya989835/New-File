# RIOTOUS Testing & Debugging Guide

> **Core Verification**: `npm run build` • Targeted Test Scripts in `scripts/` • Wrangler Live Diagnostics

This guide provides testing procedures, diagnostic scripts, and step-by-step troubleshooting workflows for common issues across the RIOTOUS codebase.

---

## 1. Primary Build Verification

Before committing any code or declaring a task complete, **always run the complete production build**:

```bash
npm run build
```

This command executes three stages:
1. `node scripts/ensure-build-deps.mjs`: Validates that `@rolldown` and `entities` packages are properly aligned.
2. `vite build`: Runs TypeScript compilation across the entire codebase and bundles both the client assets and Cloudflare Worker module.
3. `node scripts/copy-dist.mjs`: Aligns static files and the `.output/server/index.mjs` worker entry for Cloudflare deployment.

If `npm run build` completes with zero errors, TypeScript typing and bundler dependencies are intact.

---

## 2. Dedicated Diagnostic Test Scripts (`scripts/`)

The repository contains automated diagnostic scripts for specific domains:

### 2.1 SEO & Indexing Verification
```bash
node scripts/verify-seo-fixes.mjs
```
- Tests all 10 public storefront routes for absolute HTTPS canonical tags.
- Verifies 301 redirects for trailing slashes, apex domain, and legacy aliases (`/products` -> `/shop`).
- Validates XML structure of `/sitemap.xml` and rules inside `/robots.txt`.

### 2.2 Zippyy Logistics Live API Test
```bash
node scripts/test-zippyy-live.mjs
```
- Tests OAuth2 authentication with the Zippyy logistics gateway.
- Validates warehouse pickup pincode (`395006`) serviceability.
- Tests token caching and error retry handling.

### 2.3 Cloudflare D1 Database Row Count Verification
```bash
npx tsx scripts/verify-d1-counts.ts
```
- Connects to D1 database and queries row counts across `products`, `product_variants`, `orders`, and `profiles`.

### 2.4 Live Storefront Endpoint Test
```bash
node scripts/test-live.mjs
```
- Pings live endpoints on `https://riotous.store` and logs HTTP response codes and latency.

---

## 3. Common Debugging Procedures

### 3.1 Database Connection Errors
- **Symptom**: Server functions throw `Database connection error` or return empty arrays.
- **Root Cause & Fix**:
  1. If running on Cloudflare Workers, check that `wrangler.json` includes the `d1_databases` binding with `binding: "DB"`.
  2. If running locally with Node, ensure `.env` contains a valid `DATABASE_URL` pointing to Neon PostgreSQL.
  3. If offline, verify that `src/lib/db.ts` falls back to the in-memory mock engine without throwing.

### 3.2 Broken Product Images
- **Symptom**: Product thumbnails appear broken or display placeholder images.
- **Root Cause & Fix**:
  1. Inspect the image URL. If it points to `/api/public/product-image?id=...`, ensure the product ID exists in the `products` table and contains valid image strings.
  2. If images are stored in `website_media`, test `GET /api/media/:id` directly in the browser.
  3. Ensure that image upload in `/admin/products` completes with HTTP 200 and calls `invalidateImageCache()`.

### 3.3 Admin Panel Access Denied (Redirected to `/auth`)
- **Symptom**: Admin navigates to `/admin` but is redirected back to `/auth`.
- **Root Cause & Fix**:
  1. Check browser `localStorage` for `riotous_session`. If missing, the user is signed out.
  2. If token is present, decode claims via `parseTokenPayload()`. If `role` is `'customer'`, the account lacks staff privileges.
  3. Inspect `profiles` table to ensure `role` is `'Super Admin'`, `'Admin'`, `'Manager'`, or `'Staff'` and `status = 'Active'`. Accounts with `status = 'Inactive'` or `'Suspended'` are rejected.

### 3.4 Razorpay Payment Verification Failures
- **Symptom**: Payment succeeds on Razorpay modal, but order status remains `Pending`.
- **Root Cause & Fix**:
  1. Verify that `RAZORPAY_KEY_SECRET` in `.env` or Wrangler secrets matches the Razorpay dashboard secret.
  2. Inspect `/api/razorpay/webhook` logs via `npx wrangler tail`. Ensure `RAZORPAY_WEBHOOK_SECRET` matches the webhook secret configured in Razorpay.
  3. Check for HMAC SHA-256 signature mismatch errors in `verifyRazorpaySignature()`.

### 3.5 Cloudflare Worker Deployment Errors
- **Symptom**: `npx wrangler deploy` fails with module resolution or size limits.
- **Root Cause & Fix**:
  1. Verify that `.output/server/index.mjs` was created by running `npm run build`.
  2. Check for unsupported Node.js native modules. The worker requires `"compatibility_flags": ["nodejs_compat"]` in `wrangler.json`.
