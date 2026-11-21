-- RIOTOUS Migration 0010: Add production_type to products (DTF Printing vs Embroidery)

-- 1. Add production_type column to products table with default 'dtf'
ALTER TABLE products ADD COLUMN production_type TEXT DEFAULT 'dtf';

-- 2. Create index on production_type for efficient storefront collection & admin queries
CREATE INDEX IF NOT EXISTS idx_products_prod_type ON products (production_type);

-- 3. Ensure all existing records have 'dtf' as default production_type
UPDATE products SET production_type = 'dtf' WHERE production_type IS NULL OR production_type = '';

