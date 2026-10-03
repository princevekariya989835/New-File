import fs from "fs";
import path from "path";
import { FALLBACK_PRODUCTS } from "../src/lib/fallback-products";
import { DEFAULT_WEBSITE_CONFIG } from "../src/lib/website-config.types";

function esc(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSql(): string {
  const lines: string[] = [
    "-- Cloudflare D1 Initial Data Seed Migration",
    "-- Database: riotous-db",
    "-- Version: 0002_seed_initial_data.sql",
    "",
    "-- 1. Store Settings",
    `INSERT INTO store_settings (id, store_name, initial_catalog_seeded) VALUES ('default', 'RIOTOUS', 1) ON CONFLICT (id) DO UPDATE SET initial_catalog_seeded = 1;`,
    "",
    "-- 2. Return Settings",
    `INSERT INTO return_settings (id, window_days, require_delivered) VALUES ('default', 7, 1) ON CONFLICT (id) DO NOTHING;`,
    "",
    "-- 3. Profiles",
    `INSERT INTO profiles (id, email, password_hash, full_name, role, status, permissions) VALUES ('usr_admin_prince', 'princevekariya9898@gmail.com', '73b40a85482f9888099f3781d2bd6949f18264b064f705bd18c4fbb251c70d08', 'Prince Vekariya', 'Super Admin', 'Active', '{}') ON CONFLICT (email) DO UPDATE SET role = 'Super Admin', status = 'Active';`,
    `INSERT INTO profiles (id, email, password_hash, full_name, role, status, permissions) VALUES ('usr_demo_customer', 'customer@example.com', '28e75cfdc4bbd91da3c6046e9fc0a316b2cf771f286b2bb6ee8119eb1ea1e459', 'Demo Customer', 'customer', 'Active', '{}') ON CONFLICT (email) DO NOTHING;`,
    "",
    "-- 4. Default Coupons",
    `INSERT INTO coupons (id, code, name, description, discount_type, discount_value, minimum_order_value, maximum_discount, usage_limit, usage_per_customer, used_count, starts_at, expires_at, is_active, applies_to, product_ids, category_names, excluded_product_ids, excluded_category_names, created_by) VALUES ('cpn_riotous10', 'RIOTOUS10', 'Special Launch 10% Discount', 'Get 10% off on all streetwear orders above ₹999', 'percentage', 10, 999, 500, 100, 1, 25, '2026-01-01T00:00:00.000Z', '2026-12-31T23:59:59.000Z', 1, 'all', '[]', '[]', '[]', '[]', 'Admin') ON CONFLICT (code) DO NOTHING;`,
    `INSERT INTO coupons (id, code, name, description, discount_type, discount_value, minimum_order_value, maximum_discount, usage_limit, usage_per_customer, used_count, starts_at, expires_at, is_active, applies_to, product_ids, category_names, excluded_product_ids, excluded_category_names, created_by) VALUES ('cpn_riotous20', 'RIOTOUS20', 'Buy 3 Get 20% Off', 'Get 20% off when you buy 3 or more streetwear pieces.', 'percentage', 20, 0, NULL, NULL, 1, 5, '2026-01-01T00:00:00.000Z', '2026-12-31T23:59:59.000Z', 1, 'all', '[]', '[]', '[]', '[]', 'Admin') ON CONFLICT (code) DO NOTHING;`,
    `INSERT INTO coupons (id, code, name, description, discount_type, discount_value, minimum_order_value, maximum_discount, usage_limit, usage_per_customer, used_count, starts_at, expires_at, is_active, applies_to, product_ids, category_names, excluded_product_ids, excluded_category_names, created_by) VALUES ('cpn_save200', 'SAVE200', 'Flat ₹200 Off', 'Flat ₹200 discount on your order.', 'fixed', 200, 0, NULL, NULL, 1, 8, '2026-01-01T00:00:00.000Z', '2026-12-31T23:59:59.000Z', 1, 'all', '[]', '[]', '[]', '[]', 'Admin') ON CONFLICT (code) DO NOTHING;`,
    `INSERT INTO coupons (id, code, name, description, discount_type, discount_value, minimum_order_value, maximum_discount, usage_limit, usage_per_customer, used_count, starts_at, expires_at, is_active, applies_to, product_ids, category_names, excluded_product_ids, excluded_category_names, created_by) VALUES ('cpn_welcome200', 'WELCOME200', 'New Drop ₹200 Flat Off', 'Flat ₹200 off on your streetwear bag above ₹1,499', 'fixed', 200, 1499, NULL, NULL, 1, 40, '2026-01-01T00:00:00.000Z', '2026-12-31T23:59:59.000Z', 1, 'all', '[]', '[]', '[]', '[]', 'Admin') ON CONFLICT (code) DO NOTHING;`,
    "",
    "-- 5. Website CMS Config",
    `INSERT INTO website_published (id, version_id, version_number, config, published_by) VALUES ('live', 'v_init', 1, ${esc(DEFAULT_WEBSITE_CONFIG)}, 'Admin') ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO website_draft (id, config, updated_by) VALUES ('current', ${esc(DEFAULT_WEBSITE_CONFIG)}, 'Admin') ON CONFLICT (id) DO NOTHING;`,
    "",
    "-- 6. Products & Product Variants",
  ];

  for (const p of FALLBACK_PRODUCTS) {
    const mrp = p.mrp ?? p.compare_at_price ?? p.price;
    const compareAt = p.compare_at_price ?? p.mrp ?? p.price;
    lines.push(
      `INSERT INTO products (id, name, slug, description, details_html, price, base_price, mrp, compare_at_price, is_tax_inclusive, currency, images, category, sizes, colors, color_variants, stock_quantity, reserved_stock, low_stock_threshold, is_active, tags, features, care_instructions, manufacturing_info, size_measurements) VALUES (` +
        [
          esc(p.id),
          esc(p.name),
          esc(p.slug),
          esc(p.description),
          esc(p.details_html || null),
          p.price,
          p.price,
          mrp,
          compareAt,
          p.is_tax_inclusive !== false ? 1 : 0,
          esc(p.currency),
          esc(p.images),
          esc(p.category),
          esc(p.sizes),
          esc(p.colors),
          esc(p.color_variants || []),
          p.stock_quantity,
          0,
          2,
          p.is_active ? 1 : 0,
          esc(p.tags),
          esc(p.features || []),
          esc(p.care_instructions || []),
          esc(p.manufacturing_info || {}),
          esc(p.size_measurements || []),
        ].join(", ") +
        `) ON CONFLICT (id) DO UPDATE SET mrp = excluded.mrp, compare_at_price = excluded.compare_at_price;`
    );

    if (p.product_variants) {
      for (const v of p.product_variants) {
        lines.push(
          `INSERT INTO product_variants (id, product_id, size, color, color_hex, image_url, sku, stock_quantity, reserved_stock, low_stock_threshold) VALUES (` +
            [
              esc(v.id),
              esc(p.id),
              esc(v.size),
              esc(v.color),
              esc(v.color_hex || null),
              esc(v.image_url || null),
              esc(v.sku || v.id),
              v.stock_quantity,
              v.reserved_stock || 0,
              v.low_stock_threshold || 2,
            ].join(", ") +
            `) ON CONFLICT (id) DO NOTHING;`
        );
      }
    }
  }

  return lines.join("\n");
}

const sql = generateSql();
const outPath = path.resolve(process.cwd(), "migrations/0002_seed_initial_data.sql");
fs.writeFileSync(outPath, sql, "utf8");
console.log(`✓ Successfully generated ${outPath} (${sql.length} bytes)`);
