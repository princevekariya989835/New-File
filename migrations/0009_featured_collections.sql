-- RIOTOUS Migration 0009: Dynamic Featured Collections (Best Sellers & Latest Edition for Men and Women)

-- 1. Create featured_collections table
CREATE TABLE IF NOT EXISTS featured_collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  collection_type TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_featured_collections_dept ON featured_collections (department, collection_type, is_enabled);

-- 2. Create featured_collection_items join table
CREATE TABLE IF NOT EXISTS featured_collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES featured_collections(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_fci_collection_order ON featured_collection_items (collection_id, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_fci_product_id ON featured_collection_items (product_id);

-- 3. Seed the 4 featured collections
INSERT INTO featured_collections (id, title, slug, department, collection_type, description, is_enabled, display_order)
VALUES 
  ('men_best_sellers', 'Men''s Best Sellers', 'men/best-sellers', 'men', 'best_sellers', 'Verified customer favorites and top-selling heavyweight streetwear for men.', 1, 1),
  ('men_latest_edition', 'Men''s Latest Edition', 'men/latest-edition', 'men', 'latest_edition', 'Fresh seasonal drops, limited releases, and oversized DTF graphic tees for men.', 1, 2),
  ('women_best_sellers', 'Women''s Best Sellers', 'women/best-sellers', 'women', 'best_sellers', 'Curated best-selling streetwear, relaxed silhouettes, and everyday statement tees for women.', 1, 3),
  ('women_latest_edition', 'Women''s Latest Edition', 'women/latest-edition', 'women', 'latest_edition', 'New seasonal arrivals, cropped fits, baby tees, and oversized streetwear for women.', 1, 4)
ON CONFLICT (id) DO NOTHING;

