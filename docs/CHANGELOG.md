# RIOTOUS Architecture & Release Changelog

All notable architecture, database, and system modifications are recorded in this document.

---

## [Current Release] — 2026-10-22

### Complete Brevo Email Integration Audit, Edge Workers Hardening & Multi-Workflow Fix
- **Brevo Exclusive Email Provider**: Completely removed Resend, SendGrid, and other fallbacks. Brevo official API (`POST https://api.brevo.com/v3/smtp/email`) is now the exclusive transactional gateway across RIOTOUS.
- **Cloudflare Edge Workers Runtime Hardening**:
  - Awaited all email calls across auth, orders, webhooks, returns, support, and reviews. Replaced fire-and-forget unawaited `.catch(...)` promises that were aborted prematurely when Cloudflare Workers returned HTTP responses.
  - Added 10-second `AbortController` timeout to prevent hanging worker executions.
  - Non-critical email failures never block orders, payments, or registrations (`Promise.allSettled` and isolated try/catch blocks).
- **Environment & Key Resolution**:
  - Implemented multi-alias resolution for `BREVO_API_KEY`, `BREVO_KEY`, `BREVO_APIKEY`, and `BREVO_TOKEN`.
  - Added dynamic sender resolution in `getVerifiedSender()` matching `EMAIL_FROM`, `BREVO_SENDER_EMAIL`, or `BREVO_SENDER_NAME`.
  - Fixed `getEmailMode()` so it defaults to `"production"` whenever `BREVO_API_KEY` is present, eliminating false-positive simulation traps.
  - Removed misleading `{ sent: true }` when the key is missing; now returns structured `{ sent: false, reason: "..." }`.
- **Database & Audit Trail**:
  - Fixed SQL logging parameter in `email_logs`: replaced literal `"NOW()"` string parameter with ISO timestamp strings for cross-compatibility (SQLite/D1 & Postgres).
  - Added schema creation for `email_logs` and `email_otps` in `ensureDbSchema()`.
  - Added mock SQL engine support for querying and recording `email_logs`.
- **Workflows Repaired & Implemented**:
  - Customer: Welcome email, Registration OTP, Login OTP, Forgot Password OTP/Link, Order Confirmation, Payment Confirmation, Order Shipped, Out for Delivery, Order Delivered, Order Cancelled, Return Requested, Return Approved, Return Rejected, Refund Processed, Password Changed.
  - Admin Notifications: New Customer Registration, New Order Created, Payment Succeeded / Failed, Customer Review Submitted, Return Request Submitted, Support Inquiry Submitted.
  - Private Admin Recipient: Server-side resolution via `ADMIN_NOTIFICATION_EMAIL` secret or `store_settings.notification_email` / `store_settings.store_email` in database without frontend leakage.
- **Admin Diagnostics & Live Verification**:
  - Added "Test Brevo Email Dispatch" in Admin Panel → Settings → Notifications tab with immediate success/failure feedback and Brevo message ID.
  - Added "Recent Outgoing Email Logs" table in Admin Settings displaying the last 50 emails.
  - Added Brevo system health check in `adminGetSystemHealth` (`/admin/system-health`).
  - Added standalone verification script `scripts/test-brevo.mjs`.

## [Previous Release] — 2026-10-21

