import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { ensureDbSchema, getSql } from "@/lib/db";
import {
  toCatalogProduct,
  invalidateCatalogCache,
  type CatalogProduct,
  type ProductRow,
} from "@/lib/catalog";
import { invalidateAdminProductsCache } from "@/lib/admin.functions";

export type FeaturedCollectionId =
  | "men_best_sellers"
  | "men_latest_edition"
  | "women_best_sellers"
  | "women_latest_edition";

export type FeaturedCollectionMeta = {
  id: FeaturedCollectionId;
  title: string;
  slug: string;
  department: "men" | "women";
  collectionType: "best_sellers" | "latest_edition";
  description: string | null;
  bannerUrl: string | null;
  isEnabled: boolean;
  displayOrder: number;
  productCount: number;
  updatedAt?: string;
};

export type FeaturedCollectionProductItem = {
  itemId: string;
  productId: string;
  displayOrder: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    mrp: number | null;
    images: string[];
    category: string | null;
    department: string | null;
    isActive: boolean;
    stockQuantity: number;
    sku?: string | null;
  };
};

export type FeaturedCollectionDetail = FeaturedCollectionMeta & {
  items: FeaturedCollectionProductItem[];
};

export type PublicFeaturedCollectionResult = {
  collection: FeaturedCollectionMeta | null;
  products: CatalogProduct[];
  total: number;
  isEnabled: boolean;
};

// In-memory cache for public featured collection queries
const _featuredCollectionCache = new Map<
  string,
  { data: PublicFeaturedCollectionResult; timestamp: number }
>();
const FEATURED_COLLECTION_CACHE_TTL = 30_000;

export function invalidateFeaturedCollectionCache() {
  _featuredCollectionCache.clear();
}

/**
 * Public Server Function to fetch a featured collection and its assigned products
 */
