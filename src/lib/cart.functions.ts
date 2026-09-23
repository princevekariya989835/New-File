import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { getSql } from "@/lib/db";
import type { CartItem } from "@/stores/cart-store";

export const getMyCart = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<CartItem[]> => {
    try {
      const sql = getSql();
      const authCtx = context as any;
      const rows = await sql`
        SELECT items FROM carts WHERE user_id = ${authCtx.userId} LIMIT 1
      `;
      if (rows.length > 0 && rows[0].items) {
        const items = typeof rows[0].items === "string" ? JSON.parse(rows[0].items) : rows[0].items;
        return Array.isArray(items) ? items : [];
      }
    } catch {
      /* fallback */
    }
    return [];
  });

export const saveMyCart = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { items: CartItem[] }) => {
    const rawItems = Array.isArray(d?.items) ? d.items : [];
    const items: CartItem[] = rawItems.slice(0, 50).map((i) => ({
      variantId: String(i.variantId || "").slice(0, 100),
      productId: typeof i.productId === "string" ? i.productId.slice(0, 100) : null,
      productHandle: String(i.productHandle || "").slice(0, 100),
      productTitle: String(i.productTitle || "").slice(0, 200),
      variantTitle: String(i.variantTitle || "").slice(0, 200),
      imageUrl: typeof i.imageUrl === "string" ? i.imageUrl.slice(0, 2000) : null,
      price: {
        amount: String(i.price?.amount || "0"),
        currencyCode: String(i.price?.currencyCode || "INR"),
      },
      quantity: Math.max(1, Math.min(99, Math.round(Number(i.quantity) || 1))),
      selectedOptions: Array.isArray(i.selectedOptions) ? i.selectedOptions.slice(0, 10) : [],
      attributes: Array.isArray(i.attributes) ? i.attributes.slice(0, 10) : [],
      designSubmissionId:
        typeof i.designSubmissionId === "string" ? i.designSubmissionId.slice(0, 100) : null,
    }));
    return { items };
  })
  .handler(async ({ data, context }) => {
    try {
      const sql = getSql();
      const authCtx = context as any;
      const jsonItems = JSON.stringify(data.items);
      await sql`
        INSERT INTO carts (user_id, items, updated_at)
        VALUES (${authCtx.userId}, ${jsonItems}::jsonb, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          items = ${jsonItems}::jsonb,
          updated_at = NOW();
      `;
    } catch (e) {
      console.warn("saveMyCart error", e);
    }
    return { ok: true };
  });
