# RIOTOUS Known Issues & Resolutions Log

> **Document Status**: Active Technical Problem Log  
> **Rule**: Document only verified issues with established root causes, code fixes, and remaining risks.

---

## 1. Resolved Issues

### ISSUE-001: Duplicate URLs & Trailing Slash Redirection in Google Search Console
- **Status**: **RESOLVED**
- **Symptoms**: Google Search Console reported non-indexed URLs due to "Page with redirect" and "Duplicate without user-selected canonical" for URLs ending with trailing slashes (`/shop/`) and legacy paths (`/products`, `/collections`).
- **Root Cause**: The edge router served content on both `/shop` and `/shop/`, while legacy navigation links pointed to `/products` and `/collections` without standard HTTP 301 normalization.
- **Affected Files**: `src/server.ts`
- **Fix Implemented**: Added explicit 301 permanent redirects in `src/server.ts` for apex domain normalization, trailing slash stripping, and legacy catalog path aliasing to `/shop`.
- **Verification**: Verified via `scripts/verify-seo-fixes.mjs` with automated curl checks returning HTTP 301 to `/shop`.
- **Remaining Risks**: None. GSC recrawling will clear historical non-indexed warnings over time.

---

### ISSUE-002: Incomplete Canonical Links on Public Storefront Routes
- **Status**: **RESOLVED**
- **Symptoms**: Google Search Console identified multiple pages where canonical tags were relative or omitted, causing indexing ambiguity.
- **Root Cause**: Route files relied on client-side meta tags without explicit server-rendered absolute `<link rel="canonical" href="https://riotous.store/..." />`.
- **Affected Files**: `src/routes/index.tsx`, `src/routes/shop.tsx`, `src/routes/product.$handle.tsx`, `src/routes/design.tsx`, `src/routes/about.tsx`, `src/routes/contact.tsx`, `src/routes/privacy.tsx`, `src/routes/terms.tsx`, `src/routes/shipping-policy.tsx`, `src/routes/refund-policy.tsx`.
- **Fix Implemented**: Injected absolute HTTPS canonical URLs and explicit `robots: "index, follow"` directives in the `head` configuration of all 10 public routes.
- **Verification**: Tested with `scripts/verify-seo-fixes.mjs` and verified SSR markup contains `<link rel="canonical" href="https://riotous.store/..." />`.
- **Remaining Risks**: None.

---

### ISSUE-003: Non-Canonical Query Parameter URLs Present in Sitemap
- **Status**: **RESOLVED**
- **Symptoms**: Filtered URLs with query parameters (`/shop?category=oversized&sort=price_asc`) appeared in sitemap submissions.
- **Root Cause**: Legacy sitemap generator iterated over category tags and appended query string parameters.
- **Affected Files**: `src/routes/sitemap[.]xml.ts`
- **Fix Implemented**: Rewrote sitemap generator to include only the 10 clean canonical routes and dynamic product handles, excluding all query parameters and attaching dynamic `<lastmod>` timestamps from the database.
- **Verification**: Verified XML output contains only canonical URLs.
- **Remaining Risks**: None.

---

### ISSUE-004: React Email `entities` Dependency Resolution Conflict
- **Status**: **RESOLVED**
- **Symptoms**: Build failure with `Cannot find module 'entities/lib/decode.js'` during `@react-email/render` bundling.
- **Root Cause**: `@react-email/render` requires legacy `entities` v4 deep imports, whereas newer transitive dependencies hoisted `entities` v5.
- **Affected Files**: `package.json`, `vite.config.ts`, `scripts/ensure-build-deps.mjs`.
- **Fix Implemented**: Pinned `entities: 4.5.0` in `package.json` overrides, added explicit Vite resolve aliases in `vite.config.ts`, and automated prebuild verification in `scripts/ensure-build-deps.mjs`.
- **Verification**: `npm run build` succeeds consistently with zero bundling errors.
- **Remaining Risks**: None.

---

### ISSUE-005: Zippyy Logistics OAuth Token Invalidation on HTTP 401
- **Status**: **RESOLVED**
- **Symptoms**: After 24 hours of uptime, courier dispatch requests failed with HTTP 401 Unauthorized until the worker was redeployed.
- **Root Cause**: The in-memory cached OAuth token expired, but the client did not automatically invalidate the token on receiving a 401 response from the Zippyy gateway.
- **Affected Files**: `src/lib/zippyy/client.ts`.
- **Fix Implemented**: Added interceptor logic in `src/lib/zippyy/client.ts` that catches HTTP 401, clears `cachedToken = null`, requests a fresh token, and transparently retries the failed operation once.
- **Verification**: Verified using `scripts/test-zippyy-live.mjs`.
- **Remaining Risks**: None.

---

## 2. Active Technical Considerations & Mitigations

### ISSUE-006: Dual-Engine SQL Dialect Variance (D1 SQLite vs Neon PostgreSQL)
- **Status**: **MITIGATED & MONITORED**
- **Symptoms**: Potential SQL syntax differences between Cloudflare D1 (SQLite) and Neon (PostgreSQL), such as boolean comparison (`1`/`0` vs `TRUE`/`FALSE`) and JSON aggregation functions.
- **Mitigation**:
  - `src/lib/db.ts` acts as a unified abstraction layer, normalizing query inputs and providing fallbacks.
  - Queries in `src/lib/catalog.ts` utilize single-table selects with application-level mapping rather than complex Postgres-only joins.
- **Action Required for Developers**: Always test new database queries against both engines or verify compatibility with SQLite 3 before merging migrations.