export const getPublicFeaturedCollection = createServerFn({ method: "POST" })
  .inputValidator(
    (d?: {
      id?: string;
      department?: "men" | "women";
      collectionType?: "best_sellers" | "latest_edition";
    }) => {
      let resolvedId: FeaturedCollectionId = "men_best_sellers";
      if (
        d?.id === "men_best_sellers" ||
        d?.id === "men_latest_edition" ||
        d?.id === "women_best_sellers" ||
        d?.id === "women_latest_edition"
      ) {
        resolvedId = d.id;
      } else if (d?.department && d?.collectionType) {
        resolvedId = `${d.department}_${d.collectionType}` as FeaturedCollectionId;
      }
      return { id: resolvedId };
    },
  )
  .handler(async ({ data }): Promise<PublicFeaturedCollectionResult> => {
    const { id } = data;
    const cacheKey = id;
    const cached = _featuredCollectionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FEATURED_COLLECTION_CACHE_TTL) {
      return cached.data;
    }

    await ensureDbSchema();
    const sql = getSql();

    try {
      // 1. Fetch collection metadata
      const colRows = await sql`
        SELECT id, title, slug, department, collection_type, description, banner_url, is_enabled, display_order, updated_at
        FROM featured_collections
        WHERE id = ${id}
        LIMIT 1
      `;

      if (!colRows || colRows.length === 0) {
        const result: PublicFeaturedCollectionResult = {
          collection: null,
          products: [],
          total: 0,
          isEnabled: false,
        };
        _featuredCollectionCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      const col = colRows[0] as any;
      const isEnabled = Boolean(col.is_enabled === 1 || col.is_enabled === true || col.is_enabled === "1");

      // 2. Fetch assigned products in exact display_order
      let productRows: any[] = [];
      try {
        productRows = await sql`
          SELECT 
            p.id, p.name, p.slug, p.description, p.price, p.mrp, p.compare_at_price,
            p.images, p.sizes, p.colors, p.color_variants, p.tags, p.stock_quantity,
            p.is_active, p.category, p.subcategory, p.collection, p.department,
            p.is_featured, p.front_showcase_image, p.back_showcase_image,
            fci.display_order
          FROM featured_collection_items fci
          JOIN products p ON fci.product_id = p.id
          WHERE fci.collection_id = ${id}
            AND (p.is_active = 1 OR p.is_active = true OR p.is_active = 'true' OR p.is_active = '1' OR p.is_active IS NULL OR LOWER(p.status) = 'active')
          ORDER BY fci.display_order ASC
        `;
      } catch {
        productRows = [];
      }

      // Populate variant stock for accurate availability
      const productIds = productRows.map((r: any) => String(r.id));
      const sizeStockByProd = new Map<string, Record<string, number>>();
      if (productIds.length > 0) {
        try {
          const variants = await sql`
            SELECT product_id, size, stock_quantity
            FROM product_variants
            WHERE product_id IN (${productIds})
          `;
          for (const v of variants) {
            const pid = String(v.product_id);
            if (!sizeStockByProd.has(pid)) sizeStockByProd.set(pid, {});
            const sz = String(v.size || "");
            if (sz) {
              sizeStockByProd.get(pid)![sz] = Number(v.stock_quantity || 0);
            }
          }
        } catch {
          /* non-fatal */
        }
      }

      const products: CatalogProduct[] = productRows.map((r: any) => {
        const prodRow: ProductRow = {
          ...r,
          size_stock: sizeStockByProd.get(String(r.id)) || undefined,
        };
        return toCatalogProduct(prodRow, true);
      });

      const meta: FeaturedCollectionMeta = {
        id: col.id as FeaturedCollectionId,
        title: String(col.title || ""),
        slug: String(col.slug || ""),
        department: (col.department as "men" | "women") || "men",
        collectionType: (col.collection_type as "best_sellers" | "latest_edition") || "best_sellers",
        description: col.description ? String(col.description) : null,
        bannerUrl: col.banner_url ? String(col.banner_url) : null,
        isEnabled,
        displayOrder: Number(col.display_order || 0),
        productCount: products.length,
        updatedAt: col.updated_at ? String(col.updated_at) : undefined,
      };

      const result: PublicFeaturedCollectionResult = {
        collection: meta,
        products,
        total: products.length,
        isEnabled,
      };

      _featuredCollectionCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.error("[getPublicFeaturedCollection] Error:", err);
      return {
        collection: null,
        products: [],
        total: 0,
        isEnabled: false,
      };
    }
  });

/**
 * Admin Server Function to list all 4 featured collections and their product counts
 */
export const adminListFeaturedCollections = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<FeaturedCollectionMeta[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    try {
      const rows = await sql`
        SELECT 
          fc.id, fc.title, fc.slug, fc.department, fc.collection_type,
          fc.description, fc.banner_url, fc.is_enabled, fc.display_order,
          fc.updated_at,
          COUNT(fci.id) as product_count
        FROM featured_collections fc
        LEFT JOIN featured_collection_items fci ON fc.id = fci.collection_id
        GROUP BY fc.id, fc.title, fc.slug, fc.department, fc.collection_type, fc.description, fc.banner_url, fc.is_enabled, fc.display_order, fc.updated_at
        ORDER BY fc.display_order ASC
      `;

      return rows.map((r: any) => ({
        id: r.id as FeaturedCollectionId,
        title: String(r.title || ""),
        slug: String(r.slug || ""),
        department: (r.department as "men" | "women") || "men",
        collectionType: (r.collection_type as "best_sellers" | "latest_edition") || "best_sellers",
        description: r.description ? String(r.description) : null,
        bannerUrl: r.banner_url ? String(r.banner_url) : null,
        isEnabled: Boolean(r.is_enabled === 1 || r.is_enabled === true || r.is_enabled === "1"),
        displayOrder: Number(r.display_order || 0),
        productCount: Number(r.product_count || 0),
        updatedAt: r.updated_at ? String(r.updated_at) : undefined,
      }));
    } catch (err) {
      console.error("[adminListFeaturedCollections] Error:", err);
      return [];
    }
  });

