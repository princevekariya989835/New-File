-- RIOTOUS Product Department & Category Management Migration
-- Database: riotous-db & Neon PostgreSQL compatible
-- Version: 0004_add_departments_and_categories.sql

-- 1. Add Department, Subcategory, Collection, and Featured columns to products
ALTER TABLE products ADD COLUMN department TEXT DEFAULT 'men';
ALTER TABLE products ADD COLUMN subcategory TEXT;
ALTER TABLE products ADD COLUMN collection TEXT;
ALTER TABLE products ADD COLUMN is_featured INTEGER DEFAULT 0;

-- 2. Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_department ON products (department);
CREATE INDEX IF NOT EXISTS idx_products_dept_active ON products (department, is_active);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products (subcategory);
CREATE INDEX IF NOT EXISTS idx_products_collection ON products (collection);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products (is_featured);

-- 3. Enhance categories table with department and ordering
ALTER TABLE categories ADD COLUMN department TEXT DEFAULT 'unisex';
ALTER TABLE categories ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_department ON categories (department);
CREATE INDEX IF NOT EXISTS idx_categories_active_order ON categories (is_active, display_order ASC);

-- 4. Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  department TEXT DEFAULT 'unisex',
  description TEXT,
  image_url TEXT,
  banner_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections (slug);
CREATE INDEX IF NOT EXISTS idx_collections_dept ON collections (department, is_active);

-- 5. Safe backfill for existing products:
-- Assign existing products a safe default department of 'men' only if they have no existing classification
UPDATE products SET department = 'men' WHERE department IS NULL OR department = '';

-- Auto-classify as unisex if tags contain 'unisex'
UPDATE products 
SET department = 'unisex'
WHERE (
  LOWER(tags) LIKE '%unisex%' 
  OR LOWER(name) LIKE '%unisex%'
);

-- Auto-classify as women if tags or name specify women/female
UPDATE products
SET department = 'women'
WHERE (
  LOWER(tags) LIKE '%women%'
  OR LOWER(tags) LIKE '%woman%'
  OR LOWER(tags) LIKE '%female%'
  OR LOWER(name) LIKE '%women%'
  OR LOWER(name) LIKE '%woman%'
);

-- 6. Seed initial Women's categories
INSERT INTO categories (id, name, slug, department, description, image_url, is_active, display_order)
VALUES 
  ('cat_w_oversized', 'Oversized Tees', 'women-oversized-tees', 'women', 'Boxy streetwear oversized tees designed for effortless drape.', '/assets/collections/collection-oversized.jpg', 1, 1),
  ('cat_w_baby_tees', 'Baby Tees', 'baby-tees', 'women', 'Fitted Y2K silhouette with vibrant DTF prints and ribbed crew necks.', '/assets/collections/collection-printed-tees.jpg', 1, 2),
  ('cat_w_crop_tees', 'Crop Tees', 'crop-tees', 'women', 'Raw-hem cropped streetwear tees engineered for layering.', '/assets/collections/collection-custom-printing.jpg', 1, 3),
  ('cat_w_regular_fit', 'Regular Fit Tees', 'women-regular-fit-tees', 'women', 'Everyday classic streetwear fit in combed heavyweight cotton.', '/assets/collections/collection-printed-tees.jpg', 1, 4),
  ('cat_w_hoodies', 'Hoodies', 'women-hoodies', 'women', 'Dense 380+ GSM french terry oversized streetwear hoodies.', '/assets/collections/collection-best-sellers.jpg', 1, 5)
ON CONFLICT (id) DO UPDATE SET 
  department = EXCLUDED.department,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- 7. Seed initial Men's categories
INSERT INTO categories (id, name, slug, department, description, image_url, is_active, display_order)
VALUES 
  ('cat_m_oversized', 'Oversized Tees', 'men-oversized-tees', 'men', 'Heavyweight 240+ GSM dropped-shoulder boxy streetwear silhouette.', '/assets/collections/collection-oversized.jpg', 1, 1),
  ('cat_m_regular_fit', 'Regular Fit Tees', 'men-regular-fit-tees', 'men', 'Clean tailored streetwear cut for daily high-street wear.', '/assets/collections/collection-printed-tees.jpg', 1, 2),
  ('cat_m_graphic_tees', 'Graphic Tees', 'graphic-tees', 'men', 'Signature anime, automotive, and statement DTF printed tees.', '/assets/collections/collection-printed-tees.jpg', 1, 3),
  ('cat_m_hoodies', 'Hoodies', 'men-hoodies', 'men', 'Heavyweight architectural hoodies crafted from brushed fleece.', '/assets/collections/collection-best-sellers.jpg', 1, 4)
ON CONFLICT (id) DO UPDATE SET 
  department = EXCLUDED.department,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- 8. Seed initial collections
INSERT INTO collections (id, name, slug, department, description, is_active, display_order)
VALUES
  ('col_summer_drop', 'Summer Drop', 'summer-drop', 'unisex', 'Breathable lightweight and boxy cuts designed for summer heat.', 1, 1),
  ('col_anime_edition', 'Anime Edition', 'anime-edition', 'unisex', 'Iconic high-density anime artwork and character prints.', 1, 2),
  ('col_automotive_series', 'Automotive Series', 'automotive-series', 'men', 'JDM and motorsport aesthetic graphic tees.', 1, 3),
  ('col_riotous_women_launch', 'RIOTOUS Women Launch Drop', 'women-launch-drop', 'women', 'Bold streetwear graphics, crop tees, and oversized statements.', 1, 4)
ON CONFLICT (id) DO NOTHING;
