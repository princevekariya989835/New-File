import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { getSql, ensureDbSchema } from "@/lib/db";

export type DiscountType = "percentage" | "fixed";

export type CouponStatus = "Active" | "Scheduled" | "Expired" | "Disabled";

export type CouponAppliesTo = "all" | "products" | "categories";

export type CouponRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usagePerCustomer: number;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  appliesTo: CouponAppliesTo;
  productIds: string[];
  categoryNames: string[];
  excludedProductIds: string[];
  excludedCategoryNames: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  status: CouponStatus;
};

export type CouponUsageRecord = {
  id: string;
  couponId: string;
  orderId: string;
  customerId: string | null;
  customerEmail: string;
  couponCode: string;
  discountAmount: number;
  orderAmount: number;
  usedAt: string;
};

export type CouponCartItemInput = {
  productId: string | null;
  quantity: number;
  price: number;
  productName?: string;
  category?: string | null;
};

export function computeCouponStatus(c: {
  is_active?: boolean;
  isActive?: boolean;
  starts_at?: string | null;
  startsAt?: string | null;
  expires_at?: string | null;
  expiresAt?: string | null;
  usage_limit?: number | null;
  usageLimit?: number | null;
  used_count?: number;
  usedCount?: number;
  deleted_at?: string | null;
  deletedAt?: string | null;
}): CouponStatus {
  const isDeleted = Boolean(c.deleted_at ?? c.deletedAt);
  const active = Boolean(c.is_active ?? c.isActive);
  if (isDeleted || !active) return "Disabled";

  const now = Date.now();
  const startStr = c.starts_at ?? c.startsAt;
  if (startStr) {
    const sTime = new Date(startStr).getTime();
    if (!Number.isNaN(sTime) && sTime > now) return "Scheduled";
  }

  const expStr = c.expires_at ?? c.expiresAt;
  if (expStr) {
    const eTime = new Date(expStr).getTime();
    if (!Number.isNaN(eTime) && eTime < now) return "Expired";
  }

  const limit = c.usage_limit ?? c.usageLimit;
  const used = c.used_count ?? c.usedCount ?? 0;
  if (limit !== null && limit !== undefined && limit > 0 && used >= limit) {
    return "Expired";
  }

  return "Active";
}

function mapCouponDbRow(row: any): CouponRecord {
  const productIds = Array.isArray(row.product_ids)
    ? row.product_ids
    : typeof row.product_ids === "string"
      ? JSON.parse(row.product_ids || "[]")
      : [];
  const categoryNames = Array.isArray(row.category_names)
    ? row.category_names
    : typeof row.category_names === "string"
      ? JSON.parse(row.category_names || "[]")
      : [];
  const excludedProductIds = Array.isArray(row.excluded_product_ids)
    ? row.excluded_product_ids
    : typeof row.excluded_product_ids === "string"
      ? JSON.parse(row.excluded_product_ids || "[]")
      : [];
  const excludedCategoryNames = Array.isArray(row.excluded_category_names)
    ? row.excluded_category_names
    : typeof row.excluded_category_names === "string"
      ? JSON.parse(row.excluded_category_names || "[]")
      : [];

  const status = computeCouponStatus(row);

  return {
    id: String(row.id),
    code: String(row.code || "").toUpperCase(),
    name: String(row.name || ""),
    description: row.description ? String(row.description) : null,
    discountType: row.discount_type === "fixed" ? "fixed" : "percentage",
    discountValue: Number(row.discount_value || 0),
    minimumOrderValue: Number(row.minimum_order_value || 0),
    maximumDiscount: row.maximum_discount !== null && row.maximum_discount !== undefined ? Number(row.maximum_discount) : null,
    usageLimit: row.usage_limit !== null && row.usage_limit !== undefined ? Number(row.usage_limit) : null,
    usagePerCustomer: Number(row.usage_per_customer ?? 1),
    usedCount: Number(row.used_count || 0),
    startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    isActive: Boolean(row.is_active),
    appliesTo: (row.applies_to as CouponAppliesTo) || "all",
    productIds,
    categoryNames,
    excludedProductIds,
    excludedCategoryNames,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    createdBy: row.created_by ? String(row.created_by) : null,
    status,
  };
}

