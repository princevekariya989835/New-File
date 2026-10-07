-- Cloudflare D1 Migration for RIOTOUS Store
-- Database: riotous-db (7487ac0f-706e-4560-baf8-e79031b2dd5e)
-- Version: 0001_initial_d1_schema.sql

-- 1. Profiles (Customers, Staff, Admins)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  phone TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'Active',
  permissions TEXT DEFAULT '{}',
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  last_login_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at DESC);

-- 2. Email OTPs
CREATE TABLE IF NOT EXISTS email_otps (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps (email, purpose);

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  details_html TEXT,
  price REAL NOT NULL DEFAULT 0,
  base_price REAL DEFAULT 0,
  mrp REAL,
  compare_at_price REAL,
  cost_price REAL,
  sale_price REAL,
  sku TEXT,
  barcode TEXT,
  category_id TEXT,
  vendor TEXT,
  type TEXT,
  status TEXT,
  is_tax_inclusive INTEGER DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'INR',
  images TEXT NOT NULL DEFAULT '[]',
  category TEXT,
  sizes TEXT NOT NULL DEFAULT '[]',
  colors TEXT NOT NULL DEFAULT '[]',
  color_variants TEXT NOT NULL DEFAULT '[]',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 2,
  is_active INTEGER NOT NULL DEFAULT 1,
  tags TEXT NOT NULL DEFAULT '[]',
  features TEXT NOT NULL DEFAULT '[]',
  care_instructions TEXT NOT NULL DEFAULT '[]',
  manufacturing_info TEXT DEFAULT '{}',
  size_measurements TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_active_name ON products (is_active, name ASC);

-- 5. Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  size TEXT DEFAULT '',
  color TEXT DEFAULT '',
  color_hex TEXT,
  image_url TEXT,
  sku TEXT DEFAULT '',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 2,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id);

