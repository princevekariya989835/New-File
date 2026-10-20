# RIOTOUS Database Schema Reference

> **Primary Engine (Edge)**: Cloudflare D1 (`riotous-db`, SQLite dialect)  
> **Secondary Engine (Cloud)**: Neon PostgreSQL (`DATABASE_URL`, PostgreSQL dialect)  
> **Source Migration Files**: `migrations/0001_initial_d1_schema.sql`, `migrations/0004_invoices_and_tax_schema.sql`

This document provides a verified, comprehensive guide to all 36 relational database tables in the RIOTOUS ecommerce application.

---

## 1. Database Architecture & Abstraction

The database access layer is centralized in `src/lib/db.ts`:
- **Cloudflare D1 Binding**: Exposed via `env.DB` in Cloudflare Workers. Direct native SQLite engine with sub-10ms query execution across Cloudflare's edge network.
- **Neon PostgreSQL Pool**: Connected via `@neondatabase/serverless` using `DATABASE_URL`.
- **Offline Mock Engine**: If neither D1 binding nor `DATABASE_URL` is set, `src/lib/db.ts` runs an in-memory SQL runner initialized with fallback streetwear data.

---

## 2. Text-Based Entity Relationship Diagram

```text
       [profiles] (Customers & Staff)
           │
           ├── (1:N) ──> [orders] ────────── (1:N) ──> [order_items]
           │                │                              │
           │                ├── (1:1) ──> [invoices]       └── (N:1) ──> [products]
           │                ├── (1:N) ──> [shipments]                      │
           │                └── (1:N) ──> [payments]                       ├── (1:N) ──> [product_variants]
           │                                                               ├── (1:N) ──> [product_highlights]
           ├── (1:N) ──> [addresses]                                       ├── (1:N) ──> [product_specifications]
           ├── (1:N) ──> [reviews] ────────────────────────────────────────┤
           ├── (1:N) ──> [returns]                                         ├── (1:N) ──> [product_offers]
           ├── (1:N) ──> [favorites]                                       └── (1:N) ──> [inventory_transactions]
           ├── (1:N) ──> [design_submissions]
           └── (1:N) ──> [coupon_usage] ── (N:1) ──> [coupons]
```

---

## 3. Comprehensive Table Catalog (36 Tables)

### 3.1 Authentication & User Management
1. **`profiles`**: User accounts for customers and administrators.
   - `id` (TEXT, PK): Unique identifier (`usr_...` or UUID).
   - `email` (TEXT, UNIQUE): User email address.
   - `password_hash` (TEXT): Cryptographic hash (SHA-256 / bcrypt).
   - `full_name` (TEXT): Display name.
   - `role` (TEXT, DEFAULT `'customer'`): Role (`'Super Admin'`, `'Admin'`, `'Manager'`, `'Staff'`, `'customer'`).
   - `status` (TEXT, DEFAULT `'Active'`): Account status (`'Active'`, `'Inactive'`, `'Suspended'`).
   - `phone` (TEXT): Contact number.
   - `avatar_url` (TEXT): Profile picture URL.
   - `permissions` (TEXT/JSON, DEFAULT `'{}'`): Fine-grained permission toggles.
   - `last_login_at` (TEXT): Last sign-in timestamp.
   - `created_at`, `updated_at` (TEXT).
2. **`email_otps`**: Temporary one-time passwords for passwordless login and verification.
   - `id` (TEXT, PK), `email` (TEXT), `otp_hash` (TEXT), `purpose` (TEXT), `expires_at` (TEXT), `is_used` (INTEGER/BOOLEAN), `created_at` (TEXT).
3. **`addresses`**: Saved customer shipping and billing addresses.
   - `id` (TEXT, PK), `user_id` (TEXT, FK -> profiles), `full_name` (TEXT), `phone` (TEXT), `address_line1` (TEXT), `address_line2` (TEXT), `city` (TEXT), `state` (TEXT), `postal_code` (TEXT), `country` (TEXT, DEFAULT `'India'`), `is_default` (INTEGER/BOOLEAN), `created_at`, `updated_at`.