/**
 * Server-side core validation & discount calculator.
 * Strictly guarantees correct amounts, limits, and rules.
 */
export async function validateAndCalculateCoupon(params: {
  code: string;
  items: CouponCartItemInput[];
  subtotal: number;
  customerEmail?: string | null;
  customerId?: string | null;
}) {
  await ensureDbSchema();
  const sql = getSql();
  const cleanCode = String(params.code || "").toUpperCase().trim();

  if (!cleanCode) {
    return { valid: false as const, error: "Please enter a coupon code." };
  }

  if (!params.items || params.items.length === 0) {
    return { valid: false as const, error: "Your bag is empty." };
  }

  // 1. Fetch coupon by code
  const rows = await sql`
    SELECT * FROM coupons
    WHERE UPPER(code) = ${cleanCode} AND deleted_at IS NULL
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    return { valid: false as const, error: "Invalid coupon code." };
  }

  const coupon = mapCouponDbRow(rows[0]);

  // 2. Active toggle
  if (!coupon.isActive) {
    return { valid: false as const, error: "This coupon is currently disabled." };
  }

  // 3. Start time
  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    return { valid: false as const, error: "This coupon is not yet active." };
  }

  // 4. Expiry time
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
    return { valid: false as const, error: "This coupon has expired." };
  }

  // 5. Total usage limit
  if (coupon.usageLimit !== null && coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false as const, error: "This coupon has reached its maximum usage limit." };
  }

  // 6. Per-customer usage limit
  if (coupon.usagePerCustomer > 0 && (params.customerEmail || params.customerId)) {
    let usageCount = 0;
    const cleanEmail = params.customerEmail ? params.customerEmail.toLowerCase().trim() : null;

    if (cleanEmail && params.customerId) {
      const usageRows = await sql`
        SELECT COUNT(*) as count FROM coupon_usage
        WHERE coupon_id = ${coupon.id}
          AND (LOWER(customer_email) = ${cleanEmail} OR customer_id = ${params.customerId})
      `;
      usageCount = Number(usageRows?.[0]?.count || 0);
    } else if (cleanEmail) {
      const usageRows = await sql`
        SELECT COUNT(*) as count FROM coupon_usage
        WHERE coupon_id = ${coupon.id} AND LOWER(customer_email) = ${cleanEmail}
      `;
      usageCount = Number(usageRows?.[0]?.count || 0);
    } else if (params.customerId) {
      const usageRows = await sql`
        SELECT COUNT(*) as count FROM coupon_usage
        WHERE coupon_id = ${coupon.id} AND customer_id = ${params.customerId}
      `;
      usageCount = Number(usageRows?.[0]?.count || 0);
    }

    if (usageCount >= coupon.usagePerCustomer) {
      return {
        valid: false as const,
        error: `You have already redeemed this coupon the maximum allowed times (${coupon.usagePerCustomer}).`,
      };
    }
  }

  // 7. Minimum order value
  const cartSubtotal = Number(params.subtotal || 0);
  if (coupon.minimumOrderValue > 0 && cartSubtotal < coupon.minimumOrderValue) {
    return {
      valid: false as const,
      error: `Minimum order value of ₹${coupon.minimumOrderValue.toLocaleString("en-IN")} required to apply this coupon.`,
    };
  }

  // 8. Fetch product categories if needed for category-based filtering
  const prodIds = params.items.map((i) => i.productId).filter((id): id is string => !!id);
  const categoryByProdId = new Map<string, string>();
  if (prodIds.length > 0) {
    try {
      const prods = await sql`
        SELECT id, category FROM products WHERE id::text = ANY(${prodIds}::text[])
      `;
      for (const p of prods as any[]) {
        if (p.category) categoryByProdId.set(String(p.id), String(p.category));
      }
    } catch {
      // fallback
    }
  }

  // 9. Filter items for eligibility
  let eligibleSubtotal = 0;
  let hasEligibleItems = false;

  for (const item of params.items) {
    const pId = item.productId ? String(item.productId) : "";
    const pCat = item.category || (pId ? categoryByProdId.get(pId) : null) || "";

    // Check exclusion
    if (pId && coupon.excludedProductIds.includes(pId)) continue;
    if (pCat && coupon.excludedCategoryNames.some((c) => c.toLowerCase() === pCat.toLowerCase())) continue;

    // Check inclusion rules
    let isItemEligible = false;
    if (coupon.appliesTo === "all") {
      isItemEligible = true;
    } else if (coupon.appliesTo === "products") {
      isItemEligible = pId ? coupon.productIds.includes(pId) : false;
    } else if (coupon.appliesTo === "categories") {
      isItemEligible = pCat ? coupon.categoryNames.some((c) => c.toLowerCase() === pCat.toLowerCase()) : false;
    }

    if (isItemEligible) {
      hasEligibleItems = true;
      eligibleSubtotal += Number(item.price || 0) * Number(item.quantity || 1);
    }
  }

  if (!hasEligibleItems || eligibleSubtotal <= 0) {
    return {
      valid: false as const,
      error: "This coupon is not valid for the products currently in your bag.",
    };
  }

  // 10. Calculate discount
  let rawDiscount = 0;
  if (coupon.discountType === "percentage") {
    rawDiscount = (eligibleSubtotal * coupon.discountValue) / 100;
    if (coupon.maximumDiscount !== null && coupon.maximumDiscount > 0) {
      rawDiscount = Math.min(rawDiscount, coupon.maximumDiscount);
    }
  } else {
    rawDiscount = Math.min(eligibleSubtotal, coupon.discountValue);
  }

  // Prevent discount from exceeding total subtotal or going below 0
  const finalDiscount = Math.max(0, Math.min(cartSubtotal, Math.round(rawDiscount)));

  if (finalDiscount <= 0) {
    return { valid: false as const, error: "Discount calculation resulted in ₹0 for this cart." };
  }

  return {
    valid: true as const,
    coupon,
    discountAmount: finalDiscount,
    eligibleSubtotal,
    cartSubtotal,
    finalSubtotal: Math.max(0, cartSubtotal - finalDiscount),
  };
}

// ------------------------------------------------------------------------------------------------
// CLIENT / CHECKOUT ENDPOINTS
// ------------------------------------------------------------------------------------------------

export const validateCouponCode = createServerFn({ method: "POST" })
  .inputValidator((d: {
    code: string;
    subtotal: number;
    items: CouponCartItemInput[];
    customerEmail?: string | null;
    customerId?: string | null;
  }) => {
    return {
      code: String(d.code || "").trim(),
      subtotal: Number(d.subtotal || 0),
      items: Array.isArray(d.items) ? d.items : [],
      customerEmail: d.customerEmail ? String(d.customerEmail).trim() : null,
      customerId: d.customerId ? String(d.customerId).trim() : null,
    };
  })
  .handler(async ({ data }) => {
    const res = await validateAndCalculateCoupon(data);
    if (!res.valid) {
      return {
        ok: false as const,
        error: res.error,
      };
    }

    return {
      ok: true as const,
      coupon: {
        id: res.coupon.id,
        code: res.coupon.code,
        name: res.coupon.name,
        discountType: res.coupon.discountType,
        discountValue: res.coupon.discountValue,
        discountAmount: res.discountAmount,
        eligibleSubtotal: res.eligibleSubtotal,
        finalSubtotal: res.finalSubtotal,
        message:
          res.coupon.discountType === "percentage"
            ? `${res.coupon.discountValue}% OFF applied (-₹${res.discountAmount.toLocaleString("en-IN")})`
            : `₹${res.coupon.discountValue} Flat OFF applied (-₹${res.discountAmount.toLocaleString("en-IN")})`,
      },
    };
  });

// ------------------------------------------------------------------------------------------------
// ADMIN MANAGEMENT ENDPOINTS
// ------------------------------------------------------------------------------------------------

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<CouponRecord[]> => {
    await assertAdmin(context as any, "coupons", "view");
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT * FROM coupons
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    return (rows as any[]).map(mapCouponDbRow);
  });

export const adminGetCouponStats = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any, "coupons", "view");
    await ensureDbSchema();
    const sql = getSql();

    const coupons = await sql`
      SELECT * FROM coupons WHERE deleted_at IS NULL
    `;

    let totalCoupons = coupons.length;
    let activeCoupons = 0;
    let expiredCoupons = 0;
    let totalUsage = 0;

    for (const c of coupons as any[]) {
      const status = computeCouponStatus(c);
      if (status === "Active") activeCoupons++;
      if (status === "Expired") expiredCoupons++;
      totalUsage += Number(c.used_count || 0);
    }

    const usageTotals = await sql`
      SELECT COALESCE(SUM(discount_amount), 0) as total_discount FROM coupon_usage
    `;
    const totalDiscountGiven = Number(usageTotals?.[0]?.total_discount || 0);

    return {
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      totalUsage,
      totalDiscountGiven,
    };
  });

export const adminGetCouponById = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any, "coupons", "view");
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT * FROM coupons WHERE id = ${data.id} LIMIT 1
    `;
    if (!rows || rows.length === 0) throw new Error("Coupon not found");

    const coupon = mapCouponDbRow(rows[0]);

    const usageRows = await sql`
      SELECT u.*, o.order_number, o.created_at as order_date, o.total_amount, o.status as order_status, o.shipping_name
      FROM coupon_usage u
      LEFT JOIN orders o ON u.order_id = o.id
      WHERE u.coupon_id = ${coupon.id}
      ORDER BY u.used_at DESC
      LIMIT 100
    `;

    const totalDiscount = (usageRows as any[]).reduce(
      (s, r) => s + Number(r.discount_amount || 0),
      0,
    );
    const avgDiscount = usageRows.length > 0 ? Math.round(totalDiscount / usageRows.length) : 0;

    return {
      coupon,
      stats: {
        totalUsage: coupon.usedCount,
        remainingUsage: coupon.usageLimit !== null ? Math.max(0, coupon.usageLimit - coupon.usedCount) : null,
        totalDiscountGiven: totalDiscount,
        averageDiscount: avgDiscount,
      },
      history: (usageRows as any[]).map((r) => ({
        id: String(r.id),
        orderId: String(r.order_id),
        orderNumber: String(r.order_number || r.order_id),
        customerName: r.shipping_name ? String(r.shipping_name) : "Customer",
        customerEmail: String(r.customer_email || ""),
        orderAmount: Number(r.order_amount || 0),
        discountAmount: Number(r.discount_amount || 0),
        usedAt: r.used_at ? new Date(r.used_at).toISOString() : new Date().toISOString(),
        orderStatus: r.order_status || "Completed",
      })),
    };
  });

