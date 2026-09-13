import { ensureDbSchema, getSql } from "@/lib/db";
import { createServerFn } from "@tanstack/react-start";

/** A product row as stored in the database. */
export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  images: string[];
  category: string | null;
  sizes: string[];
  colors: string[];
  stock_quantity: number;
  is_active: boolean;
  tags: string[];
  product_variants?: VariantRow[];
}

/** Per size/colour inventory row. */
export interface VariantRow {
  id: string;
  size: string;
  color: string;
  sku?: string;
  stock_quantity: number;
  reserved_stock: number;
  low_stock_threshold: number;
}

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

export const FALLBACK_PRODUCTS: ProductRow[] = [
  {
    id: "prod-oversized-black-tee",
    name: "Oversized Black T-Shirt",
    slug: "oversized-black-t-shirt",
    description:
      "Heavyweight 240 GSM combed cotton oversized streetwear tee in solid black. Drop-shoulder relaxed boxy fit.",
    price: 999,
    currency: "INR",
    images: ["/products/zoro-black-1.jpg", "/products/zoro-black-2.jpg"],
    category: "Oversized Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    stock_quantity: 91,
    is_active: true,
    tags: ["Oversized", "Bestseller", "Essentials"],
    product_variants: [
      {
        id: "var-obts-blk-s",
        size: "S",
        color: "Black",
        sku: "OBTS-BLK-S",
        stock_quantity: 42,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-obts-blk-m",
        size: "M",
        color: "Black",
        sku: "OBTS-BLK-M",
        stock_quantity: 27,
        reserved_stock: 5,
        low_stock_threshold: 15,
      },
      {
        id: "var-obts-blk-l",
        size: "L",
        color: "Black",
        sku: "OBTS-BLK-L",
        stock_quantity: 18,
        reserved_stock: 3,
        low_stock_threshold: 15,
      },
      {
        id: "var-obts-blk-xl",
        size: "XL",
        color: "Black",
        sku: "OBTS-BLK-XL",
        stock_quantity: 4,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-obts-blk-xxl",
        size: "XXL",
        color: "Black",
        sku: "OBTS-BLK-XXL",
        stock_quantity: 0,
        reserved_stock: 0,
        low_stock_threshold: 8,
      },
    ],
  },
  {
    id: "prod-premium-white-tee",
    name: "Premium White T-Shirt",
    slug: "premium-white-t-shirt",
    description:
      "Clean optic white premium cotton essential tee. Tailored modern streetwear fit with durable reinforced collar.",
    price: 899,
    currency: "INR",
    images: ["/products/zoro-olive-1.jpg", "/products/zoro-olive-2.jpg"],
    category: "Essential Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    stock_quantity: 75,
    is_active: true,
    tags: ["Essential", "White", "Featured"],
    product_variants: [
      {
        id: "var-pwt-wht-s",
        size: "S",
        color: "White",
        sku: "PWT-WHT-S",
        stock_quantity: 35,
        reserved_stock: 1,
        low_stock_threshold: 10,
      },
      {
        id: "var-pwt-wht-m",
        size: "M",
        color: "White",
        sku: "PWT-WHT-M",
        stock_quantity: 0,
        reserved_stock: 0,
        low_stock_threshold: 10,
      },
      {
        id: "var-pwt-wht-l",
        size: "L",
        color: "White",
        sku: "PWT-WHT-L",
        stock_quantity: 22,
        reserved_stock: 2,
        low_stock_threshold: 12,
      },
      {
        id: "var-pwt-wht-xl",
        size: "XL",
        color: "White",
        sku: "PWT-WHT-XL",
        stock_quantity: 3,
        reserved_stock: 1,
        low_stock_threshold: 8,
      },
      {
        id: "var-pwt-wht-xxl",
        size: "XXL",
        color: "White",
        sku: "PWT-WHT-XXL",
        stock_quantity: 15,
        reserved_stock: 0,
        low_stock_threshold: 5,
      },
    ],
  },
  {
    id: "prod-classic-red-tee",
    name: "Classic Red T-Shirt",
    slug: "classic-red-t-shirt",
    description:
      "Vibrant crimson red classic tee crafted from breathable ring-spun cotton. Ideal everyday casual wear.",
    price: 849,
    currency: "INR",
    images: ["/products/zenitsu-maroon-1.jpg", "/products/zenitsu-maroon-2.jpg"],
    category: "Classic Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Red"],
    stock_quantity: 67,
    is_active: true,
    tags: ["Classic", "Red", "Casual"],
    product_variants: [
      {
        id: "var-crts-red-s",
        size: "S",
        color: "Red",
        sku: "CRTS-RED-S",
        stock_quantity: 25,
        reserved_stock: 0,
        low_stock_threshold: 8,
      },
      {
        id: "var-crts-red-m",
        size: "M",
        color: "Red",
        sku: "CRTS-RED-M",
        stock_quantity: 8,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-crts-red-l",
        size: "L",
        color: "Red",
        sku: "CRTS-RED-L",
        stock_quantity: 30,
        reserved_stock: 4,
        low_stock_threshold: 10,
      },
      {
        id: "var-crts-red-xl",
        size: "XL",
        color: "Red",
        sku: "CRTS-RED-XL",
        stock_quantity: 12,
        reserved_stock: 1,
        low_stock_threshold: 8,
      },
      {
        id: "var-crts-red-xxl",
        size: "XXL",
        color: "Red",
        sku: "CRTS-RED-XXL",
        stock_quantity: 2,
        reserved_stock: 0,
        low_stock_threshold: 5,
      },
    ],
  },
  {
    id: "prod-heavyweight-grey-tee",
    name: "Heavyweight Grey T-Shirt",
    slug: "heavyweight-grey-t-shirt",
    description:
      "Charcoal heather grey 260 GSM ultra-heavyweight boxy tee. Built for structure and longevity.",
    price: 1149,
    currency: "INR",
    images: ["/products/zoro-black-2.jpg", "/products/zoro-black-1.jpg"],
    category: "Heavyweight Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Grey"],
    stock_quantity: 124,
    is_active: true,
    tags: ["Heavyweight", "Grey", "Streetwear"],
    product_variants: [
      {
        id: "var-hwg-gry-s",
        size: "S",
        color: "Grey",
        sku: "HWG-GRY-S",
        stock_quantity: 50,
        reserved_stock: 5,
        low_stock_threshold: 15,
      },
      {
        id: "var-hwg-gry-m",
        size: "M",
        color: "Grey",
        sku: "HWG-GRY-M",
        stock_quantity: 40,
        reserved_stock: 2,
        low_stock_threshold: 15,
      },
      {
        id: "var-hwg-gry-l",
        size: "L",
        color: "Grey",
        sku: "HWG-GRY-L",
        stock_quantity: 25,
        reserved_stock: 3,
        low_stock_threshold: 12,
      },
      {
        id: "var-hwg-gry-xl",
        size: "XL",
        color: "Grey",
        sku: "HWG-GRY-XL",
        stock_quantity: 9,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-hwg-gry-xxl",
        size: "XXL",
        color: "Grey",
        sku: "HWG-GRY-XXL",
        stock_quantity: 0,
        reserved_stock: 0,
        low_stock_threshold: 6,
      },
    ],
  },
  {
    id: "prod-streetwear-blue-tee",
    name: "Streetwear Blue T-Shirt",
    slug: "streetwear-blue-t-shirt",
    description:
      "Cobalt blue pigment-dyed relaxed fit tee with vintage wash finish and ribbed neckband.",
    price: 999,
    currency: "INR",
    images: ["/products/zenitsu-maroon-2.jpg", "/products/zenitsu-maroon-1.jpg"],
    category: "Oversized Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue"],
    stock_quantity: 77,
    is_active: true,
    tags: ["Streetwear", "Blue", "Vintage"],
    product_variants: [
      {
        id: "var-stb-blu-s",
        size: "S",
        color: "Blue",
        sku: "STB-BLU-S",
        stock_quantity: 30,
        reserved_stock: 1,
        low_stock_threshold: 10,
      },
      {
        id: "var-stb-blu-m",
        size: "M",
        color: "Blue",
        sku: "STB-BLU-M",
        stock_quantity: 22,
        reserved_stock: 0,
        low_stock_threshold: 10,
      },
      {
        id: "var-stb-blu-l",
        size: "L",
        color: "Blue",
        sku: "STB-BLU-L",
        stock_quantity: 5,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-stb-blu-xl",
        size: "XL",
        color: "Blue",
        sku: "STB-BLU-XL",
        stock_quantity: 19,
        reserved_stock: 1,
        low_stock_threshold: 8,
      },
      {
        id: "var-stb-blu-xxl",
        size: "XXL",
        color: "Blue",
        sku: "STB-BLU-XXL",
        stock_quantity: 11,
        reserved_stock: 0,
        low_stock_threshold: 6,
      },
    ],
  },
];

