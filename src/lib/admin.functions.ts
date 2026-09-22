import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import {
  ARCHIVED_TAG,
  assertAdmin,
  logAudit,
  normalizeProductInput,
  slugify,
  syncProductVariants,
  type ProductInput,
} from "@/lib/admin-utils";
import { ensureDbSchema, getSql } from "@/lib/db";
import { invalidateCatalogCache } from "@/lib/catalog";
import { logServerSyncEvent } from "@/lib/server-logger";
import { removeProductFromFile } from "@/lib/fallback-products-manager.server";
import { sendOrderShipped, sendOrderDelivered, sendPaymentConfirmation } from "@/lib/email";
import {
  addInventory,
  removeInventory,
  setInventory,
  listInventoryTransactions,
  restoreOrderInventory,
  type InventoryTransactionRecord,
} from "@/lib/inventory.service";
import { resolveOrderItemImage } from "@/lib/orders.functions";

export type { ProductInput, InventoryTransactionRecord };

export type AdminProduct = {
  id: string;
  title: string;
  name: string;
  handle: string;
  status: "ACTIVE" | "DRAFT";
  totalInventory: number;
  featuredImage: string | null;
  images: string[];
  price: string;
  description: string | null;
  sizes: string[];
  colors: string[];
  tags: string[];
  category: string | null;
  sizeStock?: Record<string, number>;
};

export type AdminOrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  selected_size: string | null;
  selected_color: string | null;
  subtotal: number;
  design_submission_id: string | null;
  design_preview: string | null;
  design_preview_images: Record<string, string> | null;
};

export type AdminOrder = {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  discount_code: string | null;
  shipping_charge: number;
  tax_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_method: string;
  stock_state: string;
  shipping_name: string;
  shipping_email: string;
  shipping_phone: string | null;
  shipping_address: string;
  billing_address: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  admin_notes: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  paid_at?: string | null;
  items: AdminOrderItem[];
};

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
] as const;

export const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"] as const;

export const checkIsAdmin = createServerFn({ method: "GET" })
  .inputValidator((d?: { token?: string }) => ({
    token: typeof d?.token === "string" ? d.token : undefined,
  }))
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<boolean> => {
    return Boolean((context as any).isAdmin);
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminProduct[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    let rows: any[] = [];
    const sizeStockByProd = new Map<string, Record<string, number>>();

    try {
      rows = await sql`
        SELECT 
          p.id, p.name, p.slug, p.description, p.price, p.images, p.sizes, p.colors, p.tags, p.stock_quantity, p.is_active, p.category,
          COALESCE(
            (
              SELECT jsonb_agg(jsonb_build_object(
                'size', v.size,
                'stock_quantity', v.stock_quantity
              ))
              FROM product_variants v
              WHERE v.product_id::text = p.id::text
            ),
            '[]'::jsonb
          ) AS variants
        FROM products p
        ORDER BY p.updated_at DESC
      `;

      for (const p of rows) {
        const pId = String(p.id);
        const stockMap: Record<string, number> = {};
        const vars = Array.isArray(p.variants) ? p.variants : [];
        for (const v of vars) {
          if (v && v.size) {
            stockMap[String(v.size)] = Number(v.stock_quantity || 0);
          }
        }
        sizeStockByProd.set(pId, stockMap);
      }
    } catch {
      rows = await sql`
        SELECT id, name, slug, description, price, images, sizes, colors, tags, stock_quantity, is_active, category
        FROM products
        ORDER BY updated_at DESC
      `;
      const productIds = rows.map((p: any) => String(p.id));
      let variants: any[] = [];
      if (productIds.length > 0) {
        try {
          variants = await sql`
            SELECT product_id, size, stock_quantity
            FROM product_variants
            WHERE product_id::text = ANY(${productIds}::text[])
          `;
        } catch {
          variants = [];
        }
      }
      for (const v of variants) {
        const pid = String(v.product_id);
        if (!sizeStockByProd.has(pid)) sizeStockByProd.set(pid, {});
        const sz = String(v.size || "");
        if (sz) {
          sizeStockByProd.get(pid)![sz] = Number(v.stock_quantity || 0);
        }
      }
    }

    return rows.map((p: any) => {
      const rawImgs = Array.isArray(p.images) ? p.images : [];
      const optimizedImgs = rawImgs.map((img: string, idx: number) => {
        if (typeof img === "string" && img.startsWith("data:image/")) {
          return `/api/public/product-image?id=${encodeURIComponent(p.id)}&idx=${idx}`;
        }
        return img;
      });

      return {
        id: String(p.id),
        title: p.name,
        name: p.name,
        handle: p.slug,
        status: p.is_active ? "ACTIVE" : "DRAFT",
        totalInventory: Number(p.stock_quantity ?? 0),
        featuredImage: optimizedImgs[0] || null,
        images: optimizedImgs,
        price: String(p.price),
        description: p.description ?? null,
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
        colors: Array.isArray(p.colors) ? p.colors : [],
        tags: Array.isArray(p.tags) ? p.tags : [],
        category: p.category ?? null,
        sizeStock: sizeStockByProd.get(String(p.id)) || {},
      };
    });
  });