### Complete Admin Panel Reviews Page Audit & Repair
- **Forensic Audit & Root Causes Fixed**:
  - **Null Safety Crash Resolved**: Fixed unhandled `TypeError: Cannot read properties of null (reading 'slice')` in `src/routes/_authenticated/admin/reviews.lazy.tsx` (previously calling `r.user_id.slice(0, 8)` directly on guest reviews where `user_id` is null). Safe fallback `{r.user_id ? `${r.user_id.slice(0, 8)}…` : "Not linked"}` prevents UI crash.
  - **Slug/ID Product Join Resolution**: Fixed product metadata dropping in `src/lib/admin-reviews.functions.ts` by updating the join condition to `LEFT JOIN products p ON (r.product_id = p.id OR r.product_id = p.slug)`. Reviews linking to product slugs now correctly resolve product names and thumbnail images.
  - **Cross-Engine Date Serialization**: Replaced raw string date handling with a robust `toIsoDate()` normalizer across `src/lib/admin-reviews.functions.ts` and `src/lib/reviews.functions.ts`, eliminating Safari/WebKit `RangeError: Invalid time value` on SQLite `"YYYY-MM-DD HH:MM:SS"` strings.
  - **Deleted & Missing Product Handling**: Added graceful fallback `{ isDeleted: true, name: 'Deleted / Unlinked Product (...)', ... }` preventing page breakage when reviews reference legacy, unlinked, or deleted products.
  - **Independent Admin Notes**: Upgraded `adminUpdateReviewStatus` and the admin review card UI to allow saving internal staff notes independently with a dedicated "Save Note" button without forcing a status change.
  - **Verified Purchase Preservation on Edit**: Upgraded `adminSaveReview` to preserve existing `is_verified_buyer` status on edit so modifying review title or text never strips genuine verified status.
  - **Cross-Engine Parameterized SQL**: Replaced engine-specific `NOW()` with SQL standard `CURRENT_TIMESTAMP` in `admin-reviews.functions.ts` for full D1/SQLite/PostgreSQL portability.
  - **Enhanced UI & Feedback**:
    * Added comprehensive search across Review ID, Author Name, Customer Name, Email, User ID, Product Name, Product Slug, Title, Content, and Internal Admin Note.
    * Made all 7 header metric cards interactive click-to-filter triggers (Total, Customer, Sample, Verified, Pending, Approved, Rejected).
    * Added explicit "View on store" external link directly to the live product page `/product/${r.product?.slug}`.
    * Added dedicated Error State with retry button (`listQ.refetch`) on network or database failures.
    * Added empty state differentiation ("No reviews yet in store" vs "No reviews match this filter").
    * Added responsive client pagination (15 items per page) with Previous/Next controls and page counter.
- **Verification**:
  - Automated test suite `scripts/test-admin-reviews-audit.mjs` verifying all 8 audit scenarios with 100% pass rate.
  - Full production build `npm run build` succeeds with zero errors.

### Complete Storewide Product Review System Implementation
- **Initial 5 Reviews per Live Product (40 Total)**:
  - Seeded 40 authentic-feeling, polished customer reviews across all 8 live products (`prod-satoru-gojo-graphic-tee`, `prod-anime-swordsman-tee`, `prod-oversized-black-tee`, `prod-premium-white-tee`, `prod-classic-red-tee`, `prod-heavyweight-grey-tee`, `prod-streetwear-blue-tee`, `prod-baki-hanma-oversized-tee`) in `src/lib/reviews-seed.ts`.
  - 100% unique reviewer names and surnames (Aarav Sharma, Devansh Rao, Rohan Verma, Kabir Mehta, Aditya Chaudhury, Manish Tiwari, Abhishek Mukherjee, Yashwant Reddy, Aakash Bhatt, etc.).
  - 100% unique review titles and natural review content specifically relevant to each product's anime artwork, oversized streetwear drape, 240 GSM bio-wash cotton fabric, collar ribbing, DTF print elasticity, and cold wash durability.
  - Realistic rating distribution from 3 to 5 stars (averages 4.2 to 4.8 per product).
- **Database Schema & Invariants**:
  - Leveraged existing `reviews` table (`id`, `product_id`, `user_id`, `author_name`, `rating`, `title`, `content`, `is_verified_buyer`, `status`, `images`, `created_at`, `updated_at`).
  - Added safe column migrations for `admin_note` (TEXT) and `is_sample` (INTEGER default 0).
  - Ensured composite database indexes on `product_id` and `status`.
  - Strictly avoided `BEGIN TRANSACTION`, `COMMIT`, or `SAVEPOINT` through Cloudflare Durable Objects SQL interface. Implemented duplicate-safe primary keys (`id`) with `ON CONFLICT (id) DO NOTHING` or existence verification.
  - Initial reviews preserve authentic customer experience without falsely claiming purchase verification (`is_verified_buyer = 0`).
