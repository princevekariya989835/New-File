# RIOTOUS Backend Development Guide

> **Runtime**: Cloudflare Workers / Nitro 3 • TanStack Start Server Functions • Dual D1/Neon Database

This guide covers backend architecture, server functions, middleware, database query patterns, server logging, and transactional email infrastructure in the RIOTOUS codebase.

---

## 1. TanStack Start Server Functions (`createServerFn`)

Backend operations are implemented as type-safe RPC endpoints using `createServerFn`:

### 1.1 Basic Pattern
```typescript
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export const getStoreProductsServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: { category?: string; limit?: number }) => ({
    category: data.category ? String(data.category).trim() : undefined,
    limit: Number(data.limit || 20),
  }))
  .handler(async ({ data }) => {
    const sql = getSql();
    return await sql`SELECT * FROM products WHERE is_active = 1 LIMIT ${data.limit}`;
  });
```

### 1.2 Authenticated Server Function Pattern
To protect sensitive administrative or user actions, attach `requireAuth` from `src/lib/auth-middleware.ts`:
```typescript
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";

export const updateOrderStatusServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { orderId: string; status: string }) => ({
    orderId: String(data.orderId),
    status: String(data.status),
  }))
  .handler(async ({ data, context }) => {
    // context contains: userId, user, isAdmin, sql
    if (!context.isAdmin) {
      throw new Error("Forbidden: Staff privileges required.");
    }
    await context.sql`UPDATE orders SET status = ${data.status} WHERE id = ${data.orderId}`;
    return { success: true };
  });
```

---

## 2. Server Entry Pipeline (`src/server.ts`)

Every HTTP request enters via `src/server.ts`:
1. **Environment Binding**: Passes Cloudflare Workers `env` to the database and config layers via `setCloudflareEnv(env)`.
2. **Canonical Normalization (HTTP 301)**:
   - Apex domain redirect: `www.riotous.store` -> `riotous.store`.
   - Legacy route redirect: `/products`, `/collections`, `/catalog`, `/product` -> `/shop`.
   - Trailing slash stripping: `/shop/` -> `/shop`.
3. **Execution**: Hands request to `@tanstack/react-start/server-entry`.
4. **Catastrophic Error Normalization**: Intercepts unhandled throws swallowed by Nitro/h3 and renders a branded HTML error page.
5. **Security Headers**:
   - `Content-Security-Policy`: Restricts scripts, objects, forms, and network connections.
   - `Strict-Transport-Security`: Enforces 1-year HSTS on HTTPS.
   - `X-Frame-Options: SAMEORIGIN`.
   - `X-Content-Type-Options: nosniff`.
   - `X-Robots-Tag: noindex, nofollow`: Automatically injected for `/admin/*`, `/account/*`, `/checkout`, `/auth`, and private `/api/*` endpoints.

---

## 3. Database Query Patterns (`src/lib/db.ts`)

### 3.1 Obtaining the SQL Client
Always obtain the tagged-template SQL runner using `getSql()`:
```typescript
import { getSql } from "@/lib/db";

const sql = getSql();
const rows = await sql`SELECT id, name, price FROM products WHERE is_active = true`;
```

### 3.2 D1 vs Neon Compatibility
`src/lib/db.ts` automatically translates queries between SQLite (Cloudflare D1) and PostgreSQL (Neon):
- **Booleans**: Always write boolean conditions as `WHERE is_active = 1 OR is_active = true` or use boolean parameter interpolation `${true}`.
- **JSON Aggregation**:
  - D1 (SQLite) supports `json_group_array(json_object(...))`.
  - Neon (PostgreSQL) supports `jsonb_agg(jsonb_build_object(...))`.
  - Prefer single-table queries with application-level mapping (e.g. `src/lib/catalog.ts`) when executing cross-engine queries.
- **Timestamps**: Always store ISO 8601 strings (`new Date().toISOString()`).

---

## 4. Real-Time Cache Sync Invariant

To guarantee that any change made in `/admin/*` is instantly visible to all users:
1. **Never use long-lived server in-memory caches without invalidation hooks.**
2. When performing updates, always trigger the respective invalidation function:
   - `invalidateCatalogCache()`: Clears `_productsCache` and `_productHandleCache` in `src/lib/catalog.ts`.
   - `invalidatePublicWebsiteConfigCache()`: Clears `_publicWebsiteConfigCache` in `src/lib/website-config.functions.ts`.
   - `invalidateImageCache()`: Clears `_imageCache` in `src/lib/product-images.ts`.
   - `invalidateCouponCache()`: Clears coupon memory cache in `src/lib/coupons.functions.ts`.
   - `invalidateOrderCache()`: Clears cached order statuses in `src/lib/orders.functions.ts`.

---

## 5. Server Logging & Error Capture

- **`src/lib/server-logger.ts`**: Structured logging helper for production edge debugging:
  ```typescript
  import { logServerSyncEvent } from "@/lib/server-logger";
  
  logServerSyncEvent("ADMIN_MUTATION", {
    operation: "updateProductStock",
    productId: "prod_123",
    newStock: 50,
  });
  ```
- **Error Types**: `DATABASE_ERROR`, `SYNC_SUCCESS`, `ADMIN_MUTATION`, `CACHE_INVALIDATION`.
- **`src/lib/error-capture.ts`**: Captures unhandled SSR exceptions and formats user-friendly error responses without exposing sensitive stack traces.

---

## 6. Transactional Emails (`src/lib/email/`, `src/lib/email-templates/`)

- **Providers**:
  - **Brevo API** (`src/lib/email/brevo.ts`): Primary delivery provider (`BREVO_API_KEY`).
  - **Resend API** (`src/lib/email/resend.ts`): Secondary/backup provider (`RESEND_API_KEY`).
- **Templates** (`@react-email/components`):
  - `src/lib/email-templates/order-confirmation.tsx`: Branded order summary with line items, total, shipping address, and tracking link.
  - `src/lib/email-templates/shipment-dispatched.tsx`: Dispatched notification with Zippyy courier name and tracking number.
  - `src/lib/email-templates/return-status.tsx`: Return request status update (Approved, Rejected, Refunded).
- **Audit Logging**: Every outgoing email is recorded in the `email_logs` database table.