export const adminAddInventory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { productId: string; quantity: number; reason?: string }) => ({
    productId: String(d.productId),
    quantity: Math.max(1, Math.round(Number(d.quantity) || 1)),
    reason: d.reason ? String(d.reason).slice(0, 120) : "Admin manual add",
  }))
  .handler(async ({ data, context }) => {
    const res = await addInventory(context as any, {
      productId: data.productId,
      quantity: data.quantity,
      reason: data.reason,
    });
    invalidateCatalogCache();
    return res;
  });

export const adminRemoveInventory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { productId: string; quantity: number; reason?: string }) => ({
    productId: String(d.productId),
    quantity: Math.max(1, Math.round(Number(d.quantity) || 1)),
    reason: d.reason ? String(d.reason).slice(0, 120) : "Admin manual remove",
  }))
  .handler(async ({ data, context }) => {
    const res = await removeInventory(context as any, {
      productId: data.productId,
      quantity: data.quantity,
      reason: data.reason,
    });
    invalidateCatalogCache();
    return res;
  });

export const adminSetInventory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { productId: string; quantity: number; reason?: string }) => ({
    productId: String(d.productId),
    quantity: Math.max(0, Math.round(Number(d.quantity) || 0)),
    reason: d.reason ? String(d.reason).slice(0, 120) : "Admin manual set",
  }))
  .handler(async ({ data, context }) => {
    const res = await setInventory(context as any, {
      productId: data.productId,
      quantity: data.quantity,
      reason: data.reason,
    });
    invalidateCatalogCache();
    return res;
  });

function unwrapInput(d: any) {
  let target = d;
  while (target && typeof target === "object" && "data" in target) {
    target = target.data;
  }
  return target;
}

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: any) => {
    const raw = unwrapInput(d);
    const productId = raw?.productId ?? raw?.id ?? raw?.product_id ?? raw;
    return {
      productId: String(productId ?? "").trim(),
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; archived: boolean }> => {
    await assertAdmin(context as any);
    const sql = getSql();
    if (!data.productId) {
      throw new Error("Missing product ID");
    }

    try {
      await sql`
        UPDATE order_items
        SET product_id = NULL, variant_id = NULL
        WHERE product_id::text = ${data.productId}
           OR variant_id::text IN (SELECT id::text FROM product_variants WHERE product_id::text = ${data.productId})
      `;
    } catch {
      await sql`UPDATE order_items SET product_id = NULL WHERE product_id::text = ${data.productId}`;
    }

    await sql`DELETE FROM product_variants WHERE product_id::text = ${data.productId}`;
    await sql`DELETE FROM product_images WHERE product_id::text = ${data.productId}`;
    await sql`DELETE FROM favorites WHERE product_handle::text = ${data.productId} OR product_handle::text IN (SELECT slug FROM products WHERE id::text = ${data.productId})`;
    await sql`DELETE FROM reviews WHERE product_id::text = ${data.productId}`;
    await sql`DELETE FROM inventory_transactions WHERE product_id::text = ${data.productId}`;

    try {
      await sql`DELETE FROM products WHERE id::text = ${data.productId} OR slug::text = ${data.productId}`;
    } catch (delErr: any) {
      logServerSyncEvent("DATABASE_ERROR", {
        operation: "adminDeleteProduct",
        productId: data.productId,
        status: "FAILED",
        error: delErr?.message || String(delErr),
      });
      throw new Error(`Database deletion failed: ${delErr?.message || String(delErr)}`);
    }

    // 1. Permanently remove from fallback source file (src/lib/fallback-products.ts) on disk & memory
    await removeProductFromFile(data.productId);

    // 2. Persist deletion in store_settings tombstones and update catalog timestamp
    try {
      await sql`
        UPDATE store_settings
        SET updated_at = NOW(),
            deleted_product_ids = (
              CASE 
                WHEN deleted_product_ids IS NULL THEN ${JSON.stringify([data.productId])}::jsonb
                ELSE deleted_product_ids || ${JSON.stringify([data.productId])}::jsonb
              END
            )
        WHERE id = 'default'
      `;
    } catch {}

    invalidateCatalogCache();

    try {
      // Clean up featured products reference in website configs
      const configs = await sql`SELECT id, config FROM website_published UNION ALL SELECT id, config FROM website_draft`;
      for (const row of configs ?? []) {
        if (row?.config && typeof row.config === "object") {
          const cfg = row.config;
          if (Array.isArray(cfg?.featuredProducts?.productIds)) {
            const before = cfg.featuredProducts.productIds.length;
            cfg.featuredProducts.productIds = cfg.featuredProducts.productIds.filter(
              (pId: string) => pId !== data.productId && !pId.includes(data.productId),
            );
            if (cfg.featuredProducts.productIds.length !== before) {
              if (row.id === "live") {
                await sql`UPDATE website_published SET config = ${JSON.stringify(cfg)}::jsonb WHERE id = 'live'`;
              } else if (row.id === "current") {
                await sql`UPDATE website_draft SET config = ${JSON.stringify(cfg)}::jsonb WHERE id = 'current'`;
              }
            }
          }
        }
      }
    } catch {
      // ignore non-fatal website config cleanup
    }

    await logAudit(context as any, "product.delete", "product", data.productId, {
      id: data.productId,
    });

    logServerSyncEvent("PRODUCT_DELETE", {
      operation: "adminDeleteProduct",
      productId: data.productId,
      status: "SUCCESS",
    });

    return { ok: true, archived: false };
  });