4. **`rate_limits`**: Persistent distributed rate limiter counters across Cloudflare Workers.
   - `key` (TEXT, PK): Composite rate key (e.g. `login:account:user@example.com`, `login:ip:1.2.3.4`).
   - `attempts` (INTEGER, DEFAULT 1): Number of failed attempts within the active window.
   - `first_attempt_at` (INTEGER): Timestamp ms when the first attempt occurred.
   - `last_attempt_at` (INTEGER): Timestamp ms of the most recent attempt.
   - `blocked_until` (INTEGER): Timestamp ms until which further attempts are rejected with 429.
   - `expires_at` (INTEGER): Expiry timestamp ms for automatic pruning/decay.
5. **`password_resets`**: Cryptographic single-use password recovery tokens.
   - `id` (TEXT, PK): Unique recovery request ID (`pr_...`).
   - `user_id` (TEXT, FK -> profiles): Associated customer ID.
   - `email` (TEXT): Normalized email address.
   - `token_hash` (TEXT, UNIQUE): SHA-256 cryptographic hash of the 32-byte secret token (raw token is never persisted).
   - `expires_at` (TEXT): ISO timestamp when the token expires (typically 20 minutes).
   - `used_at` (TEXT): ISO timestamp when the token was consumed (atomically prevents replay/reuse).
   - `ip_address` (TEXT): IP address of the requester for security auditing.
   - `created_at` (TEXT): Request creation timestamp.

### 3.2 Product Catalog & Merchandise
4. **`categories`**: Product taxonomy categories.
   - `id` (TEXT, PK), `name` (TEXT), `slug` (TEXT, UNIQUE), `description` (TEXT), `image_url` (TEXT), `display_order` (INTEGER), `is_active` (INTEGER/BOOLEAN).
5. **`products`**: Master product records.
   - `id` (TEXT, PK): Unique ID (`prod_...`).
   - `name` (TEXT): Product title.
   - `slug` (TEXT, UNIQUE): URL handle (e.g. `'riotous-heavyweight-black-tee'`).
   - `description` (TEXT): Product overview text.
   - `details_html` (TEXT): Rich HTML description.
   - `price` (NUMERIC): Selling price in INR.
   - `mrp` (NUMERIC): Maximum retail price for discount display.
   - `compare_at_price` (NUMERIC): Strikethrough price.
   - `is_tax_inclusive` (INTEGER/BOOLEAN, DEFAULT 1): Whether GST is included.
   - `currency` (TEXT, DEFAULT `'INR'`).
   - `images` (TEXT/JSON): Array of image URLs.
   - `category` (TEXT): Category name.
   - `sizes` (TEXT/JSON): Available sizes (e.g. `['S', 'M', 'L', 'XL', 'XXL']`).
   - `colors` (TEXT/JSON): Available colors.
   - `color_variants` (TEXT/JSON): Array of color variant objects (`{ name, hex, images }`).
   - `stock_quantity` (INTEGER, DEFAULT 0): Aggregate stock count.
   - `is_active` (INTEGER/BOOLEAN, DEFAULT 1): Published visibility flag.
   - `tags` (TEXT/JSON): Array of promotional tags (`'Featured'`, `'Trending'`).
   - `features`, `care_instructions`, `manufacturing_info`, `size_measurements` (TEXT/JSON).
   - `created_at`, `updated_at` (TEXT).
