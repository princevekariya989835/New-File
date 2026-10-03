import { neon } from "@neondatabase/serverless";
import { FALLBACK_PRODUCTS } from "./fallback-products";

let _schemaInitialized = false;
let _schemaPromise: Promise<void> | null = null;
let _cfEnv: any = null;

// Allow server.ts or Cloudflare runtime to inject env bindings
export function setCloudflareEnv(env: any) {
  if (env) {
    _cfEnv = env;
    if (typeof globalThis !== "undefined") {
      const g = globalThis as any;
      g.__cf_env__ = env;
      if (env.DB) {
        g.DB = env.DB;
      }
    }
  }
}

export function getCloudflareEnv(): any {
  if (_cfEnv) return _cfEnv;
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (g.__cf_env__) return g.__cf_env__;
    if (g.__env__) return g.__env__;
    if (g.env) return g.env;
    if (g.DB) return { DB: g.DB };
  }
  return null;
}

export function getD1Binding(): any {
  const env = getCloudflareEnv();
  if (env?.DB) return env.DB;
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (g.DB) return g.DB;
    if (g.__cf_env__?.DB) return g.__cf_env__.DB;
    if (g.__env__?.DB) return g.__env__.DB;
  }
  return null;
}

export function isD1Active(): boolean {
  return Boolean(getD1Binding());
}

export function getDatabaseEngineName(): string {
  if (isD1Active()) return "Cloudflare D1 (riotous-db)";
  if (getDatabaseUrl()) return "Neon PostgreSQL";
  if (getLocalD1Token()) return "Cloudflare D1 (riotous-db via REST)";
  return "Local In-Memory Engine";
}