export const adminSetProductStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: any) => {
    const raw = unwrapInput(d);
    const productId = raw?.productId ?? raw?.id ?? raw?.product_id ?? "";
    const status = raw?.status === "ACTIVE" ? "ACTIVE" : "DRAFT";
    return {
      productId: String(productId ?? "").trim(),
      status: status as "ACTIVE" | "DRAFT",
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();

    try {
      const updated = await sql`
        UPDATE products SET is_active = ${data.status === "ACTIVE"}, updated_at = NOW()
        WHERE id::text = ${data.productId} OR slug::text = ${data.productId}
        RETURNING id, name, slug, is_active
      `;

      if (!updated || updated.length === 0) {
        throw new Error(`Product not found with ID ${data.productId}`);
      }

      try {
        await sql`UPDATE store_settings SET updated_at = NOW() WHERE id = 'default'`;
      } catch {}

      invalidateCatalogCache();

      logServerSyncEvent("PRODUCT_PUBLISH", {
        operation: data.status === "ACTIVE" ? "publishProduct" : "unpublishProduct",
        productId: data.productId,
        status: "SUCCESS",
        details: { status: data.status, updatedId: updated[0].id },
      });

      return { ok: true, product: updated[0] };
    } catch (err: any) {
      logServerSyncEvent("DATABASE_ERROR", {
        operation: "adminSetProductStatus",
        productId: data.productId,
        status: "FAILED",
        error: err?.message || String(err),
      });
      throw new Error(`Status update failed: ${err?.message || String(err)}`);
    }
  });

export const adminCreateProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: any) => unwrapInput(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const values = normalizeProductInput(data);
    const sql = getSql();
    const productId = `prod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const base = slugify(values.name) || "product";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const doInsert = async () => {
      try {
        await sql`
          INSERT INTO products (
            id, name, slug, description, price, base_price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
          ) VALUES (
            ${productId}, ${values.name}, ${slug}, ${values.description}, ${values.price}, ${values.price}, 'INR',
            ${JSON.stringify(values.images)}::jsonb, ${values.category}, ${JSON.stringify(values.sizes)}::jsonb,
            ${JSON.stringify(values.colors)}::jsonb, ${values.stock_quantity}, ${values.is_active}, ${JSON.stringify(values.tags)}::jsonb
          );
        `;
      } catch (colErr: any) {
        const msg = String(colErr?.message || "").toLowerCase();
        if (msg.includes("base_price") && msg.includes("does not exist")) {
          await sql`
            INSERT INTO products (
              id, name, slug, description, price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
            ) VALUES (
              ${productId}, ${values.name}, ${slug}, ${values.description}, ${values.price}, 'INR',
              ${JSON.stringify(values.images)}::jsonb, ${values.category}, ${JSON.stringify(values.sizes)}::jsonb,
              ${JSON.stringify(values.colors)}::jsonb, ${values.stock_quantity}, ${values.is_active}, ${JSON.stringify(values.tags)}::jsonb
            );
          `;
        } else {
          throw colErr;
        }
      }
    };

    try {
      await doInsert();
    } catch (insertErr: any) {
      // Auto-heal schema if id, base_price, or other constraints conflict
      try {
        await sql`
          DO $$
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
          END $$;
        `;
        await sql`ALTER TABLE products ALTER COLUMN id TYPE TEXT USING id::text`;
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0`;
        await sql`ALTER TABLE products ALTER COLUMN base_price DROP NOT NULL`;
        await sql`ALTER TABLE products ALTER COLUMN base_price SET DEFAULT 0`;
        await sql`ALTER TABLE products ALTER COLUMN price DROP NOT NULL`;
        await sql`ALTER TABLE product_variants ALTER COLUMN product_id TYPE TEXT USING product_id::text`;
        await sql`ALTER TABLE product_variants ALTER COLUMN id TYPE TEXT USING id::text`;
        await doInsert();
      } catch {
        throw insertErr;
      }
    }

    await syncProductVariants(
      context as any,
      productId,
      values.sizes,
      values.colors,
      values.stock_quantity,
      values.sizeStock,
    );

    try {
      const sql = getSql();
      await sql`UPDATE store_settings SET updated_at = NOW() WHERE id = 'default'`;
    } catch {}

    await logAudit(context as any, "product.create", "product", productId, {
      name: values.name,
      stock: values.stock_quantity,
    });
    invalidateCatalogCache();

    logServerSyncEvent("PRODUCT_CREATE", {
      operation: "adminCreateProduct",
      productId,
      status: "SUCCESS",
      details: { name: values.name, stock: values.stock_quantity, price: values.price },
    });

    return { ok: true, productId };
  });