-- 6. Product Highlights
CREATE TABLE IF NOT EXISTS product_highlights (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prod_highlights_prod_id ON product_highlights (product_id, is_active, display_order ASC);

-- 7. Product Specifications
CREATE TABLE IF NOT EXISTS product_specifications (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prod_specs_prod_id ON product_specifications (product_id, is_active, display_order ASC);

-- 8. Product Offers
CREATE TABLE IF NOT EXISTS product_offers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value REAL NOT NULL DEFAULT 0,
  promo_code TEXT,
  minimum_quantity INTEGER NOT NULL DEFAULT 1,
  maximum_quantity INTEGER,
  eligible_products TEXT DEFAULT '[]',
  eligible_categories TEXT DEFAULT '[]',
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  terms_and_conditions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prod_offers_prod_id ON product_offers (product_id, is_active, display_order ASC);

-- 9. Product Images (Legacy Compatibility)
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  image_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 10. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  order_number TEXT UNIQUE NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  discount_code TEXT,
  coupon_id TEXT,
  discount_type TEXT,
  discount_value REAL,
  eligible_amount REAL,
  original_subtotal REAL,
  final_subtotal REAL,
  shipping_charge REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'Pending',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_gateway TEXT DEFAULT 'Razorpay',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  paid_at TEXT,
  stock_state TEXT DEFAULT 'Normal',
  shipping_name TEXT NOT NULL,
  shipping_email TEXT NOT NULL,
  shipping_phone TEXT,
  shipping_address TEXT NOT NULL,
  shipping_full_name TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_pincode TEXT,
  billing_address TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  cancelled_at TEXT,
  admin_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON orders (razorpay_payment_id);

-- 11. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  design_submission_id TEXT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL DEFAULT 0,
  unit_price REAL,
  total_price REAL,
  selected_size TEXT,
  selected_color TEXT,
  size TEXT,
  color TEXT,
  sku TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

-- 12. Addresses
CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 13. Reviews
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);

-- 14. Returns
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  return_number TEXT UNIQUE NOT NULL,
  order_id TEXT,
  order_item_id TEXT,
  user_id TEXT,
  customer_id TEXT,
  quantity INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Requested',
  reason TEXT NOT NULL,
  comments TEXT,
  refund_amount REAL DEFAULT 0,
  items TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns (order_id);

-- 15. Return Settings
CREATE TABLE IF NOT EXISTS return_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  window_days INTEGER NOT NULL DEFAULT 7,
  require_delivered INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 16. Return Notifications
CREATE TABLE IF NOT EXISTS return_notifications (
  id TEXT PRIMARY KEY,
  return_id TEXT,
  event TEXT,
  recipient TEXT,
  subject TEXT,
  status TEXT DEFAULT 'pending',
  error TEXT,
  attempts INTEGER DEFAULT 0,
  sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 17. Design Submissions
CREATE TABLE IF NOT EXISTS design_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  color_name TEXT NOT NULL,
  placement TEXT NOT NULL,
  product_title TEXT,
  variant_id TEXT,
  price REAL,
  preview_data_url TEXT,
  preview_images TEXT DEFAULT '[]',
  canvases TEXT DEFAULT '{}',
  emailed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 18. Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  product_handle TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_price REAL,
  product_image TEXT,
  product_currency TEXT DEFAULT 'INR',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);

-- 19. Carts
CREATE TABLE IF NOT EXISTS carts (
  user_id TEXT PRIMARY KEY,
  items TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 20. Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  target_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 21. Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  variant_id TEXT,
  order_id TEXT,
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inv_tx_product ON inventory_transactions (product_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_variant ON inventory_transactions (variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_order ON inventory_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_created ON inventory_transactions (created_at DESC);

-- 22. Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  channel TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  budget REAL NOT NULL DEFAULT 0,
  spent REAL NOT NULL DEFAULT 0,
  target_audience TEXT,
  product_ids TEXT NOT NULL DEFAULT '[]',
  discount_code TEXT,
  discount_type TEXT,
  discount_value REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 23. Shipments
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  tracking_number TEXT,
  carrier TEXT,
  shipping_method TEXT,
  shipping_cost REAL DEFAULT 0,
  estimated_delivery_date TEXT,
  actual_delivery_date TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  shipping_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  admin_note TEXT,
  updated_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 24. Shipment Tracking Events
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  awb_number TEXT,
  status TEXT,
  location TEXT,
  activity TEXT,
  event_time TEXT,
  raw_payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 25. Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_id TEXT,
  transaction_id TEXT,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'Pending',
  paid_at TEXT,
  refund_amount REAL DEFAULT 0,
  admin_note TEXT,
  updated_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);

-- 26. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL,
  minimum_order_value REAL DEFAULT 0,
  maximum_discount REAL,
  usage_limit INTEGER,
  usage_per_customer INTEGER DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  applies_to TEXT NOT NULL DEFAULT 'all',
  product_ids TEXT NOT NULL DEFAULT '[]',
  category_names TEXT NOT NULL DEFAULT '[]',
  excluded_product_ids TEXT NOT NULL DEFAULT '[]',
  excluded_category_names TEXT NOT NULL DEFAULT '[]',
  deleted_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active, deleted_at);

-- 27. Coupon Usage
CREATE TABLE IF NOT EXISTS coupon_usage (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  customer_id TEXT,
  customer_email TEXT NOT NULL,
  coupon_code TEXT NOT NULL,
  discount_amount REAL NOT NULL,
  order_amount REAL NOT NULL,
  used_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON coupon_usage (customer_email, coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage (order_id);

-- 28. Website Published
CREATE TABLE IF NOT EXISTS website_published (
  id TEXT PRIMARY KEY DEFAULT 'live',
  version_id TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT NOT NULL DEFAULT 'Admin',
  change_summary TEXT
);

-- 29. Website Draft
CREATE TABLE IF NOT EXISTS website_draft (
  id TEXT PRIMARY KEY DEFAULT 'current',
  config TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT DEFAULT 'Admin'
);

-- 30. Website Versions
CREATE TABLE IF NOT EXISTS website_versions (
  id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL,
  config TEXT NOT NULL,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT NOT NULL,
  change_summary TEXT,
  status TEXT DEFAULT 'published'
);

-- 31. Website Media
CREATE TABLE IF NOT EXISTS website_media (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  data_base64 TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_website_media_created ON website_media (created_at DESC);

-- 32. Amazon Export Templates
CREATE TABLE IF NOT EXISTS amazon_export_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'General',
  file_name TEXT NOT NULL,
  file_format TEXT NOT NULL,
  headers TEXT NOT NULL DEFAULT '[]',
  mapping TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_amazon_templates_active ON amazon_export_templates (is_active, created_at DESC);

-- 33. Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  order_id TEXT,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sender TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'brevo',
  provider_message_id TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs (email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_order ON email_logs (order_id);

-- 34. Store Settings
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT NOT NULL DEFAULT 'RIOTOUS',
  store_logo TEXT DEFAULT '',
  store_email TEXT NOT NULL DEFAULT 'support@riotous.store',
  store_phone TEXT NOT NULL DEFAULT '+91 90998 66791',
  store_address TEXT DEFAULT 'Plot 42, Streetwear District, Surat, Gujarat 395006, India',
  business_gstin TEXT DEFAULT '24AAAAA0000A1Z5',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  currency_code TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '12h',
  country TEXT NOT NULL DEFAULT 'India',
  language TEXT NOT NULL DEFAULT 'en',
  maintenance_mode INTEGER NOT NULL DEFAULT 0,
  maintenance_message TEXT DEFAULT 'We are currently updating the store. Please check back shortly.',
  order_notifications INTEGER NOT NULL DEFAULT 1,
  low_stock_notifications INTEGER NOT NULL DEFAULT 1,
  return_notifications INTEGER NOT NULL DEFAULT 1,
  review_notifications INTEGER NOT NULL DEFAULT 1,
  payment_notifications INTEGER NOT NULL DEFAULT 1,
  shipping_notifications INTEGER NOT NULL DEFAULT 1,
  notification_email TEXT DEFAULT 'support@riotous.store',
  appearance_theme TEXT NOT NULL DEFAULT 'dark',
  free_shipping_threshold REAL NOT NULL DEFAULT 1499,
  standard_shipping_charge REAL NOT NULL DEFAULT 99,
  express_shipping_charge REAL NOT NULL DEFAULT 199,
  cod_enabled INTEGER NOT NULL DEFAULT 1,
  cod_extra_charge REAL NOT NULL DEFAULT 0,
  upi_enabled INTEGER NOT NULL DEFAULT 1,
  card_enabled INTEGER NOT NULL DEFAULT 1,
  netbanking_enabled INTEGER NOT NULL DEFAULT 1,
  wallet_enabled INTEGER NOT NULL DEFAULT 1,
  initial_catalog_seeded INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT DEFAULT 'Admin'
);