export type AdminCouponInput = {
  code: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderValue?: number;
  maximumDiscount?: number | null;
  usageLimit?: number | null;
  usagePerCustomer?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
  appliesTo?: CouponAppliesTo;
  productIds?: string[];
  categoryNames?: string[];
  excludedProductIds?: string[];
  excludedCategoryNames?: string[];
};

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: AdminCouponInput) => {
    const rawCode = String(d.code || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .trim();

    if (!rawCode || rawCode.length < 3) {
      throw new Error("Coupon code must be at least 3 characters long.");
    }
    if (!/^[A-Z0-9_-]+$/.test(rawCode)) {
      throw new Error("Coupon code can only contain letters, numbers, hyphens, and underscores.");
    }

    const name = String(d.name || "").trim();
    if (!name) throw new Error("Coupon internal name is required.");

    const discountType: DiscountType = d.discountType === "fixed" ? "fixed" : "percentage";
    const discountValue = Number(d.discountValue || 0);

    if (discountType === "percentage") {
      if (discountValue <= 0 || discountValue > 100) {
        throw new Error("Percentage discount must be between 1% and 100%.");
      }
    } else {
      if (discountValue <= 0) {
        throw new Error("Fixed discount amount must be greater than ₹0.");
      }
    }

    return {
      code: rawCode,
      name,
      description: d.description ? String(d.description).trim() : null,
      discountType,
      discountValue,
      minimumOrderValue: Math.max(0, Number(d.minimumOrderValue || 0)),
      maximumDiscount: d.maximumDiscount ? Math.max(1, Number(d.maximumDiscount)) : null,
      usageLimit: d.usageLimit ? Math.max(1, Math.round(Number(d.usageLimit))) : null,
      usagePerCustomer: d.usagePerCustomer !== undefined && d.usagePerCustomer !== null ? Math.max(1, Math.round(Number(d.usagePerCustomer))) : 1,
      startsAt: d.startsAt ? new Date(d.startsAt).toISOString() : null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
      isActive: d.isActive !== false,
      appliesTo: (d.appliesTo as CouponAppliesTo) || "all",
      productIds: Array.isArray(d.productIds) ? d.productIds : [],
      categoryNames: Array.isArray(d.categoryNames) ? d.categoryNames : [],
      excludedProductIds: Array.isArray(d.excludedProductIds) ? d.excludedProductIds : [],
      excludedCategoryNames: Array.isArray(d.excludedCategoryNames) ? d.excludedCategoryNames : [],
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any, "coupons", "create");
    await ensureDbSchema();
    const sql = getSql();

    // Check duplicate code
    const existing = await sql`
      SELECT id FROM coupons
      WHERE UPPER(code) = ${data.code} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (existing && existing.length > 0) {
      throw new Error(`A coupon with code "${data.code}" already exists.`);
    }

    const id = `cpn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const authCtx = context as any;
    const adminEmail = authCtx?.user?.email || "Admin";

    await sql`
      INSERT INTO coupons (
        id, code, name, description, discount_type, discount_value,
        minimum_order_value, maximum_discount, usage_limit, usage_per_customer, used_count,
        starts_at, expires_at, is_active, applies_to, product_ids, category_names,
        excluded_product_ids, excluded_category_names, created_by, created_at, updated_at
      ) VALUES (
        ${id}, ${data.code}, ${data.name}, ${data.description}, ${data.discountType}, ${data.discountValue},
        ${data.minimumOrderValue}, ${data.maximumDiscount}, ${data.usageLimit}, ${data.usagePerCustomer}, 0,
        ${data.startsAt}, ${data.expiresAt}, ${data.isActive}, ${data.appliesTo},
        ${JSON.stringify(data.productIds)}::jsonb, ${JSON.stringify(data.categoryNames)}::jsonb,
        ${JSON.stringify(data.excludedProductIds)}::jsonb, ${JSON.stringify(data.excludedCategoryNames)}::jsonb,
        ${adminEmail}, NOW(), NOW()
      );
    `;

    await logAudit(context as any, "coupon.create", "coupon", id, {
      code: data.code,
      discount: `${data.discountValue}${data.discountType === "percentage" ? "%" : " INR"}`,
    });

    return { ok: true, id, code: data.code };
  });

