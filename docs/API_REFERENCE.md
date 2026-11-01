# RIOTOUS API & Server Function Reference

> **API Architecture**: REST / Webhook Endpoints (`src/routes/api/*`) + Type-Safe TanStack Start RPCs (`src/lib/*.functions.ts`)

This reference documents the external HTTP endpoints and core backend server functions available in the RIOTOUS codebase.

---

## 1. Public & Media REST Endpoints

### 1.1 Media Binary Stream: `GET /api/media/:id`
- **File**: `src/routes/api/media.$id.ts`
- **Auth**: None (Public).
- **Purpose**: Serves images, banners, and videos stored in the `website_media` database table.
- **Features**: Supports HTTP Range requests (for video scrubbing), ETags, and `Cache-Control: public, max-age=31536000, immutable`.
- **Response**: Binary stream with the asset's stored `mime_type`.

### 1.2 Product Image Stream: `GET /api/public/product-image`
- **File**: `src/routes/api/public/product-image.tsx`
- **Auth**: None (Public).
- **Query Parameters**:
  - `id`: Product ID (e.g. `'prod_black_tee'`).
  - `color` (Optional): Color variant name (e.g. `'Maroon'`).
  - `idx` (Optional): Image index within gallery (default `0`).
  - `v`: Version hash timestamp for cache-busting.
- **Response**: Binary image stream (`image/webp` or `image/jpeg`).

### 1.3 Media Upload: `POST /api/media/upload`
- **File**: `src/routes/api/media.upload.ts`
- **Auth**: Required (`requireAuth`, Staff Role).
- **Payload**: JSON with `fileName`, `mimeType`, `dataBase64`.
- **Response**: `{ id: string, url: string }`.

### 1.4 Product Feed: `GET /api/products`
- **File**: `src/routes/api/products.ts`
- **Auth**: None (Public).
- **Response**: JSON array of published storefront catalog items.

---

## 2. Invoicing & Document Endpoints

### 2.1 Tax Invoice View/Download: `GET /api/invoices/:orderId`
- **File**: `src/routes/api/invoices.$orderId.ts`
- **Auth**: Required (Customer who placed the order or Staff).
- **Query Parameters**: `format=html` (default) or `format=pdf`.
- **Response**: GST-compliant invoice HTML or PDF document stream.

---

## 3. Webhook Ingestion Endpoints

### 3.1 Razorpay Payment Webhook: `POST /api/razorpay/webhook`
- **File**: `src/routes/api/razorpay.webhook.ts`
- **Auth**: HMAC SHA-256 signature verification via header `x-razorpay-signature` and secret `RAZORPAY_WEBHOOK_SECRET`.
- **Handled Events**:
  - `payment.captured`: Updates order `payment_status = 'Paid'`, deducts reserved inventory stock, generates GST invoice, and dispatches confirmation email.
  - `payment.failed`: Marks order `payment_status = 'Failed'` and releases reserved stock.
- **Response**: HTTP 200 `{ status: "ok" }`.

### 3.2 Zippyy Logistics Webhook: `POST /api/zippyy/webhook` & `POST /tracking/webhook`
- **Files**: `src/routes/api/zippyy.webhook.ts`, `src/routes/tracking.webhook.ts`
- **Auth**: Secret verification via `ZIPPYY_WEBHOOK_SECRET`.
- **Handled Events**: Ingests status transitions (`PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `RTO`). Logs event into `shipment_tracking_events` and syncs order status.

---

## 4. Core TanStack Start Server Functions Catalog

### 4.1 Catalog & Product Server Functions (`src/lib/catalog.ts`)
- **`fetchProductsServerFn({ data: { first: number } })`**:
  Fetches active storefront products with variant pricing and thumbnails. Uses 2s burst debounce cache (`_productsCache`).
- **`getProductByHandleDirect(handle: string)`**:
  Fetches a single product by slug handle including color variants, highlights, garment specifications, and promotional offers.

### 4.2 Admin Management Functions (`src/lib/admin.functions.ts`)
- **`checkIsAdmin({ data: { token?: string } })`**:
  Verifies if the session token belongs to an active staff member (`Super Admin`, `Admin`, `Manager`, `Staff`).
- **`getAdminProductsServerFn()`**:
  Returns all products (both active and inactive) with complete variant stock matrices for administrative tables.
- **`createProductServerFn({ data: ProductPayload })`**:
  Creates a new product with variants, highlights, and specifications. Calls `invalidateCatalogCache()`.
- **`updateProductServerFn({ data: ProductPayload })`**:
  Updates existing product and variant details. Calls `invalidateCatalogCache()`.
- **`deleteProductServerFn({ data: { id: string } })`**:
  Deletes or archives a product and its associated variants. Calls `invalidateCatalogCache()`.

### 4.3 Order & Checkout Functions (`src/lib/orders.functions.ts`)
- **`createOrderServerFn({ data: CreateOrderPayload })`**:
  Validates cart items, checks stock availability, creates a pending order in `orders` and `order_items`, and locks stock in `reserved_stock`.
- **`getOrderByIdServerFn({ data: { orderId: string } })`**:
  Returns order details, tracking information, and invoice metadata.
- **`updateOrderStatusServerFn({ data: { orderId: string, status: string } })`**:
  Staff-only function updating order status (`Processing`, `Shipped`, `Delivered`, `Cancelled`).

### 4.4 Inventory Engine Functions (`src/lib/inventory.service.ts`)
- **`deductStockForOrder(orderId: string, sql: SqlRunner)`**:
  Transfers reserved stock to permanently deducted stock upon confirmed payment and logs an `ORDER_DEDUCT` inventory transaction.
- **`restoreStockForReturn(orderId: string, variantId: string, quantity: number, sql: SqlRunner)`**:
  Restores returned items to available inventory and logs a `RETURN_RESTORE` transaction.
- **`adjustStockManual(variantId: string, newQuantity: number, reason: string, sql: SqlRunner)`**:
  Admin manual stock override with audit log record. Calls `invalidateCatalogCache()`.

### 4.5 Coupon & Discount Functions (`src/lib/coupons.functions.ts`)
- **`validateCouponServerFn({ data: { code: string, cartTotal: number, customerEmail?: string } })`**:
  Checks validity, expiry, minimum order value, usage limits, and calculates the exact discount amount.
- **`listCouponsServerFn()`**: Returns all active and draft coupon codes for the admin coupons manager.

### 4.6 Website Configuration Functions (`src/lib/website-config.functions.ts`)
- **`getPublicWebsiteConfigServerFn()`**:
  Returns active homepage visual configuration, announcement bar text, and curated banners. Uses 60s memory micro-cache.
- **`publishWebsiteConfigServerFn({ data: { config: WebsiteConfig } })`**:
  Promotes draft configuration to `website_published` and immediately calls `invalidatePublicWebsiteConfigCache()`.