export const adminUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: any) => unwrapInput(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    if (!data.productId) throw new Error("Invalid product data: missing product id");
    const values = normalizeProductInput(data);
    const sql = getSql();

    let updatedRows: any[] = [];
    try {
      updatedRows = await sql`
        UPDATE products SET
          name = ${values.name},
          description = ${values.description},
          price = ${values.price},
          base_price = ${values.price},
          images = ${JSON.stringify(values.images)}::jsonb,
          category = ${values.category},
          sizes = ${JSON.stringify(values.sizes)}::jsonb,
          colors = ${JSON.stringify(values.colors)}::jsonb,
          stock_quantity = ${values.stock_quantity},
          is_active = ${values.is_active},
          tags = ${JSON.stringify(values.tags)}::jsonb,
          updated_at = NOW()
        WHERE id::text = ${data.productId} OR slug::text = ${data.productId}
        RETURNING id, name, slug, price, stock_quantity, is_active
      `;
    } catch (updateErr: any) {
      const msg = String(updateErr?.message || "").toLowerCase();
      if (msg.includes("base_price") && msg.includes("does not exist")) {
        updatedRows = await sql`
          UPDATE products SET
            name = ${values.name},
            description = ${values.description},
            price = ${values.price},
            images = ${JSON.stringify(values.images)}::jsonb,
            category = ${values.category},
            sizes = ${JSON.stringify(values.sizes)}::jsonb,
            colors = ${JSON.stringify(values.colors)}::jsonb,
            stock_quantity = ${values.stock_quantity},
            is_active = ${values.is_active},
            tags = ${JSON.stringify(values.tags)}::jsonb,
            updated_at = NOW()
          WHERE id::text = ${data.productId} OR slug::text = ${data.productId}
          RETURNING id, name, slug, price, stock_quantity, is_active
        `;
      } else {
        logServerSyncEvent("DATABASE_ERROR", {
          operation: "adminUpdateProduct",
          productId: data.productId,
          status: "FAILED",
          error: updateErr?.message || String(updateErr),
        });
        throw new Error(`Product update failed: ${updateErr?.message || String(updateErr)}`);
      }
    }

    if (!updatedRows || updatedRows.length === 0) {
      logServerSyncEvent("DATABASE_ERROR", {
        operation: "adminUpdateProduct",
        productId: data.productId,
        status: "FAILED",
        error: "No product matched the specified ID or slug",
      });
      throw new Error(`Product update failed: No product found with ID "${data.productId}".`);
    }

    const canonicalId = String(updatedRows[0].id);

    await syncProductVariants(
      context as any,
      canonicalId,
      values.sizes,
      values.colors,
      values.stock_quantity,
      values.sizeStock,
    );

    try {
      await sql`UPDATE store_settings SET updated_at = NOW() WHERE id = 'default'`;
    } catch {}

    await logAudit(context as any, "product.update", "product", canonicalId, {
      name: values.name,
      stock: values.stock_quantity,
    });
    invalidateCatalogCache();

    logServerSyncEvent("PRODUCT_UPDATE", {
      operation: "adminUpdateProduct",
      productId: canonicalId,
      status: "SUCCESS",
      details: { name: values.name, price: values.price, stock: values.stock_quantity, is_active: values.is_active },
    });

    return { ok: true, product: updatedRows[0] };
  });

export type AdminVariant = {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  is_active: boolean;
  size: string;
  color: string;
  sku: string;
  stock_quantity: number;
  reserved_stock: number;
  low_stock_threshold: number;
};

