-- Migration 0007: Reviews moderation and administrative columns
-- Ensures admin_note and is_sample columns exist for review moderation workflow

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  user_id TEXT,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  title TEXT,
  content TEXT NOT NULL,
  is_verified_buyer INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved',
  images TEXT NOT NULL DEFAULT '[]',
  admin_note TEXT,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_is_sample ON reviews (is_sample);