6. **`product_variants`**: Specific SKU variant records (Size x Color).
   - `id` (TEXT, PK): Variant ID (`var_...`).
   - `product_id` (TEXT, FK -> products).
   - `size` (TEXT): Garment size (`'S'`, `'M'`, `'L'`, `'XL'`, `'XXL'`).
   - `color` (TEXT): Variant color.
   - `color_hex` (TEXT): Hex color code.
   - `image_url` (TEXT): Specific variant thumbnail image.
   - `sku` (TEXT, UNIQUE): Inventory SKU code.
   - `stock_quantity` (INTEGER, DEFAULT 0): Units currently in stock.
   - `reserved_stock` (INTEGER, DEFAULT 0): Units locked in pending checkout orders.
   - `low_stock_threshold` (INTEGER, DEFAULT 2): Alert threshold.
7. **`product_highlights`**: Visual feature callouts displayed on product pages.
   - `id` (TEXT, PK), `product_id` (TEXT, FK), `image_url` (TEXT), `title` (TEXT), `description` (TEXT), `display_order` (INTEGER), `is_active` (INTEGER/BOOLEAN).
8. **`product_specifications`**: Technical garment specifications table.
   - `id` (TEXT, PK), `product_id` (TEXT, FK), `label` (TEXT), `value` (TEXT), `display_order` (INTEGER), `is_active` (INTEGER/BOOLEAN).
9. **`product_offers`**: Tiered deals and promotional offers displayed on product pages.
   - `id` (TEXT, PK), `product_id` (TEXT, FK), `title` (TEXT), `description` (TEXT), `discount_type` (TEXT), `discount_value` (NUMERIC), `promo_code` (TEXT), `minimum_quantity` (INTEGER), `maximum_quantity` (INTEGER), `start_date`, `end_date`, `is_active`, `display_order`.
10. **`product_images`**: Auxiliary image index.
    - `id` (TEXT, PK), `product_id` (TEXT, FK), `url` (TEXT), `alt_text` (TEXT), `display_order` (INTEGER).

### 3.3 Orders, Invoices & Checkout
11. **`orders`**: Customer order transactions.
    - `id` (TEXT, PK): Order ID (`ord_...`).
    - `order_number` (TEXT, UNIQUE): Human-readable reference (`'ORD-9842'`).
    - `user_id` (TEXT, FK -> profiles, nullable for guests).
    - `subtotal`, `discount_amount`, `discount_code`, `shipping_charge`, `tax_amount`, `total_amount` (NUMERIC).
    - `currency` (TEXT, DEFAULT `'INR'`).
    - `status` (TEXT): Order status (`'Pending'`, `'Processing'`, `'Shipped'`, `'Delivered'`, `'Cancelled'`).
    - `payment_status` (TEXT): Payment state (`'Pending'`, `'Paid'`, `'Failed'`, `'Refunded'`).
    - `payment_method` (TEXT): e.g. `'Razorpay (Online)'`, `'COD'`.
    - `stock_state` (TEXT, DEFAULT `'Normal'`): Inventory deduction status.
    - `shipping_name`, `shipping_email`, `shipping_phone`, `shipping_address`, `billing_address` (TEXT).
    - `courier_name`, `tracking_number`, `tracking_url` (TEXT).
    - `shipped_at`, `delivered_at`, `cancelled_at` (TEXT).
    - `admin_notes` (TEXT).
    - `created_at`, `updated_at` (TEXT).
12. **`order_items`**: Line items within an order.
    - `id` (TEXT, PK), `order_id` (TEXT, FK -> orders), `product_id` (TEXT, FK -> products), `variant_id` (TEXT, FK -> product_variants), `title` (TEXT), `sku` (TEXT), `size` (TEXT), `color` (TEXT), `quantity` (INTEGER), `unit_price` (NUMERIC), `total_price` (NUMERIC), `image_url` (TEXT).
