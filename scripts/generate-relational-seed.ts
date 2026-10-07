import fs from "fs";
import path from "path";
import { FALLBACK_PRODUCTS } from "../src/lib/fallback-products";

function esc(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSql(): string {
  const lines: string[] = [
    "-- Cloudflare D1 Full Relational Data Migration",
    "-- Database: riotous-db",
    "-- Version: 0003_populate_full_relational_data.sql",
    "",
    "-- 1. Categories",
    `INSERT INTO categories (id, name, slug, description) VALUES ('cat_oversized', 'Oversized Tees', 'oversized-tees', 'Heavyweight 240+ GSM oversized streetwear silhouette.') ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO categories (id, name, slug, description) VALUES ('cat_essential', 'Essential Tees', 'essential-tees', 'Daily wear premium breathable combed cotton tees.') ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO categories (id, name, slug, description) VALUES ('cat_classic', 'Classic Tees', 'classic-tees', 'Timeless cut, colorfast reactive dye streetwear basics.') ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO categories (id, name, slug, description) VALUES ('cat_heavyweight', 'Heavyweight Tees', 'heavyweight-tees', '260 GSM dense french terry structural boxy fit tees.') ON CONFLICT (id) DO NOTHING;`,
    "",
    "-- 2. Profiles (Customers)",
    `INSERT INTO profiles (id, email, password_hash, full_name, role, status, permissions) VALUES ('usr_cust_1', 'aarav.sharma@example.com', '28e75cfdc4bbd91da3c6046e9fc0a316b2cf771f286b2bb6ee8119eb1ea1e459', 'Aarav Sharma', 'customer', 'Active', '{}') ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO profiles (id, email, password_hash, full_name, role, status, permissions) VALUES ('usr_cust_2', 'priya.patel@example.com', '28e75cfdc4bbd91da3c6046e9fc0a316b2cf771f286b2bb6ee8119eb1ea1e459', 'Priya Patel', 'customer', 'Active', '{}') ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO profiles (id, email, password_hash, full_name, role, status, permissions) VALUES ('usr_cust_3', 'rohan.v@example.com', '28e75cfdc4bbd91da3c6046e9fc0a316b2cf771f286b2bb6ee8119eb1ea1e459', 'Rohan Verma', 'customer', 'Active', '{}') ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO profiles (id, email, password_hash, full_name, role, status, permissions) VALUES ('usr_cust_4', 'ananya.iyer@example.com', '28e75cfdc4bbd91da3c6046e9fc0a316b2cf771f286b2bb6ee8119eb1ea1e459', 'Ananya Iyer', 'customer', 'Active', '{}') ON CONFLICT (id) DO NOTHING;`,
    "",
    "-- 3. Product Highlights, Specifications, and Offers",
  ];

  for (const p of FALLBACK_PRODUCTS) {
    if (p.highlights) {
      for (const h of p.highlights) {
        lines.push(
          `INSERT INTO product_highlights (id, product_id, image_url, title, description, display_order, is_active) VALUES (` +
            [
              esc(h.id),
              esc(p.id),
              esc(h.image_url),
              esc(h.title || null),
              esc(h.description || null),
              h.display_order || 0,
              h.is_active ? 1 : 0,
            ].join(", ") +
            `) ON CONFLICT (id) DO NOTHING;`
        );
      }
    }

    if (p.specifications) {
      for (const s of p.specifications) {
        lines.push(
          `INSERT INTO product_specifications (id, product_id, label, value, display_order, is_active) VALUES (` +
            [
              esc(s.id),
              esc(p.id),
              esc(s.label),
              esc(s.value),
              s.display_order || 0,
              s.is_active ? 1 : 0,
            ].join(", ") +
            `) ON CONFLICT (id) DO NOTHING;`
        );
      }
    }

    if (p.offers) {
      for (const o of p.offers) {
        lines.push(
          `INSERT INTO product_offers (id, product_id, title, description, discount_type, discount_value, promo_code, minimum_quantity, maximum_quantity, eligible_products, eligible_categories, start_date, end_date, is_active, display_order, terms_and_conditions) VALUES (` +
            [
              esc(o.id),
              esc(p.id),
              esc(o.title),
              esc(o.description || null),
              esc(o.discount_type),
              o.discount_value,
              esc(o.promo_code || null),
              o.minimum_quantity || 1,
              esc(o.maximum_quantity),
              esc(o.eligible_products || []),
              esc(o.eligible_categories || []),
              esc(o.start_date || null),
              esc(o.end_date || null),
              o.is_active ? 1 : 0,
              o.display_order || 0,
              esc(o.terms_and_conditions || null),
            ].join(", ") +
            `) ON CONFLICT (id) DO NOTHING;`
        );
      }
    }
  }

  lines.push("");
  lines.push("-- 4. Orders");
  const orders = [
    {
      id: "ord_1001",
      user_id: "usr_cust_1",
      order_number: "ORD-9842",
      subtotal: 1499,
      discount_amount: 150,
      discount_code: "RIOTOUS10",
      shipping_charge: 0,
      tax_amount: 0,
      total_amount: 1349,
      currency: "INR",
      status: "Shipped",
      payment_status: "Paid",
      payment_method: "Razorpay (Online)",
      stock_state: "Normal",
      shipping_name: "Aarav Sharma",
      shipping_email: "aarav.sharma@example.com",
      shipping_phone: "+91 98765 43210",
      shipping_address: "Flat 402, Skyline Residency, Bandra West, Mumbai, Maharashtra 400050",
      billing_address: "Flat 402, Skyline Residency, Bandra West, Mumbai, Maharashtra 400050",
      courier_name: "BlueDart Express",
      tracking_number: "BD982341209IN",
      tracking_url: "https://www.bluedart.com/tracking/BD982341209IN",
      shipped_at: "2026-09-30T10:00:00.000Z",
      created_at: "2026-09-29T14:30:00.000Z",
    },
    {
      id: "ord_1002",
      user_id: "usr_cust_2",
      order_number: "ORD-9843",
      subtotal: 1299,
      discount_amount: 0,
      discount_code: null,
      shipping_charge: 50,
      tax_amount: 0,
      total_amount: 1349,
      currency: "INR",
      status: "Processing",
      payment_status: "Paid",
      payment_method: "UPI (PhonePe)",
      stock_state: "Normal",
      shipping_name: "Priya Patel",
      shipping_email: "priya.patel@example.com",
      shipping_phone: "+91 98123 45678",
      shipping_address: "12, Shanti Niketan Society, Navrangpura, Ahmedabad, Gujarat 380009",
      billing_address: "12, Shanti Niketan Society, Navrangpura, Ahmedabad, Gujarat 380009",
      courier_name: "Delhivery",
      tracking_number: "DLV10928374",
      tracking_url: "https://www.delhivery.com/track/package/DLV10928374",
      created_at: "2026-10-01T09:15:00.000Z",
    },
    {
      id: "ord_1003",
      user_id: "usr_cust_3",
      order_number: "ORD-9844",
      subtotal: 1799,
      discount_amount: 0,
      discount_code: null,
      shipping_charge: 0,
      tax_amount: 0,
      total_amount: 1799,
      currency: "INR",
      status: "Confirmed",
      payment_status: "Pending",
      payment_method: "Cash on Delivery",
      stock_state: "Normal",
      shipping_name: "Rohan Verma",
      shipping_email: "rohan.v@example.com",
      shipping_phone: "+91 97234 56789",
      shipping_address: "Tower B-601, Cyber City Greens, Sector 24, Gurugram, Haryana 122002",
      billing_address: "Tower B-601, Cyber City Greens, Sector 24, Gurugram, Haryana 122002",
      created_at: "2026-10-02T11:00:00.000Z",
    },
    {
      id: "ord_1004",
      user_id: "usr_cust_4",
      order_number: "ORD-9845",
      subtotal: 1399,
      discount_amount: 0,
      discount_code: null,
      shipping_charge: 0,
      tax_amount: 0,
      total_amount: 1399,
      currency: "INR",
      status: "Pending",
      payment_status: "Pending",
      payment_method: "Cash on Delivery",
      stock_state: "Normal",
      shipping_name: "Ananya Iyer",
      shipping_email: "ananya.iyer@example.com",
      shipping_phone: "+91 99345 67890",
      shipping_address: "45, Indiranagar 100ft Road, Bangalore, Karnataka 560038",
      billing_address: "45, Indiranagar 100ft Road, Bangalore, Karnataka 560038",
      created_at: "2026-10-02T18:00:00.000Z",
    },
  ];

  for (const o of orders) {
    lines.push(
      `INSERT INTO orders (id, user_id, order_number, subtotal, discount_amount, discount_code, shipping_charge, tax_amount, total_amount, currency, status, payment_status, payment_method, stock_state, shipping_name, shipping_email, shipping_phone, shipping_address, billing_address, courier_name, tracking_number, tracking_url, shipped_at, created_at) VALUES (` +
        [
          esc(o.id),
          esc(o.user_id),
          esc(o.order_number),
          o.subtotal,
          o.discount_amount,
          esc(o.discount_code),
          o.shipping_charge,
          o.tax_amount,
          o.total_amount,
          esc(o.currency),
          esc(o.status),
          esc(o.payment_status),
          esc(o.payment_method),
          esc(o.stock_state),
          esc(o.shipping_name),
          esc(o.shipping_email),
          esc(o.shipping_phone),
          esc(o.shipping_address),
          esc(o.billing_address),
          esc(o.courier_name || null),
          esc(o.tracking_number || null),
          esc(o.tracking_url || null),
          esc(o.shipped_at || null),
          esc(o.created_at),
        ].join(", ") +
        `) ON CONFLICT (id) DO NOTHING;`
    );
  }

  lines.push("");
  lines.push("-- 5. Order Items");
  const items = [
    {
      id: "item_1001",
      order_id: "ord_1001",
      product_id: "prod-oversized-black-tee",
      variant_id: "var-obts-blk-l",
      product_name: "Oversized Black T-Shirt",
      product_image: "/products/zoro-black-1.jpg",
      quantity: 1,
      price: 1199,
      unit_price: 1199,
      total_price: 1199,
      selected_size: "L",
      selected_color: "Black",
      size: "L",
      color: "Black",
      sku: "OBTS-BLK-L",
      subtotal: 1199,
      created_at: "2026-09-29T14:30:00.000Z",
    },
    {
      id: "item_1002",
      order_id: "ord_1002",
      product_id: "prod-premium-white-tee",
      variant_id: "var-pwt-wht-m",
      product_name: "Premium White T-Shirt",
      product_image: "/products/zoro-olive-1.jpg",
      quantity: 1,
      price: 899,
      unit_price: 899,
      total_price: 899,
      selected_size: "M",
      selected_color: "White",
      size: "M",
      color: "White",
      sku: "PWT-WHT-M",
      subtotal: 899,
      created_at: "2026-10-01T09:15:00.000Z",
    },
    {
      id: "item_1003",
      order_id: "ord_1003",
      product_id: "prod-heavyweight-grey-tee",
      variant_id: "var-hwg-gry-xl",
      product_name: "Heavyweight Grey T-Shirt",
      product_image: "/products/zoro-black-2.jpg",
      quantity: 1,
      price: 1149,
      unit_price: 1149,
      total_price: 1149,
      selected_size: "XL",
      selected_color: "Grey",
      size: "XL",
      color: "Grey",
      sku: "HWG-GRY-XL",
      subtotal: 1149,
      created_at: "2026-10-02T11:00:00.000Z",
    },
    {
      id: "item_1004",
      order_id: "ord_1004",
      product_id: "prod-classic-red-tee",
      variant_id: "var-crts-red-s",
      product_name: "Classic Red T-Shirt",
      product_image: "/products/zenitsu-maroon-1.jpg",
      quantity: 1,
      price: 849,
      unit_price: 849,
      total_price: 849,
      selected_size: "S",
      selected_color: "Red",
      size: "S",
      color: "Red",
      sku: "CRTS-RED-S",
      subtotal: 849,
      created_at: "2026-10-02T18:00:00.000Z",
    },
  ];

  for (const it of items) {
    lines.push(
      `INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, product_image, quantity, price, unit_price, total_price, selected_size, selected_color, size, color, sku, subtotal, created_at) VALUES (` +
        [
          esc(it.id),
          esc(it.order_id),
          esc(it.product_id),
          esc(it.variant_id),
          esc(it.product_name),
          esc(it.product_image),
          it.quantity,
          it.price,
          it.unit_price,
          it.total_price,
          esc(it.selected_size),
          esc(it.selected_color),
          esc(it.size),
          esc(it.color),
          esc(it.sku),
          it.subtotal,
          esc(it.created_at),
        ].join(", ") +
        `) ON CONFLICT (id) DO NOTHING;`
    );
  }

  lines.push("");
  lines.push("-- 6. Coupon Usage");
  lines.push(
    `INSERT INTO coupon_usage (id, coupon_id, order_id, customer_id, customer_email, coupon_code, discount_amount, order_amount, used_at) VALUES ('cusg_demo_1', 'cpn_riotous10', 'ord_1001', 'usr_cust_1', 'aarav.sharma@example.com', 'RIOTOUS10', 150, 1500, '2026-09-30T10:00:00.000Z') ON CONFLICT (id) DO NOTHING;`
  );
  lines.push(
    `INSERT INTO coupon_usage (id, coupon_id, order_id, customer_id, customer_email, coupon_code, discount_amount, order_amount, used_at) VALUES ('cusg_demo_2', 'cpn_welcome200', 'ord_1002', 'usr_cust_2', 'priya.patel@example.com', 'WELCOME200', 200, 1800, '2026-10-01T09:15:00.000Z') ON CONFLICT (id) DO NOTHING;`
  );

  return lines.join("\n");
}

const sql = generateSql();
const outPath = path.resolve(process.cwd(), "migrations/0003_populate_full_relational_data.sql");
fs.writeFileSync(outPath, sql, "utf8");
console.log(`✓ Successfully generated ${outPath} (${sql.length} bytes)`);
