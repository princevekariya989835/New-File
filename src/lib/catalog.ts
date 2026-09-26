import { getSql } from "@/lib/db";
import { createServerFn } from "@tanstack/react-start";
import { logServerSyncEvent } from "@/lib/server-logger";
import {
  FALLBACK_PRODUCTS,
  type ProductRow,
  type VariantRow,
  type ProductHighlightRow,
  type ProductSpecificationRow,
  type ProductOfferRow,
  type GarmentMeasurement,
  type ManufacturingInfo,
} from "./fallback-products";

export {
  FALLBACK_PRODUCTS,
  type ProductRow,
  type VariantRow,
  type ProductHighlightRow,
  type ProductSpecificationRow,
  type ProductOfferRow,
  type GarmentMeasurement,
  type ManufacturingInfo,
};

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

export interface ProductHighlight {
  id: string;
  productId: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductSpecification {
  id: string;
  productId: string;
  label: string;
  value: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductOffer {
  id: string;
  productId: string;
  title: string;
  description: string | null;
  discountType: "percentage" | "fixed_amount" | "buy_x_get_y" | "flat_price" | "coupon";
  discountValue: number;
  promoCode: string | null;
  minimumQuantity: number;
  maximumQuantity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  displayOrder: number;
  termsAndConditions: string | null;
  computedLowPrice?: number;
}

export interface CatalogProductNode {
  id: string;
  productId: string;
  title: string;
  description: string;
  detailsHtml?: string | null;
  highlights?: ProductHighlight[];
  specifications?: ProductSpecification[];
  offers?: ProductOffer[];
  features?: string[];
  careInstructions?: string[];
  manufacturingInfo?: ManufacturingInfo | null;
  sizeMeasurements?: GarmentMeasurement[];
  mrp?: number | null;
  discountAmount?: number | null;
  discountPercentage?: number | null;
  isTaxInclusive?: boolean;
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
export function toCatalogProduct(row: ProductRow, isListing = false): CatalogProduct {
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

  // Optimize images: map base64 data URLs to binary streaming endpoint /api/public/product-image
  const rawImages = row.images && row.images.length > 0 ? row.images : ["/placeholder-tee.jpg"];
  const sourceImages = isListing ? [rawImages[0]] : rawImages;
  const vHash = (row as any).updated_at ? new Date((row as any).updated_at).getTime() : 1;
  const optimizedImages = sourceImages.map((img, idx) => {
    if (typeof img === "string" && img.startsWith("data:image/")) {
      return `/api/public/product-image?id=${encodeURIComponent(row.id)}&idx=${idx}&v=${vHash}`;
    }
    return img || "/placeholder-tee.jpg";
  });

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
        image: isListing ? null : (optimizedImages[0] ? { url: optimizedImages[0], altText: row.name } : null),
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

  const rawHighlights = isListing ? [] : (row.highlights ?? []);
  const highlights: ProductHighlight[] = rawHighlights.map((h, idx) => {
    let imgUrl = h.image_url;
    if (typeof imgUrl === "string" && imgUrl.startsWith("data:image/")) {
      imgUrl = `/api/public/product-image?id=${encodeURIComponent(row.id)}&type=highlight&idx=${idx}&v=${vHash}`;
    }
    return {
      id: String(h.id),
      productId: String(h.product_id || row.id),
      imageUrl: imgUrl || "/placeholder-tee.jpg",
      title: h.title ?? null,
      description: h.description ?? null,
      displayOrder: Number(h.display_order ?? 0),
      isActive: h.is_active !== false,
    };
  });

  const rawSpecs = isListing ? [] : (row.specifications ?? []);
  const specifications: ProductSpecification[] = rawSpecs.map((s) => ({
    id: String(s.id),
    productId: String(s.product_id || row.id),
    label: String(s.label),
    value: String(s.value),
    displayOrder: Number(s.display_order ?? 0),
    isActive: s.is_active !== false,
  }));

  const sellingPrice = Number(row.price || 0);
  const mrp = Number(row.mrp || row.compare_at_price || 0) || null;
  const discountAmount = mrp && mrp > sellingPrice ? mrp - sellingPrice : null;
  const discountPercentage = mrp && mrp > sellingPrice ? Math.round((discountAmount! / mrp) * 100) : null;
  const isTaxInclusive = row.is_tax_inclusive !== false;

  const rawOffers = isListing ? [] : (row.offers ?? []);
  const offers: ProductOffer[] = rawOffers
    .filter((o) => o.is_active !== false)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((o) => {
      let computedLowPrice: number | undefined = undefined;
      if (o.discount_type === "percentage" && o.discount_value > 0) {
        computedLowPrice = Math.max(0, Math.round(sellingPrice * (1 - o.discount_value / 100)));
      } else if (o.discount_type === "fixed_amount" && o.discount_value > 0) {
        computedLowPrice = Math.max(0, sellingPrice - o.discount_value);
      } else if (o.discount_type === "buy_x_get_y" && o.minimum_quantity > 1) {
        const freeItems = Math.max(1, o.discount_value || 1);
        const paidItems = Math.max(1, o.minimum_quantity - freeItems);
        computedLowPrice = Math.round((sellingPrice * paidItems) / o.minimum_quantity);
      } else if (o.discount_type === "flat_price" && o.discount_value > 0) {
        computedLowPrice = o.discount_value;
      }

      return {
        id: String(o.id),
        productId: String(o.product_id || row.id),
        title: String(o.title),
        description: o.description ?? null,
        discountType: o.discount_type,
        discountValue: Number(o.discount_value || 0),
        promoCode: o.promo_code ?? null,
        minimumQuantity: Number(o.minimum_quantity || 1),
        maximumQuantity: o.maximum_quantity ? Number(o.maximum_quantity) : null,
        startDate: o.start_date ?? null,
        endDate: o.end_date ?? null,
        isActive: o.is_active !== false,
        displayOrder: Number(o.display_order ?? 0),
        termsAndConditions: o.terms_and_conditions ?? null,
        computedLowPrice,
      };
    });

  const features = isListing ? undefined : (Array.isArray(row.features) ? row.features.filter(Boolean) : []);
  const careInstructions = isListing ? undefined : (Array.isArray(row.care_instructions) ? row.care_instructions.filter(Boolean) : []);
  const manufacturingInfo = isListing ? undefined : (row.manufacturing_info || null);
  const sizeMeasurements = isListing ? undefined : (Array.isArray(row.size_measurements) ? row.size_measurements : []);

  return {
    node: {
      id: row.id,
      productId: row.id,
      title: row.name,
      description: isListing ? "" : (row.description ?? ""),
      detailsHtml: isListing ? null : (row.details_html ?? null),
      highlights: isListing ? undefined : highlights,
      specifications: isListing ? undefined : specifications,
      offers: isListing ? undefined : offers,
      features,
      careInstructions,
      manufacturingInfo,
      sizeMeasurements,
      mrp,
      discountAmount,
      discountPercentage,
      isTaxInclusive,
      handle: row.slug,
      tags: row.tags ?? [],
      productType: row.category ?? "",
      stock: Math.max(row.stock_quantity ?? 0, available),
      available,
      priceRange: { minVariantPrice: price },
      images: {
        edges: optimizedImages.map((url) => ({
          node: { url, altText: row.name },
        })),
      },
      variants: { edges: variants.map((node) => ({ node })) },
      options,
    },
  };
}



let _seeded = false;
let _seedPromise: Promise<void> | null = null;

// Micro-cache (60s TTL) prevents simultaneous render bursts while ensuring all edge workers read fresh DB data
const _productsCache = new Map<number, { data: CatalogProduct[]; timestamp: number }>();
const _productHandleCache = new Map<string, { data: CatalogProductNode | null; timestamp: number }>();
const CATALOG_CACHE_TTL = 60_000;

export function invalidateCatalogCache() {
  _productsCache.clear();
  _productHandleCache.clear();
  try {
    import("./product-images").then((m) => m.invalidateImageCache()).catch(() => {});
  } catch {
    /* non-fatal */
  }
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
      } catch {
        /* non-fatal */
      }

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
          } catch {
            /* non-fatal */
          }
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
      } catch {
        /* non-fatal */
      }

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