export const adminListVariants = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminVariant[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT 
        v.id, v.product_id, v.size, v.color, v.sku, v.stock_quantity, v.reserved_stock, v.low_stock_threshold,
        p.name as product_name, p.images as product_images, p.is_active
      FROM product_variants v
      LEFT JOIN products p ON v.product_id::text = p.id::text
      ORDER BY v.created_at ASC
    `;

    return rows.map((v: any) => {
      const images = Array.isArray(v.product_images)
        ? v.product_images
        : typeof v.product_images === "string"
          ? JSON.parse(v.product_images)
          : [];
      return {
        id: String(v.id),
        product_id: String(v.product_id),
        product_name: v.product_name ?? "Product",
        product_image: images[0] ?? null,
        is_active: Boolean(v.is_active),
        size: v.size ?? "",
        color: v.color ?? "",
        sku: v.sku ?? v.id,
        stock_quantity: Number(v.stock_quantity ?? 0),
        reserved_stock: Number(v.reserved_stock ?? 0),
        low_stock_threshold: Number(v.low_stock_threshold ?? 5),
      };
    });
  });

export const adminAddVariantInventory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { variantId: string; quantity: number; reason?: string }) => ({
    variantId: String(d.variantId),
    quantity: Math.max(1, Math.round(Number(d.quantity) || 1)),
    reason: d.reason ? String(d.reason).slice(0, 120) : "Admin manual add",
  }))
  .handler(async ({ data, context }) => {
    try {
      const res = await addInventory(context as any, {
        variantId: data.variantId,
        quantity: data.quantity,
        reason: data.reason,
      });
      try {
        const sql = getSql();
        await sql`UPDATE store_settings SET updated_at = NOW() WHERE id = 'default'`;
      } catch {}
      invalidateCatalogCache();
      logServerSyncEvent("INVENTORY_UPDATE", {
        operation: "adminAddVariantInventory",
        variantId: data.variantId,
        productId: res.productId,
        status: "SUCCESS",
        details: { quantityAdded: data.quantity, newTotal: res.current },
      });
      return res;
    } catch (err: any) {
      logServerSyncEvent("DATABASE_ERROR", {
        operation: "adminAddVariantInventory",
        variantId: data.variantId,
        status: "FAILED",
        error: err?.message || String(err),
      });
      throw err;
    }
  });

export const adminRemoveVariantInventory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { variantId: string; quantity: number; reason?: string }) => ({
    variantId: String(d.variantId),
    quantity: Math.max(1, Math.round(Number(d.quantity) || 1)),
    reason: d.reason ? String(d.reason).slice(0, 120) : "Admin manual remove",
  }))
  .handler(async ({ data, context }) => {
    try {
      const res = await removeInventory(context as any, {
        variantId: data.variantId,
        quantity: data.quantity,
        reason: data.reason,
      });
      try {
        const sql = getSql();
        await sql`UPDATE store_settings SET updated_at = NOW() WHERE id = 'default'`;
      } catch {}
      invalidateCatalogCache();
      logServerSyncEvent("INVENTORY_UPDATE", {
        operation: "adminRemoveVariantInventory",
        variantId: data.variantId,
        productId: res.productId,
        status: "SUCCESS",
        details: { quantityRemoved: data.quantity, newTotal: res.current },
      });
      return res;
    } catch (err: any) {
      logServerSyncEvent("DATABASE_ERROR", {
        operation: "adminRemoveVariantInventory",
        variantId: data.variantId,
        status: "FAILED",
        error: err?.message || String(err),
      });
      throw err;
    }
  });

export const adminSetVariantInventory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { variantId: string; quantity: number; reason?: string }) => ({
    variantId: String(d.variantId),
    quantity: Math.max(0, Math.round(Number(d.quantity) || 0)),
    reason: d.reason ? String(d.reason).slice(0, 120) : "Admin manual set",
  }))
  .handler(async ({ data, context }) => {
    try {
      const res = await setInventory(context as any, {
        variantId: data.variantId,
        quantity: data.quantity,
        reason: data.reason,
      });
      try {
        const sql = getSql();
        await sql`UPDATE store_settings SET updated_at = NOW() WHERE id = 'default'`;
      } catch {}
      invalidateCatalogCache();
      logServerSyncEvent("INVENTORY_UPDATE", {
        operation: "adminSetVariantInventory",
        variantId: data.variantId,
        productId: res.productId,
        status: "SUCCESS",
        details: { quantitySet: data.quantity, newTotal: res.current },
      });
      return res;
    } catch (err: any) {
      logServerSyncEvent("DATABASE_ERROR", {
        operation: "adminSetVariantInventory",
        variantId: data.variantId,
        status: "FAILED",
        error: err?.message || String(err),
      });
      throw err;
    }
  });

export type AdminListOrdersInput = {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
};

export type AdminListOrdersResult = {
  orders: AdminOrder[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  totalRevenue: number;
};

export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d?: Partial<AdminListOrdersInput>) => ({
    page: Math.max(1, Number(d?.page || 1)),
    limit: Math.min(100, Math.max(1, Number(d?.limit || 25))),
    q: typeof d?.q === "string" ? d.q.trim() : "",
    status: typeof d?.status === "string" ? d.status.trim() : "",
    paymentStatus: typeof d?.paymentStatus === "string" ? d.paymentStatus.trim() : "",
    from: typeof d?.from === "string" ? d.from.trim() : "",
    to: typeof d?.to === "string" ? d.to.trim() : "",
  }))
  .handler(async ({ data, context }): Promise<AdminListOrdersResult> => {
    try {
      await assertAdmin(context as any);
      await ensureDbSchema();
      const sql = getSql();

      const page = data.page;
      const limit = data.limit;
      const offset = (page - 1) * limit;

      const qFilter = data.q ? `%${data.q.toLowerCase()}%` : null;
      const fromDate = data.from ? new Date(data.from).toISOString() : null;
      const toDate = data.to ? new Date(new Date(data.to).getTime() + 86400000).toISOString() : null;

      let orders: any[] = [];
      let totalCount = 0;
      let totalRevenue = 0;

      try {
        const [ordersRes, aggregatesRes] = await Promise.all([
          sql`
            SELECT id, order_number, created_at, total_amount, subtotal, discount_amount, discount_code,
              shipping_charge, tax_amount, currency, status, payment_status, payment_method, stock_state,
              shipping_name, shipping_email, shipping_phone, shipping_address, billing_address,
              courier_name, tracking_number, tracking_url, shipped_at, delivered_at, cancelled_at, admin_notes,
              razorpay_order_id, razorpay_payment_id, paid_at
            FROM orders
            WHERE (${data.status}::text = '' OR status = ${data.status})
              AND (${data.paymentStatus}::text = '' OR payment_status = ${data.paymentStatus})
              AND (${fromDate}::timestamp with time zone IS NULL OR created_at >= ${fromDate}::timestamp with time zone)
              AND (${toDate}::timestamp with time zone IS NULL OR created_at <= ${toDate}::timestamp with time zone)
              AND (
                ${qFilter}::text IS NULL OR
                LOWER(order_number) LIKE ${qFilter} OR
                LOWER(shipping_name) LIKE ${qFilter} OR
                LOWER(shipping_email) LIKE ${qFilter} OR
                LOWER(shipping_phone) LIKE ${qFilter} OR
                LOWER(COALESCE(tracking_number, '')) LIKE ${qFilter}
              )
            ORDER BY created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          `,
          sql`
            SELECT
              COUNT(*)::int as total_count,
              COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled', 'Returned', 'Refunded') THEN total_amount ELSE 0 END), 0)::numeric as net_revenue
            FROM orders
            WHERE (${data.status}::text = '' OR status = ${data.status})
              AND (${data.paymentStatus}::text = '' OR payment_status = ${data.paymentStatus})
              AND (${fromDate}::timestamp with time zone IS NULL OR created_at >= ${fromDate}::timestamp with time zone)
              AND (${toDate}::timestamp with time zone IS NULL OR created_at <= ${toDate}::timestamp with time zone)
              AND (
                ${qFilter}::text IS NULL OR
                LOWER(order_number) LIKE ${qFilter} OR
                LOWER(shipping_name) LIKE ${qFilter} OR
                LOWER(shipping_email) LIKE ${qFilter} OR
                LOWER(shipping_phone) LIKE ${qFilter} OR
                LOWER(COALESCE(tracking_number, '')) LIKE ${qFilter}
              )
          `,
        ]);

        orders = ordersRes;
        if (aggregatesRes && aggregatesRes[0]) {
          totalCount = Number(aggregatesRes[0].total_count || 0);
          totalRevenue = Number(aggregatesRes[0].net_revenue || 0);
        }
      } catch (orderErr: any) {
        console.warn("[Admin] Primary orders query warning, falling back to base select:", orderErr?.message);
        try {
          orders = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
          totalCount = orders.length;
        } catch (fbErr) {
          console.error("[Admin] Critical orders query error:", fbErr);
          return { orders: [], totalCount: 0, page: 1, limit, totalPages: 0, totalRevenue: 0 };
        }
      }

      if (orders.length === 0) {
        return { orders: [], totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) || 1, totalRevenue };
      }

      const orderIds = orders.map((o) => String(o.id));

      // Fetch line items ONLY for current page orders. Exclude heavy base64 preview_data_url from initial list!
      let items: any[] = [];
      try {
        items = await sql`
          SELECT i.id, i.order_id, i.product_id, i.product_name, i.product_image, i.quantity, i.price,
            i.selected_size, i.selected_color, i.subtotal, i.design_submission_id,
            p.images as product_images_json
          FROM order_items i
          LEFT JOIN products p ON i.product_id::text = p.id::text
          WHERE i.order_id::text = ANY(${orderIds}::text[])
        `;
      } catch (itemErr: any) {
        console.warn("[Admin] Extended order_items query warning, using direct query:", itemErr?.message);
        try {
          items = await sql`
            SELECT * FROM order_items
            WHERE order_id::text = ANY(${orderIds}::text[])
          `;
        } catch (itemFbErr) {
          console.warn("[Admin] Fallback order_items query failed:", itemFbErr);
          items = [];
        }
      }

      const itemsByOrderId = new Map<string, AdminOrderItem[]>();
      for (const item of items) {
        const oId = String(item.order_id);
        if (!itemsByOrderId.has(oId)) itemsByOrderId.set(oId, []);

        const resolvedImg = resolveOrderItemImage({
          orderProductImage: item.product_image,
          productImagesJson: item.product_images_json,
          productId: item.product_id,
        });

        itemsByOrderId.get(oId)!.push({
          id: String(item.id),
          product_id: item.product_id ? String(item.product_id) : null,
          product_name: (item.product_name as string) || "Item",
          product_image: resolvedImg,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          selected_size: (item.selected_size as string) || null,
          selected_color: (item.selected_color as string) || null,
          subtotal: Number(item.subtotal || 0),
          design_submission_id: (item.design_submission_id as string) || null,
          design_preview: null, // loaded on demand when expanded
          design_preview_images: null,
        });
      }

      const mappedOrders: AdminOrder[] = orders.map((o: any) => ({
        id: String(o.id),
        order_number: o.order_number,
        created_at: new Date(o.created_at).toISOString(),
        total_amount: Number(o.total_amount || 0),
        subtotal: Number(o.subtotal || 0),
        discount_amount: Number(o.discount_amount || 0),
        discount_code: o.discount_code || null,
        shipping_charge: Number(o.shipping_charge || 0),
        tax_amount: Number(o.tax_amount || 0),
        currency: o.currency || "INR",
        status: o.status || "Pending",
        payment_status: o.payment_status || "Pending",
        payment_method: o.payment_method || "COD",
        stock_state: o.stock_state || "Normal",
        shipping_name: o.shipping_name || "",
        shipping_email: o.shipping_email || "",
        shipping_phone: o.shipping_phone || null,
        shipping_address: o.shipping_address || "",
        billing_address: o.billing_address || null,
        courier_name: o.courier_name || null,
        tracking_number: o.tracking_number || null,
        tracking_url: o.tracking_url || null,
        shipped_at: o.shipped_at ? new Date(o.shipped_at).toISOString() : null,
        delivered_at: o.delivered_at ? new Date(o.delivered_at).toISOString() : null,
        cancelled_at: o.cancelled_at ? new Date(o.cancelled_at).toISOString() : null,
        admin_notes: o.admin_notes || null,
        razorpay_order_id: o.razorpay_order_id || null,
        razorpay_payment_id: o.razorpay_payment_id || null,
        paid_at: o.paid_at ? new Date(o.paid_at).toISOString() : null,
        items: itemsByOrderId.get(String(o.id)) || [],
      }));

      return {
        orders: mappedOrders,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalRevenue,
      };
    } catch (err: any) {
      console.error("[Admin] adminListOrders error:", err);
      throw new Error(err?.message || "Failed to load orders from database");
    }
  });

export const adminGetOrderDesignPreview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: String(d.orderId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const previews = await sql`
      SELECT i.id as item_id, i.design_submission_id,
        d.preview_data_url as design_preview,
        d.preview_images as design_preview_images
      FROM order_items i
      JOIN design_submissions d ON i.design_submission_id::text = d.id::text
      WHERE i.order_id::text = ${data.orderId}
    `;

    const result: Record<
      string,
      { designPreview: string | null; designPreviewImages: Record<string, string> | null }
    > = {};

    for (const r of previews as any[]) {
      let parsedPreviewImages: Record<string, string> | null = null;
      if (r.design_preview_images) {
        if (typeof r.design_preview_images === "object") {
          parsedPreviewImages = r.design_preview_images;
        } else if (typeof r.design_preview_images === "string") {
          try {
            parsedPreviewImages = JSON.parse(r.design_preview_images);
          } catch {
            parsedPreviewImages = null;
          }
        }
      }
      result[String(r.item_id)] = {
        designPreview: r.design_preview || null,
        designPreviewImages: parsedPreviewImages,
      };
    }

    return { orderId: data.orderId, previews: result };
  });

export const adminExportOrdersCsv = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d?: { q?: string; status?: string; paymentStatus?: string; from?: string; to?: string }) => ({
      q: d?.q ? String(d.q).trim() : "",
      status: d?.status ? String(d.status).trim() : "",
      paymentStatus: d?.paymentStatus ? String(d.paymentStatus).trim() : "",
      from: d?.from ? String(d.from).trim() : "",
      to: d?.to ? String(d.to).trim() : "",
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const qFilter = data.q ? `%${data.q.toLowerCase()}%` : null;
    const fromDate = data.from ? new Date(data.from).toISOString() : null;
    const toDate = data.to ? new Date(new Date(data.to).getTime() + 86400000).toISOString() : null;

    const rows = await sql`
      SELECT order_number, created_at, shipping_name, shipping_email, shipping_phone,
        status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id,
        total_amount, courier_name, tracking_number, shipping_address
      FROM orders
      WHERE (${data.status}::text = '' OR status = ${data.status})
        AND (${data.paymentStatus}::text = '' OR payment_status = ${data.paymentStatus})
        AND (${fromDate}::timestamp with time zone IS NULL OR created_at >= ${fromDate}::timestamp with time zone)
        AND (${toDate}::timestamp with time zone IS NULL OR created_at <= ${toDate}::timestamp with time zone)
        AND (
          ${qFilter}::text IS NULL OR
          LOWER(order_number) LIKE ${qFilter} OR
          LOWER(shipping_name) LIKE ${qFilter} OR
          LOWER(shipping_email) LIKE ${qFilter} OR
          LOWER(shipping_phone) LIKE ${qFilter} OR
          LOWER(COALESCE(tracking_number, '')) LIKE ${qFilter}
        )
      ORDER BY created_at DESC
      LIMIT 5000
    `;

    const head = [
      "Order",
      "Date",
      "Customer",
      "Email",
      "Phone",
      "Status",
      "Payment",
      "Method",
      "Razorpay Order ID",
      "Razorpay Payment ID",
      "Total",
      "Courier",
      "Tracking",
      "Address",
    ];

    const lines = (rows as any[]).map((o) => [
      o.order_number,
      new Date(o.created_at).toISOString(),
      o.shipping_name,
      o.shipping_email,
      o.shipping_phone ?? "",
      o.status,
      o.payment_status,
      o.payment_method,
      o.razorpay_order_id ?? "",
      o.razorpay_payment_id ?? "",
      String(o.total_amount),
      o.courier_name ?? "",
      o.tracking_number ?? "",
      (o.shipping_address || "").replace(/\n/g, " "),
    ]);

    const csv = [head, ...lines]
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? "");
            const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
            return `"${safe.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");

    return { csv, rowCount: rows.length };
  });