/**
 * Admin Server Function to get full details of a specific featured collection with assigned products
 */
export const adminGetFeaturedCollection = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => ({
    id: String(d.id) as FeaturedCollectionId,
  }))
  .handler(async ({ data, context }): Promise<FeaturedCollectionDetail> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const colRows = await sql`
      SELECT id, title, slug, department, collection_type, description, banner_url, is_enabled, display_order, updated_at
      FROM featured_collections
      WHERE id = ${data.id}
      LIMIT 1
    `;

    if (!colRows || colRows.length === 0) {
      throw new Error(`Featured collection ${data.id} not found`);
    }

    const col = colRows[0] as any;

    let itemRows: any[] = [];
    try {
      itemRows = await sql`
        SELECT 
          fci.id as item_id, fci.display_order,
          p.id, p.name, p.slug, p.price, p.mrp, p.images, p.category, p.department,
          p.is_active, p.stock_quantity, p.sku
        FROM featured_collection_items fci
        JOIN products p ON fci.product_id = p.id
        WHERE fci.collection_id = ${data.id}
        ORDER BY fci.display_order ASC
      `;
    } catch {
      itemRows = [];
    }

    const items: FeaturedCollectionProductItem[] = itemRows.map((r: any) => {
      let images: string[] = [];
      if (Array.isArray(r.images)) {
        images = r.images;
      } else if (typeof r.images === "string") {
        try {
          images = JSON.parse(r.images);
        } catch {
          images = [r.images];
        }
      }

      return {
        itemId: String(r.item_id || `fci_${r.id}`),
        productId: String(r.id),
        displayOrder: Number(r.display_order || 0),
        product: {
          id: String(r.id),
          name: String(r.name || ""),
          slug: String(r.slug || ""),
          price: Number(r.price || 0),
          mrp: r.mrp != null ? Number(r.mrp) : null,
          images: Array.isArray(images) ? images : [],
          category: r.category ? String(r.category) : null,
          department: r.department ? String(r.department) : null,
          isActive: Boolean(r.is_active === 1 || r.is_active === true || r.is_active === "1"),
          stockQuantity: Number(r.stock_quantity || 0),
          sku: r.sku ? String(r.sku) : null,
        },
      };
    });

    return {
      id: col.id as FeaturedCollectionId,
      title: String(col.title || ""),
      slug: String(col.slug || ""),
      department: (col.department as "men" | "women") || "men",
      collectionType: (col.collection_type as "best_sellers" | "latest_edition") || "best_sellers",
      description: col.description ? String(col.description) : null,
      bannerUrl: col.banner_url ? String(col.banner_url) : null,
      isEnabled: Boolean(col.is_enabled === 1 || col.is_enabled === true || col.is_enabled === "1"),
      displayOrder: Number(col.display_order || 0),
      productCount: items.length,
      updatedAt: col.updated_at ? String(col.updated_at) : undefined,
      items,
    };
  });

/**
 * Admin Server Function to save and publish a featured collection (reorder, add/remove, enable/disable)
 */