13. **`invoices`**: Tax invoices generated for completed orders.
    - `id` (TEXT, PK), `order_id` (TEXT, FK -> orders), `invoice_number` (TEXT, UNIQUE, e.g. `'INV-2026-0001'`), `invoice_date` (TEXT), `subtotal`, `discount_amount`, `taxable_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `total_amount` (NUMERIC), `customer_gstin` (TEXT), `pdf_url` (TEXT).
14. **`invoice_sequences`**: Sequence generator for sequential invoice numbering.
    - `id` (TEXT, PK), `prefix` (TEXT), `year` (INTEGER), `last_sequence` (INTEGER).
15. **`payments`**: Payment gateway transaction records.
    - `id` (TEXT, PK), `order_id` (TEXT, FK -> orders), `gateway` (TEXT, DEFAULT `'razorpay'`), `transaction_id` (TEXT), `amount` (NUMERIC), `currency` (TEXT), `status` (TEXT), `payment_method` (TEXT), `gateway_response` (TEXT/JSON), `created_at` (TEXT).

### 3.4 Shipping, Logistics & Tracking
16. **`shipments`**: Logistics shipments created via Zippyy.
    - `id` (TEXT, PK), `order_id` (TEXT, FK -> orders), `carrier` (TEXT), `tracking_number` (TEXT), `shipping_label_url` (TEXT), `status` (TEXT), `manifest_id` (TEXT), `shipped_at`, `delivered_at`, `created_at`.
17. **`shipment_tracking_events`**: Granular tracking history events ingested via webhooks.
    - `id` (TEXT, PK), `shipment_id` (TEXT, FK -> shipments), `status` (TEXT), `location` (TEXT), `description` (TEXT), `occurred_at` (TEXT).

### 3.5 Discounts, Coupons & Campaigns
18. **`coupons`**: Discount coupon codes.
    - `id` (TEXT, PK), `code` (TEXT, UNIQUE), `name` (TEXT), `description` (TEXT), `discount_type` (TEXT: `'percentage'` | `'fixed'`), `discount_value` (NUMERIC), `minimum_order_value` (NUMERIC), `maximum_discount` (NUMERIC), `usage_limit` (INTEGER), `usage_per_customer` (INTEGER), `used_count` (INTEGER), `starts_at`, `expires_at`, `is_active` (INTEGER/BOOLEAN).
19. **`coupon_usage`**: Audit trail of applied coupons per order.
    - `id` (TEXT, PK), `coupon_id` (TEXT, FK), `order_id` (TEXT, FK), `customer_id` (TEXT), `customer_email` (TEXT), `coupon_code` (TEXT), `discount_amount` (NUMERIC), `order_amount` (NUMERIC), `used_at` (TEXT).
20. **`campaigns`**: Marketing and promotional email campaigns.
    - `id` (TEXT, PK), `name` (TEXT), `subject` (TEXT), `content_html` (TEXT), `target_audience` (TEXT), `scheduled_at` (TEXT), `status` (TEXT), `sent_count` (INTEGER).

### 3.6 Returns & Feedback
21. **`returns`**: Customer return and replacement requests.
    - `id` (TEXT, PK), `order_id` (TEXT, FK -> orders), `user_id` (TEXT, FK -> profiles), `reason` (TEXT), `status` (TEXT: `'Requested'`, `'Approved'`, `'Inspected'`, `'Refunded'`, `'Rejected'`), `refund_amount` (NUMERIC), `photo_urls` (TEXT/JSON), `admin_notes` (TEXT), `created_at`, `updated_at`.
22. **`return_settings`**: Global return policies and timeframes.
    - `id` (TEXT, PK), `return_window_days` (INTEGER, DEFAULT 7), `allow_exchanges` (INTEGER/BOOLEAN), `terms_html` (TEXT).
23. **`return_notifications`**: Email notifications sent during return lifecycle.
    - `id` (TEXT, PK), `return_id` (TEXT, FK), `notification_type` (TEXT), `sent_at` (TEXT).
24. **`reviews`**: Customer product reviews and star ratings.
    - `id` (TEXT, PK), `product_id` (TEXT, FK -> products), `user_id` (TEXT, FK -> profiles), `customer_name` (TEXT), `rating` (INTEGER: 1-5), `review_text` (TEXT), `photo_urls` (TEXT/JSON), `is_verified_purchase` (INTEGER/BOOLEAN), `is_approved` (INTEGER/BOOLEAN), `created_at` (TEXT).

### 3.7 Custom Studio, Carts & Wishlists
25. **`design_submissions`**: Custom apparel designs submitted from `/design`.
    - `id` (TEXT, PK), `user_id` (TEXT, nullable), `customer_name` (TEXT), `customer_email` (TEXT), `customer_phone` (TEXT), `design_data_json` (TEXT), `preview_front_url` (TEXT), `preview_back_url` (TEXT), `status` (TEXT: `'Pending'`, `'Reviewed'`, `'In Production'`), `admin_notes` (TEXT), `created_at` (TEXT).
26. **`favorites`**: Customer wishlists.
    - `id` (TEXT, PK), `user_id` (TEXT, FK -> profiles), `product_id` (TEXT, FK -> products), `created_at` (TEXT).
27. **`carts`**: Persistent server-side customer carts.
    - `id` (TEXT, PK), `user_id` (TEXT, FK -> profiles), `items_json` (TEXT), `updated_at` (TEXT).

### 3.8 Website Content, Media & Store Settings
28. **`website_published`**: Currently active homepage content and visual blocks.
    - `id` (TEXT, PK, DEFAULT `'current'`), `content_json` (TEXT), `updated_at` (TEXT), `updated_by` (TEXT).
29. **`website_draft`**: Staging draft of homepage modifications.
    - `id` (TEXT, PK, DEFAULT `'current'`), `content_json` (TEXT), `updated_at` (TEXT).
30. **`website_versions`**: Historical revision log of homepage configurations.
    - `id` (TEXT, PK), `version_number` (INTEGER), `content_json` (TEXT), `created_at` (TEXT), `created_by` (TEXT).
31. **`website_media`**: In-database media storage for hero images and banners.
    - `id` (TEXT, PK), `file_name` (TEXT), `mime_type` (TEXT), `size_bytes` (INTEGER), `data_base64` (TEXT), `uploaded_by` (TEXT), `created_at` (TEXT).
32. **`store_settings`**: Global store configuration.
    - `id` (TEXT, PK, DEFAULT `'default'`), `store_name` (TEXT), `currency` (TEXT), `tax_rate` (NUMERIC), `initial_catalog_seeded` (INTEGER/BOOLEAN), `deleted_product_ids` (TEXT/JSON), `contact_email` (TEXT), `phone` (TEXT), `address` (TEXT).

### 3.9 System Logs & Amazon Integration
33. **`admin_audit_log`**: Detailed administrative change audit log.
    - `id` (TEXT, PK), `user_id` (TEXT), `action` (TEXT), `entity_type` (TEXT), `entity_id` (TEXT), `details_json` (TEXT), `created_at` (TEXT).
34. **`inventory_transactions`**: Audit trail of stock additions, deductions, and adjustments.
    - `id` (TEXT, PK), `product_id` (TEXT, FK), `variant_id` (TEXT, FK), `change_type` (TEXT: `'ORDER_DEDUCT'`, `'RESTOCK'`, `'RETURN_RESTORE'`, `'MANUAL_ADJUST'`), `quantity_change` (INTEGER), `new_stock_quantity` (INTEGER), `reference_id` (TEXT), `notes` (TEXT), `created_at` (TEXT).
35. **`amazon_export_templates`**: Templates for generating Amazon Marketplace flat-file feeds.
    - `id` (TEXT, PK), `template_name` (TEXT), `mapping_json` (TEXT), `created_at` (TEXT).
36. **`email_logs`**: Outgoing transactional email delivery log.
    - `id` (TEXT, PK), `recipient_email` (TEXT), `template_name` (TEXT), `status` (TEXT: `'SENT'`, `'FAILED'`), `error_message` (TEXT), `sent_at` (TEXT).