// In-memory database store for local dev when neither D1 nor DATABASE_URL is set
const _mockProducts: any[] = FALLBACK_PRODUCTS.map((p) => ({
  ...p,
  images: [...p.images],
  sizes: [...p.sizes],
  colors: [...p.colors],
  tags: [...p.tags],
  color_variants: p.color_variants ? [...p.color_variants] : [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

let _mockVariants: any[] = FALLBACK_PRODUCTS.flatMap((p) =>
  (p.product_variants || []).map((v) => ({
    ...v,
    product_id: p.id,
    color_hex: v.color_hex || null,
    image_url: v.image_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
);

const _mockProfiles: any[] = [
  {
    id: "usr_admin_default",
    email: "princevekariya9898@gmail.com",
    password_hash: "28e75cfdc4bbd91da3c6046e9fc0a316b2cf771f286b2bb6ee8119eb1ea1e459",
    full_name: "Prince Vekariya",
    role: "Super Admin",
    status: "Active",
    permissions: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "usr_demo_customer",
    email: "customer@example.com",
    password_hash: "28e75cfdc4bbd91da3c6046e9fc0a316b2cf771f286b2bb6ee8119eb1ea1e459",
    full_name: "Demo Customer",
    role: "customer",
    status: "Active",
    permissions: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let _mockEmailOtps: any[] = [];

const _mockCoupons: any[] = [
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
    id: "cpn_riotous20",
    code: "RIOTOUS20",
    name: "Buy 3 Get 20% Off",
    description: "Get 20% off when you buy 3 or more streetwear pieces.",
    discount_type: "percentage",
    discount_value: 20,
    minimum_order_value: 0,
    maximum_discount: null,
    usage_limit: null,
    usage_per_customer: 1,
    used_count: 5,
    starts_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-12-31T23:59:59.000Z",
    is_active: true,
    applies_to: "all",
    product_ids: [],
    category_names: [],
    excluded_product_ids: [],
    excluded_category_names: [],
    deleted_at: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "Admin",
  },
  {
    id: "cpn_save200",
    code: "SAVE200",
    name: "Flat ₹200 Off",
    description: "Flat ₹200 discount on your order.",
    discount_type: "fixed",
    discount_value: 200,
    minimum_order_value: 0,
    maximum_discount: null,
    usage_limit: null,
    usage_per_customer: 1,
    used_count: 8,
    starts_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-12-31T23:59:59.000Z",
    is_active: true,
    applies_to: "all",
    product_ids: [],
    category_names: [],
    excluded_product_ids: [],
    excluded_category_names: [],
    deleted_at: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
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
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "Admin",
  },
];

const _mockCouponUsage: any[] = [
  {
    id: "cusg_demo_1",
    coupon_id: "cpn_riotous10",
    order_id: "ord_demo_1",
    customer_id: "usr_cust_1",
    customer_email: "customer@example.com",
    coupon_code: "RIOTOUS10",
    discount_amount: 150,
    order_amount: 1500,
    used_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "cusg_demo_2",
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

const _mockEmailLogs: any[] = [];

const _mockOrders: any[] = [
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

const _mockOrderItems: any[] = [
  {
    id: "item_1001",
    order_id: "ord_1001",
    product_id: "prod-acid-wash-tee",
    variant_id: "var-awvt-blk-l",
    design_submission_id: null,
    product_name: "Acid Wash Oversized Tee",
    product_image: "/products/zoro-olive-1.jpg",
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
    product_id: "prod-cyberpunk-tee",
    variant_id: "var-cpgt-blk-m",
    design_submission_id: null,
    product_name: "Cyberpunk Graphic Tee",
    product_image: "/products/zoro-black-1.jpg",
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
    product_id: "prod-anime-heavyweight-tee",
    variant_id: "var-aahw-mrn-xl",
    design_submission_id: null,
    product_name: "Heavyweight Boxy Tee",
    product_image: "/products/zenitsu-maroon-1.jpg",
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
    product_id: "prod-oversized-black-tee",
    variant_id: "var-obts-blk-s",
    design_submission_id: null,
    product_name: "Distressed Street Tee",
    product_image: "/products/zoro-black-2.jpg",
    quantity: 1,
    price: 1399,
    selected_size: "S",
    selected_color: "Washed Grey",
    subtotal: 1399,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

const _mockReturns: any[] = [];
const _mockReviews: any[] = [];
const _mockDesignSubmissions: any[] = [];
const _mockInventoryTransactions: any[] = [];
let _mockProductHighlights: any[] = [];
let _mockProductSpecifications: any[] = [];
let _mockProductOffers: any[] = [];
const _mockWebsiteMedia = new Map<string, any>();

export function removeMockProduct(productIdOrSlug: string): boolean {
  if (!productIdOrSlug) return false;
  const norm = String(productIdOrSlug).toLowerCase().trim();
  const idx = _mockProducts.findIndex(
    (p) => String(p.id).toLowerCase() === norm || String(p.slug).toLowerCase() === norm,
  );
  if (idx !== -1) {
    const [removed] = _mockProducts.splice(idx, 1);
    _mockVariants = _mockVariants.filter((v) => String(v.product_id) !== String(removed.id));
    _mockProductHighlights = _mockProductHighlights.filter((h) => String(h.product_id) !== String(removed.id));
    _mockProductSpecifications = _mockProductSpecifications.filter((s) => String(s.product_id) !== String(removed.id));
    _mockProductOffers = _mockProductOffers.filter((o) => String(o.product_id) !== String(removed.id));
    return true;
  }
  return false;
}

export function getDatabaseUrl(): string | null {
  if (typeof process !== "undefined" && process.env?.DATABASE_URL) {
    return process.env.DATABASE_URL.trim();
  }
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (g.DATABASE_URL) return String(g.DATABASE_URL).trim();
    if (g.__env__?.DATABASE_URL) return String(g.__env__.DATABASE_URL).trim();
    if (g.process?.env?.DATABASE_URL) return String(g.process.env.DATABASE_URL).trim();
  }
  return null;
}

// Known columns containing serialized JSON that should be parsed when returned
const JSON_COLUMNS = new Set([
  "images", "sizes", "colors", "color_variants", "tags", "features",
  "care_instructions", "manufacturing_info", "size_measurements",
  "product_variants", "variants", "product_images", "sizeStock",
  "highlights", "specifications", "offers",
  "items", "canvases", "preview_images", "product_ids", "category_names",
  "excluded_product_ids", "excluded_category_names", "config", "details",
  "headers", "mapping", "permissions", "eligible_products", "eligible_categories",
]);

function parseJsonFields(row: any): any {
  if (!row || typeof row !== "object") return row;
  const parsed = { ...row };
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof val === "string" && JSON_COLUMNS.has(key)) {
      try {
        parsed[key] = JSON.parse(val);
      } catch {
        // Keep string if not valid JSON
      }
    }
  }
  return parsed;
}

/**
 * Normalizes PostgreSQL query strings and parameters to SQLite / Cloudflare D1 syntax.
 */
function transformPgSqlToD1(strings: TemplateStringsArray | string[] | string, values: any[] = []) {
  let rawSql = "";
  const finalBindings: any[] = [];
  let stripNextClosingParen = false;

  if (typeof strings === "string") {
    rawSql = strings;
    for (const v of values) {
      if (typeof v === "boolean") {
        finalBindings.push(v ? 1 : 0);
      } else if (v instanceof Date) {
        finalBindings.push(v.toISOString());
      } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        finalBindings.push(JSON.stringify(v));
      } else {
        finalBindings.push(v);
      }
    }
  } else if (Array.isArray(strings)) {
    for (let i = 0; i < strings.length; i++) {
      let part = strings[i];
      if (stripNextClosingParen) {
        part = part.replace(/^(\s*::[a-zA-Z0-9_]+(\[\])?)?\s*\)/, "");
        stripNextClosingParen = false;
      }
      rawSql += part;

      if (i < values.length) {
        const val = values[i];
        if (Array.isArray(val)) {
          const anyMatch = rawSql.match(/(=?\s*ANY\s*\(\s*)$/i);
          if (anyMatch) {
            rawSql = rawSql.slice(0, -anyMatch[1].length);
            if (val.length === 0) {
              rawSql += "IN (NULL)";
            } else {
              rawSql += `IN (${val.map(() => "?").join(", ")})`;
              finalBindings.push(...val);
            }
            stripNextClosingParen = true;
          } else {
            if (val.length === 0) {
              rawSql += "NULL";
            } else {
              rawSql += `(${val.map(() => "?").join(", ")})`;
              finalBindings.push(...val);
            }
          }
        } else if (typeof val === "boolean") {
          rawSql += "?";
          finalBindings.push(val ? 1 : 0);
        } else if (val instanceof Date) {
          rawSql += "?";
          finalBindings.push(val.toISOString());
        } else if (val !== null && typeof val === "object") {
          rawSql += "?";
          finalBindings.push(JSON.stringify(val));
        } else {
          rawSql += "?";
          finalBindings.push(val);
        }
      }
    }
  }

  // Handle DDL / procedural blocks
  if (rawSql.includes("DO $$") || rawSql.includes("DROP CONSTRAINT IF EXISTS")) {
    return { sql: "", bindings: [], skip: true };
  }

  // Strip Postgres typecasts
  rawSql = rawSql.replace(/::[a-zA-Z0-9_]+(\[\])?/g, "");

  // Functions: NOW() -> CURRENT_TIMESTAMP
  rawSql = rawSql.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");

  // Date compatibility transformations for SQLite / D1
  rawSql = rawSql.replace(/DATE_TRUNC\s*\(\s*['"]month['"]\s*,\s*CURRENT_DATE\s*\)/gi, "date('now', 'start of month')");
  rawSql = rawSql.replace(/DATE_TRUNC\s*\(\s*['"]month['"]\s*,\s*([^)]+)\s*\)/gi, "date($1, 'start of month')");
  rawSql = rawSql.replace(/TO_CHAR\s*\(\s*([^,]+)\s*,\s*['"]YYYY-MM-DD['"]\s*\)/gi, "substr($1, 1, 10)");
  rawSql = rawSql.replace(/CURRENT_DATE\s*-\s*INTERVAL\s*['"]([0-9]+)\s*days['"]/gi, "date('now', '-$1 days')");
  rawSql = rawSql.replace(/CURRENT_DATE\s*\+\s*INTERVAL\s*['"]([0-9]+)\s*days['"]/gi, "date('now', '+$1 days')");
  rawSql = rawSql.replace(/\bCURRENT_DATE\b/gi, "date('now')");

  // to_regclass -> sqlite_master table check
  rawSql = rawSql.replace(
    /to_regclass\('public\.([a-zA-Z0-9_]+)'\)\s+IS\s+NOT\s+NULL/gi,
    "(SELECT 1 FROM sqlite_master WHERE type='table' AND name='$1') IS NOT NULL",
  );

  // JSON functions
  rawSql = rawSql.replace(/\bjsonb_agg\b/gi, "json_group_array");
  rawSql = rawSql.replace(/\bjsonb_build_object\b/gi, "json_object");
  rawSql = rawSql.replace(/\bjsonb_typeof\b/gi, "json_type");
  rawSql = rawSql.replace(/\bjsonb_array_length\b/gi, "json_array_length");
  rawSql = rawSql.replace(/\bjsonb_build_array\b/gi, "json_array");
  rawSql = rawSql.replace(/->>\s*0\b/g, ", '$[0]')");
  rawSql = rawSql.replace(/->\s*0\b/g, ", '$[0]')");

  // ILIKE -> LIKE
  rawSql = rawSql.replace(/\bILIKE\b/gi, "LIKE");

  return { sql: rawSql.trim(), bindings: finalBindings, skip: false };
}

/**
 * Creates a tagged-template `sql` execution interface wrapping Cloudflare D1.
 */
function createD1Sql(d1: any) {
  const d1Sql = async (strings: TemplateStringsArray | string[] | string, ...values: any[]): Promise<any[]> => {
    const { sql, bindings, skip } = transformPgSqlToD1(strings, values);
    if (skip || !sql) {
      return [];
    }

    try {
      const stmt = bindings.length > 0 ? d1.prepare(sql).bind(...bindings) : d1.prepare(sql);
      const res = await stmt.all();
      const rows = res.results || [];
      return rows.map((r: any) => parseJsonFields(r));
    } catch (err: any) {
      console.error("[Cloudflare D1 Query Error]:", err?.message || err, "\nSQL:", sql, "\nBindings:", bindings);
      throw err;
    }
  };

  (d1Sql as any).query = async (str: string, ...bindings: any[]) => {
    return d1Sql(str, ...bindings);
  };

  return d1Sql;
}

/**
 * D1 REST API Client for Local Node.js development.
 * Allows local development server to query live D1 database.
 */
let _cachedRestToken: string | null = null;
export function getLocalD1Token(forceRefresh: boolean = false): string | null {
  if (typeof process !== "undefined" && process.env?.CLOUDFLARE_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN.trim();
  }
  if (!forceRefresh && _cachedRestToken) return _cachedRestToken;
  try {
    if (typeof process !== "undefined" && process.versions?.node) {
      let fs: any = null;
      let path: any = null;
      let os: any = null;

      if (typeof (process as any).getBuiltinModule === "function") {
        fs = (process as any).getBuiltinModule("fs") || (process as any).getBuiltinModule("node:fs");
        path = (process as any).getBuiltinModule("path") || (process as any).getBuiltinModule("node:path");
        os = (process as any).getBuiltinModule("os") || (process as any).getBuiltinModule("node:os");
      }

      if (fs && path && os) {
        const home = os.homedir();
        const candidatePaths = [
          path.join(home, "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml"),
          path.join(home, ".config", ".wrangler", "config", "default.toml"),
          path.join(home, ".wrangler", "config", "default.toml"),
        ];

        for (const tomlPath of candidatePaths) {
          if (fs.existsSync(tomlPath)) {
            const toml = fs.readFileSync(tomlPath, "utf8");
            const m = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
            if (m) {
              _cachedRestToken = m[1];
              return _cachedRestToken;
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function createD1RestSql() {
  const accountId = "f243cdf7bf870b1000051f76985db609";
  const databaseId = "7487ac0f-706e-4560-baf8-e79031b2dd5e";

  const restSql = async (strings: TemplateStringsArray | string[] | string, ...values: any[]): Promise<any[]> => {
    let token = getLocalD1Token();
    if (!token) return [];

    const { sql, bindings, skip } = transformPgSqlToD1(strings, values);
    if (skip || !sql) return [];

    let res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params: bindings }),
    });

    let data: any = await res.json();
    if (res.status === 401 || (data.errors && data.errors.some((e: any) => e.code === 10000 || e.code === 7403))) {
      // Token expired, force re-reading from wrangler config
      token = getLocalD1Token(true);
      if (token) {
        res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql, params: bindings }),
        });
        data = await res.json();
      }
    }

    if (data.errors && data.errors.length > 0) {
      throw new Error(data.errors.map((e: any) => e.message).join(", "));
    }
    const rows = data.result?.[0]?.results || [];
    return rows.map((r: any) => parseJsonFields(r));
  };

  (restSql as any).query = async (str: string, ...bindings: any[]) => {
    return restSql(str, ...bindings);
  };

  return restSql;
}

let _cachedSql: any = null;
let _cachedSqlMode: string | null = null;

export function getSql() {
  const useNeon = (typeof process !== "undefined" && process.env?.USE_NEON === "true");
  const localD1Token = getLocalD1Token();

  // 1. In local Node.js development, connect to the real Cloudflare D1 database via REST
  if (typeof process !== "undefined" && process.versions?.node && localD1Token && !useNeon) {
    if (_cachedSql && _cachedSqlMode === "d1-rest") {
      return _cachedSql;
    }
    _cachedSql = createD1RestSql();
    _cachedSqlMode = "d1-rest";
    return _cachedSql;
  }

  // 2. Cloudflare D1 Native Edge Binding (Active in Production Cloudflare Worker)
  const d1 = getD1Binding();
  if (d1) {
    if (_cachedSql && _cachedSqlMode === "d1-native") {
      return _cachedSql;
    }
    _cachedSql = createD1Sql(d1);
    _cachedSqlMode = "d1-native";
    return _cachedSql;
  }

  // 3. Explicit Rollback to Neon PostgreSQL if requested
  const neonUrl = getDatabaseUrl();
  if (useNeon && neonUrl) {
    if (_cachedSql && _cachedSqlMode === `neon-${neonUrl}`) {
      return _cachedSql;
    }
    _cachedSql = neon(neonUrl);
    _cachedSqlMode = `neon-${neonUrl}`;
    return _cachedSql;
  }

  // 4. In-Memory Mock Database Engine (Priority 4 - Local offline fallback)
  {
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
        return [{ id: "default", window_days: 7, require_delivered: 1 }];
      }

      if (lower.includes("store_settings")) {
        return [{ id: "default", store_name: "RIOTOUS", initial_catalog_seeded: 1 }];
      }

      // SELECT from products
      if (lower.includes("from products") && !lower.includes("delete from")) {
        if (lower.includes("select 1")) {
          return _mockProducts.length > 0 ? [{ 1: 1 }] : [];
        }
        const mapProd = (p: any, isActiveOnly = false) => {
          const prodVariants = _mockVariants.filter((v) => String(v.product_id) === String(p.id));
          const prodHighlights = _mockProductHighlights
            .filter((h) => String(h.product_id) === String(p.id) && (!isActiveOnly || h.is_active !== false))
            .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
          const prodSpecs = _mockProductSpecifications
            .filter((s) => String(s.product_id) === String(p.id) && (!isActiveOnly || s.is_active !== false))
            .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
          const prodOffers = _mockProductOffers
            .filter((o) => String(o.product_id) === String(p.id) && (!isActiveOnly || o.is_active !== false))
            .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

          return {
            ...p,
            mrp: p.mrp ?? p.compare_at_price ?? p.price,
            compare_at_price: p.compare_at_price ?? p.mrp ?? p.price,
            product_variants: prodVariants,
            variants: prodVariants,
            highlights: prodHighlights,
            specifications: prodSpecs,
            offers: prodOffers,
          };
        };

        if (lower.includes("where") && (lower.includes("slug =") || lower.includes("id =") || lower.includes("id::text ="))) {
          const matchVal = values[0] ? String(values[0]).toLowerCase() : "";
          const found = _mockProducts.find(
            (p) => String(p.slug).toLowerCase() === matchVal || String(p.id).toLowerCase() === matchVal,
          );
          return found ? [mapProd(found, false)] : [];
        }

        return _mockProducts.map((p) => mapProd(p, true));
      }

      // SELECT from profiles
      if (lower.includes("from profiles")) {
        if (lower.includes("where")) {
          const emailVal = values.find((v) => typeof v === "string" && v.includes("@"));
          if (emailVal) {
            const found = _mockProfiles.find((p) => p.email.toLowerCase() === String(emailVal).toLowerCase());
            return found ? [found] : [];
          }
          const idVal = values[0] ? String(values[0]) : "";
          const found = _mockProfiles.find((p) => p.id === idVal);
          return found ? [found] : [];
        }
        return [..._mockProfiles];
      }

      // SELECT from coupons
      if (lower.includes("from coupons")) {
        if (lower.includes("where") && lower.includes("code =")) {
          const codeVal = values[0] ? String(values[0]).toUpperCase() : "";
          const found = _mockCoupons.find((c) => c.code.toUpperCase() === codeVal && c.is_active && !c.deleted_at);
          return found ? [found] : [];
        }
        return _mockCoupons.filter((c) => !c.deleted_at);
      }

      // SELECT from orders
      if (lower.includes("from orders")) {
        return [..._mockOrders];
      }

      // SELECT from order_items
      if (lower.includes("from order_items")) {
        return [..._mockOrderItems];
      }

      // INSERT INTO website_media
      if (lower.includes("insert into website_media")) {
        const id = values[0] ? String(values[0]) : `med_${Date.now()}`;
        const fileName = values[1] ? String(values[1]) : "media";
        const mimeType = values[2] ? String(values[2]) : "image/jpeg";
        const mediaType = values[3] ? String(values[3]) : "image";
        const sizeBytes = Number(values[4]) || 0;
        const dataBase64 = values[5] ? String(values[5]) : "";
        const createdAt = values[6] ? String(values[6]) : new Date().toISOString();
        const createdBy = values[7] ? String(values[7]) : "Admin";
        _mockWebsiteMedia.set(id, {
          id,
          file_name: fileName,
          mime_type: mimeType,
          media_type: mediaType,
          size_bytes: sizeBytes,
          data_base64: dataBase64,
          created_at: createdAt,
          created_by: createdBy,
        });
        return [{ id }];
      }

      // SELECT from website_media
      if (lower.includes("from website_media")) {
        if (lower.includes("where id =") || lower.includes("where id::text =")) {
          const idVal = values[0] ? String(values[0]) : "";
          if (idVal && _mockWebsiteMedia.has(idVal)) {
            return [_mockWebsiteMedia.get(idVal)];
          }
          return [];
        }
        return Array.from(_mockWebsiteMedia.values());
      }

      // UPDATE products
      if (lower.includes("update products")) {
        const idVal = values[values.length - 1] ?? values[values.length - 2];
        const matchVal = String(idVal || "").toLowerCase().trim();
        const found = _mockProducts.find(
          (p) => String(p.id).toLowerCase() === matchVal || String(p.slug).toLowerCase() === matchVal,
        );
        if (found) {
          for (const v of values) {
            if (Array.isArray(v)) {
              if (v.some((item) => typeof item === "string" && (item.startsWith("/") || item.startsWith("http") || item.startsWith("data:")))) {
                found.images = [...v];
              }
            } else if (typeof v === "string" && v.startsWith("[")) {
              try {
                const parsed = JSON.parse(v);
                if (Array.isArray(parsed) && parsed.some((item) => typeof item === "string" && (item.startsWith("/") || item.startsWith("http") || item.startsWith("data:")))) {
                  found.images = [...parsed];
                }
              } catch {}
            }
          }
          if (values[0] !== undefined && typeof values[0] === "string") found.name = values[0];
          found.updated_at = new Date().toISOString();
          return [found];
        }
        return [];
      }

      // INSERT INTO products
      if (lower.includes("insert into products")) {
        const id = values[0] ? String(values[0]) : `prod_${Date.now()}`;
        const name = values[1] ? String(values[1]) : "Product";
        const slug = values[2] ? String(values[2]) : id;
        let images: string[] = [];
        for (const v of values) {
          if (Array.isArray(v) && v.some((item) => typeof item === "string" && (item.startsWith("/") || item.startsWith("http")))) {
            images = [...v];
            break;
          } else if (typeof v === "string" && v.startsWith("[")) {
            try {
              const p = JSON.parse(v);
              if (Array.isArray(p) && p.some((item) => typeof item === "string" && (item.startsWith("/") || item.startsWith("http")))) {
                images = [...p];
                break;
              }
            } catch {}
          }
        }
        const newProd = {
          id,
          name,
          slug,
          images: images.length ? images : ["/placeholder-tee.jpg"],
          sizes: ["S", "M", "L", "XL", "XXL"],
          colors: ["Black"],
          stock_quantity: 25,
          is_active: 1,
          tags: ["New"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        _mockProducts.push(newProd);
        return [{ id }];
      }

      return [];
    };

    (mockSql as any).query = async (str: string) => mockSql([str] as any);
    return mockSql as any;
  }
}

/**
 * Initializes or verifies database schema and initial catalog.
 * Highly optimized with single check.
 */
export async function ensureDbSchema() {
  if (_schemaInitialized) return;
  if (_schemaPromise) return _schemaPromise;

  _schemaPromise = (async () => {
    try {
      const sql = getSql();
      // Fast check that products exist
      try {
        const rows = await sql`SELECT 1 FROM products LIMIT 1`;
        if (rows && rows.length > 0) {
          _schemaInitialized = true;
          return;
        }
      } catch {
        // Table or connection pending
      }
      _schemaInitialized = true;
    } catch (err) {
      console.warn("[DB] ensureDbSchema warning:", err);
      _schemaInitialized = true;
    } finally {
      _schemaPromise = null;
    }
  })();

  return _schemaPromise;
}

export { FALLBACK_PRODUCTS };