- **Review Status & Purchase Verification Rules**:
  - Enforced system-confirmed purchase verification: reviews are only marked verified when confirmed by a delivered order in the database (`orders.status = 'Delivered'`).
  - Prohibited manual verification spoofing in Admin Panel (`adminSaveReview` strictly checks delivered orders in `orders` / `order_items`).
  - Sample content (`is_sample = 1`) is strictly excluded from public storefront product queries (`getProductReviews`) until replaced or converted.
  - Unapproved reviews (`status = 'pending'`, `'rejected'`, `'hidden'`) are kept out of public product pages.
- **Frontend & Real-Time Calculation**:
  - Eliminated hardcoded fallback ratings ("4.8" and "124 reviews") on `src/routes/product.$handle.tsx`.
  - Dynamically calculates arithmetic average rating and exact review count per product.
  - Prefetches reviews in `/product/$handle` route `loader` for instant, crawler-accessible SSR.
  - Renders star rating breakdown with percentage bars, review filtering (5, 4, 3, 2, 1 stars), sort options (Most recent, Highest rating, Lowest rating, Verified purchases), verified buyer badge (`ShieldCheck`), customer photos gallery, and paginated review list without horizontal overflow.
- **Admin Panel Control**:
  - Enhanced Admin Panel (`src/routes/_authenticated/admin/reviews.lazy.tsx`) with:
    * Content Source filter: "All sources", "Customer reviews", "Sample content".
    * Live stats breakdown: Total, Customer, Sample, Verified, Pending, Approved, Rejected, Avg rating.
    * Visual distinction badges: `Sample Content` vs `Customer Review`, and `Verified Buyer` vs `Unverified`.
    * System verification status indicator replacing manual spoofing dropdown.
    * Status transitions: Approve, Reject, Restore to Pending, Hide, and Delete with audit logging and `invalidateCatalogCache()`.
- **Verification**:
  - Automated test suite `scripts/test-product-reviews-complete.mjs` verifying all 7 core invariants with 100% pass rate.
  - `npm run build` succeeds with zero TypeScript errors and zero bundling warnings.

---

## [Release] — 2026-10-21

### Complete Product Page Admin Control & Front/Back Showcase Image Fix
- **Dedicated FRONT & BACK Showcase Admin Controls**:
  - Added a dedicated "Product Showcase Images (FRONT & BACK)" editor section in Admin Panel → Products → Edit Product.
  - Provided independent controls for both Front Showcase and Back Showcase images: direct file upload (`uploadProductImage`), gallery quick-picker drawer (selecting any image from the uploaded product gallery without re-upload), manual URL/media ID input, live visual card previews with dynamic badge overlays, image replace button, and image removal.
  - Added customizable Heading (defaults to "FRONT" and "BACK") and Subtitle (defaults to "Minimal & Clean" and "Bold Statement") fields.
- **Complete Invariant Decoupling from Gallery**:
  - Refactored `ProductGallery` (`src/components/product/product-gallery.tsx`) so that FRONT and BACK showcase panels strictly render from dedicated database fields `front_showcase_image` and `back_showcase_image` rather than inferring from gallery array indices `images[0]` and `images[1]`.
  - Reordering or modifying the main gallery no longer changes the showcase assignments.
  - Changing front image does not overwrite back image; changing back image does not overwrite front image; removing one image gracefully keeps the other active.
  - If neither image is assigned, the showcase section is cleanly omitted without displaying random pictures or placeholders.
- **Database Schema & Runtime Storage**:
  - Added nullable columns `front_showcase_image`, `back_showcase_image`, `front_showcase_title`, `front_showcase_subtitle`, `back_showcase_title`, `back_showcase_subtitle` to `products` table in `ensureDbSchema()` (`src/lib/db.ts`).
  - Added mapping and persistence across `ProductRow`, `CatalogProductNode`, `adminListProducts`, `adminCreateProduct`, `adminUpdateProduct`, and `mapDbProduct`.
  - Enhanced local mock SQL engine in `src/lib/db.ts` to parse all column assignments in `UPDATE products SET ...` clauses.
  - Base64 data URLs uploaded through the admin panel are automatically persisted to `website_media` table streaming endpoint `/api/media/:id`.
  - Cache invalidation via `invalidateCatalogCache()` ensures immediate real-time reflection across visitor and authenticated edge sessions.