let _seeded = false;
let _seedPromise: Promise<void> | null = null;

async function seedInitialProductsIfNeeded() {
  if (_seeded) return;
  if (_seedPromise) return _seedPromise;

  _seedPromise = (async () => {
    try {
      const sql = getSql();
      const fallbackIds = FALLBACK_PRODUCTS.map((p) => p.id);

      // Remove obsolete products not in FALLBACK_PRODUCTS
      await sql`
        DELETE FROM products WHERE id::text <> ALL(${fallbackIds}::text[])
      `;

      for (const p of FALLBACK_PRODUCTS) {
        try {
          await sql`
            INSERT INTO products (
              id, name, slug, description, price, base_price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
            ) VALUES (
              ${p.id}, ${p.name}, ${p.slug}, ${p.description}, ${p.price}, ${p.price}, ${p.currency},
              ${JSON.stringify(p.images)}::jsonb, ${p.category}, ${JSON.stringify(p.sizes)}::jsonb, ${JSON.stringify(p.colors)}::jsonb,
              ${p.stock_quantity}, ${p.is_active}, ${JSON.stringify(p.tags)}::jsonb
            ) ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              slug = EXCLUDED.slug,
              description = EXCLUDED.description,
              price = EXCLUDED.price,
              currency = EXCLUDED.currency,
              images = EXCLUDED.images,
              category = EXCLUDED.category,
              sizes = EXCLUDED.sizes,
              colors = EXCLUDED.colors,
              stock_quantity = EXCLUDED.stock_quantity,
              is_active = EXCLUDED.is_active,
              tags = EXCLUDED.tags;
          `;
        } catch {
          await sql`
            INSERT INTO products (
              id, name, slug, description, price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
            ) VALUES (
              ${p.id}, ${p.name}, ${p.slug}, ${p.description}, ${p.price}, ${p.currency},
              ${JSON.stringify(p.images)}::jsonb, ${p.category}, ${JSON.stringify(p.sizes)}::jsonb, ${JSON.stringify(p.colors)}::jsonb,
              ${p.stock_quantity}, ${p.is_active}, ${JSON.stringify(p.tags)}::jsonb
            ) ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              slug = EXCLUDED.slug,
              description = EXCLUDED.description,
              price = EXCLUDED.price,
              currency = EXCLUDED.currency,
              images = EXCLUDED.images,
              category = EXCLUDED.category,
              sizes = EXCLUDED.sizes,
              colors = EXCLUDED.colors,
              stock_quantity = EXCLUDED.stock_quantity,
              is_active = EXCLUDED.is_active,
              tags = EXCLUDED.tags;
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
                ) ON CONFLICT (id) DO UPDATE SET
                  stock_quantity = EXCLUDED.stock_quantity,
                  reserved_stock = EXCLUDED.reserved_stock;
              `;
            } catch {
              // ignore
            }
          }
        }
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

export const fetchProductsServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { first?: number }) => ({ first: Number(d.first || 20) }))
  .handler(async ({ data }): Promise<CatalogProduct[]> => {
    try {
      await ensureDbSchema();
      await seedInitialProductsIfNeeded();
      const sql = getSql();
      const first = data.first || 20;

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
      const variants = await sql`
        SELECT id, product_id, size, color, stock_quantity, reserved_stock, low_stock_threshold
        FROM product_variants
        WHERE product_id::text = ANY(${productIds}::text[])
      `;

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
    } catch (err) {
      console.warn("fetchProducts error", err);
      return [];
    }
  });

export async function fetchProducts(first = 20): Promise<CatalogProduct[]> {
  try {
    const res = await fetchProductsServerFn({ data: { first } });
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.warn("fetchProducts wrapper error", err);
    return [];
  }
}

export const fetchProductByHandleServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { handle: string }) => ({ handle: String(d.handle) }))
  .handler(async ({ data }): Promise<CatalogProductNode | null> => {
    try {
      await ensureDbSchema();
      await seedInitialProductsIfNeeded();
      const sql = getSql();

      const products = await sql`
        SELECT id, name, slug, description, price, currency, images, category, sizes, colors, stock_quantity, is_active, tags
        FROM products
        WHERE (slug = ${data.handle} OR id::text = ${data.handle}) AND (is_active = true OR is_active IS NULL)
        LIMIT 1
      `;

      if (!products || products.length === 0) {
        return null;
      }

      const p = products[0];
      const variants = await sql`
        SELECT id, product_id, size, color, stock_quantity, reserved_stock, low_stock_threshold
        FROM product_variants
        WHERE product_id::text = ${String(p.id)}
      `;

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

      return toCatalogProduct(row).node;
    } catch (err) {
      console.warn("fetchProductByHandle error", err);
      return null;
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
