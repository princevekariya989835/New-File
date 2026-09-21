import { getSql } from "@/lib/db";
import { createServerFn } from "@tanstack/react-start";
import { logServerSyncEvent } from "@/lib/server-logger";
import {
  FALLBACK_PRODUCTS,
  type ProductRow,
  type VariantRow,
} from "./fallback-products";

export { FALLBACK_PRODUCTS, type ProductRow, type VariantRow };

export interface CatalogImage {
  url: string;
  altText: string | null;
}

export interface CatalogVariant {
  id: string;
  /** Database id of the product_variants row, when the product has variants. */
  variantRowId: string | null;
  /** Units a customer can still buy right now. */
  available: number;
  title: string;
  price: { amount: string; currencyCode: string };
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
  image?: CatalogImage | null;
}

export interface CatalogProductNode {
  id: string;
  productId: string;
  title: string;
  description: string;
  handle: string;
  tags: string[];
  productType: string;
  stock: number;
  /** Units still purchasable across all variants. */
  available: number;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { edges: Array<{ node: CatalogImage }> };
  variants: { edges: Array<{ node: CatalogVariant }> };
  options: Array<{ name: string; values: string[] }>;
}

export interface CatalogProduct {
  node: CatalogProductNode;
}

/** Stable variant key encoding product + chosen size/colour. */
export function makeVariantId(productId: string, size: string | null, color: string | null) {
  return [productId, size ?? "", color ?? ""].join("|");
}

export function parseVariantId(variantId: string) {
  const [productId, size, color] = variantId.split("|");
  return {
    productId: productId ?? null,
    size: size || null,
    color: color || null,
  };
}

/** Maps a database row into the shape the storefront UI renders. */
export function toCatalogProduct(row: ProductRow): CatalogProduct {
  const currency = row.currency || "INR";
  const price = { amount: String(row.price), currencyCode: currency };
  const rows = row.product_variants ?? [];

  const byKey = new Map<string, VariantRow>();
  for (const v of rows) {
    const s = (v.size ?? "").trim().toLowerCase();
    const c = (v.color ?? "").trim().toLowerCase();
    byKey.set(`${s}|${c}`, v);
    if (s && !c) byKey.set(`${s}|`, v);
    if (!s && c) byKey.set(`|${c}`, v);
    if (s) byKey.set(`${s}`, v);
  }

  const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];
  const rawSizes = row.sizes?.length ? row.sizes : DEFAULT_SIZES;
  const sizes = rawSizes.filter(Boolean);
  const colors = row.colors?.length ? row.colors : [null];

  const variants: CatalogVariant[] = [];
  for (const color of colors) {
    for (const size of sizes) {
      const s = (size ?? "").trim().toLowerCase();
      const c = (color ?? "").trim().toLowerCase();
      let match = byKey.get(`${s}|${c}`);
      if (!match && s) match = byKey.get(`${s}|`) || byKey.get(s);
      if (!match && c) match = byKey.get(`|${c}`);

      // Products without variant rows or unmatched rows fall back to product-level stock.
      const available = match
        ? Math.max(0, (match.stock_quantity ?? 0) - (match.reserved_stock ?? 0))
        : rows.length === 0
          ? Math.max(0, row.stock_quantity ?? 0)
          : 0;

      variants.push({
        id: makeVariantId(row.id, size, color),
        variantRowId: match?.id ?? null,
        available,
        title: [size, color].filter(Boolean).join(" / ") || "Default",
        price,
        availableForSale: row.is_active && available > 0,
        selectedOptions: [
          ...(size ? [{ name: "Size", value: size }] : []),
          ...(color ? [{ name: "Color", value: color }] : []),
        ],
        image: row.images?.[0] ? { url: row.images[0], altText: row.name } : null,
      });
    }
  }

  // Failsafe: If all individual variants resulted in 0 available, but the product table itself has stock > 0,
  // distribute the product stock across the variants so the customer can select and buy.
  let available = variants.reduce((s, v) => s + v.available, 0);
  if (available === 0 && (row.stock_quantity ?? 0) > 0 && variants.length > 0) {
    const totalQty = Math.max(0, row.stock_quantity);
    const base = Math.floor(totalQty / variants.length);
    const rem = totalQty % variants.length;
    variants.forEach((v, idx) => {
      v.available = base + (idx < rem ? 1 : 0);
      v.availableForSale = row.is_active && v.available > 0;
    });
    available = totalQty;
  }

  const options = [
    { name: "Size", values: sizes },
    ...(row.colors?.length ? [{ name: "Color", values: row.colors }] : []),
  ];

  return {
    node: {
      id: row.id,
      productId: row.id,
      title: row.name,
      description: row.description ?? "",
      handle: row.slug,
      tags: row.tags ?? [],
      productType: row.category ?? "",
      stock: Math.max(row.stock_quantity ?? 0, available),
      available,
      priceRange: { minVariantPrice: price },
      images: {
        edges: (row.images && row.images.length > 0 ? row.images : ["/placeholder-tee.jpg"]).map(
          (url) => ({
            node: { url, altText: row.name },
          }),
        ),
      },
      variants: { edges: variants.map((node) => ({ node })) },
      options,
    },
  };
}