export type OrderPatchInput = {
  orderId: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  adminNotes?: string | null;
};

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: OrderPatchInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const authCtx = context as any;

    if (data.status) {
      if (data.status === "Cancelled" || data.status === "Returned" || data.status === "Refunded") {
        await restoreOrderInventory(
          data.orderId,
          `Admin set status to ${data.status}`,
          authCtx.userId,
        );
        if (data.status === "Returned") {
          await sql`UPDATE orders SET status = 'Returned', updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
        } else if (data.status === "Refunded") {
          await sql`UPDATE orders SET status = 'Refunded', payment_status = 'Refunded', updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
        } else if (data.status === "Cancelled") {
          await sql`UPDATE orders SET status = 'Cancelled', cancelled_at = COALESCE(cancelled_at, NOW()), updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
        }
      } else if (data.status === "Shipped") {
        await sql`UPDATE orders SET status = 'Shipped', shipped_at = COALESCE(shipped_at, NOW()), updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
      } else if (data.status === "Delivered") {
        await sql`UPDATE orders SET status = 'Delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
      } else {
        await sql`UPDATE orders SET status = ${data.status}, updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
      }
    }
    if (data.paymentStatus) {
      await sql`UPDATE orders SET payment_status = ${data.paymentStatus}, updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
    }
    if (data.courierName !== undefined) {
      await sql`UPDATE orders SET courier_name = ${data.courierName}, updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
    }
    if (data.trackingNumber !== undefined) {
      await sql`UPDATE orders SET tracking_number = ${data.trackingNumber}, updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
    }
    if (data.trackingUrl !== undefined) {
      await sql`UPDATE orders SET tracking_url = ${data.trackingUrl}, updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
    }
    if (data.adminNotes !== undefined) {
      await sql`UPDATE orders SET admin_notes = ${data.adminNotes}, updated_at = NOW() WHERE id::text = ${String(data.orderId)}`;
    }

    await logAudit(context as any, "order.update", "order", data.orderId, { status: data.status });

    // Fire transactional emails on key status transitions (fire and forget, idempotent)
    if (data.status === "Shipped" || data.status === "Delivered" || data.paymentStatus === "Paid") {
      try {
        const orderRow = await sql`
          SELECT id, order_number, shipping_email, shipping_name, user_id,
                 courier_name, tracking_number, tracking_url, total_amount, currency, payment_method
          FROM orders WHERE id::text = ${String(data.orderId)} LIMIT 1
        `;
        if (orderRow.length > 0) {
          const o = orderRow[0] as any;
          const baseOpts = {
            to: String(o.shipping_email || ""),
            orderNumber: String(o.order_number || ""),
            orderId: String(o.id || ""),
            customerName: String(o.shipping_name || "Customer"),
            userId: o.user_id ? String(o.user_id) : null,
          };
          if (data.status === "Shipped") {
            sendOrderShipped({
              ...baseOpts,
              courierName: data.courierName ?? (o.courier_name || null),
              trackingNumber: data.trackingNumber ?? (o.tracking_number || null),
              trackingUrl: data.trackingUrl ?? (o.tracking_url || null),
            }).catch((e) => console.warn("[Admin] Shipped email failed:", e));
          } else if (data.status === "Delivered") {
            sendOrderDelivered(baseOpts).catch((e) =>
              console.warn("[Admin] Delivered email failed:", e),
            );
          } else if (data.paymentStatus === "Paid") {
            sendPaymentConfirmation({
              ...baseOpts,
              total: Number(o.total_amount || 0).toLocaleString("en-IN"),
              currency: "₹",
              paymentMethod: String(o.payment_method || "COD"),
              transactionId: null,
            }).catch((e) => console.warn("[Admin] Payment confirmation email failed:", e));
          }
        }
      } catch (emailErr) {
        console.warn("[Admin] Email dispatch lookup failed (non-fatal):", emailErr);
      }
    }

    return { ok: true };
  });

