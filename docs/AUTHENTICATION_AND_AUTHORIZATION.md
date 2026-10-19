# RIOTOUS Authentication & Authorization Guide

> **Security Model**: Cryptographic Signed Tokens • Staff Role-Based Access Control (RBAC) • Database Profile Verification

This guide details the authentication flow, session storage, server middleware guards, staff roles, and permission enforcement across the RIOTOUS platform.

---

## 1. Authentication Architecture Overview

```mermaid
sequenceDiagram
    autonumber
    actor Client as Visitor / Admin
    participant Storage as localStorage & Cookie
    participant UI as React UI (Optimistic Parse)
    participant RouteGuard as _authenticated Route Guard
    participant ServerFn as Server Function (requireAuth)
    participant AuthServer as src/lib/auth.server.ts
    participant DB as profiles Table

    Client->>Storage: Store token in riotous_session
    Client->>UI: Read claims via parseTokenPayload()
    Note over UI: Optimistic UI rendering only.<br/>NO security privileges granted.
    Client->>RouteGuard: Navigate to /admin/* or /account/*
    RouteGuard->>Storage: Check for riotous_session token
    alt No Token
        RouteGuard-->>Client: Redirect to /auth?redirect=...
    else Token Found
        RouteGuard->>Client: Mount Route Layout Shell
    end

    Client->>ServerFn: Invoke Server Function (Header / Cookie / Body)
    ServerFn->>AuthServer: verifyAndDecodeToken(token)
    alt Invalid / Expired Token
        AuthServer-->>ServerFn: Throw 401 Unauthorized
        ServerFn-->>Client: Error: Please sign in
    else Valid Cryptographic Signature
        AuthServer-->>ServerFn: Return Decoded User Payload
        ServerFn->>DB: SELECT role, status, permissions FROM profiles WHERE id = user.id
        DB-->>ServerFn: Return Profile Row
        alt Status is Inactive or Suspended
            ServerFn-->>Client: Error: Account is inactive or suspended
        else Status is Active
            Note over ServerFn: Inject { userId, user, isAdmin, sql } into context
            ServerFn->>ServerFn: Execute Handler Logic
            ServerFn-->>Client: Return Success Payload
        end
    end
```

---

## 2. Session Management & Token Storage

### 2.1 Storage Mechanism
- **Primary Client Store**: `localStorage.getItem("riotous_session")`.
- **Cookie Mirroring**: Mirrored to `document.cookie` as `riotous_session=<token>; path=/; max-age=2592000; SameSite=Lax; Secure` to support server-side rendering and static asset authentication.

### 2.2 Client-Side Claims Parsing (`src/lib/auth.types.ts`)
The helper `parseTokenPayload(token: string)` extracts user metadata (ID, email, name, role) for optimistic client UI rendering (e.g. displaying "Welcome, Aarav" in the header):
> [!CAUTION]
> **Client parsing is strictly for optimistic rendering.** It does NOT grant permissions or bypass server authorization. Every protected operation is independently verified on the server.

---

## 3. Server Authentication Middleware (`src/lib/auth-middleware.ts`)

All protected server functions attach the `requireAuth` middleware. It performs a multi-stage token discovery:
1. **Context Check**: Inspects `opts.context.token` sent by client middleware.
2. **Payload Check**: Inspects `data.token` passed in arguments.
3. **HTTP Headers**: Inspects `Authorization: Bearer <token>` and `x-riotous-session`.
4. **Cookies**: Inspects `riotous_session` cookie.

### Verification & Database Validation:
1. The token is cryptographically verified using `verifyAndDecodeToken(token)` from `src/lib/auth.server.ts`.
2. The user's active status and role are queried from the `profiles` table:
   ```sql
   SELECT id, role, email, status, permissions FROM profiles
   WHERE id = $1 AND LOWER(email) = LOWER($2) LIMIT 1;
   ```
3. If `status` is `'Inactive'` or `'Suspended'`, the request is immediately rejected with `401 Unauthorized`.
4. If the profile's role matches a staff role, `isAdmin` is set to `true`.

---

## 4. Staff Roles & Role-Based Access Control (RBAC)

The application defines five standard user roles in `src/lib/auth.types.ts`:

| Role Name | Scope | Admin Panel Access? | Key Permissions |
| :--- | :--- | :--- | :--- |
| **`Super Admin`** | System Owner | Yes (`hasAdminPanelAccess: true`) | Full unrestricted access to all 19 modules, staff management, settings, and database utilities. |
| **`Admin`** | Store Administrator | Yes (`hasAdminPanelAccess: true`) | Catalog management, inventory updates, order processing, returns, coupons, and marketing. |
| **`Manager`** | Operations Manager | Yes (`hasAdminPanelAccess: true`) | Order fulfillment, inventory adjustments, and customer returns. |
| **`Staff`** | Support / Warehouse | Yes (`hasAdminPanelAccess: true`) | Order viewing, label printing, and customer support. |
| **`customer`** | Storefront Shopper | No (`hasAdminPanelAccess: false`) | Personal order history, return requests, favorites, and reviews. |

### Helper Function: `hasAdminPanelAccess`
```typescript
export function hasAdminPanelAccess(user?: { role?: string | null; status?: string | null } | null): boolean {
  if (!user) return false;
  const status = String(user.status || "Active").toLowerCase().trim();
  if (status === "inactive" || status === "suspended") return false;
  return isStaffRole(user.role);
}
```

---

## 5. Password Reset & Security Protocols

- **Password Hashing**: Passwords are hashed using salted cryptographic digests before persisting into the `profiles` table.
- **Admin Reset Utility (`src/lib/admin-reset.functions.ts`)**: Supports emergency administrator password recovery configured via `ADMIN_RESET_PASSWORD` environment variable.
- **Sign Out**: `signOut()` in `src/routes/_authenticated/admin/route.tsx` clears `localStorage`, invalidates active TanStack Query caches (`qc.clear()`), and resets auth store state.