---

## [Release] — 2026-10-21

### Complete Storewide Product Page Redesign + Fully Admin-Managed Product Content
- **Single Reusable Template for Every Product**: Fully refactored `src/routes/product.$handle.tsx` into a shared, data-driven template serving every existing and future product across all categories without category-specific code bifurcations.
- **Strict Header & Footer Preservation**: Original `SiteHeader` (`src/components/site-header.tsx`) and `SiteFooter` (`src/components/site-footer.tsx`) maintained 100% untouched.
- **Approved Visual Hierarchy**:
  - **Desktop Image Gallery Rail (`src/components/product/product-gallery.tsx`)**: Vertical thumbnail rail with red active outline, large 4:5 main image, top-left `NEW` badge, top-right wishlist button connected to `useFavorites()`, floating prev/next navigation, bottom-left zoom trigger, 1/N counter badge, touch-swiping, and wide FRONT / BACK presentation strip (`Minimal & Clean` / `Bold Statement`).
  - **Dynamic Pricing & MRP Hierarchy**: Selling price in prominent bold red (`text-brand-red`), struck-through MRP, red discount badge (`% OFF`), savings amount (`(Save ₹...)`), and tax-inclusive label.
  - **4 Compact Benefit Icons (`src/components/product/product-benefits-strip.tsx`)**: Placed directly below the short description in a 4-column compact row (Premium Cotton Fabric, High Quality DTF Print, Oversized Fit, Fast Shipping).
  - **Promotional Offer Banner (`src/components/product/product-promotional-banner.tsx`)**: Recreated pale-pink offer card (`bg-[#FFF0F2]`) with red gift icon, customizable heading, offer title ("Buy 2 Get 1 Free"), discount code copy, terms modal, and angled streetwear t-shirt visual on the right.
  - **Variant & Inventory Controls**: Select Size buttons (solid black when active, white with subtle border when unselected) with Size Guide link; Select Colour chips with swatches; Quantity selector with soft-red stock pill (`Only 5 left in S / White`) on the same row.
  - **Side-by-Side Purchase Actions**: `Add to Cart` (solid red background with shopping bag) and `Buy Now` (white with dark border and black lightning icon) side-by-side without horizontal overflow.
  - **3-Item Reassurance Row**: Secure Payment (Razorpay), Easy Returns & Exchange, Free Shipping on orders above ₹999 with subtle dividers.
  - **Structured Product Information Sections (`src/components/product/product-info-sections.tsx`)**: 2-column layout on desktop (Product Details with description left and detail photo right; Size & Fit; Fabric & Print; Wash Care; Shipping & Returns; Reviews (124)) and touch-friendly mobile accordions.
  - **Engineered Secondary Feature Strip (`src/components/product/product-benefits-strip.tsx`)**: 4-card feature strip (Soft & Breathable Cotton, Durable DTF Print, Oversized Fit, Fade Resistant).
  - **Real Customer Reviews & Complete Your Fit (`src/components/product/product-recommendations.tsx`)**: Real review summary from `getProductReviews()` and curated recommendation scoring algorithm.
  - **Mobile Sticky Purchase Bar (`src/components/product/product-sticky-bar.tsx`)**: Mobile sticky bottom bar syncing selected variant, stock status, price, and instant Add to Cart.
- **Admin Content Management & Database Persistence**:
  - Schema extension: added `sku`, `seo_title`, `seo_description` columns to `products` in `src/lib/db.ts` (`ensureDbSchema`).
  - Added SKU and custom slug editing in `src/components/admin/product-ui.tsx` and `src/routes/_authenticated/admin/products.tsx`.
  - Added Left/Right image reordering arrows (`ChevronLeft`, `ChevronRight`) in `ImageManager`.
  - Immediate catalog micro-cache invalidation (`invalidateCatalogCache()`) on admin mutations.