export const adminBulkUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { orderIds: string[]; status: string }) => ({
    orderIds: (d.orderIds ?? []).map(String).slice(0, 200),
    status: String(d.status),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const authCtx = context as any;
    if (!data.orderIds.length) return { ok: true, updated: 0 };

    if (data.status === "Cancelled" || data.status === "Returned" || data.status === "Refunded") {
      for (const orderId of data.orderIds) {
        await restoreOrderInventory(
          orderId,
          `Admin bulk ${data.status.toLowerCase()}`,
          authCtx.userId,
        );
      }
      for (const orderId of data.orderIds) {
        if (data.status === "Returned") {
          await sql`UPDATE orders SET status = 'Returned', updated_at = NOW() WHERE id::text = ${orderId}`;
        } else if (data.status === "Refunded") {
          await sql`UPDATE orders SET status = 'Refunded', payment_status = 'Refunded', updated_at = NOW() WHERE id::text = ${orderId}`;
        } else if (data.status === "Cancelled") {
          await sql`UPDATE orders SET status = 'Cancelled', cancelled_at = COALESCE(cancelled_at, NOW()), updated_at = NOW() WHERE id::text = ${orderId}`;
        }
      }
    } else {
      for (const orderId of data.orderIds) {
        if (data.status === "Shipped") {
          await sql`UPDATE orders SET status = 'Shipped', shipped_at = COALESCE(shipped_at, NOW()), updated_at = NOW() WHERE id::text = ${orderId}`;
        } else if (data.status === "Delivered") {
          await sql`UPDATE orders SET status = 'Delivered', delivered_at = COALESCE(delivered_at, NOW()), updated_at = NOW() WHERE id::text = ${orderId}`;
        } else {
          await sql`UPDATE orders SET status = ${data.status}, updated_at = NOW() WHERE id::text = ${orderId}`;
        }
      }
    }

    await logAudit(context as any, "order.bulk_update", "order", null, {
      status: data.status,
      count: data.orderIds.length,
    });
    return { ok: true, updated: data.orderIds.length };
  });

export const adminListInventoryTransactions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator(
    (d?: { productId?: string; variantId?: string; orderId?: string; limit?: number }) => ({
      productId: d?.productId ? String(d.productId) : undefined,
      variantId: d?.variantId ? String(d.variantId) : undefined,
      orderId: d?.orderId ? String(d.orderId) : undefined,
      limit: d?.limit ? Number(d.limit) : 50,
    }),
  )
  .handler(async ({ data, context }): Promise<InventoryTransactionRecord[]> => {
    return await listInventoryTransactions(context as any, data);
  });

export const adminGetDesign = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const rows = await sql`
      SELECT id, color_name, placement, product_title, preview_data_url, canvases, created_at, customer_email, customer_name
      FROM design_submissions
      WHERE id::text = ${String(data.id)}
      LIMIT 1
    `;
    return rows[0] || null;
  });