let _seeded = false;
let _seedPromise: Promise<void> | null = null;

// Micro-cache (2s burst debounce) prevents simultaneous render bursts while ensuring all edge workers read fresh DB data
const _productsCache = new Map<number, { data: CatalogProduct[]; timestamp: number }>();
const _productHandleCache = new Map<string, { data: CatalogProductNode | null; timestamp: number }>();
const CATALOG_CACHE_TTL = 60_000;

export function invalidateCatalogCache() {
  _productsCache.clear();
  _productHandleCache.clear();
}

export async function seedInitialProductsIfNeeded() {
  if (_seeded) return;
  if (_seedPromise) return _seedPromise;

  _seedPromise = (async () => {
    try {
      const sql = getSql();

      // Filter out any deleted products so they are NEVER re-seeded
      const deletedIds = new Set<string>();
      try {
        const { getDeletedProductIds } = await import("./fallback-products-manager.server");
        getDeletedProductIds().forEach((id) => deletedIds.add(id.toLowerCase().trim()));
      } catch {}

      // Check if store_settings has initial_catalog_seeded flag
      try {
        const settings = await sql`
          SELECT initial_catalog_seeded, deleted_product_ids FROM store_settings WHERE id = 'default' LIMIT 1
        `;
        if (settings && settings.length > 0) {
          if (settings[0].deleted_product_ids && Array.isArray(settings[0].deleted_product_ids)) {
            settings[0].deleted_product_ids.forEach((d: string) => deletedIds.add(String(d).toLowerCase().trim()));
          }
          if (settings[0].initial_catalog_seeded) {
            _seeded = true;
            return;
          }
        }
      } catch {
        // Table or column may not exist yet, proceed
      }

      // Quick existence check: If products table already has records, mark seeded and exit
      try {
        const existing = await sql`SELECT 1 FROM products LIMIT 1`;
        if (existing && existing.length > 0) {
          _seeded = true;
          try {
            await sql`UPDATE store_settings SET initial_catalog_seeded = true WHERE id = 'default'`;
          } catch {}
          return;
        }
      } catch {
        // Table may not exist yet or connection error, proceed
      }

      for (const p of FALLBACK_PRODUCTS) {
        if (deletedIds.has(p.id.toLowerCase()) || deletedIds.has(p.slug.toLowerCase())) {
          continue;
        }
        try {
          await sql`
            INSERT INTO products (
              id, name, slug, description, price, base_price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
            ) VALUES (
              ${p.id}, ${p.name}, ${p.slug}, ${p.description}, ${p.price}, ${p.price}, ${p.currency},
              ${JSON.stringify(p.images)}::jsonb, ${p.category}, ${JSON.stringify(p.sizes)}::jsonb, ${JSON.stringify(p.colors)}::jsonb,
              ${p.stock_quantity}, ${p.is_active}, ${JSON.stringify(p.tags)}::jsonb
            ) ON CONFLICT (id) DO NOTHING;
          `;
        } catch {
          await sql`
            INSERT INTO products (
              id, name, slug, description, price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
            ) VALUES (
              ${p.id}, ${p.name}, ${p.slug}, ${p.description}, ${p.price}, ${p.currency},
              ${JSON.stringify(p.images)}::jsonb, ${p.category}, ${JSON.stringify(p.sizes)}::jsonb, ${JSON.stringify(p.colors)}::jsonb,
              ${p.stock_quantity}, ${p.is_active}, ${JSON.stringify(p.tags)}::jsonb
            ) ON CONFLICT (id) DO NOTHING;
          `;
        }
        if (p.product_variants) {
          for (const v of p.product_variants) {
            try {
              await sql`
                INSERT INTO product_variants (
                  id, product_id, size, color, sku, stock_quantity, reserved_stock, low_stock_threshold
                ) VALUES (
                  ${v.id}, ${p.id}, ${v.size}, ${v.color}, ${v.sku || v.id}, ${v.stock_quantity}, ${v.reserved_stock}, ${v.low_stock_threshold}
                ) ON CONFLICT (id) DO NOTHING;
              `;
            } catch {
              // ignore
            }
          }
        }
      }

      try {
        await sql`UPDATE store_settings SET initial_catalog_seeded = true WHERE id = 'default'`;
      } catch {}

      _seeded = true;
    } catch (err) {
      console.warn("Seed initial products error:", err);
    } finally {
      _seedPromise = null;
    }
  })();

  return _seedPromise;
}

