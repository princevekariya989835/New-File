import { neon } from "@neondatabase/serverless";

let _schemaInitialized = false;
let _schemaPromise: Promise<void> | null = null;

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || null;
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    const mockSql = async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings
        .reduce((acc, str, i) => acc + str + (values[i] !== undefined ? values[i] : ""), "")
        .trim();
      const lower = query.toLowerCase();
      if (lower.startsWith("select count")) {
        return [
          {
            count: 0,
            order_count: 0,
            product_count: 0,
            customer_count: 0,
            total_sales: 0,
            sales_today: 0,
            sales_month: 0,
          },
        ];
      }
      if (lower.includes("return_settings")) {
        return [{ id: "default", window_days: 7, require_delivered: true }];
      }
      return [];
    };
    return mockSql as any;
  }
  return neon(url);
}

/**
 * Initializes all required database tables, indexes, and initial data in Neon PostgreSQL.
 * Optimized for high performance and fast dashboard startup with singleton promise locking.
 */
export async function ensureDbSchema() {
  if (_schemaInitialized) return;
  if (_schemaPromise) return _schemaPromise;
  if (!process.env.DATABASE_URL) {
    _schemaInitialized = true;
    return;
  }

  _schemaPromise = (async () => {
    try {
      const sql = getSql();

      // 1. Ultra-fast catalog check using PostgreSQL native to_regclass.
      // Checks all core tables in a single query (<50ms).
      try {
        const check = await sql`
          SELECT 
            to_regclass('public.products') IS NOT NULL AS has_products,
            to_regclass('public.profiles') IS NOT NULL AS has_profiles,
            to_regclass('public.website_published') IS NOT NULL AS has_website,
            to_regclass('public.store_settings') IS NOT NULL AS has_settings
        `;
        const row = check?.[0];
        if (row && (row.has_products || row.has_profiles || row.has_website || row.has_settings)) {
          // Core database schema already exists.
          // Check if newly introduced tables are missing and create only what is needed:
          const missingDdl: string[] = [];
          if (!row.has_website) {
            missingDdl.push(`
              CREATE TABLE IF NOT EXISTS website_published (
                id TEXT PRIMARY KEY DEFAULT 'live',
                version_id TEXT NOT NULL,
                version_number INTEGER NOT NULL DEFAULT 1,
                config JSONB NOT NULL,
                published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                published_by TEXT NOT NULL DEFAULT 'Admin',
                change_summary TEXT
              );
              CREATE TABLE IF NOT EXISTS website_draft (
                id TEXT PRIMARY KEY DEFAULT 'current',
                config JSONB NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT DEFAULT 'Admin'
              );
              CREATE TABLE IF NOT EXISTS website_versions (
                id TEXT PRIMARY KEY,
                version_number INTEGER NOT NULL,
                config JSONB NOT NULL,
                published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                published_by TEXT NOT NULL,
                change_summary TEXT,
                status TEXT DEFAULT 'published'
              );
            `);
          }
          if (!row.has_settings) {
            missingDdl.push(`
              CREATE TABLE IF NOT EXISTS store_settings (
                id TEXT PRIMARY KEY DEFAULT 'default',
                store_name TEXT NOT NULL DEFAULT 'RIOTOUS',
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
              INSERT INTO store_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
            `);
          }
          if (missingDdl.length > 0) {
            try {
              if (typeof (sql as any).query === "function") {
                await (sql as any).query(missingDdl.join("\n"));
              } else {
                await (sql as any)([missingDdl.join("\n")]);
              }
            } catch {
              // ignore non-fatal creation warnings
            }
          }
          _schemaInitialized = true;
          return;
        }
      } catch (checkErr) {
        console.warn("[Neon DB] catalog check warning:", checkErr);
      }

      const schemaStatements = [
        `CREATE TABLE IF NOT EXISTS email_otps (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          otp TEXT NOT NULL,
          purpose TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT,
          role TEXT NOT NULL DEFAULT 'customer',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          price NUMERIC NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'INR',
          images JSONB NOT NULL DEFAULT '[]'::jsonb,
          category TEXT,
          sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
          colors JSONB NOT NULL DEFAULT '[]'::jsonb,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          reserved_stock INTEGER NOT NULL DEFAULT 0,
          low_stock_threshold INTEGER NOT NULL DEFAULT 2,
          is_active BOOLEAN NOT NULL DEFAULT true,
          tags JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS product_variants (
          id TEXT PRIMARY KEY,
          product_id TEXT,
          size TEXT,
          color TEXT,
          sku TEXT,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          reserved_stock INTEGER NOT NULL DEFAULT 0,
          low_stock_threshold INTEGER NOT NULL DEFAULT 2,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          order_number TEXT UNIQUE NOT NULL,
          subtotal NUMERIC NOT NULL DEFAULT 0,
          discount_amount NUMERIC NOT NULL DEFAULT 0,
          discount_code TEXT,
          shipping_charge NUMERIC NOT NULL DEFAULT 0,
          tax_amount NUMERIC NOT NULL DEFAULT 0,
          total_amount NUMERIC NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'INR',
          status TEXT NOT NULL DEFAULT 'Pending',
          payment_status TEXT NOT NULL DEFAULT 'Pending',
          payment_method TEXT NOT NULL DEFAULT 'COD',
          stock_state TEXT DEFAULT 'Normal',
          shipping_name TEXT NOT NULL,
          shipping_email TEXT NOT NULL,
          shipping_phone TEXT,
          shipping_address TEXT NOT NULL,
          billing_address TEXT,
          courier_name TEXT,
          tracking_number TEXT,
          tracking_url TEXT,
          shipped_at TIMESTAMP WITH TIME ZONE,
          delivered_at TIMESTAMP WITH TIME ZONE,
          cancelled_at TIMESTAMP WITH TIME ZONE,
          admin_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS order_items (
          id TEXT PRIMARY KEY,
          order_id TEXT,
          product_id TEXT,
          variant_id TEXT,
          design_submission_id TEXT,
          product_name TEXT NOT NULL,
          product_image TEXT,
          quantity INTEGER NOT NULL DEFAULT 1,
          price NUMERIC NOT NULL DEFAULT 0,
          selected_size TEXT,
          selected_color TEXT,
          subtotal NUMERIC NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS addresses (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          name TEXT,
          street TEXT NOT NULL,
          city TEXT NOT NULL,
          state TEXT NOT NULL,
          postal_code TEXT NOT NULL,
          country TEXT NOT NULL,
          phone TEXT,
          is_default BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS reviews (
          id TEXT PRIMARY KEY,
          product_id TEXT,
          user_id TEXT,
          author_name TEXT NOT NULL,
          rating INTEGER NOT NULL DEFAULT 5,
          title TEXT,
          content TEXT NOT NULL,
          is_verified_buyer BOOLEAN NOT NULL DEFAULT false,
          status TEXT NOT NULL DEFAULT 'approved',
          images JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS returns (
          id TEXT PRIMARY KEY,
          return_number TEXT UNIQUE NOT NULL,
          order_id TEXT,
          order_item_id TEXT,
          user_id TEXT,
          quantity INTEGER DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'Requested',
          reason TEXT NOT NULL,
          comments TEXT,
          refund_amount NUMERIC DEFAULT 0,
          items JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS return_settings (
          id TEXT PRIMARY KEY DEFAULT 'default',
          window_days INTEGER NOT NULL DEFAULT 7,
          require_delivered BOOLEAN NOT NULL DEFAULT true,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS design_submissions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          customer_name TEXT,
          customer_email TEXT,
          color_name TEXT NOT NULL,
          placement TEXT NOT NULL,
          product_title TEXT,
          variant_id TEXT,
          price NUMERIC,
          preview_data_url TEXT,
          preview_images JSONB DEFAULT '[]'::jsonb,
          canvases JSONB,
          emailed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          product_handle TEXT NOT NULL,
          product_title TEXT NOT NULL,
          product_price NUMERIC,
          product_image TEXT,
          product_currency TEXT DEFAULT 'INR',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS carts (
          user_id TEXT PRIMARY KEY,
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS admin_audit_log (
          id TEXT PRIMARY KEY,
          actor_id TEXT,
          actor_email TEXT,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id TEXT,
          details JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS return_notifications (
          id TEXT PRIMARY KEY,
          return_id TEXT,
          event TEXT,
          recipient TEXT,
          subject TEXT,
          status TEXT DEFAULT 'pending',
          error TEXT,
          attempts INTEGER DEFAULT 0,
          sent_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS inventory_transactions (
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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS campaigns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Draft',
          channel TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          budget NUMERIC NOT NULL DEFAULT 0,
          spent NUMERIC NOT NULL DEFAULT 0,
          target_audience TEXT,
          product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          discount_code TEXT,
          discount_type TEXT,
          discount_value NUMERIC NOT NULL DEFAULT 0,
          impressions INTEGER NOT NULL DEFAULT 0,
          clicks INTEGER NOT NULL DEFAULT 0,
          conversions INTEGER NOT NULL DEFAULT 0,
          revenue NUMERIC NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS shipments (
          id TEXT PRIMARY KEY,
          order_id TEXT,
          customer_id TEXT,
          customer_name TEXT,
          tracking_number TEXT,
          carrier TEXT,
          shipping_method TEXT,
          shipping_cost NUMERIC DEFAULT 0,
          estimated_delivery_date TIMESTAMP WITH TIME ZONE,
          actual_delivery_date TIMESTAMP WITH TIME ZONE,
          status TEXT NOT NULL DEFAULT 'Pending',
          shipping_address TEXT,
          city TEXT,
          state TEXT,
          postal_code TEXT,
          country TEXT,
          shipped_at TIMESTAMP WITH TIME ZONE,
          delivered_at TIMESTAMP WITH TIME ZONE,
          admin_note TEXT,
          updated_by TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          order_id TEXT,
          customer_id TEXT,
          transaction_id TEXT,
          payment_method TEXT NOT NULL DEFAULT 'COD',
          amount NUMERIC NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'INR',
          status TEXT NOT NULL DEFAULT 'Pending',
          paid_at TIMESTAMP WITH TIME ZONE,
          refund_amount NUMERIC DEFAULT 0,
          admin_note TEXT,
          updated_by TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS website_published (
          id TEXT PRIMARY KEY DEFAULT 'live',
          version_id TEXT NOT NULL,
          version_number INTEGER NOT NULL DEFAULT 1,
          config JSONB NOT NULL,
          published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          published_by TEXT NOT NULL DEFAULT 'Admin',
          change_summary TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS website_draft (
          id TEXT PRIMARY KEY DEFAULT 'current',
          config JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_by TEXT DEFAULT 'Admin'
        )`,
        `CREATE TABLE IF NOT EXISTS website_versions (
          id TEXT PRIMARY KEY,
          version_number INTEGER NOT NULL,
          config JSONB NOT NULL,
          published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          published_by TEXT NOT NULL,
          change_summary TEXT,
          status TEXT DEFAULT 'published'
        )`,
        `CREATE TABLE IF NOT EXISTS website_media (
          id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          media_type TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_website_media_created ON website_media (created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active)`,
        `CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_inv_tx_product ON inventory_transactions (product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_inv_tx_variant ON inventory_transactions (variant_id)`,
        `CREATE INDEX IF NOT EXISTS idx_inv_tx_order ON inventory_transactions (order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_inv_tx_created ON inventory_transactions (created_at DESC)`,
        `UPDATE profiles SET role = CASE WHEN email = 'princevekariya9898@gmail.com' THEN 'admin' ELSE 'customer' END`,
        `INSERT INTO profiles (id, email, password_hash, full_name, role) VALUES ('usr_admin_prince', 'princevekariya9898@gmail.com', '73b40a85482f9888099f3781d2bd6949f18264b064f705bd18c4fbb251c70d08', 'Prince Vekariya', 'admin') ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
        `INSERT INTO return_settings (id, window_days, require_delivered) VALUES ('default', 7, true) ON CONFLICT (id) DO NOTHING`,
        `DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN (
            SELECT tc.table_schema, tc.table_name, tc.constraint_name
            FROM information_schema.table_constraints tc
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND (
                tc.table_name IN ('order_items', 'cart', 'carts', 'cart_items', 'product_variants', 'product_images', 'reviews', 'favorites', 'inventory_transactions', 'orders')
                OR tc.constraint_name LIKE '%product%'
                OR tc.constraint_name LIKE '%variant%'
              )
          ) LOOP
            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
          END LOOP;
        END $$;`,
        `ALTER TABLE products ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0`,
        `ALTER TABLE products ALTER COLUMN base_price DROP NOT NULL`,
        `ALTER TABLE products ALTER COLUMN base_price SET DEFAULT 0`,
        `UPDATE products SET base_price = price WHERE base_price IS NULL`,
        `ALTER TABLE products ALTER COLUMN price DROP NOT NULL`,
        `ALTER TABLE products ALTER COLUMN price SET DEFAULT 0`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT`,
        `ALTER TABLE product_variants ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE product_variants ALTER COLUMN product_id TYPE TEXT USING product_id::text`,
        `ALTER TABLE product_variants ALTER COLUMN sku DROP NOT NULL`,
        `ALTER TABLE product_variants ALTER COLUMN sku SET DEFAULT ''`,
        `ALTER TABLE product_variants ALTER COLUMN color DROP NOT NULL`,
        `ALTER TABLE product_variants ALTER COLUMN color SET DEFAULT ''`,
        `ALTER TABLE product_variants ALTER COLUMN size DROP NOT NULL`,
        `ALTER TABLE product_variants ALTER COLUMN size SET DEFAULT ''`,
        `ALTER TABLE product_images ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE product_images ALTER COLUMN product_id TYPE TEXT USING product_id::text`,
        `ALTER TABLE orders ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE orders ALTER COLUMN user_id TYPE TEXT USING user_id::text`,
        `ALTER TABLE order_items ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE order_items ALTER COLUMN order_id TYPE TEXT USING order_id::text`,
        `ALTER TABLE order_items ALTER COLUMN product_id TYPE TEXT USING product_id::text`,
        `ALTER TABLE order_items ALTER COLUMN variant_id TYPE TEXT USING variant_id::text`,
        `ALTER TABLE reviews ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE reviews ALTER COLUMN product_id TYPE TEXT USING product_id::text`,
        `ALTER TABLE favorites ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE inventory_transactions ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE inventory_transactions ALTER COLUMN product_id TYPE TEXT USING product_id::text`,
        `ALTER TABLE inventory_transactions ALTER COLUMN variant_id TYPE TEXT USING variant_id::text`,
        `ALTER TABLE admin_audit_log ALTER COLUMN id TYPE TEXT USING id::text`,
        `ALTER TABLE admin_audit_log ALTER COLUMN entity_id TYPE TEXT USING entity_id::text`,
        `ALTER TABLE orders ALTER COLUMN shipping_full_name DROP NOT NULL`,
        `ALTER TABLE orders ALTER COLUMN shipping_phone DROP NOT NULL`,
        `ALTER TABLE orders ALTER COLUMN shipping_address_line1 DROP NOT NULL`,
        `ALTER TABLE orders ALTER COLUMN shipping_city DROP NOT NULL`,
        `ALTER TABLE orders ALTER COLUMN shipping_state DROP NOT NULL`,
        `ALTER TABLE orders ALTER COLUMN shipping_pincode DROP NOT NULL`,
        `ALTER TABLE order_items ALTER COLUMN unit_price DROP NOT NULL`,
        `ALTER TABLE order_items ALTER COLUMN total_price DROP NOT NULL`,
        `ALTER TABLE order_items ALTER COLUMN product_name DROP NOT NULL`,
        `ALTER TABLE order_items ALTER COLUMN product_image TYPE TEXT`,
        `ALTER TABLE order_items ALTER COLUMN product_name TYPE TEXT`,
        `ALTER TABLE order_items ALTER COLUMN size TYPE TEXT`,
        `ALTER TABLE order_items ALTER COLUMN color TYPE TEXT`,
        `ALTER TABLE order_items ALTER COLUMN sku TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN order_number TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN payment_method TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN payment_status TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN razorpay_order_id TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN razorpay_payment_id TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN shipping_full_name TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN shipping_phone TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN shipping_address_line1 TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN shipping_address_line2 TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN shipping_city TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN shipping_state TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN shipping_pincode TYPE TEXT`,
        `ALTER TABLE orders ALTER COLUMN tracking_number TYPE TEXT`,
        `ALTER TABLE categories ALTER COLUMN image_url TYPE TEXT`,
        `ALTER TABLE product_images ALTER COLUMN image_url TYPE TEXT`,
        `CREATE TABLE IF NOT EXISTS store_settings (
          id TEXT PRIMARY KEY DEFAULT 'default',
          store_name TEXT NOT NULL DEFAULT 'RIOTOUS',
          store_logo TEXT DEFAULT '',
          store_email TEXT NOT NULL DEFAULT 'support@riotous.store',
          store_phone TEXT NOT NULL DEFAULT '+91 98765 43210',
          store_address TEXT DEFAULT 'Plot 42, Streetwear District, Surat, Gujarat 395006, India',
          business_gstin TEXT DEFAULT '24AAAAA0000A1Z5',
          currency_symbol TEXT NOT NULL DEFAULT '₹',
          currency_code TEXT NOT NULL DEFAULT 'INR',
          timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
          date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
          time_format TEXT NOT NULL DEFAULT '12h',
          country TEXT NOT NULL DEFAULT 'India',
          language TEXT NOT NULL DEFAULT 'en',
          maintenance_mode BOOLEAN NOT NULL DEFAULT false,
          maintenance_message TEXT DEFAULT 'We are currently updating the store. Please check back shortly.',
          order_notifications BOOLEAN NOT NULL DEFAULT true,
          low_stock_notifications BOOLEAN NOT NULL DEFAULT true,
          return_notifications BOOLEAN NOT NULL DEFAULT true,
          review_notifications BOOLEAN NOT NULL DEFAULT true,
          payment_notifications BOOLEAN NOT NULL DEFAULT true,
          shipping_notifications BOOLEAN NOT NULL DEFAULT true,
          notification_email TEXT DEFAULT 'support@riotous.store',
          appearance_theme TEXT NOT NULL DEFAULT 'dark',
          free_shipping_threshold NUMERIC NOT NULL DEFAULT 1499,
          standard_shipping_charge NUMERIC NOT NULL DEFAULT 99,
          express_shipping_charge NUMERIC NOT NULL DEFAULT 199,
          cod_enabled BOOLEAN NOT NULL DEFAULT true,
          cod_extra_charge NUMERIC NOT NULL DEFAULT 0,
          upi_enabled BOOLEAN NOT NULL DEFAULT true,
          card_enabled BOOLEAN NOT NULL DEFAULT true,
          netbanking_enabled BOOLEAN NOT NULL DEFAULT true,
          wallet_enabled BOOLEAN NOT NULL DEFAULT true,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_by TEXT DEFAULT 'Admin'
        )`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar TEXT`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active'`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by TEXT`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb`,
        `ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS ip_address TEXT`,
        `ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT`,
        `ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS target_name TEXT`,
        `ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS module TEXT`,
        `INSERT INTO store_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`,
        `UPDATE profiles SET role = 'Super Admin' WHERE email = 'princevekariya9898@gmail.com'`,
      ];

      // For fresh database setups, execute in grouped batches rather than 70 sequential HTTP calls
      try {
        const ddlBatch = schemaStatements.filter((s) => !s.trim().startsWith("DO $$")).join(";\n");
        if (typeof (sql as any).query === "function") {
          await (sql as any).query(ddlBatch);
        } else {
          await (sql as any)([ddlBatch]);
        }
      } catch {
        // Fallback to concurrent chunk execution
        const batchSize = 8;
        for (let i = 0; i < schemaStatements.length; i += batchSize) {
          const chunk = schemaStatements.slice(i, i + batchSize);
          await Promise.allSettled(
            chunk.map(async (stmt) => {
              try {
                if (typeof (sql as any).query === "function") {
                  await (sql as any).query(stmt);
                } else {
                  await (sql as any)([stmt]);
                }
              } catch {
                // ignore statement-level warnings
              }
            }),
          );
        }
      }

      _schemaInitialized = true;
    } catch (err) {
      console.error("[Neon DB] ensureDbSchema warning:", err);
      // Mark as initialized on failure too to prevent re-querying every single request
      _schemaInitialized = true;
    } finally {
      _schemaPromise = null;
    }
  })();

  return _schemaPromise;
}