---

## [Release] — 2026-10-21

### Mobile Navigation Drawer Redesign & Implementation
- **Luxury-Streetwear Editorial Drawer**: Replaced legacy mobile overlay with a slide-in drawer (`src/components/mobile-nav-drawer.tsx`) inspired by the brand's aesthetic.
- **Brand Header**: Signature red-and-black RIOTOUS typography (`RIOTOUS`), letterspaced "WEAR THE NOISE" tagline, and quick-dismiss close button.
- **Integrated Product Search**: Rounded pill input with magnifying glass icon connecting directly to the store's instant catalog search modal.
- **Structured Primary Navigation**: 4 aligned navigation rows with icons and chevrons, featuring soft-red highlighting on the "Shop" entry.
- **Stateful Account Card**: Dual-state card displaying personalized initial avatar, customer name, signed-in indicator, account settings, and logout for members, or welcoming prompt linking to auth for guests.
- **Quick-Access Shortcuts**: 3-column cards for "My Orders", "Wishlist", and "Saved" with clean hover/touch responses.
- **Promotional Offer Card**: Responsive "BUY 2 GET 1 FREE" promotional banner with "SHOP NOW" CTA, streetwear t-shirt visual, and red graffiti crown accent.
- **Compact Brand Footer & Watermark**: Official brand social links, "STAY CONNECTED →", and subtle vector mascot watermark.

---

## [Release] — 2026-10-19

### Shop Page & Storefront Usability Audit Optimizations (9 Fixes)
- **Consolidated Button Styles (Fix 1)**: Unified button primitives in `src/components/ui/button.tsx` into 3 standardized variants (Primary, Secondary, Ghost/Outline) with consistent `rounded-full` curvature, padding, font weights, and hover/active states.
- **Harmonized Footer Links & "Design Your Own" (Fix 2 & Fix 4)**: Standardized link styling across Shop, Company, and Support footer columns; eliminated route-active red underline discrepancies in `src/components/site-footer.tsx`.
- **Unified Newsletter Input & Join Button (Fix 3)**: Cohesive pill-shaped newsletter form with matching `rounded-full` radii, responsive heights, and no-overflow flex behavior.
- **Improved Product Card Information Hierarchy (Fix 5)**: Established clear vertical hierarchy (Category kicker -> Product title -> Price block with selling price, struck-through MRP, and discount badge) without empty whitespace boxes in `src/components/product-card.tsx`.
- **Separated Contact Information from Newsletter (Fix 6)**: Added a dedicated "Contact Us" subheading with clean top border separation in `src/components/site-footer.tsx`.
- **Repositioned Floating WhatsApp Button (Fix 7)**: Relocated button to the true bottom-right viewport corner in `src/components/floating-whatsapp.tsx` (`z-30`), eliminating overlap with product cards in the rightmost column.
- **Grouped Item Count with Filter Toolbar (Fix 8)**: Reorganized shop toolbar in `src/routes/shop.tsx` so `{filtered.length} items` aligns directly before the "All sizes" and "Sort" dropdowns with clean mobile stacking.
- **Aligned Product Text Flush with Product Image (Fix 9)**: Removed accidental `px-1` indent in `src/components/product-card.tsx` and `src/components/shop/shop-skeleton.tsx`, establishing precise left alignment.

### Mobile Performance & Asset Delivery Optimization
- **Eliminated Render-Blocking External Typography**: Self-hosted `Archivo Black` woff2 (9.7 KB) locally in `public/assets/fonts/` with `@font-face` and `font-display: swap` in `src/styles.css`. Removed external Google Fonts CSS and preconnect links from `src/routes/__root.tsx`.
- **Eliminated Global Preload Waste & Optimized Mobile LCP**: Removed wasteful 105.5 KB global `/assets/hero-model.jpg` preload from `src/routes/__root.tsx`. Generated mobile-optimized hero asset `public/assets/hero-model-mobile.jpg` (45.3 KB vs 105.5 KB, 57% savings). Added route-scoped responsive preload in `src/routes/index.tsx` and responsive `srcSet`/`sizes` in `src/components/ui/streetwear-hero.tsx`.
- **Accelerated Product Detail Page LCP**: Added dynamic `<link rel="preload" as="image" fetchPriority="high">` in `src/routes/product.$handle.tsx` for immediate above-the-fold product image discovery.
- **Compressed Collection Card Assets**: Re-encoded 4 collection images in `public/assets/collections/`, saving 715 KB (888 KB -> 173 KB) with zero visual quality or cropping degradation.

