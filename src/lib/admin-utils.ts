import { getSql } from "@/lib/db";
import { isAdminEmail } from "@/lib/auth";

export type AdminCtx = {
  userId?: string;
  user?: {
    email?: string;
    role?: string;
    id?: string;
    fullName?: string | null;
    status?: string;
    permissions?: Record<string, string[]>;
  };
  isAdmin?: boolean;
  [key: string]: any;
};

export const STAFF_MODULES = [
  "dashboard",
  "products",
  "orders",
  "inventory",
  "customers",
  "returns",
  "reviews",
  "designs",
  "marketing",
  "analytics",
  "shipping",
  "payments",
  "website",
  "staff",
  "settings",
] as const;

export type StaffModule = (typeof STAFF_MODULES)[number];

export const STAFF_ACTIONS = ["view", "create", "edit", "delete", "publish", "manage"] as const;

export type StaffAction = (typeof STAFF_ACTIONS)[number];

export function hasStaffPermission(
  role?: string | null,
  customPermissions?: Record<string, string[]> | null,
  module?: string,
  action: string = "view",
): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();

  // Super Admin has unrestricted access to everything
  if (r === "super admin" || r === "super_admin") return true;

  // Check custom permission override if provided
  if (module && customPermissions && typeof customPermissions === "object") {
    const modPerms = customPermissions[module];
    if (Array.isArray(modPerms)) {
      if (modPerms.includes("manage") || modPerms.includes(action) || modPerms.includes("*")) {
        return true;
      }
    }
  }

  // Admin role defaults
  if (r === "admin" || r === "administrator") {
    if (module === "staff" && (action === "delete" || action === "manage")) {
      return false; // Only Super Admin can manage/delete other staff credentials
    }
    if (module === "settings" && action === "delete") {
      return false; // Danger zone wipe is Super Admin only
    }
    return true;
  }

  // Manager role defaults
  if (r === "manager") {
    if (module === "staff") return action === "view";
    if (module === "settings") return action === "view";
    if (module === "website" && (action === "publish" || action === "delete")) return false;
    if (module === "payments" && (action === "edit" || action === "delete" || action === "manage"))
      return false;
    if (
      action === "delete" &&
      (module === "products" || module === "customers" || module === "orders")
    )
      return false;
    return true;
  }

  // Staff role defaults
  if (r === "staff") {
    if (
      module === "dashboard" ||
      module === "orders" ||
      module === "products" ||
      module === "inventory" ||
      module === "returns" ||
      module === "reviews" ||
      module === "designs"
    ) {
      if (action === "view") return true;
      if (
        action === "edit" &&
        (module === "orders" || module === "returns" || module === "inventory")
      )
        return true;
    }
    return false;
  }

  return false;
}

export async function assertAdmin(context: any) {
  if (context?.isAdmin) return;
  const userRole = context?.user?.role;
  const userEmail = context?.user?.email;

  if (isAdminEmail(userEmail)) return;

  if (userRole && hasStaffPermission(userRole, null, "dashboard", "view")) {
    return;
  }

  const sql = getSql();
  const userId = context?.userId || context?.user?.id;
  if (!userId) {
    if (isAdminEmail(userEmail)) return;
    throw new Error("Forbidden: Staff access only");
  }
  const rows = await sql`
    SELECT role, email, status FROM profiles WHERE id = ${userId} LIMIT 1
  `;
  if (rows.length === 0) {
    if (isAdminEmail(userEmail)) return;
    throw new Error("Forbidden: Staff access only");
  }
  const r = rows[0];
  if (r.status === "Inactive" || r.status === "Suspended") {
    throw new Error("Forbidden: Account is inactive or suspended");
  }
  if (isAdminEmail(r.email) || hasStaffPermission(r.role, null, "dashboard", "view")) {
    return;
  }
  throw new Error("Forbidden: Staff access only");
}

export async function assertSuperAdmin(context: any) {
  const userEmail = context?.user?.email;
  if (isAdminEmail(userEmail)) return;

  const userRole = context?.user?.role;
  if (
    userRole &&
    (userRole.toLowerCase() === "super admin" || userRole.toLowerCase() === "super_admin")
  ) {
    return;
  }

  const sql = getSql();
  const userId = context?.userId || context?.user?.id;
  if (!userId) throw new Error("Forbidden: Super Administrator access required");

  const rows = await sql`SELECT role, email FROM profiles WHERE id = ${userId} LIMIT 1`;
  if (rows.length > 0 && (isAdminEmail(rows[0].email) || rows[0].role === "Super Admin")) {
    return;
  }

  throw new Error("Forbidden: Super Administrator access required");
}