  try {
    // Ultra-fast single-roundtrip query: Correlated subquery fetches product + variants together
    const products = await sql`
      SELECT 
        p.id, p.name, p.slug, p.price, p.currency,
        CASE 
          WHEN jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0 THEN jsonb_build_array(p.images->0)
          ELSE '[]'::jsonb 
        END AS images,
        p.category, p.sizes, p.colors, p.stock_quantity, p.is_active, p.tags, p.updated_at,
        COALESCE(
          (
            SELECT jsonb_agg(jsonb_build_object(
              'id', v.id,
              'size', v.size,
              'color', v.color,
              'stock_quantity', v.stock_quantity,
              'reserved_stock', v.reserved_stock,
              'low_stock_threshold', v.low_stock_threshold
            ))
            FROM product_variants v
            WHERE v.product_id::text = p.id::text
          ),
          '[]'::jsonb
        ) AS product_variants
      FROM products p
      WHERE p.is_active = true OR p.is_active IS NULL
      ORDER BY p.name ASC, p.id ASC
      LIMIT ${first}
    `;

    if (!products || products.length === 0) {
      return [];
    }

    const rows: ProductRow[] = products.map((p: any) => ({
      id: String(p.id),
      name: p.name as string,
      slug: p.slug as string,
      description: null,
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
      updated_at: p.updated_at,
      product_variants: Array.isArray(p.product_variants)
        ? p.product_variants.map((v: any) => ({
            id: String(v.id),
            size: (v.size as string) || "",
            color: (v.color as string) || "",
            stock_quantity: Number(v.stock_quantity || 0),
            reserved_stock: Number(v.reserved_stock || 0),
            low_stock_threshold: Number(v.low_stock_threshold || 2),
          }))
        : typeof p.product_variants === "string"
          ? JSON.parse(p.product_variants)
          : [],
    }));

    return rows.map((r) => toCatalogProduct(r, true));
  } catch (err) {
    console.warn("[getPublishedProducts] Correlated query fallback using single JOIN:", err);
    // Single query using LEFT JOIN to guarantee 1 roundtrip even in fallback
    const rowsJoined = await sql`
      SELECT 
        p.id, p.name, p.slug, p.price, p.currency,
        p.images, p.category, p.sizes, p.colors, p.stock_quantity, p.is_active, p.tags, p.updated_at,
        v.id AS variant_id, v.size AS variant_size, v.color AS variant_color,
        v.stock_quantity AS variant_stock_quantity, v.reserved_stock AS variant_reserved_stock,
        v.low_stock_threshold AS variant_low_stock_threshold
      FROM (
        SELECT * FROM products
        WHERE is_active = true OR is_active IS NULL
        ORDER BY name ASC, id ASC
        LIMIT ${first}
      ) p
      LEFT JOIN product_variants v ON v.product_id::text = p.id::text
      ORDER BY p.name ASC, p.id ASC
    `;

    if (!rowsJoined || rowsJoined.length === 0) {
      return [];
    }

    const productMap = new Map<string, ProductRow>();
    for (const row of rowsJoined) {
      const pId = String(row.id);
      if (!productMap.has(pId)) {
        productMap.set(pId, {
          id: pId,
          name: row.name as string,
          slug: row.slug as string,
          description: null,
          price: Number(row.price || 0),
          currency: (row.currency as string) || "INR",
          images: Array.isArray(row.images)
            ? row.images
            : typeof row.images === "string"
              ? JSON.parse(row.images)
              : [],
          category: (row.category as string) || null,
          sizes: Array.isArray(row.sizes)
            ? row.sizes
            : typeof row.sizes === "string"
              ? JSON.parse(row.sizes)
              : [],
          colors: Array.isArray(row.colors)
            ? row.colors
            : typeof row.colors === "string"
              ? JSON.parse(row.colors)
              : [],
          stock_quantity: Number(row.stock_quantity || 0),
          is_active: Boolean(row.is_active),
          tags: Array.isArray(row.tags) ? row.tags : typeof row.tags === "string" ? JSON.parse(row.tags) : [],
          updated_at: row.updated_at,
          product_variants: [],
        });
      }

      if (row.variant_id) {
        productMap.get(pId)!.product_variants!.push({
          id: String(row.variant_id),
          size: (row.variant_size as string) || "",
          color: (row.variant_color as string) || "",
          stock_quantity: Number(row.variant_stock_quantity || 0),
          reserved_stock: Number(row.variant_reserved_stock || 0),
          low_stock_threshold: Number(row.variant_low_stock_threshold || 2),
        });
      }
    }

    return Array.from(productMap.values()).map((r) => toCatalogProduct(r, true));
  }
}