export const adminUpdateFeaturedCollection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      id: string;
      title?: string;
      description?: string;
      isEnabled?: boolean;
      productIds: string[];
    }) => ({
      id: String(d.id) as FeaturedCollectionId,
      title: d.title !== undefined ? String(d.title).trim() : undefined,
      description: d.description !== undefined ? String(d.description).trim() : undefined,
      isEnabled: d.isEnabled !== undefined ? Boolean(d.isEnabled) : undefined,
      productIds: (d.productIds || []).map(String).filter(Boolean),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    const { id, title, description, isEnabled, productIds } = data;

    // 1. Update collection metadata
    if (title !== undefined && description !== undefined && isEnabled !== undefined) {
      await sql`
        UPDATE featured_collections
        SET title = ${title},
            description = ${description},
            is_enabled = ${isEnabled ? 1 : 0},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    } else if (isEnabled !== undefined) {
      await sql`
        UPDATE featured_collections
        SET is_enabled = ${isEnabled ? 1 : 0},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    } else if (title !== undefined) {
      await sql`
        UPDATE featured_collections
        SET title = ${title},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    // 2. Replace assigned products
    // Delete existing items
    await sql`DELETE FROM featured_collection_items WHERE collection_id = ${id}`;

    // Insert new items preserving order
    for (let i = 0; i < productIds.length; i++) {
      const pid = productIds[i];
      const itemId = `fci_${id}_${pid}`;
      try {
        await sql`
          INSERT INTO featured_collection_items (id, collection_id, product_id, display_order)
          VALUES (${itemId}, ${id}, ${pid}, ${i})
        `;
      } catch (insertErr) {
        console.warn(`[adminUpdateFeaturedCollection] Item insert warn for ${pid}:`, insertErr);
      }
    }

    // 3. Invalidate caches for immediate live reflection
    invalidateFeaturedCollectionCache();
    invalidateCatalogCache();
    invalidateAdminProductsCache();

    // 4. Log audit event
    await logAudit(context as any, "featured_collection.update", "featured_collection", id, {
      productCount: productIds.length,
      isEnabled,
    });

    return { ok: true, count: productIds.length };
  });

/**
 * Admin Server Function to search and filter products to add into a collection
 */
export const adminSearchProductsForCollection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d?: {
      q?: string;
      department?: string;
      category?: string;
      excludeProductIds?: string[];
      limit?: number;
    }) => ({
      q: d?.q ? String(d.q).trim().toLowerCase() : undefined,
      department: d?.department ? String(d.department).toLowerCase() : undefined,
      category: d?.category ? String(d.category).toLowerCase() : undefined,
      excludeProductIds: (d?.excludeProductIds || []).map(String),
      limit: Math.min(100, Math.max(1, Number(d?.limit) || 40)),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    const { q, department, category, excludeProductIds, limit } = data;

    let rows: any[] = [];
    try {
      rows = await sql`
        SELECT 
          id, name, slug, price, mrp, images, category, department,
          is_active, stock_quantity, sku, tags
        FROM products
        ORDER BY updated_at DESC
        LIMIT 200
      `;
    } catch {
      rows = [];
    }

    const excludeSet = new Set(excludeProductIds);

    let filtered = rows.filter((p: any) => {
      const pid = String(p.id);
      if (excludeSet.has(pid)) return false;

      // Department filter
      if (department && department !== "all") {
        const prodDept = (p.department || "men").toLowerCase();
        if (department === "men") {
          if (prodDept !== "men" && prodDept !== "unisex") return false;
        } else if (department === "women") {
          if (prodDept !== "women" && prodDept !== "unisex") return false;
        } else if (prodDept !== department) {
          return false;
        }
      }

      // Category filter
      if (category && category !== "all") {
        const prodCat = (p.category || "").toLowerCase();
        if (!prodCat.includes(category)) return false;
      }

      // Search term filter
      if (q) {
        const name = (p.name || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        if (!name.includes(q) && !sku.includes(q) && !cat.includes(q)) return false;
      }

      return true;
    });

    return filtered.slice(0, limit).map((p: any) => {
      let images: string[] = [];
      if (Array.isArray(p.images)) {
        images = p.images;
      } else if (typeof p.images === "string") {
        try {
          images = JSON.parse(p.images);
        } catch {
          images = [p.images];
        }
      }

      return {
        id: String(p.id),
        name: String(p.name || ""),
        slug: String(p.slug || ""),
        price: Number(p.price || 0),
        mrp: p.mrp != null ? Number(p.mrp) : null,
        images: Array.isArray(images) ? images : [],
        category: p.category ? String(p.category) : null,
        department: p.department ? String(p.department) : null,
        isActive: Boolean(p.is_active === 1 || p.is_active === true || p.is_active === "1"),
        stockQuantity: Number(p.stock_quantity || 0),
        sku: p.sku ? String(p.sku) : null,
      };
    });
  });

