# RIOTOUS Admin Dashboard & Management Console

> **Location**: `src/routes/_authenticated/admin/*` (`/admin/*`)  
> **Layout**: `src/routes/_authenticated/admin/route.tsx`  
> **Security Guard**: `hasAdminPanelAccess(user)` + `requireAuth` Server Middleware

This guide details the architecture, 19 operational modules, access controls, and real-time cache synchronization rules of the RIOTOUS administrative dashboard.

---

## 1. Dashboard Layout & Navigation

The admin interface uses a responsive dual-tone dashboard:
- **Left Sidebar**: Dark theme (`#0C0C0E`), persistent on desktop, collapsible on mobile. Displays store branding, staff user badge, and links to all 19 operational modules.
- **Top Bar**: Search bar, unread notification counter (`getAdminNotifications`), live store link (`https://riotous.store`), and user profile dropdown with one-click sign out.
- **Content Area**: High-contrast, clean management views powered by Radix UI tables, filters, modals, and charts.

---

## 2. Inventory of All 19 Admin Modules

| # | Module | Route Path | Implementation Files | Operational Responsibility |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Dashboard** | `/admin` | `index.tsx`, `index.lazy.tsx`, `admin-dashboard.functions.ts` | Executive KPIs: Total Revenue, Total Orders, Active Customers, Low Stock Alerts, and Recent Order Stream. |
| **2** | **Orders** | `/admin/orders` | `orders.tsx`, `orders.lazy.tsx`, `orders.functions.ts` | Order lifecycle manager: Status filtering (`Processing`, `Shipped`, `Delivered`, `Cancelled`), line item inspection, and Zippyy courier dispatch. |
| **3** | **Products** | `/admin/products` | `products.tsx`, `product-details-editor.tsx`, `admin.functions.ts` | Full catalog management: Multi-image uploads, size/color variant matrices, promotional offers, highlights, and specifications. |
| **4** | **Inventory** | `/admin/inventory` | `inventory.tsx`, `inventory.lazy.tsx`, `inventory.service.ts` | Live stock levels per variant, low-stock threshold triggers, reserved stock releases, and audit-logged manual adjustments. |
| **5** | **Returns** | `/admin/returns` | `returns.tsx`, `returns.lazy.tsx`, `admin-returns.functions.ts` | Customer return review workflow: Inspection status, photo evidence verification, and refund approvals. |
| **6** | **Reviews** | `/admin/reviews` | `reviews.tsx`, `reviews.lazy.tsx`, `admin-reviews.functions.ts` | Store review moderation: Star rating approval toggles, spam deletion, and verified buyer badge checks. |
| **7** | **Customers** | `/admin/customers` | `customers.tsx`, `customers.lazy.tsx`, `admin-customers.functions.ts` | Customer directory: Spend history, order frequency, profile data, and address book lookups. |
| **8** | **Coupons** | `/admin/coupons` | `coupons.tsx`, `coupons.lazy.tsx`, `coupons.functions.ts` | Promo code generator: Flat or percentage discounts, minimum cart values, usage caps, and validity windows. |
| **9** | **Offers** | `/admin/offers` | `offers.tsx`, `offers.lazy.tsx` | Product-level promotional deal cards, bundle savings tags, and festival banner badges. |
| **10** | **Design Studio** | `/admin/designs` | `designs.tsx`, `design-submissions.functions.ts` | Custom apparel queue: Inspection of front/back artwork submitted via `/design`, print coordination, and customer outreach. |
| **11** | **Storefront** | `/admin/storefront` | `storefront.tsx`, `storefront.lazy.tsx`, `website-config.functions.ts` | Visual homepage customizer: Hero banners, announcement bars, curated collection carousels, and navigation links. |
| **12** | **Marketing** | `/admin/marketing` | `marketing.tsx`, `marketing.lazy.tsx`, `admin-marketing.functions.ts` | Marketing campaign schedules, email blasts, and banner coordination. |
| **13** | **Shipping** | `/admin/shipping` | `shipping.tsx`, `shipping.lazy.tsx`, `admin-shipping.functions.ts` | Logistics settings: Zippyy API credentials, warehouse pickup pincodes, and courier serviceability. |
| **14** | **Payments** | `/admin/payments` | `payments.tsx`, `payments.lazy.tsx`, `admin-payments.functions.ts` | Payment gateway reconciliation: Razorpay payment IDs, captured amounts, and refund records. |
| **15** | **Analytics** | `/admin/analytics` | `analytics.tsx`, `analytics.lazy.tsx`, `admin-analytics.functions.ts` | Sales performance graphs (Recharts), category revenue distribution, average order value (AOV), and conversion rates. |
| **16** | **Settings** | `/admin/settings` | `settings.tsx`, `settings.lazy.tsx`, `admin-settings.functions.ts` | Store identity, GST rates, invoice prefix rules, business address, and policy configuration. |
| **17** | **Staff** | `/admin/staff` | `staff.tsx`, `staff.lazy.tsx`, `admin-staff.functions.ts` | Team management: Role-based permissions (`Super Admin`, `Admin`, `Manager`, `Staff`), invitations, and password resets. |
| **18** | **System Health** | `/admin/health` | `health.tsx`, `admin-health.functions.ts` | Edge diagnostics: Database query latency, memory consumption, cache hit rates, and external API status. |
| **19** | **Activity Log** | `/admin/activity` | `activity.tsx`, `admin_audit_log` table | Real-time audit log tracking all administrative modifications across the store. |

---

## 3. Real-Time Consistency & Invalidation Protocol

### 3.1 The Invariant
> **CRITICAL RULE**: Any administrative mutation (products, pricing, inventory, website config, banners, shipping, settings) MUST immediately reflect for ALL users—both logged-in members and non-logged-in guest visitors.

### 3.2 Invalidation Mapping
Every admin mutation function in `src/lib/` must execute its designated invalidation hook:

```typescript
// 1. When updating products, variants, or pricing:
import { invalidateCatalogCache } from "@/lib/catalog";
import { invalidateImageCache } from "@/lib/product-images";
invalidateCatalogCache();
invalidateImageCache();

// 2. When updating homepage visual config, banners, or announcement bars:
import { invalidatePublicWebsiteConfigCache } from "@/lib/website-config.functions";
invalidatePublicWebsiteConfigCache();

// 3. When updating coupon codes or usage rules:
import { invalidateCouponCache } from "@/lib/coupons.functions";
invalidateCouponCache();

// 4. When updating orders, tracking, or shipment statuses:
import { invalidateOrderCache } from "@/lib/orders.functions";
invalidateOrderCache();
```

### 3.3 Client-Side TanStack Query Invalidation
On the client side, mutation handlers call `queryClient.invalidateQueries({ queryKey: [...] })` to immediately refetch fresh server data without requiring manual page refreshes.
