-- Migration 0008: High-Performance Database Indexes for Admin Panel & Catalog Listings
-- Optimizes sales grouping, order status filtering, department catalog queries, and variant inventory.

-- 1. Index on order_items(product_id) to eliminate full table scans during best-seller and sales analytics
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- 2. Compound index on orders(status, created_at) for fast revenue and status-filtered queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC);

-- 3. Compound index on products for department storefront listings and sorting
CREATE INDEX IF NOT EXISTS idx_products_dept_status_feat ON products (department, is_active, is_featured DESC, created_at DESC);

-- 4. Index on products(updated_at) for fast admin catalog sorting
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products (updated_at DESC);

-- 5. Compound index on product_variants for stock calculations
CREATE INDEX IF NOT EXISTS idx_product_variants_prod_stock ON product_variants (product_id, stock_quantity);

