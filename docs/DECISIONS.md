# RIOTOUS Architecture Decision Records (ADRs)

This document captures the key architectural choices, rationales, alternatives considered, and constraints governing the RIOTOUS codebase.

---

## ADR-001: Selection of TanStack Start & Nitro for Edge SSR
- **Status**: **ACCEPTED**
- **Context**: The store required sub-second initial load times across mobile devices in India and seamless deployment to Cloudflare Workers.
- **Decision**: Adopted TanStack Start (`@tanstack/react-start`) compiled via Nitro 3 with the `cloudflare_module` preset.
- **Rationale**:
  1. Full-stack React 19 SSR with type-safe server functions (`createServerFn`).
  2. Ultra-lightweight edge worker bundle (~1MB) compared to bulky Next.js standalone outputs.
  3. Seamless Vite 8 build pipeline with native code-splitting via `.lazy.tsx`.
- **Consequences**: Server functions run on Cloudflare Workers; heavy Node-specific C++ native modules must be avoided.

---

## ADR-002: Dual Database Strategy (Cloudflare D1 + Neon PostgreSQL)
- **Status**: **ACCEPTED**
- **Context**: Production runtime requires edge database colocation with Cloudflare Workers, while local development and external tooling require standard SQL access.
- **Decision**: Implemented a unified database abstraction in `src/lib/db.ts` supporting Cloudflare D1 natively (`env.DB`) and Neon PostgreSQL (`DATABASE_URL`).
- **Rationale**:
  1. Cloudflare D1 provides native microsecond query execution within worker memory.
  2. Neon PostgreSQL provides pooled serverless connectivity for Node.js scripts and migrations.
  3. In-memory mock fallback allows developers to build and test UI completely offline.
- **Consequences**: Queries and schema migrations must adhere to SQLite 3 and PostgreSQL dialect compatibility.

---

## ADR-003: In-Database Media Storage (`website_media`) with Streaming Endpoints
- **Status**: **ACCEPTED**
- **Context**: Storing product images and custom hero banners required an image pipeline that avoided complex third-party AWS S3 / Cloudflare R2 configurations and egress fees.
- **Decision**: Store media files directly in the `website_media` table and stream them via `GET /api/media/:id` and `/api/public/product-image`.
- **Rationale**:
  1. Complete atomic backup and restoration alongside database migrations.
  2. Zero external cloud storage credentials or ongoing third-party service bills.
  3. Cloudflare Workers edge caching (`Cache-Control: public, max-age=31536000, immutable`) ensures media is cached globally at the edge after the first request.
- **Consequences**: Ingestion payloads must be reasonably sized; database storage limits must be monitored.

---

## ADR-004: Instant Cache Invalidation Protocol over Event Sockets
- **Status**: **ACCEPTED**
- **Context**: Business rule: Any change made in `/admin/*` must immediately be visible to all visitors. WebSockets or server-sent events introduce persistent connection overhead on serverless workers.
- **Decision**: Enforce short 2-second burst debounce caches paired with explicit cache invalidation functions (`invalidateCatalogCache()`, `invalidatePublicWebsiteConfigCache()`, etc.) called on every administrative mutation.
- **Rationale**:
  1. No persistent connection costs or worker subrequest limits.
  2. Guarantees that the very next HTTP request from any guest or logged-in user reads fresh database data.
  3. Client-side SWR refetches automatically via `queryClient.invalidateQueries()`.
- **Consequences**: Developers must remember to call invalidation helpers when creating new admin mutation functions.

---

## ADR-005: Decoupled Token Claims Parsing vs Server Verification
- **Status**: **ACCEPTED**
- **Context**: The client UI needed instant display of user names and roles without blocking hydration, while maintaining strict server security.
- **Decision**: Created `parseTokenPayload()` for optimistic client rendering, while requiring cryptographic signature verification in `verifyAndDecodeToken()` and database profile checks in `requireAuth`.
- **Rationale**:
  1. Zero lag during client hydration; UI immediately reflects user identity.
  2. Absolute server-side security: client claims can never bypass database role checks.
- **Consequences**: Developers must never rely on client-parsed claims for authorization.

---

## ADR-006: Absolute HTTPS Canonical Normalization & 301 Redirects
- **Status**: **ACCEPTED**
- **Context**: Google Search Console reported indexing fragmentation due to duplicate trailing slash paths (`/shop/`) and legacy catalog paths (`/products`, `/collections`).
- **Decision**: Implement server-level HTTP 301 permanent redirects in `src/server.ts` and inject explicit absolute HTTPS canonical URLs on all 10 public storefront routes.
- **Rationale**:
  1. Eliminates duplicate page indexing penalties.
  2. Directs Googlebot link equity exclusively to clean canonical URLs.
  3. Removes sitemap ambiguity by excluding parameterized search/filter strings.
- **Consequences**: Future public pages must define an explicit canonical tag in their route `head`.