export const adminUpdateCoupon = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string } & AdminCouponInput) => {
    const rawCode = String(d.code || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .trim();

    if (!rawCode || rawCode.length < 3) {
      throw new Error("Coupon code must be at least 3 characters long.");
    }

    const name = String(d.name || "").trim();
    if (!name) throw new Error("Coupon name is required.");

    const discountType: DiscountType = d.discountType === "fixed" ? "fixed" : "percentage";
    const discountValue = Number(d.discountValue || 0);

    if (discountType === "percentage") {
      if (discountValue <= 0 || discountValue > 100) {
        throw new Error("Percentage discount must be between 1% and 100%.");
      }
    } else {
      if (discountValue <= 0) {
        throw new Error("Fixed discount amount must be greater than ₹0.");
      }
    }

    return {
      id: String(d.id),
      code: rawCode,
      name,
      description: d.description ? String(d.description).trim() : null,
      discountType,
      discountValue,
      minimumOrderValue: Math.max(0, Number(d.minimumOrderValue || 0)),
      maximumDiscount: d.maximumDiscount ? Math.max(1, Number(d.maximumDiscount)) : null,
      usageLimit: d.usageLimit ? Math.max(1, Math.round(Number(d.usageLimit))) : null,
      usagePerCustomer: d.usagePerCustomer !== undefined && d.usagePerCustomer !== null ? Math.max(1, Math.round(Number(d.usagePerCustomer))) : 1,
      startsAt: d.startsAt ? new Date(d.startsAt).toISOString() : null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
      isActive: d.isActive !== false,
      appliesTo: (d.appliesTo as CouponAppliesTo) || "all",
      productIds: Array.isArray(d.productIds) ? d.productIds : [],
      categoryNames: Array.isArray(d.categoryNames) ? d.categoryNames : [],
      excludedProductIds: Array.isArray(d.excludedProductIds) ? d.excludedProductIds : [],
      excludedCategoryNames: Array.isArray(d.excludedCategoryNames) ? d.excludedCategoryNames : [],
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any, "coupons", "edit");
    await ensureDbSchema();
    const sql = getSql();

    // Check duplicate code on another coupon
    const existing = await sql`
      SELECT id FROM coupons
      WHERE UPPER(code) = ${data.code} AND id != ${data.id} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (existing && existing.length > 0) {
      throw new Error(`Another coupon with code "${data.code}" already exists.`);
    }

    await sql`
      UPDATE coupons SET
        code = ${data.code},
        name = ${data.name},
        description = ${data.description},
        discount_type = ${data.discountType},
        discount_value = ${data.discountValue},
        minimum_order_value = ${data.minimumOrderValue},
        maximum_discount = ${data.maximumDiscount},
        usage_limit = ${data.usageLimit},
        usage_per_customer = ${data.usagePerCustomer},
        starts_at = ${data.startsAt},
        expires_at = ${data.expiresAt},
        is_active = ${data.isActive},
        applies_to = ${data.appliesTo},
        product_ids = ${JSON.stringify(data.productIds)}::jsonb,
        category_names = ${JSON.stringify(data.categoryNames)}::jsonb,
        excluded_product_ids = ${JSON.stringify(data.excludedProductIds)}::jsonb,
        excluded_category_names = ${JSON.stringify(data.excludedCategoryNames)}::jsonb,
        updated_at = NOW()
      WHERE id = ${data.id}
    `;

    await logAudit(context as any, "coupon.edit", "coupon", data.id, {
      code: data.code,
    });

    return { ok: true, id: data.id };
  });

export const adminToggleCouponActive = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string; isActive: boolean }) => ({
    id: String(d.id),
    isActive: Boolean(d.isActive),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any, "coupons", "edit");
    await ensureDbSchema();
    const sql = getSql();

    await sql`
      UPDATE coupons
      SET is_active = ${data.isActive}, updated_at = NOW()
      WHERE id = ${data.id}
    `;

    await logAudit(context as any, "coupon.toggle", "coupon", data.id, {
      isActive: data.isActive,
    });

    return { ok: true, id: data.id, isActive: data.isActive };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any, "coupons", "delete");
    await ensureDbSchema();
    const sql = getSql();

    // Soft delete to protect historical order records
    await sql`
      UPDATE coupons
      SET deleted_at = NOW(), is_active = false, updated_at = NOW()
      WHERE id = ${data.id}
    `;

    await logAudit(context as any, "coupon.delete", "coupon", data.id, {});

    return { ok: true, id: data.id };
  });
