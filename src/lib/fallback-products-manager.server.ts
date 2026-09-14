import { FALLBACK_PRODUCTS, type ProductRow } from "./fallback-products";
import { removeMockProduct } from "./db";

// In-memory set of deleted product IDs and slugs
const _deletedIds = new Set<string>();

// Load initially deleted products from disk if available
try {
  if (typeof process !== "undefined" && process.cwd) {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const jsonPath = path.resolve(process.cwd(), "public/deleted-products.json");
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, "utf8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        list.forEach((id: string) => _deletedIds.add(String(id).toLowerCase().trim()));
      }
    }
  }
} catch {
  // Ignore startup read errors in non-fs runtimes
}

export function isProductDeleted(productIdOrSlug: string): boolean {
  if (!productIdOrSlug) return false;
  const norm = String(productIdOrSlug).toLowerCase().trim();
  return _deletedIds.has(norm);
}

export function getDeletedProductIds(): string[] {
  return Array.from(_deletedIds);
}

export async function recordProductDeletion(productIdOrSlug: string): Promise<void> {
  if (!productIdOrSlug) return;
  const norm = String(productIdOrSlug).toLowerCase().trim();
  _deletedIds.add(norm);

  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const jsonPath = path.resolve(process.cwd(), "public/deleted-products.json");
    const list = Array.from(_deletedIds);
    fs.writeFileSync(jsonPath, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.warn("[recordProductDeletion] Could not write to deleted-products.json:", err);
  }
}

/**
 * Permanently removes a product from:
 * 1. The in-memory FALLBACK_PRODUCTS array
 * 2. The physical src/lib/fallback-products.ts source file on disk
 * 3. The public/deleted-products.json registry
 * 4. In-memory mock database store (_mockProducts & _mockVariants)
 */
export async function removeProductFromFile(productIdOrSlug: string): Promise<boolean> {
  if (!productIdOrSlug) return false;
  const norm = String(productIdOrSlug).toLowerCase().trim();

  // Find in FALLBACK_PRODUCTS
  const index = FALLBACK_PRODUCTS.findIndex(
    (p) => p.id.toLowerCase() === norm || p.slug.toLowerCase() === norm,
  );

  let removedItem: ProductRow | null = null;
  if (index !== -1) {
    removedItem = FALLBACK_PRODUCTS.splice(index, 1)[0];
    _deletedIds.add(removedItem.id.toLowerCase());
    _deletedIds.add(removedItem.slug.toLowerCase());
  } else {
    _deletedIds.add(norm);
  }

  // Also remove from mock DB
  removeMockProduct(productIdOrSlug);
  if (removedItem) {
    removeMockProduct(removedItem.id);
    removeMockProduct(removedItem.slug);
  }

  // Update deleted-products.json
  await recordProductDeletion(productIdOrSlug);
  if (removedItem) {
    await recordProductDeletion(removedItem.id);
    await recordProductDeletion(removedItem.slug);
  }

  // Rewrite src/lib/fallback-products.ts on disk if running on Node with filesystem access
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), "src/lib/fallback-products.ts");

    if (fs.existsSync(filePath)) {
      const fileHeader = `export interface VariantRow {
  id: string;
  size: string;
  color: string;
  sku?: string;
  stock_quantity: number;
  reserved_stock: number;
  low_stock_threshold: number;
}

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

export const FALLBACK_PRODUCTS: ProductRow[] = `;

      const fileContent = `${fileHeader}${JSON.stringify(FALLBACK_PRODUCTS, null, 2)};\n`;
      fs.writeFileSync(filePath, fileContent, "utf8");
      console.log(`[Permanent Deletion] Successfully updated ${filePath} on disk.`);
    }
  } catch (err) {
    console.warn("[removeProductFromFile] Filesystem write failed (may be on read-only serverless runtime):", err);
  }

  return true;
}