### Technical SEO & Google Search Console Optimization
- **Added**: Absolute HTTPS canonical link tags across all 10 public storefront routes (`/`, `/shop`, `/product/:handle`, `/design`, `/about`, `/contact`, `/privacy`, `/terms`, `/shipping-policy`, `/refund-policy`).
- **Added**: Server-level HTTP 301 permanent redirects in `src/server.ts` for apex domain normalization (`www.riotous.store` -> `riotous.store`), trailing slash removal (`/shop/` -> `/shop`), and legacy catalog paths (`/products`, `/collections`, `/catalog`, `/product` -> `/shop`).
- **Updated**: `src/routes/sitemap[.]xml.ts` to exclude all parameterized URLs, include dynamic `<lastmod>` timestamps from the database, and attach `X-Robots-Tag: noindex`.
- **Updated**: `src/routes/robots[.]txt.ts` and `public/robots.txt` with dedicated `Googlebot` directives and explicit allowance for `/api/media/` and `/api/public/` image streaming.
- **Added**: Schema.org JSON-LD structured data (`Product`, `BreadcrumbList`, `Organization`) across product and catalog pages.
- **Verified**: Created and executed `scripts/verify-seo-fixes.mjs`.

### Permanent AI Agent Knowledge Base
- **Added**: Comprehensive 26-document knowledge base under `docs/` and updated root `AGENTS.md`.
- **Added**: Task-to-File Lookup Table in `docs/README.md` enabling instant navigation for future coding sessions.

---

## [Pre-Release] — 2026-09-15

### GST Tax Invoicing System
- **Added**: Database migration `0004_invoices_and_tax_schema.sql` creating `invoices` and `invoice_sequences` tables.
- **Added**: Database migration `0005_add_invoice_fields_to_orders.sql` adding `invoice_number` and `invoice_date` to the `orders` table.
- **Added**: `src/lib/invoice.functions.ts` calculating CGST (9%), SGST (9%), or IGST (18%) and generating sequential invoice references.
- **Added**: Endpoint `GET /api/invoices/:orderId` supporting both HTML and PDF formats.

### Zippyy Courier Logistics Integration
- **Added**: Full client and service integration in `src/lib/zippyy/*`.
- **Added**: Multi-courier dispatch workflow in `/admin/orders` assigning AWBs and generating shipping labels.
- **Added**: Webhook listeners in `src/routes/api/zippyy.webhook.ts` and `src/routes/tracking.webhook.ts` for real-time tracking ingestion.

### Real-Time Admin Consistency Protocol
- **Added**: Instant cache invalidation hooks (`invalidateCatalogCache()`, `invalidatePublicWebsiteConfigCache()`, `invalidateImageCache()`, `invalidateCouponCache()`) triggered on every administrative mutation.
- **Refactored**: Replaced static long-lived caching with 2-second burst debouncing in `src/lib/catalog.ts`.

### Cloudflare D1 Native Database Binding
- **Added**: Native `d1_databases` binding `DB` (`riotous-db`) in `wrangler.json`.
- **Added**: Multi-engine abstraction in `src/lib/db.ts` seamlessly selecting D1 at the edge, Neon PostgreSQL in Node environments, or offline in-memory mocks.

### Interactive Custom Design Studio
- **Added**: Fabric.js canvas editor at `/design` (`src/routes/design.lazy.tsx`) supporting front/back t-shirt artwork creation.
- **Added**: Queue management view at `/admin/designs` and `design_submissions` table.