export async function assertPermission(
  context: any,
  module: StaffModule | string,
  action: StaffAction | string = "view",
) {
  const userEmail = context?.user?.email;
  if (isAdminEmail(userEmail)) return;

  const userRole = context?.user?.role;
  const perms = context?.user?.permissions;
  if (hasStaffPermission(userRole, perms, module, action)) {
    return;
  }

  const sql = getSql();
  const userId = context?.userId || context?.user?.id;
  if (!userId) throw new Error(`Forbidden: Insufficient permissions for ${module}:${action}`);

  const rows =
    await sql`SELECT role, email, permissions, status FROM profiles WHERE id = ${userId} LIMIT 1`;
  if (rows.length === 0)
    throw new Error(`Forbidden: Insufficient permissions for ${module}:${action}`);

  const r = rows[0];
  if (r.status === "Inactive" || r.status === "Suspended") {
    throw new Error("Forbidden: Account is inactive or suspended");
  }
  if (isAdminEmail(r.email) || hasStaffPermission(r.role, r.permissions, module, action)) {
    return;
  }

  throw new Error(`Forbidden: You do not have permission to ${action} ${module}`);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export const ARCHIVED_TAG = "__archived";

export type ProductInput = {
  title: string;
  description?: string;
  price: string | number;
  sizes?: string[];
  colors?: string[];
  tags?: string[];
  category?: string;
  stock?: number;
  sizeStock?: Record<string, number>;
  images?: string[];
  isActive?: boolean;
};

function cleanList(list?: string[]) {
  return Array.from(new Set((list ?? []).map((v) => String(v).trim()).filter(Boolean)));
}

/** Normalises + validates a product payload coming from the admin form. */
export function normalizeProductInput(d: ProductInput) {
  const title = String(d.title ?? "").trim();
  if (!title) throw new Error("Invalid product data: name is required");
  if (title.length > 200) throw new Error("Invalid product data: name is too long (max 200 chars)");

  const price = Number(d.price);
  if (!Number.isFinite(price) || price < 0)
    throw new Error("Invalid product data: price must be a number ≥ 0");

  let sizes = cleanList(d.sizes);
  if (sizes.length === 0) {
    sizes = ["S", "M", "L", "XL", "XXL"];
  }

  const explicitStockSum =
    d.sizeStock && typeof d.sizeStock === "object"
      ? Object.values(d.sizeStock).reduce(
          (sum, v) => sum + Math.max(0, Math.round(Number(v) || 0)),
          0,
        )
      : 0;

  const passedTotalStock = Math.max(0, Math.round(Number(d.stock) || 0));
  const sizeStock: Record<string, number> = {};
  let totalStock = 0;

  if (explicitStockSum > 0) {
    for (const s of sizes) {
      const q = Math.max(0, Math.round(Number(d.sizeStock?.[s]) || 0));
      sizeStock[s] = q;
      totalStock += q;
    }
  } else if (passedTotalStock > 0) {
    totalStock = passedTotalStock;
    const base = Math.floor(totalStock / sizes.length);
    const rem = totalStock % sizes.length;
    sizes.forEach((s, idx) => {
      sizeStock[s] = base + (idx < rem ? 1 : 0);
    });
  } else {
    totalStock = 0;
    sizes.forEach((s) => {
      sizeStock[s] = 0;
    });
  }

  // Sanitize images: preserve valid URLs, data URLs, and paths
  const images = (d.images ?? [])
    .map((img) => String(img || "").trim())
    .filter((img) => img.length > 0);

  return {
    name: title,
    description: d.description?.trim() ? d.description.trim() : null,
    price,
    images: images.length > 0 ? images : ["/placeholder-tee.jpg"],
    sizes,
    colors: cleanList(d.colors).length > 0 ? cleanList(d.colors) : ["Black"],
    tags: cleanList(d.tags),
    category: d.category?.trim() ? d.category.trim() : "Oversized Tees",
    stock_quantity: totalStock,
    sizeStock,
    is_active: d.isActive !== false,
  };
}

/** Records an important admin action. Never throws — logging must not break the action. */
export async function logAudit(
  context: any,
  action: string,
  entityType: string | null,
  entityId: string | null,
  details: Record<string, unknown> = {},
  options?: {
    module?: string;
    targetName?: string;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  try {
    const sql = getSql();
    const id = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const actorId = context?.userId || context?.user?.id || "usr_system";
    const actorEmail = context?.user?.email || null;
    const mod = options?.module || entityType || "General";
    const targetName =
      options?.targetName || (details?.name as string) || (details?.title as string) || null;
    const ip = options?.ipAddress || null;
    const ua = options?.userAgent || null;

    await sql`
      INSERT INTO admin_audit_log (id, actor_id, actor_email, action, entity_type, entity_id, details, module, target_name, ip_address, user_agent)
      VALUES (
        ${id},
        ${actorId},
        ${actorEmail},
        ${action},
        ${entityType},
        ${entityId},
        ${JSON.stringify(details)}::jsonb,
        ${mod},
        ${targetName},
        ${ip},
        ${ua}
      );
    `;
  } catch (e) {
    console.warn("[Admin Audit] Notice:", e);
  }
}

/**
 * Makes sure a product has one inventory row per size/colour combination and synchronizes stock.
 */
export async function syncProductVariants(
  context: any,
  productId: string,
  sizes: string[],
  colors: string[],
  distributeTotal?: number,
  sizeStock?: Record<string, number>,
) {
  const sql = getSql();
  const s = sizes.length ? sizes : [""];
  const c = colors.length ? colors : [""];
  const desired: Array<{ size: string; color: string }> = [];
  for (const color of c) for (const size of s) desired.push({ size, color });

  const existing = await sql`
    SELECT id, size, color, stock_quantity, reserved_stock
    FROM product_variants
    WHERE product_id::text = ${String(productId)}
  `;

  const key = (v: { size: string; color: string }) =>
    `${(v.size || "").trim()}|${(v.color || "").trim()}`;
  const existingMap = new Map<string, any>();
  for (const v of existing ?? []) {
    existingMap.set(key(v), v);
  }

  const hasExplicitSizeStock = Boolean(
    sizeStock &&
    Object.keys(sizeStock).length > 0 &&
    Object.values(sizeStock).some((val) => val > 0),
  );

  if (hasExplicitSizeStock) {
    // 1. Explicit per-size allocation
    for (const item of desired) {
      const k = key(item);
      const targetQty = Math.max(0, Math.round(Number(sizeStock![item.size]) || 0));
      const ex = existingMap.get(k);
      if (ex) {
        await sql`
          UPDATE product_variants
          SET stock_quantity = ${targetQty}, updated_at = NOW()
          WHERE id::text = ${String(ex.id)}
        `;
      } else {
        const varId = `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        await sql`
          INSERT INTO product_variants (id, product_id, size, color, sku, stock_quantity)
          VALUES (${varId}, ${String(productId)}, ${item.size}, ${item.color}, ${varId}, ${targetQty});
        `;
      }
    }
  } else if (distributeTotal !== undefined && Number(distributeTotal) >= 0) {
    // 2. Distribute total across desired combinations
    const total = Math.max(0, Math.round(Number(distributeTotal)));
    const base = desired.length ? Math.floor(total / desired.length) : 0;
    const rem = desired.length ? total % desired.length : 0;

    for (let i = 0; i < desired.length; i++) {
      const item = desired[i];
      const k = key(item);
      const targetQty = base + (i < rem ? 1 : 0);
      const ex = existingMap.get(k);
      if (ex) {
        await sql`
          UPDATE product_variants
          SET stock_quantity = ${targetQty}, updated_at = NOW()
          WHERE id::text = ${String(ex.id)}
        `;
      } else {
        const varId = `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        await sql`
          INSERT INTO product_variants (id, product_id, size, color, sku, stock_quantity)
          VALUES (${varId}, ${String(productId)}, ${item.size}, ${item.color}, ${varId}, ${targetQty});
        `;
      }
    }
  } else {
    // 3. Make sure any missing variants exist
    for (const item of desired) {
      const k = key(item);
      if (!existingMap.has(k)) {
        const varId = `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        await sql`
          INSERT INTO product_variants (id, product_id, size, color, sku, stock_quantity)
          VALUES (${varId}, ${String(productId)}, ${item.size}, ${item.color}, ${varId}, 0);
        `;
      }
    }
  }

  // Safely clean up stale variants that are not desired and have 0 reserved stock & no order references
  const wanted = new Set(desired.map(key));
  const stale = (existing ?? []).filter(
    (v: any) => !wanted.has(key(v)) && Number(v.reserved_stock || 0) === 0,
  );
  if (stale.length) {
    for (const st of stale) {
      const refs = await sql`
        SELECT count(*)::int as count FROM order_items WHERE variant_id::text = ${String(st.id)}
      `;
      if ((refs[0]?.count ?? 0) === 0) {
        await sql`DELETE FROM product_variants WHERE id::text = ${String(st.id)}`;
      }
    }
  }

  // Sync parent product total stock from sum of variants
  const varSum = await sql`
    SELECT COALESCE(SUM(stock_quantity), 0)::int as total
    FROM product_variants
    WHERE product_id::text = ${String(productId)}
  `;
  const finalTotal = Number(varSum[0]?.total ?? 0);
  await sql`
    UPDATE products
    SET stock_quantity = ${finalTotal}, updated_at = NOW()
    WHERE id::text = ${String(productId)}
  `;
}