export const fetchProductsServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { first?: number }) => ({ first: Number(d.first || 50) }))
  .handler(async ({ data }): Promise<CatalogProduct[]> => {
    const first = data.first || 50;

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

      // Read directly from database - single query with correlated variants, highlights, specifications, offers
      let products: any[] = [];
      try {
        products = await sql`
          SELECT 
            p.id, p.name, p.slug, p.description, p.details_html, p.price, p.mrp, p.compare_at_price, p.is_tax_inclusive,
            p.features, p.care_instructions, p.manufacturing_info, p.size_measurements,
            p.currency, p.images, p.category, p.sizes, p.colors, p.stock_quantity, p.is_active, p.tags, p.updated_at,
            COALESCE(
              (
                SELECT jsonb_agg(jsonb_build_object(
                  'id', v.id,
                  'size', v.size,
                  'color', v.color,
                  'stock_quantity', v.stock_quantity,
                  'reserved_stock', v.reserved_stock,
                  'low_stock_threshold', v.low_stock_threshold
                ))
                FROM product_variants v
                WHERE v.product_id::text = p.id::text
              ),
              '[]'::jsonb
            ) AS product_variants,
            COALESCE(
              (
                SELECT jsonb_agg(jsonb_build_object(
                  'id', h.id,
                  'product_id', h.product_id,
                  'image_url', h.image_url,
                  'title', h.title,
                  'description', h.description,
                  'display_order', h.display_order,
                  'is_active', h.is_active
                ) ORDER BY h.display_order ASC, h.created_at ASC)
                FROM product_highlights h
                WHERE h.product_id::text = p.id::text AND (h.is_active = true OR h.is_active IS NULL)
              ),
              '[]'::jsonb
            ) AS highlights,
            COALESCE(
              (
                SELECT jsonb_agg(jsonb_build_object(
                  'id', s.id,
                  'product_id', s.product_id,
                  'label', s.label,
                  'value', s.value,
                  'display_order', s.display_order,
                  'is_active', s.is_active
                ) ORDER BY s.display_order ASC, s.created_at ASC)
                FROM product_specifications s
                WHERE s.product_id::text = p.id::text AND (s.is_active = true OR s.is_active IS NULL)
              ),
              '[]'::jsonb
            ) AS specifications,
            COALESCE(
              (
                SELECT jsonb_agg(jsonb_build_object(
                  'id', o.id,
                  'product_id', o.product_id,
                  'title', o.title,
                  'description', o.description,
                  'discount_type', o.discount_type,
                  'discount_value', o.discount_value,
                  'promo_code', o.promo_code,
                  'minimum_quantity', o.minimum_quantity,
                  'maximum_quantity', o.maximum_quantity,
                  'start_date', o.start_date,
                  'end_date', o.end_date,
                  'display_order', o.display_order,
                  'is_active', o.is_active,
                  'terms_and_conditions', o.terms_and_conditions
                ) ORDER BY o.display_order ASC, o.created_at ASC)
                FROM product_offers o
                WHERE o.product_id::text = p.id::text AND (o.is_active = true OR o.is_active IS NULL)
              ),
              '[]'::jsonb
            ) AS offers
          FROM products p
          WHERE (p.slug = ${data.handle} OR p.id::text = ${data.handle}) AND (p.is_active = true OR p.is_active IS NULL)
          LIMIT 1
        `;
      } catch (queryErr) {
        // Fallback query if new columns or tables are resolving
        products = await sql`
          SELECT 
            p.id, p.name, p.slug, p.description, p.price, p.currency, p.images, p.category, p.sizes, p.colors, p.stock_quantity, p.is_active, p.tags, p.updated_at,
            COALESCE(
              (
                SELECT jsonb_agg(jsonb_build_object(
                  'id', v.id,
                  'size', v.size,
                  'color', v.color,
                  'stock_quantity', v.stock_quantity,
                  'reserved_stock', v.reserved_stock,
                  'low_stock_threshold', v.low_stock_threshold
                ))
                FROM product_variants v
                WHERE v.product_id::text = p.id::text
              ),
              '[]'::jsonb
            ) AS product_variants
          FROM products p
          WHERE (p.slug = ${data.handle} OR p.id::text = ${data.handle}) AND (p.is_active = true OR p.is_active IS NULL)
          LIMIT 1
        `;
      }

      if (!products || products.length === 0) {
        _productHandleCache.set(handleKey, { data: null, timestamp: Date.now() });
        return null;
      }

      const p = products[0];
      const variantRows: VariantRow[] = Array.isArray(p.product_variants)
        ? p.product_variants.map((v: any) => ({
            id: String(v.id),
            size: (v.size as string) || "",
            color: (v.color as string) || "",
            stock_quantity: Number(v.stock_quantity || 0),
            reserved_stock: Number(v.reserved_stock || 0),
            low_stock_threshold: Number(v.low_stock_threshold || 2),
          }))
        : typeof p.product_variants === "string"
          ? JSON.parse(p.product_variants)
          : [];

      const highlightRows: ProductHighlightRow[] = Array.isArray(p.highlights)
        ? p.highlights.map((h: any) => ({
            id: String(h.id),
            product_id: String(h.product_id || p.id),
            image_url: String(h.image_url),
            title: h.title ?? null,
            description: h.description ?? null,
            display_order: Number(h.display_order ?? 0),
            is_active: h.is_active !== false,
          }))
        : typeof p.highlights === "string"
          ? JSON.parse(p.highlights)
          : [];

      const specRows: ProductSpecificationRow[] = Array.isArray(p.specifications)
        ? p.specifications.map((s: any) => ({
            id: String(s.id),
            product_id: String(s.product_id || p.id),
            label: String(s.label),
            value: String(s.value),
            display_order: Number(s.display_order ?? 0),
            is_active: s.is_active !== false,
          }))
        : typeof p.specifications === "string"
          ? JSON.parse(p.specifications)
          : [];

      const offerRows: ProductOfferRow[] = Array.isArray(p.offers)
        ? p.offers.map((o: any) => ({
            id: String(o.id),
            product_id: String(o.product_id || p.id),
            title: String(o.title),
            description: o.description ?? null,
            discount_type: o.discount_type,
            discount_value: Number(o.discount_value || 0),
            promo_code: o.promo_code ?? null,
            minimum_quantity: Number(o.minimum_quantity || 1),
            maximum_quantity: o.maximum_quantity ? Number(o.maximum_quantity) : null,
            start_date: o.start_date ?? null,
            end_date: o.end_date ?? null,
            is_active: o.is_active !== false,
            display_order: Number(o.display_order ?? 0),
            terms_and_conditions: o.terms_and_conditions ?? null,
          }))
        : typeof p.offers === "string"
          ? JSON.parse(p.offers)
          : [];

      const row: ProductRow = {
        id: String(p.id),
        name: p.name as string,
        slug: p.slug as string,
        description: (p.description as string) || null,
        details_html: (p.details_html as string) || null,
        price: Number(p.price || 0),
        mrp: p.mrp != null ? Number(p.mrp) : p.compare_at_price != null ? Number(p.compare_at_price) : null,
        compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
        is_tax_inclusive: p.is_tax_inclusive !== false,
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
        updated_at: p.updated_at,
        product_variants: variantRows,
        highlights: highlightRows,
        specifications: specRows,
        offers: offerRows,
        features: Array.isArray(p.features) ? p.features : typeof p.features === "string" ? JSON.parse(p.features) : [],
        care_instructions: Array.isArray(p.care_instructions) ? p.care_instructions : typeof p.care_instructions === "string" ? JSON.parse(p.care_instructions) : [],
        manufacturing_info: p.manufacturing_info ? (typeof p.manufacturing_info === "string" ? JSON.parse(p.manufacturing_info) : p.manufacturing_info) : null,
        size_measurements: Array.isArray(p.size_measurements) ? p.size_measurements : typeof p.size_measurements === "string" ? JSON.parse(p.size_measurements) : [],
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
