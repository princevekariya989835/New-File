import { neon } from "@neondatabase/serverless";
import { FALLBACK_PRODUCTS } from "./fallback-products";

let _schemaInitialized = false;
let _schemaPromise: Promise<void> | null = null;

// In-memory database store for local dev when DATABASE_URL is not set
let _mockProducts: any[] = FALLBACK_PRODUCTS.map((p) => ({
  ...p,
  images: [...p.images],
  sizes: [...p.sizes],
  colors: [...p.colors],
  tags: [...p.tags],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

let _mockVariants: any[] = FALLBACK_PRODUCTS.flatMap((p) =>
  (p.product_variants || []).map((v) => ({
    ...v,
    product_id: p.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
);

let _mockCoupons: any[] = [
  {
    id: "cpn_riotous10",
    code: "RIOTOUS10",
    name: "Special Launch 10% Discount",
    description: "Get 10% off on all streetwear orders above ₹999",
    discount_type: "percentage",
    discount_value: 10,
    minimum_order_value: 999,
    maximum_discount: 500,
    usage_limit: 100,
    usage_per_customer: 1,
    used_count: 25,
    starts_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-12-31T23:59:59.000Z",
    is_active: true,
    applies_to: "all",
    product_ids: [],
    category_names: [],
    excluded_product_ids: [],
    excluded_category_names: [],
    deleted_at: null,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "Admin",
  },
  {
    id: "cpn_welcome200",
    code: "WELCOME200",
    name: "New Drop ₹200 Flat Off",
    description: "Flat ₹200 off on your streetwear bag above ₹1,499",
    discount_type: "fixed",
    discount_value: 200,
    minimum_order_value: 1499,
    maximum_discount: null,
    usage_limit: null,
    usage_per_customer: 1,
    used_count: 40,
    starts_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-12-31T23:59:59.000Z",
    is_active: true,
    applies_to: "all",
    product_ids: [],
    category_names: [],
    excluded_product_ids: [],
    excluded_category_names: [],
    deleted_at: null,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "Admin",
  },
  {
    id: "cpn_festive20",
    code: "FESTIVE20",
    name: "Festive Flash Sale 20%",
    description: "Limited time 20% discount on graphic tees",
    discount_type: "percentage",
    discount_value: 20,
    minimum_order_value: 799,
    maximum_discount: 600,
    usage_limit: 100,
    usage_per_customer: 1,
    used_count: 100,
    starts_at: "2026-08-01T00:00:00.000Z",
    expires_at: "2026-09-01T23:59:59.000Z",
    is_active: true,
    applies_to: "all",
    product_ids: [],
    category_names: [],
    excluded_product_ids: [],
    excluded_category_names: [],
    deleted_at: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-09-01T23:59:59.000Z",
    created_by: "Admin",
  },
];

let _mockCouponUsage: any[] = [
  {
    id: "usg_1",
    coupon_id: "cpn_riotous10",
    order_id: "ord_demo_1",
    customer_id: "usr_cust_1",
    customer_email: "customer1@example.com",
    coupon_code: "RIOTOUS10",
    discount_amount: 150,
    order_amount: 1350,
    used_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "usg_2",
    coupon_id: "cpn_welcome200",
    order_id: "ord_demo_2",
    customer_id: "usr_cust_2",
    customer_email: "customer2@example.com",
    coupon_code: "WELCOME200",
    discount_amount: 200,
    order_amount: 1800,
    used_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

let _mockEmailLogs: any[] = [];

let _mockOrders: any[] = [
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
    shipped_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    delivered_at: null,
    cancelled_at: null,
    admin_notes: "Customer requested discreet packaging.",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
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
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    admin_notes: "Priority shipment.",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
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
    courier_name: null,
    tracking_number: null,
    tracking_url: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    admin_notes: null,
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 3600000).toISOString(),
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
    courier_name: null,
    tracking_number: null,
    tracking_url: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    admin_notes: null,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

let _mockOrderItems: any[] = [
  {
    id: "item_1001",
    order_id: "ord_1001",
    product_id: "prod_1",
    variant_id: "var_1_l_black",
    design_submission_id: null,
    product_name: "Acid Wash Oversized Tee",
    product_image: "/placeholder-tee.jpg",
    quantity: 1,
    price: 1499,
    selected_size: "L",
    selected_color: "Vintage Black",
    subtotal: 1499,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "item_1002",
    order_id: "ord_1002",
    product_id: "prod_2",
    variant_id: "var_2_m_black",
    design_submission_id: null,
    product_name: "Cyberpunk Graphic Tee",
    product_image: "/placeholder-tee.jpg",
    quantity: 1,
    price: 1299,
    selected_size: "M",
    selected_color: "Jet Black",
    subtotal: 1299,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "item_1003",
    order_id: "ord_1003",
    product_id: "prod_3",
    variant_id: "var_3_xl_white",
    design_submission_id: null,
    product_name: "Heavyweight Boxy Tee",
    product_image: "/placeholder-tee.jpg",
    quantity: 1,
    price: 1799,
    selected_size: "XL",
    selected_color: "Off-White",
    subtotal: 1799,
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: "item_1004",
    order_id: "ord_1004",
    product_id: "prod_4",
    variant_id: "var_4_s_grey",
    design_submission_id: null,
    product_name: "Distressed Street Tee",
    product_image: "/placeholder-tee.jpg",
    quantity: 1,
    price: 1399,
    selected_size: "S",
    selected_color: "Washed Grey",
    subtotal: 1399,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

let _mockReturns: any[] = [];
let _mockReviews: any[] = [];
let _mockDesignSubmissions: any[] = [];
let _mockInventoryTransactions: any[] = [];

export function removeMockProduct(productIdOrSlug: string): boolean {
  if (!productIdOrSlug) return false;
  const norm = String(productIdOrSlug).toLowerCase().trim();
  const idx = _mockProducts.findIndex(
    (p) => String(p.id).toLowerCase() === norm || String(p.slug).toLowerCase() === norm,
  );
  if (idx !== -1) {
    const [removed] = _mockProducts.splice(idx, 1);
    _mockVariants = _mockVariants.filter((v) => String(v.product_id) !== String(removed.id));
    return true;
  }
  return false;
}

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || null;
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    const mockSql = async (strings: TemplateStringsArray | string[] | string, ...values: any[]) => {
      let queryStr = "";
      if (typeof strings === "string") {
        queryStr = strings;
      } else if (Array.isArray(strings)) {
        queryStr = strings
          .reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `__VAL_${i}__` : ""), "")
          .trim();
      }
      const lower = queryStr.toLowerCase();

      if (
        (lower.startsWith("select count") || lower.includes("(select count(*)")) &&
        !lower.includes("from coupon_usage") &&
        !lower.includes("from coupons")
      ) {
        return [
          {
            count: _mockProducts.length,
            order_count: 0,
            product_count: _mockProducts.length,
            customer_count: 0,
            total_sales: 0,
            sales_today: 0,
            sales_month: 0,
            total_products: _mockProducts.length,
          },
        ];
      }

      if (lower.includes("return_settings")) {
        return [{ id: "default", window_days: 7, require_delivered: true }];
      }

      if (lower.includes("store_settings")) {
        return [{ id: "default", store_name: "RIOTOUS", initial_catalog_seeded: true }];
      }

      // SELECT from products
      if (lower.includes("from products")) {
        if (lower.includes("select 1")) {
          return _mockProducts.length > 0 ? [{ 1: 1 }] : [];
        }
        // Single product lookup by slug or id
        if (lower.includes("slug =") || lower.includes("slug::text =") || lower.includes("id::text =")) {
          const targetVal = String(values[0] ?? "").toLowerCase();
          const p = _mockProducts.find(
            (item) =>
              (item.slug && item.slug.toLowerCase() === targetVal) ||
              (item.id && String(item.id).toLowerCase() === targetVal),
          );
          if (!p) return [];
          if (lower.includes("is_active = true") && p.is_active === false) return [];
          return [p];
        }
        // Active products query
        if (lower.includes("where is_active = true") || lower.includes("is_active is null")) {
          return _mockProducts.filter((p) => p.is_active !== false);
        }
        return [..._mockProducts];
      }

      // INSERT INTO products
      if (lower.startsWith("insert into products") || lower.includes("insert into products")) {
        const id = values[0] ? String(values[0]) : `prod_${Date.now().toString(36)}`;
        const name = values[1] ? String(values[1]) : "Product";
        const slug = values[2] ? String(values[2]) : id;
        const description = values[3] ? String(values[3]) : null;
        const price = Number(values[4] || 0);
        let images: string[] = [];
        try {
          images = typeof values[7] === "string" ? JSON.parse(values[7]) : (values[7] || []);
        } catch {
          images = ["/placeholder-tee.jpg"];
        }
        const category = values[8] ? String(values[8]) : "Oversized Tees";
        let sizes: string[] = [];
        try {
          sizes = typeof values[9] === "string" ? JSON.parse(values[9]) : (values[9] || ["S", "M", "L", "XL", "XXL"]);
        } catch {}
        let colors: string[] = [];
        try {
          colors = typeof values[10] === "string" ? JSON.parse(values[10]) : (values[10] || ["Black"]);
        } catch {}
        const stock_quantity = Number(values[11] || 0);
        const is_active = values[12] !== false;
        let tags: string[] = [];
        try {
          tags = typeof values[13] === "string" ? JSON.parse(values[13]) : (values[13] || []);
        } catch {}

        const newProd = {
          id,
          name,
          slug,
          description,
          price,
          base_price: price,
          currency: "INR",
          images: Array.isArray(images) && images.length ? images : ["/placeholder-tee.jpg"],
          category,
          sizes: Array.isArray(sizes) && sizes.length ? sizes : ["S", "M", "L", "XL", "XXL"],
          colors: Array.isArray(colors) && colors.length ? colors : ["Black"],
          stock_quantity,
          is_active,
          tags: Array.isArray(tags) ? tags : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const existingIdx = _mockProducts.findIndex((p) => p.id === id || p.slug === slug);
        if (existingIdx >= 0) {
          _mockProducts[existingIdx] = newProd;
        } else {
          _mockProducts.unshift(newProd);
        }
        return [{ id }];
      }

      // UPDATE products
      if (lower.startsWith("update products") || lower.includes("update products")) {
        const idVal = String(values[values.length - 1] ?? values[0] ?? "");
        const prod = _mockProducts.find((p) => p.id === idVal || p.slug === idVal);
        if (prod) {
          if (lower.includes("is_active =")) {
            prod.is_active = values[0] !== false;
          } else {
            if (values[0]) prod.name = String(values[0]);
            if (values[1] !== undefined) prod.description = values[1] ? String(values[1]) : null;
            if (values[2] !== undefined) prod.price = Number(values[2]);
            if (values[3] !== undefined) prod.base_price = Number(values[3]);
            if (values[4]) {
              try { prod.images = typeof values[4] === "string" ? JSON.parse(values[4]) : values[4]; } catch {}
            }
            if (values[5]) prod.category = String(values[5]);
            if (values[6]) {
              try { prod.sizes = typeof values[6] === "string" ? JSON.parse(values[6]) : values[6]; } catch {}
            }
            if (values[7]) {
              try { prod.colors = typeof values[7] === "string" ? JSON.parse(values[7]) : values[7]; } catch {}
            }
            if (values[8] !== undefined) prod.stock_quantity = Number(values[8]);
            if (values[9] !== undefined) prod.is_active = values[9] !== false;
            if (values[10]) {
              try { prod.tags = typeof values[10] === "string" ? JSON.parse(values[10]) : values[10]; } catch {}
            }
          }
          prod.updated_at = new Date().toISOString();
        }
        return [{ id: idVal }];
      }

      // DELETE FROM products
      if (lower.startsWith("delete from products") || lower.includes("delete from products")) {
        const idVal = String(values[0] ?? values[1] ?? "").toLowerCase().trim();
        const idx = _mockProducts.findIndex(
          (p) => String(p.id).toLowerCase() === idVal || String(p.slug).toLowerCase() === idVal,
        );
        if (idx >= 0) {
          const removed = _mockProducts.splice(idx, 1)[0];
          _mockVariants = _mockVariants.filter((v) => String(v.product_id) !== String(removed.id));
          return [{ id: removed.id }];
        }
        return [{ id: values[0] || "deleted" }];
      }

      // SELECT from product_variants
      if (lower.includes("from product_variants")) {
        if (lower.includes("product_id::text = any")) {
          const ids = Array.isArray(values[0]) ? values[0].map(String) : [String(values[0])];
          return _mockVariants.filter((v) => ids.includes(String(v.product_id)));
        }
        if (lower.includes("product_id::text =") || lower.includes("product_id =")) {
          const pid = String(values[0] ?? "");
          return _mockVariants.filter((v) => String(v.product_id) === pid);
        }
        return [..._mockVariants];
      }

      // INSERT INTO product_variants
      if (lower.startsWith("insert into product_variants") || lower.includes("insert into product_variants")) {
        const vid = String(values[0] ?? `var_${Date.now()}`);
        const pid = String(values[1] ?? "");
        const size = String(values[2] ?? "");
        const color = String(values[3] ?? "");
        const sku = String(values[4] ?? vid);
        const qty = Number(values[5] || 0);
        const newVar = {
          id: vid,
          product_id: pid,
          size,
          color,
          sku,
          stock_quantity: qty,
          reserved_stock: 0,
          low_stock_threshold: 2,
        };
        const exIdx = _mockVariants.findIndex((v) => v.id === vid);
        if (exIdx >= 0) _mockVariants[exIdx] = newVar;
        else _mockVariants.push(newVar);
        return [{ id: vid }];
      }

      // UPDATE product_variants
      if (lower.startsWith("update product_variants") || lower.includes("update product_variants")) {
        const idVal = String(values[values.length - 1] ?? "");
        const v = _mockVariants.find((item) => item.id === idVal);
        if (v && values[0] !== undefined) {
          v.stock_quantity = Number(values[0]);
        }
        return [{ id: idVal }];
      }

      // DELETE FROM product_variants
      if (lower.startsWith("delete from product_variants") || lower.includes("delete from product_variants")) {
        const pid = String(values[0] ?? "");
        _mockVariants = _mockVariants.filter((v) => String(v.product_id) !== pid && String(v.id) !== pid);
        return [];
      }

      // SELECT from coupons
      if (lower.includes("from coupons")) {
        if (lower.includes("upper(code) =") || lower.includes("code =") || lower.includes("upper(code::text) =")) {
          const targetCode = String(values[0] ?? "").toUpperCase().trim();
          const found = _mockCoupons.find(
            (c) => String(c.code).toUpperCase().trim() === targetCode && !c.deleted_at,
          );
          return found ? [found] : [];
        }
        if (lower.includes("id =") || lower.includes("id::text =")) {
          const targetId = String(values[0] ?? "");
          const found = _mockCoupons.find((c) => String(c.id) === targetId);
          return found ? [found] : [];
        }
        return [..._mockCoupons.filter((c) => !c.deleted_at)];
      }

      // INSERT INTO coupons
      if (lower.startsWith("insert into coupons") || lower.includes("insert into coupons")) {
        const colsMatch = queryStr.match(/insert\s+into\s+coupons\s*\(([^)]+)\)/i);
        let id = `cpn_${Date.now().toString(36)}`;
        let code = "CODE";
        let name = "Coupon";
        let description: string | null = null;
        let discount_type = "percentage";
        let discount_value = 0;
        let minimum_order_value = 0;
        let maximum_discount: number | null = null;
        let usage_limit: number | null = null;
        let usage_per_customer = 1;
        let used_count = 0;
        let starts_at: string | null = null;
        let expires_at: string | null = null;
        let is_active = true;
        let applies_to = "all";
        let product_ids: string[] = [];
        let category_names: string[] = [];
        let excluded_product_ids: string[] = [];
        let excluded_category_names: string[] = [];
        let created_by = "Admin";

        if (colsMatch) {
          const cols = colsMatch[1].split(",").map((c) => c.trim().toLowerCase());
          const colMap: Record<string, any> = {};
          cols.forEach((col, i) => {
            colMap[col] = values[i];
          });
          if (colMap["id"]) id = String(colMap["id"]);
          if (colMap["code"]) code = String(colMap["code"]).toUpperCase().trim();
          if (colMap["name"]) name = String(colMap["name"]);
          if (colMap["description"] !== undefined) description = colMap["description"] ? String(colMap["description"]) : null;
          if (colMap["discount_type"]) discount_type = String(colMap["discount_type"]);
          if (colMap["discount_value"] !== undefined) discount_value = Number(colMap["discount_value"] || 0);
          if (colMap["minimum_order_value"] !== undefined) minimum_order_value = Number(colMap["minimum_order_value"] || 0);
          if (colMap["maximum_discount"] !== undefined) maximum_discount = colMap["maximum_discount"] !== null && colMap["maximum_discount"] !== undefined ? Number(colMap["maximum_discount"]) : null;
          if (colMap["usage_limit"] !== undefined) usage_limit = colMap["usage_limit"] !== null && colMap["usage_limit"] !== undefined ? Number(colMap["usage_limit"]) : null;
          if (colMap["usage_per_customer"] !== undefined) usage_per_customer = Number(colMap["usage_per_customer"] ?? 1);
          if (colMap["used_count"] !== undefined) used_count = Number(colMap["used_count"] || 0);
          if (colMap["starts_at"]) starts_at = String(colMap["starts_at"]);
          if (colMap["expires_at"]) expires_at = String(colMap["expires_at"]);
          if (colMap["is_active"] !== undefined) is_active = colMap["is_active"] !== false && colMap["is_active"] !== "false";
          if (colMap["applies_to"]) applies_to = String(colMap["applies_to"]);
          if (colMap["product_ids"] !== undefined) {
            try { product_ids = typeof colMap["product_ids"] === "string" ? JSON.parse(colMap["product_ids"]) : (colMap["product_ids"] || []); } catch {}
          }
          if (colMap["category_names"] !== undefined) {
            try { category_names = typeof colMap["category_names"] === "string" ? JSON.parse(colMap["category_names"]) : (colMap["category_names"] || []); } catch {}
          }
          if (colMap["excluded_product_ids"] !== undefined) {
            try { excluded_product_ids = typeof colMap["excluded_product_ids"] === "string" ? JSON.parse(colMap["excluded_product_ids"]) : (colMap["excluded_product_ids"] || []); } catch {}
          }
          if (colMap["excluded_category_names"] !== undefined) {
            try { excluded_category_names = typeof colMap["excluded_category_names"] === "string" ? JSON.parse(colMap["excluded_category_names"]) : (colMap["excluded_category_names"] || []); } catch {}
          }
          if (colMap["created_by"]) created_by = String(colMap["created_by"]);
        } else {
          id = values[0] ? String(values[0]) : `cpn_${Date.now().toString(36)}`;
          code = values[1] ? String(values[1]).toUpperCase().trim() : "CODE";
          name = values[2] ? String(values[2]) : code;
          description = values[3] ? String(values[3]) : null;
          discount_type = values[4] ? String(values[4]) : "percentage";
          discount_value = Number(values[5] || 0);
          minimum_order_value = Number(values[6] || 0);
          maximum_discount = values[7] !== null && values[7] !== undefined ? Number(values[7]) : null;
          usage_limit = values[8] !== null && values[8] !== undefined ? Number(values[8]) : null;
          usage_per_customer = values[9] !== null && values[9] !== undefined ? Number(values[9]) : 1;
          used_count = Number(values[10] || 0);
          starts_at = values[11] ? String(values[11]) : null;
          expires_at = values[12] ? String(values[12]) : null;
          is_active = values[13] !== false;
          applies_to = values[14] ? String(values[14]) : "all";
          try { product_ids = typeof values[15] === "string" ? JSON.parse(values[15]) : (values[15] || []); } catch {}
          try { category_names = typeof values[16] === "string" ? JSON.parse(values[16]) : (values[16] || []); } catch {}
          try { excluded_product_ids = typeof values[17] === "string" ? JSON.parse(values[17]) : (values[17] || []); } catch {}
          try { excluded_category_names = typeof values[18] === "string" ? JSON.parse(values[18]) : (values[18] || []); } catch {}
          created_by = values[19] ? String(values[19]) : "Admin";
        }

        const newCoupon = {
          id,
          code,
          name,
          description,
          discount_type,
          discount_value,
          minimum_order_value,
          maximum_discount,
          usage_limit,
          usage_per_customer,
          used_count,
          starts_at,
          expires_at,
          is_active,
          applies_to,
          product_ids,
          category_names,
          excluded_product_ids,
          excluded_category_names,
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by,
        };
        const existingIdx = _mockCoupons.findIndex((c) => c.id === id || c.code === code);
        if (existingIdx >= 0) _mockCoupons[existingIdx] = newCoupon;
        else _mockCoupons.unshift(newCoupon);
        return [{ id }];
      }

      // UPDATE coupons
      if (lower.startsWith("update coupons") || lower.includes("update coupons")) {
        const idVal = String(values[values.length - 1] ?? values[0] ?? "");
        const c = _mockCoupons.find((item) => item.id === idVal);
        if (c) {
          if (lower.includes("used_count = used_count + 1")) {
            if (c.usage_limit !== null && c.used_count >= c.usage_limit) {
              return []; // atomic condition failed
            }
            c.used_count = (c.used_count || 0) + 1;
            c.updated_at = new Date().toISOString();
            return [{ id: c.id, used_count: c.used_count }];
          }
          if (lower.includes("deleted_at =")) {
            c.deleted_at = new Date().toISOString();
            c.is_active = false;
            return [{ id: c.id }];
          }
          if (lower.includes("is_active =")) {
            c.is_active = values[0] === true;
            c.updated_at = new Date().toISOString();
            return [{ id: c.id }];
          }
          c.updated_at = new Date().toISOString();
        }
        return [{ id: idVal }];
      }

      // SELECT from coupon_usage
      if (lower.includes("from coupon_usage")) {
        let list = [..._mockCouponUsage];

        // Filter by coupon_id if present
        if (lower.includes("coupon_id =") || lower.includes("coupon_id::text =")) {
          const cId = String(values[0] ?? "").toLowerCase();
          list = list.filter((u) => String(u.coupon_id).toLowerCase() === cId);
        }

        // Filter by customer_email or customer_id
        if (lower.includes("customer_email") || lower.includes("customer_id")) {
          const emailVal = values
            .find((v) => typeof v === "string" && v.includes("@"))
            ?.toLowerCase();
          const custIdVal = values.find(
            (v) => typeof v === "string" && (v.startsWith("usr_") || v.startsWith("cust_")),
          );

          if (emailVal && custIdVal) {
            list = list.filter(
              (u) =>
                (u.customer_email && u.customer_email.toLowerCase() === emailVal) ||
                (u.customer_id && String(u.customer_id) === custIdVal),
            );
          } else if (emailVal) {
            list = list.filter(
              (u) => u.customer_email && u.customer_email.toLowerCase() === emailVal,
            );
          } else if (custIdVal) {
            list = list.filter((u) => u.customer_id && String(u.customer_id) === custIdVal);
          }
        }

        if (lower.includes("count(") || lower.startsWith("select count")) {
          return [{ count: list.length }];
        }

        if (lower.includes("sum(discount_amount)")) {
          const total = list.reduce((acc, u) => acc + (Number(u.discount_amount) || 0), 0);
          return [{ total_discount: total }];
        }

        return list;
      }

      // INSERT INTO coupon_usage
      if (lower.startsWith("insert into coupon_usage") || lower.includes("insert into coupon_usage")) {
        const usageId = values[0] ? String(values[0]) : `usg_${Date.now()}`;
        const newUsage = {
          id: usageId,
          coupon_id: values[1] ? String(values[1]) : "",
          order_id: values[2] ? String(values[2]) : "",
          customer_id: values[3] ? String(values[3]) : null,
          customer_email: values[4] ? String(values[4]) : "",
          coupon_code: values[5] ? String(values[5]) : "",
          discount_amount: Number(values[6] || 0),
          order_amount: Number(values[7] || 0),
          used_at: new Date().toISOString(),
        };
        _mockCouponUsage.unshift(newUsage);
        return [{ id: usageId }];
      }

      // SELECT from orders
      if (lower.includes("from orders")) {
        if (lower.includes("count(*)::int as total_orders") || lower.includes("count(*) as total_orders")) {
          const validOrders = _mockOrders.filter((o) => !["Cancelled", "Returned", "Refunded"].includes(o.status));
          const totalSales = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
          return [
            {
              total_orders: _mockOrders.length,
              total_sales: totalSales,
              sales_today: totalSales,
              sales_month: totalSales,
              revenue_orders_count: validOrders.length,
            },
          ];
        }

        if (lower.includes("group by status")) {
          const counts: Record<string, number> = {};
          for (const o of _mockOrders) {
            counts[o.status] = (counts[o.status] || 0) + 1;
          }
          return Object.entries(counts).map(([status, count]) => ({ status, count }));
        }

        if (lower.includes("group by payment_status")) {
          const counts: Record<string, number> = {};
          for (const o of _mockOrders) {
            counts[o.payment_status] = (counts[o.payment_status] || 0) + 1;
          }
          return Object.entries(counts).map(([payment_status, count]) => ({ payment_status, count }));
        }

        if (lower.includes("group by to_char(created_at")) {
          const map: Record<string, { revenue: number; orders: number }> = {};
          for (const o of _mockOrders) {
            if (["Cancelled", "Returned", "Refunded"].includes(o.status)) continue;
            const d = String(o.created_at || "").slice(0, 10);
            if (!map[d]) map[d] = { revenue: 0, orders: 0 };
            map[d].revenue += Number(o.total_amount || 0);
            map[d].orders += 1;
          }
          return Object.entries(map).map(([date, val]) => ({ date, revenue: val.revenue, orders: val.orders }));
        }

        if (lower.includes("user_id::text =") || lower.includes("user_id =")) {
          const uid = String(values[0] ?? "");
          const email = String(values[1] ?? values[0] ?? "").toLowerCase().trim();
          return _mockOrders.filter((o) => {
            const oUid = String(o.user_id || "");
            const oEmail = String(o.shipping_email || "").toLowerCase().trim();
            return (uid && oUid === uid) || (email && oEmail === email) || (email && oUid === email);
          });
        }

        if (lower.includes("id::text =") || lower.includes("id =")) {
          const idVal = String(values[0] ?? "");
          const match = _mockOrders.find((o) => String(o.id) === idVal || String(o.order_number) === idVal);
          return match ? [match] : [];
        }

        return [..._mockOrders];
      }

      // INSERT INTO orders
      if (lower.startsWith("insert into orders") || lower.includes("insert into orders")) {
        const orderId = values[0] ? String(values[0]) : `ord_${Date.now()}`;
        const newOrder = {
          id: orderId,
          user_id: values[1] ? String(values[1]) : null,
          order_number: values[2] ? String(values[2]) : `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          subtotal: Number(values[3] || 0),
          discount_amount: Number(values[4] || 0),
          discount_code: values[5] ? String(values[5]) : null,
          shipping_charge: Number(values[6] || 0),
          tax_amount: Number(values[7] || 0),
          total_amount: Number(values[8] || 0),
          currency: values[9] ? String(values[9]) : "INR",
          status: values[10] ? String(values[10]) : "Pending",
          payment_status: values[11] ? String(values[11]) : "Pending",
          payment_method: values[12] ? String(values[12]) : "COD",
          stock_state: values[13] ? String(values[13]) : "Normal",
          shipping_name: values[14] ? String(values[14]) : "",
          shipping_email: values[15] ? String(values[15]) : "",
          shipping_phone: values[16] ? String(values[16]) : null,
          shipping_address: values[17] ? String(values[17]) : "",
          billing_address: values[18] ? String(values[18]) : null,
          courier_name: null,
          tracking_number: null,
          tracking_url: null,
          shipped_at: null,
          delivered_at: null,
          cancelled_at: null,
          admin_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        _mockOrders.unshift(newOrder);
        return [{ id: orderId }];
      }

      // UPDATE orders
      if (lower.startsWith("update orders") || lower.includes("update orders")) {
        const idVal = String(values[values.length - 1] ?? "");
        const targetIds = Array.isArray(values[0]) ? values[0].map(String) : [idVal];
        for (const o of _mockOrders) {
          if (targetIds.includes(String(o.id)) || String(o.id) === idVal) {
            if (lower.includes("status =")) {
              const match = queryStr.match(/status\s*=\s*'([^']+)'/i) || queryStr.match(/status\s*=\s*__VAL_(\d+)__/i);
              if (match) {
                o.status = match[1].startsWith("__") ? String(values[Number(match[1].replace(/\D/g, ""))]) : match[1];
              } else if (values[0]) {
                o.status = String(values[0]);
              }
              if (o.status === "Shipped" && !o.shipped_at) o.shipped_at = new Date().toISOString();
              if (o.status === "Delivered" && !o.delivered_at) o.delivered_at = new Date().toISOString();
              if (o.status === "Cancelled" && !o.cancelled_at) o.cancelled_at = new Date().toISOString();
            }
            if (lower.includes("payment_status =")) {
              o.payment_status = String(values[0] ?? "Paid");
            }
            if (lower.includes("courier_name =")) {
              o.courier_name = values[0] ? String(values[0]) : null;
            }
            if (lower.includes("tracking_number =")) {
              o.tracking_number = values[0] ? String(values[0]) : null;
            }
            if (lower.includes("tracking_url =")) {
              o.tracking_url = values[0] ? String(values[0]) : null;
            }
            if (lower.includes("admin_notes =")) {
              o.admin_notes = values[0] ? String(values[0]) : null;
            }
            if (lower.includes("stock_state =")) {
              o.stock_state = String(values[0] ?? "Normal");
            }
            o.updated_at = new Date().toISOString();
          }
        }
        return [{ id: idVal }];
      }

      // SELECT from order_items
      if (lower.includes("from order_items")) {
        if (lower.includes("oi.product_name") && lower.includes("group by oi.product_name")) {
          const map: Record<string, { units: number; revenue: number }> = {};
          for (const item of _mockOrderItems) {
            const name = item.product_name || "Product";
            if (!map[name]) map[name] = { units: 0, revenue: 0 };
            map[name].units += Number(item.quantity || 1);
            map[name].revenue += Number(item.subtotal || 0);
          }
          return Object.entries(map).map(([name, val]) => ({ name, units: val.units, revenue: val.revenue }));
        }

        if (lower.includes("order_id::text =") || lower.includes("order_id =")) {
          const oId = String(values[0] ?? "");
          return _mockOrderItems.filter((i) => String(i.order_id) === oId);
        }

        return [..._mockOrderItems];
      }

      // INSERT INTO order_items
      if (lower.startsWith("insert into order_items") || lower.includes("insert into order_items")) {
        const itemId = values[0] ? String(values[0]) : `item_${Date.now()}`;
        const newItem = {
          id: itemId,
          order_id: values[1] ? String(values[1]) : "",
          product_id: values[2] ? String(values[2]) : null,
          variant_id: values[3] ? String(values[3]) : null,
          design_submission_id: values[4] ? String(values[4]) : null,
          product_name: values[5] ? String(values[5]) : "Item",
          product_image: values[6] ? String(values[6]) : null,
          quantity: Number(values[7] || 1),
          price: Number(values[8] || 0),
          selected_size: values[9] ? String(values[9]) : null,
          selected_color: values[10] ? String(values[10]) : null,
          subtotal: Number(values[11] || 0),
          created_at: new Date().toISOString(),
        };
        _mockOrderItems.push(newItem);
        return [{ id: itemId }];
      }

      // SELECT from returns
      if (lower.includes("from returns")) {
        return [..._mockReturns];
      }

      // INSERT INTO returns
      if (lower.startsWith("insert into returns") || lower.includes("insert into returns")) {
        const id = values[0] ? String(values[0]) : `ret_${Date.now()}`;
        const newRet = { id, created_at: new Date().toISOString() };
        _mockReturns.unshift(newRet);
        return [{ id }];
      }

      // SELECT from reviews
      if (lower.includes("from reviews")) {
        return [..._mockReviews];
      }

      // INSERT INTO reviews
      if (lower.startsWith("insert into reviews") || lower.includes("insert into reviews")) {
        const id = values[0] ? String(values[0]) : `rev_${Date.now()}`;
        const newRev = { id, created_at: new Date().toISOString() };
        _mockReviews.unshift(newRev);
        return [{ id }];
      }

      // SELECT from design_submissions
      if (lower.includes("from design_submissions")) {
        return [..._mockDesignSubmissions];
      }

      // INSERT INTO design_submissions
      if (lower.startsWith("insert into design_submissions") || lower.includes("insert into design_submissions")) {
        const id = values[0] ? String(values[0]) : `des_${Date.now()}`;
        const newDes = { id, created_at: new Date().toISOString() };
        _mockDesignSubmissions.unshift(newDes);
        return [{ id }];
      }

      // SELECT from inventory_transactions
      if (lower.includes("from inventory_transactions")) {
        return [..._mockInventoryTransactions];
      }

      // INSERT INTO inventory_transactions
      if (lower.startsWith("insert into inventory_transactions") || lower.includes("insert into inventory_transactions")) {
        const id = values[0] ? String(values[0]) : `itx_${Date.now()}`;
        _mockInventoryTransactions.unshift({ id, created_at: new Date().toISOString() });
        return [{ id }];
      }

      // SELECT from profiles
      if (lower.includes("from profiles")) {
        return [
          {
            id: "usr_admin_1",
            email: "admin@riotous.store",
            full_name: "Admin User",
            role: "admin",
            status: "Active",
            created_at: new Date().toISOString(),
          },
        ];
      }

      // SELECT from email_logs
      if (lower.includes("from email_logs")) {
        if (lower.includes("order_id =") && lower.includes("email_type =")) {
          const orderId = String(values[0] ?? "");
          const emailType = String(values[1] ?? "");
          return _mockEmailLogs.filter(
            (l) => String(l.order_id) === orderId && String(l.email_type) === emailType,
          );
        }
        return [..._mockEmailLogs];
      }

      // INSERT INTO email_logs
      if (lower.startsWith("insert into email_logs") || lower.includes("insert into email_logs")) {
        const id = values[0] ? String(values[0]) : `eml_${Date.now()}`;
        const newLog = {
          id,
          user_id: values[1] ? String(values[1]) : null,
          order_id: values[2] ? String(values[2]) : null,
          email_type: values[3] ? String(values[3]) : "UNKNOWN",
          recipient: values[4] ? String(values[4]) : "",
          sender: values[5] ? String(values[5]) : "",
          status: values[6] ? String(values[6]) : "sent",
          provider: values[7] ? String(values[7]) : "brevo",
          provider_message_id: values[8] ? String(values[8]) : null,
          error_message: values[9] ? String(values[9]) : null,
          created_at: new Date().toISOString(),
          sent_at: values[6] === "sent" ? new Date().toISOString() : null,
        };
        _mockEmailLogs.unshift(newLog);
        return [{ id }];
      }

      return [];
    };

    (mockSql as any).query = async (str: string) => mockSql([str] as any);
    return mockSql as any;
  }
  return neon(url);
}

async function runDdlStatement(sql: any, stmt: string) {
  const trimmed = stmt.trim();
  if (!trimmed) return;
  if (typeof sql.query === "function") {
    await sql.query(trimmed);
  } else {
    await sql([trimmed]);
  }
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
            to_regclass('public.orders') IS NOT NULL AS has_orders,
            to_regclass('public.order_items') IS NOT NULL AS has_order_items,
            to_regclass('public.returns') IS NOT NULL AS has_returns,
            to_regclass('public.return_settings') IS NOT NULL AS has_return_settings,
            to_regclass('public.reviews') IS NOT NULL AS has_reviews,
            to_regclass('public.design_submissions') IS NOT NULL AS has_design_submissions,
            to_regclass('public.inventory_transactions') IS NOT NULL AS has_inv_tx,
            to_regclass('public.website_published') IS NOT NULL AS has_website,
            to_regclass('public.store_settings') IS NOT NULL AS has_settings,
            to_regclass('public.coupons') IS NOT NULL AS has_coupons,
            to_regclass('public.coupon_usage') IS NOT NULL AS has_coupon_usage,
            to_regclass('public.amazon_export_templates') IS NOT NULL AS has_amazon_templates,
            to_regclass('public.email_logs') IS NOT NULL AS has_email_logs
        `;
        const row = check?.[0];
        if (row && (row.has_products || row.has_profiles || row.has_orders || row.has_website || row.has_settings)) {
          // Core database schema exists.
          // Check if newly introduced or missing tables are needed and create only what is needed:
          const missingStatements: string[] = [];

          if (!row.has_email_logs) {
            missingStatements.push(
              `CREATE TABLE IF NOT EXISTS email_logs (
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
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP WITH TIME ZONE
              )`,
              `CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs (created_at DESC)`,
              `CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs (email_type)`,
              `CREATE INDEX IF NOT EXISTS idx_email_logs_order ON email_logs (order_id)`
            );
          }

          if (!row.has_orders) {
            missingStatements.push(
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
              `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id)`,
              `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)`,
            );
          }

          if (!row.has_order_items) {
            missingStatements.push(
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
              `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)`,
            );
          }

          if (!row.has_returns) {
            missingStatements.push(
              `CREATE TABLE IF NOT EXISTS returns (
                id TEXT PRIMARY KEY,
                return_number TEXT UNIQUE NOT NULL,
                order_id TEXT,
                order_item_id TEXT,
                customer_id TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'Pending',
                reason TEXT NOT NULL,
                comments TEXT,
                refund_amount NUMERIC DEFAULT 0,
                items JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              )`,
              `CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns (order_id)`,
            );
          }

          if (!row.has_return_settings) {
            missingStatements.push(
              `CREATE TABLE IF NOT EXISTS return_settings (
                id TEXT PRIMARY KEY DEFAULT 'default',
                window_days INTEGER NOT NULL DEFAULT 7,
                require_delivered BOOLEAN NOT NULL DEFAULT true,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              )`,
            );
          }

          if (!row.has_reviews) {
            missingStatements.push(
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
              `CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id)`,
            );
          }

          if (!row.has_design_submissions) {
            missingStatements.push(
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
            );
          }

          if (!row.has_inv_tx) {
            missingStatements.push(
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
              `CREATE INDEX IF NOT EXISTS idx_inv_tx_order_id ON inventory_transactions (order_id)`,
            );
          }

          if (!row.has_coupons) {
            missingStatements.push(
              `CREATE TABLE IF NOT EXISTS coupons (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                discount_type TEXT NOT NULL,
                discount_value NUMERIC NOT NULL,
                minimum_order_value NUMERIC DEFAULT 0,
                maximum_discount NUMERIC,
                usage_limit INTEGER,
                usage_per_customer INTEGER DEFAULT 1,
                used_count INTEGER NOT NULL DEFAULT 0,
                starts_at TIMESTAMP WITH TIME ZONE,
                expires_at TIMESTAMP WITH TIME ZONE,
                is_active BOOLEAN NOT NULL DEFAULT true,
                applies_to TEXT NOT NULL DEFAULT 'all',
                product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                category_names JSONB NOT NULL DEFAULT '[]'::jsonb,
                excluded_product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                excluded_category_names JSONB NOT NULL DEFAULT '[]'::jsonb,
                deleted_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT
              )`,
              `CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (UPPER(code))`,
              `CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active, deleted_at)`,
            );
          }

          if (!row.has_coupon_usage) {
            missingStatements.push(
              `CREATE TABLE IF NOT EXISTS coupon_usage (
                id TEXT PRIMARY KEY,
                coupon_id TEXT NOT NULL,
                order_id TEXT NOT NULL,
                customer_id TEXT,
                customer_email TEXT NOT NULL,
                coupon_code TEXT NOT NULL,
                discount_amount NUMERIC NOT NULL,
                order_amount NUMERIC NOT NULL,
                used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              )`,
              `CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage (coupon_id)`,
              `CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON coupon_usage (customer_email, coupon_id)`,
              `CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage (order_id)`,
            );
          }

          if (!row.has_amazon_templates) {
            missingStatements.push(
              `CREATE TABLE IF NOT EXISTS amazon_export_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                purpose TEXT NOT NULL DEFAULT 'General',
                file_name TEXT NOT NULL,
                file_format TEXT NOT NULL,
                headers JSONB NOT NULL DEFAULT '[]'::jsonb,
                mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT
              )`,
              `CREATE INDEX IF NOT EXISTS idx_amazon_templates_active ON amazon_export_templates (is_active, created_at DESC)`,
            );
          }

          if (!row.has_website) {
            missingStatements.push(
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
            );
          }

          if (!row.has_settings) {
            missingStatements.push(
              `CREATE TABLE IF NOT EXISTS store_settings (
                id TEXT PRIMARY KEY DEFAULT 'default',
                store_name TEXT NOT NULL DEFAULT 'RIOTOUS',
                initial_catalog_seeded BOOLEAN DEFAULT false,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              )`,
              `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS initial_catalog_seeded BOOLEAN DEFAULT false`,
              `INSERT INTO store_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`,
            );
          }

          // Ensure columns on existing tables are present
          missingStatements.push(
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_value NUMERIC`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS eligible_amount NUMERIC`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_subtotal NUMERIC`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_subtotal NUMERIC`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
            `ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_state TEXT DEFAULT 'Normal'`,
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_submission_id TEXT`,
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_size TEXT`,
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_color TEXT`,
            `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer'`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active'`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar TEXT`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code TEXT`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT`,
          );

          if (missingStatements.length > 0) {
            for (const stmt of missingStatements) {
              try {
                await runDdlStatement(sql, stmt);
              } catch (stmtErr: any) {
                console.warn("[Neon DB] Missing table/column DDL warning:", stmtErr?.message || stmtErr);
              }
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
        `CREATE TABLE IF NOT EXISTS coupons (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          discount_type TEXT NOT NULL,
          discount_value NUMERIC NOT NULL,
          minimum_order_value NUMERIC DEFAULT 0,
          maximum_discount NUMERIC,
          usage_limit INTEGER,
          usage_per_customer INTEGER DEFAULT 1,
          used_count INTEGER NOT NULL DEFAULT 0,
          starts_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN NOT NULL DEFAULT true,
          applies_to TEXT NOT NULL DEFAULT 'all',
          product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          category_names JSONB NOT NULL DEFAULT '[]'::jsonb,
          excluded_product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          excluded_category_names JSONB NOT NULL DEFAULT '[]'::jsonb,
          deleted_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS coupon_usage (
          id TEXT PRIMARY KEY,
          coupon_id TEXT NOT NULL,
          order_id TEXT NOT NULL,
          customer_id TEXT,
          customer_email TEXT NOT NULL,
          coupon_code TEXT NOT NULL,
          discount_amount NUMERIC NOT NULL,
          order_amount NUMERIC NOT NULL,
          used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
        `CREATE TABLE IF NOT EXISTS amazon_export_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          purpose TEXT NOT NULL DEFAULT 'General',
          file_name TEXT NOT NULL,
          file_format TEXT NOT NULL,
          headers JSONB NOT NULL DEFAULT '[]'::jsonb,
          mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS email_logs (
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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          sent_at TIMESTAMP WITH TIME ZONE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs (created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs (email_type)`,
        `CREATE INDEX IF NOT EXISTS idx_email_logs_order ON email_logs (order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_amazon_templates_active ON amazon_export_templates (is_active, created_at DESC)`,
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
        `CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (UPPER(code))`,
        `CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active, deleted_at)`,
        `CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage (coupon_id)`,
        `CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON coupon_usage (customer_email, coupon_id)`,
        `CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage (order_id)`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id TEXT`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type TEXT`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_value NUMERIC`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS eligible_amount NUMERIC`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_subtotal NUMERIC`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_subtotal NUMERIC`,
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
        `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS initial_catalog_seeded BOOLEAN DEFAULT false`,
        `INSERT INTO store_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`,
        `UPDATE profiles SET role = 'Super Admin' WHERE email = 'princevekariya9898@gmail.com'`,
      ];

      // Execute schema statements in concurrent chunks
      const batchSize = 6;
      for (let i = 0; i < schemaStatements.length; i += batchSize) {
        const chunk = schemaStatements.slice(i, i + batchSize);
        await Promise.allSettled(
          chunk.map(async (stmt) => {
            try {
              await runDdlStatement(sql, stmt);
            } catch (stmtErr: any) {
              // ignore statement-level warnings
            }
          }),
        );
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