/**
 * Direct high-performance query for published storefront products from Neon PostgreSQL.
 * Single source of truth across all edge workers and visitor sessions.
 */
export async function getPublishedProducts(first = 50): Promise<CatalogProduct[]> {
  const sql = getSql();

  const products = await sql`
    SELECT id, name, slug, description, price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
    FROM products
    WHERE is_active = true OR is_active IS NULL
    ORDER BY name ASC, id ASC
    LIMIT ${first}
  `;

  if (!products || products.length === 0) {
    return [];
  }

  const productIds = products.map((p: any) => String(p.id));
  let variants: any[] = [];
  if (productIds.length > 0) {
    try {
      variants = await sql`
        SELECT id, product_id, size, color, stock_quantity, reserved_stock, low_stock_threshold
        FROM product_variants
        WHERE product_id::text = ANY(${productIds}::text[])
      `;
    } catch {
      variants = [];
    }
  }

  const variantsByProductId = new Map<string, VariantRow[]>();
  for (const v of variants) {
    const pId = String(v.product_id);
    if (!variantsByProductId.has(pId)) variantsByProductId.set(pId, []);
    variantsByProductId.get(pId)!.push({
      id: String(v.id),
      size: (v.size as string) || "",
      color: (v.color as string) || "",
      stock_quantity: Number(v.stock_quantity || 0),
      reserved_stock: Number(v.reserved_stock || 0),
      low_stock_threshold: Number(v.low_stock_threshold || 2),
    });
  }

  const rows: ProductRow[] = products.map((p: any) => ({
    id: String(p.id),
    name: p.name as string,
    slug: p.slug as string,
    description: (p.description as string) || null,
    price: Number(p.price || 0),
    currency: (p.currency as string) || "INR",
    images: Array.isArray(p.images)
      ? p.images
      : typeof p.images === "string"
        ? JSON.parse(p.images)
        : [],
    category: (p.category as string) || null,
    sizes: Array.isArray(p.sizes)
      ? p.sizes
      : typeof p.sizes === "string"
        ? JSON.parse(p.sizes)
        : [],
    colors: Array.isArray(p.colors)
      ? p.colors
      : typeof p.colors === "string"
        ? JSON.parse(p.colors)
        : [],
    stock_quantity: Number(p.stock_quantity || 0),
    is_active: Boolean(p.is_active),
    tags: Array.isArray(p.tags) ? p.tags : typeof p.tags === "string" ? JSON.parse(p.tags) : [],
    product_variants: variantsByProductId.get(String(p.id)) || [],
  }));

  return rows.map(toCatalogProduct);
}

export const fetchProductsServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { first?: number }) => ({ first: Number(d.first || 20) }))
  .handler(async ({ data }): Promise<CatalogProduct[]> => {
    const first = data.first || 20;

    // Check burst debounce cache first (2s TTL)
    const cached = _productsCache.get(first);
    if (cached && Date.now() - cached.timestamp < CATALOG_CACHE_TTL) {
      return cached.data;
    }

    try {
      const results = await getPublishedProducts(first);
      _productsCache.set(first, { data: results, timestamp: Date.now() });
      return results;
    } catch (err: any) {
      logServerSyncEvent("DATABASE_ERROR", {
        operation: "fetchProducts",
        status: "FAILED",
        error: err?.message || String(err),
      });
      console.warn("fetchProducts error:", err);
      return cached?.data || [];
    }
  });

export async function fetchProducts(first = 20): Promise<CatalogProduct[]> {
  try {
    const res = await fetchProductsServerFn({ data: { first } });
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.warn("fetchProducts wrapper error:", err);
    return [];
  }
}

export const fetchProductByHandleServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { handle: string }) => ({ handle: String(d.handle) }))
  .handler(async ({ data }): Promise<CatalogProductNode | null> => {
    const handleKey = String(data.handle).toLowerCase().trim();

    // Check burst debounce cache first
    const cached = _productHandleCache.get(handleKey);
    if (cached && Date.now() - cached.timestamp < CATALOG_CACHE_TTL) {
      return cached.data;
    }

    try {
      const sql = getSql();

      // Read directly from database - Single Source of Truth
      const products = await sql`
        SELECT id, name, slug, description, price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
        FROM products
        WHERE (slug = ${data.handle} OR id::text = ${data.handle}) AND (is_active = true OR is_active IS NULL)
        LIMIT 1
      `;

      if (!products || products.length === 0) {
        _productHandleCache.set(handleKey, { data: null, timestamp: Date.now() });
        return null;
      }

      const p = products[0];
      let variants: any[] = [];
      try {
        variants = await sql`
          SELECT id, product_id, size, color, stock_quantity, reserved_stock, low_stock_threshold
          FROM product_variants
          WHERE product_id::text = ${String(p.id)}
        `;
      } catch {
        variants = [];
      }

      const variantRows: VariantRow[] = variants.map((v: any) => ({
        id: String(v.id),
        size: (v.size as string) || "",
        color: (v.color as string) || "",
        stock_quantity: Number(v.stock_quantity || 0),
        reserved_stock: Number(v.reserved_stock || 0),
        low_stock_threshold: Number(v.low_stock_threshold || 2),
      }));

      const row: ProductRow = {
        id: String(p.id),
        name: p.name as string,
        slug: p.slug as string,
        description: (p.description as string) || null,
        price: Number(p.price || 0),
        currency: (p.currency as string) || "INR",
        images: Array.isArray(p.images)
          ? p.images
          : typeof p.images === "string"
            ? JSON.parse(p.images)
            : [],
        category: (p.category as string) || null,
        sizes: Array.isArray(p.sizes)
          ? p.sizes
          : typeof p.sizes === "string"
        ? JSON.parse(p.sizes)
        : [],
        colors: Array.isArray(p.colors)
          ? p.colors
          : typeof p.colors === "string"
            ? JSON.parse(p.colors)
            : [],
        stock_quantity: Number(p.stock_quantity || 0),
        is_active: Boolean(p.is_active),
        tags: Array.isArray(p.tags) ? p.tags : typeof p.tags === "string" ? JSON.parse(p.tags) : [],
        product_variants: variantRows,
      };

      const result = toCatalogProduct(row).node;
      _productHandleCache.set(handleKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err: any) {
      logServerSyncEvent("DATABASE_ERROR", {
        operation: "fetchProductByHandle",
        productId: data.handle,
        status: "FAILED",
        error: err?.message || String(err),
      });
      console.warn("fetchProductByHandle error:", err);
      return cached?.data || null;
    }
  });

export async function fetchProductByHandle(handle: string): Promise<CatalogProductNode | null> {
  try {
    return await fetchProductByHandleServerFn({ data: { handle } });
  } catch (err) {
    console.warn("fetchProductByHandle wrapper error", err);
    return null;
  }
}

export function formatPrice(amount: string | number, currencyCode = "INR") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode || "INR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(0)}`;
  }
}
