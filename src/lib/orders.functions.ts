import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { ensureDbSchema, getSql } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/email";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import {
  deductOrderInventory,
  restoreOrderInventory,
  InventoryError,
} from "@/lib/inventory.service";
import { validateAndCalculateCoupon } from "@/lib/coupons.functions";
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  getRazorpayKeyId,
} from "@/lib/razorpay.server";
import { syncOrderToZippyy } from "@/lib/zippyy";
import { FALLBACK_PRODUCTS } from "@/lib/fallback-products";

export function extractPrimaryImage(images: unknown): string | null {
  if (!images) return null;
  let arr: unknown[] = [];
  if (Array.isArray(images)) {
    arr = images;
  } else if (typeof images === "string") {
    const trimmed = images.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("data:image/")
    ) {
      return trimmed;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) arr = parsed;
      else if (typeof parsed === "string") return parsed;
      else if (parsed && typeof parsed === "object") {
        const obj = parsed as any;
        const u = obj.url || obj.src || obj.image || obj.secure_url;
        if (typeof u === "string" && u.trim()) return u.trim();
      }
    } catch {
      if (
        trimmed.length > 3 &&
        (trimmed.endsWith(".jpg") ||
          trimmed.endsWith(".jpeg") ||
          trimmed.endsWith(".png") ||
          trimmed.endsWith(".webp") ||
          trimmed.endsWith(".avif"))
      ) {
        return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
      }
      return null;
    }
  }
  if (arr.length === 0) return null;
  const first = arr[0];
  if (typeof first === "string" && first.trim()) {
    const s = first.trim();
    if (
      s.startsWith("http://") ||
      s.startsWith("https://") ||
      s.startsWith("/") ||
      s.startsWith("data:image/")
    ) {
      return s;
    }
    return `/${s}`;
  }
  if (first && typeof first === "object") {
    const obj = first as any;
    const url = obj.url || obj.src || obj.image || obj.secure_url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}

export function getFallbackProductImage(productId: string | null): string | null {
  if (!productId) return null;
  const cleanId = productId.toLowerCase().trim();
  const fb = FALLBACK_PRODUCTS.find(
    (p) => p.id.toLowerCase() === cleanId || p.slug.toLowerCase() === cleanId,
  );
  return fb?.images?.[0] || null;
}

export function getFallbackProductImageByName(name: string | null): string | null {
  if (!name) return null;
  const cleanName = name.toLowerCase().trim();
  // 1. Exact or substring match
  let fb = FALLBACK_PRODUCTS.find((p) => {
    const pName = p.name.toLowerCase().trim();
    return pName === cleanName || cleanName.includes(pName) || pName.includes(cleanName);
  });
  if (fb?.images?.[0]) return fb.images[0];

  // 2. Score by matching distinctive words
  const GENERIC = new Set(["tee", "shirt", "t-shirt", "graphic", "oversized", "tee-shirt", "cotton", "printed"]);
  const words = cleanName
    .split(/[\s\-_]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !GENERIC.has(w));

  let bestProduct: (typeof FALLBACK_PRODUCTS)[0] | null = null;
  let bestScore = 0;

  for (const p of FALLBACK_PRODUCTS) {
    const pLower = p.name.toLowerCase();
    const pSlug = p.slug.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (pLower.includes(w) || pSlug.includes(w)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestProduct = p;
    }
  }

  if (bestProduct?.images?.[0] && bestScore > 0) {
    return bestProduct.images[0];
  }

  return null;
}

export function resolveOrderItemImage(options: {
  designPreview?: string | null;
  orderProductImage?: string | null;
  productImagesJson?: unknown;
  productId?: string | null;
  productName?: string | null;
}): string {
  // Priority 1: Custom design preview (if item has custom artwork preview)
  if (
    options.designPreview &&
    typeof options.designPreview === "string" &&
    options.designPreview.trim() &&
    !options.designPreview.includes("[object Object]")
  ) {
    return options.designPreview.trim();
  }

  // Priority 2: Stored order product image snapshot (historical snapshot)
  // Must NOT be a broken placeholder, numeric corrupted count, or object string
  if (
    options.orderProductImage &&
    typeof options.orderProductImage === "string"
  ) {
    const trimmed = options.orderProductImage.trim();
    const isCorrupted =
      trimmed.length < 4 ||
      trimmed.includes("[object Object]") ||
      trimmed.endsWith("/placeholder-tee.jpg") ||
      trimmed === "placeholder-tee.jpg" ||
      /^\d+$/.test(trimmed);

    if (!isCorrupted) {
      return trimmed;
    }
  }

  // Priority 3: Product's current primary image from products table (via JOIN)
  const primaryFromProduct = extractPrimaryImage(options.productImagesJson);
  if (primaryFromProduct) {
    if (primaryFromProduct.startsWith("data:image/") && options.productId) {
      return `/api/public/product-image?id=${encodeURIComponent(options.productId)}&idx=0`;
    }
    return primaryFromProduct;
  }

  // Priority 4: Fallback products definition by ID or slug
  const fallbackFromCatalog = getFallbackProductImage(options.productId || null);
  if (fallbackFromCatalog) {
    return fallbackFromCatalog;
  }

  // Priority 5: Fallback products definition by product title/name
  const fallbackByName = getFallbackProductImageByName(options.productName || null);
  if (fallbackByName) {
    return fallbackByName;
  }

  // Priority 6: Clean fallback image that exists
  return "/products/zoro-black-1.jpg";
}

export type OrderLineItem = {
  title: string;
  quantity: number;
  imageUrl: string | null;
  size: string | null;
  color: string | null;
  designSubmissionId: string | null;
  price: { amount: string; currencyCode: string } | null;
};

export type CustomerOrder = {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  paymentMethod: string | null;
  subtotal: { amount: string; currencyCode: string };
  discount: { amount: string; currencyCode: string; code?: string | null };
  shippingCharge: { amount: string; currencyCode: string };
  taxAmount: { amount: string; currencyCode: string };
  total: { amount: string; currencyCode: string };
  shipping: {
    name: string;
    email: string;
    phone: string | null;
    address: string;
  };
  billingAddress: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  lineItems: OrderLineItem[];
};

export type PlaceOrderInput = {
  shippingName: string;
  shippingEmail: string;
  shippingPhone?: string | null;
  shippingAddress: string;
  items: Array<{
    productId: string | null;
    designSubmissionId?: string | null;
    productName: string;
    productImage?: string | null;
    quantity: number;
    price: number;
    selectedSize?: string | null;
    selectedColor?: string | null;
  }>;
  shipping?: number;
  currency?: string;
  couponCode?: string | null;
};

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<CustomerOrder[]> => {
    try {
      await ensureDbSchema();
      const sql = getSql();
      const authCtx = context as any;
      const userId = String(authCtx.userId || "");
      const userEmail = String(authCtx.user?.email || "").toLowerCase().trim();

      // Opportunistic safe link: if legacy orders exist with matching verified email but unassigned user_id, associate them
      if (userId && userEmail) {
        try {
          await sql`
            UPDATE orders
            SET user_id = ${userId}
            WHERE (user_id IS NULL OR user_id = '' OR user_id = ${userEmail})
              AND LOWER(shipping_email) = ${userEmail}
          `;
        } catch {
          // non-fatal
        }
      }

      const orders = await sql`
        SELECT id, order_number, created_at, subtotal, discount_amount, discount_code,
          shipping_charge, tax_amount, total_amount, currency, status, payment_status,
          payment_method, shipping_name, shipping_email, shipping_phone, shipping_address,
          billing_address, courier_name, tracking_number, tracking_url,
          shipped_at, delivered_at, cancelled_at
        FROM orders
        WHERE user_id::text = ${userId}
           OR (user_id IS NULL AND LOWER(shipping_email) = ${userEmail})
           OR (user_id::text = ${userEmail})
        ORDER BY created_at DESC
      `;

      if (orders.length === 0) return [];

      const items = await sql`
        SELECT i.order_id, i.product_id, i.product_name, i.product_image, i.quantity, i.price, i.selected_size, i.selected_color,
          i.design_submission_id, d.preview_data_url, p.images as product_images_json
        FROM order_items i
        LEFT JOIN design_submissions d ON i.design_submission_id::text = d.id::text
        LEFT JOIN products p ON (i.product_id::text = p.id::text OR i.product_id::text = p.slug::text OR (i.product_id IS NULL AND LOWER(p.name) = LOWER(i.product_name)))
        WHERE i.order_id IN (
          SELECT id FROM orders
          WHERE user_id::text = ${userId}
             OR (user_id IS NULL AND LOWER(shipping_email) = ${userEmail})
             OR (user_id::text = ${userEmail})
        )
      `;

      const itemsByOrderId = new Map<string, OrderLineItem[]>();
      for (const item of items as any[]) {
        const oId = String(item.order_id);
        if (!itemsByOrderId.has(oId)) itemsByOrderId.set(oId, []);
        const currency = "INR";
        const finalImg = resolveOrderItemImage({
          designPreview: item.preview_data_url,
          orderProductImage: item.product_image,
          productImagesJson: item.product_images_json,
          productId: item.product_id,
          productName: item.product_name,
        });

        itemsByOrderId.get(oId)!.push({
          title: item.product_name,
          quantity: Number(item.quantity || 1),
          imageUrl: finalImg,
          size: item.selected_size || null,
          color: item.selected_color || null,
          designSubmissionId: item.design_submission_id || null,
          price: { amount: String(item.price || 0), currencyCode: currency },
        });
      }

      return orders.map((o: any) => {
        const currency = o.currency || "INR";
        return {
          id: String(o.id),
          name: o.order_number,
          processedAt: new Date(o.created_at).toISOString(),
          financialStatus: o.payment_status || "Pending",
          fulfillmentStatus: o.status || "Pending",
          paymentMethod: o.payment_method || null,
          subtotal: { amount: String(o.subtotal || o.total_amount || 0), currencyCode: currency },
          discount: {
            amount: String(o.discount_amount || 0),
            currencyCode: currency,
            code: o.discount_code || null,
          },
          shippingCharge: { amount: String(o.shipping_charge || 0), currencyCode: currency },
          taxAmount: { amount: String(o.tax_amount || 0), currencyCode: currency },
          total: { amount: String(o.total_amount || 0), currencyCode: currency },
          shipping: {
            name: o.shipping_name || "",
            email: o.shipping_email || "",
            phone: o.shipping_phone || null,
            address: o.shipping_address || "",
          },
          billingAddress: o.billing_address || null,
          courierName: o.courier_name || null,
          trackingNumber: o.tracking_number || null,
          trackingUrl: o.tracking_url || null,
          shippedAt: o.shipped_at ? new Date(o.shipped_at).toISOString() : null,
          deliveredAt: o.delivered_at ? new Date(o.delivered_at).toISOString() : null,
          cancelledAt: o.cancelled_at ? new Date(o.cancelled_at).toISOString() : null,
          lineItems: itemsByOrderId.get(String(o.id)) || [],
        };
      });
    } catch (e: any) {
      console.error("[Customer Orders] getMyOrders error:", e);
      throw new Error(e?.message || "Failed to load your orders.");
    }
  });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: PlaceOrderInput) => {
    const name = str(d?.shippingName, 120);
    const email = str(d?.shippingEmail, 255);
    const address = str(d?.shippingAddress, 1000);
    if (!name || !email || !address) throw new Error("Missing shipping details");
    if (!Array.isArray(d.items) || d.items.length === 0) throw new Error("Your bag is empty");
    if (d.items.length > 50) throw new Error("Order item limit exceeded (maximum 50 items allowed per order).");
    return {
      shippingName: name,
      shippingEmail: email,
      shippingPhone: d.shippingPhone ? String(d.shippingPhone).replace(/[^\d+\-\s()]/g, "").slice(0, 20) : null,
      shippingAddress: address,
      currency: str(d.currency, 8) || "INR",
      shipping: Number.isFinite(d.shipping) ? Number(d.shipping) : 0,
      couponCode: d.couponCode ? str(d.couponCode, 50).toUpperCase().replace(/\s+/g, "") : null,
      items: d.items.map((i) => ({
        productId: typeof i.productId === "string" ? i.productId : null,
        designSubmissionId: typeof i.designSubmissionId === "string" ? i.designSubmissionId : null,
        productName: str(i.productName, 200) || "Item",
        productImage: typeof i.productImage === "string" ? i.productImage.slice(0, 2000) : null,
        quantity: Math.max(1, Math.min(99, Math.round(Number(i.quantity) || 1))),
        selectedSize: str(i.selectedSize, 40) || null,
        selectedColor: str(i.selectedColor, 40) || null,
      })),
    };
  })
  .handler(async ({ data, context }) => {
    await ensureDbSchema();
    const sql = getSql();

    const productIds = data.items.map((i) => i.productId).filter((v): v is string => !!v);
    const priceById = new Map<string, number>();
    const imageById = new Map<string, string>();
    if (productIds.length) {
      const prods = await sql`
        SELECT id, slug, name, price, images FROM products
        WHERE id::text = ANY(${productIds}::text[]) OR slug::text = ANY(${productIds}::text[])
      `;
      for (const p of prods as any[]) {
        const pId = String(p.id);
        const pSlug = p.slug ? String(p.slug) : "";
        const pName = p.name ? String(p.name).toLowerCase().trim() : "";
        priceById.set(pId, Number(p.price || 0));
        if (pSlug) priceById.set(pSlug, Number(p.price || 0));

        let primaryImg =
          extractPrimaryImage(p.images) ||
          getFallbackProductImage(pId) ||
          (pSlug ? getFallbackProductImage(pSlug) : null);
        if (primaryImg) {
          if (primaryImg.startsWith("data:image/")) {
            primaryImg = `/api/public/product-image?id=${encodeURIComponent(pId)}&idx=0`;
          }
          imageById.set(pId, primaryImg);
          if (pSlug) imageById.set(pSlug, primaryImg);
          if (pName) imageById.set(`name:${pName}`, primaryImg);
        }
      }
    }

    const CUSTOM_PRICE = 1499;
    const items = data.items.map((i) => {
      const price =
        (i.productId ? priceById.get(i.productId) : null) ??
        (i.productName ? priceById.get(i.productName) : null) ??
        CUSTOM_PRICE;

      const productPrimaryImg =
        (i.productId ? imageById.get(i.productId) : null) ||
        (i.productName ? imageById.get(`name:${i.productName.toLowerCase().trim()}`) : null) ||
        getFallbackProductImage(i.productId) ||
        getFallbackProductImageByName(i.productName);

      let finalSnapshot = typeof i.productImage === "string" ? i.productImage.trim() : null;
      if (
        !finalSnapshot ||
        finalSnapshot.length < 5 ||
        finalSnapshot.includes("[object Object]") ||
        finalSnapshot.endsWith("/placeholder-tee.jpg") ||
        finalSnapshot === "placeholder-tee.jpg" ||
        /^\d+$/.test(finalSnapshot)
      ) {
        finalSnapshot = productPrimaryImg;
      }
      if (!finalSnapshot && !i.designSubmissionId) {
        finalSnapshot = productPrimaryImg || "/products/zoro-black-1.jpg";
      }

      return {
        ...i,
        price,
        subtotal: price * i.quantity,
        resolvedProductImage: finalSnapshot,
      };
    });

    const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0);

    // Validate and calculate coupon discount if code was provided
    let discountAmount = 0;
    let appliedCoupon: any = null;
    let eligibleAmount = itemsTotal;

    const authCtx = context as any;

    if (data.couponCode) {
      const couponRes = await validateAndCalculateCoupon({
        code: data.couponCode,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
          productName: i.productName,
        })),
        subtotal: itemsTotal,
        customerEmail: data.shippingEmail,
        customerId: String(authCtx.userId),
      });

      if (!couponRes.valid) {
        throw new Error(couponRes.error || "Invalid coupon code.");
      }

      discountAmount = couponRes.discountAmount;
      appliedCoupon = couponRes.coupon;
      eligibleAmount = couponRes.eligibleSubtotal;
    }

    const finalSubtotal = Math.max(0, itemsTotal - discountAmount);
    const shipping = finalSubtotal >= 1999 || finalSubtotal === 0 ? 0 : 79;
    const total = finalSubtotal + shipping;

    const orderId = `ord_${Date.now().toString(36)}_${Math.floor(100000 + Math.random() * 900000)}`;
    const orderNumber = `RIO-${Date.now().toString(36).toUpperCase()}`;

    // Atomically check and deduct inventory before finalizing the order
    try {
      await deductOrderInventory(
        orderId,
        items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          selectedSize: i.selectedSize,
          selectedColor: i.selectedColor,
        })),
        String(authCtx.userId),
      );
    } catch (err) {
      if (err instanceof InventoryError) {
        throw new Error(err.message);
      }
      throw new Error("Unable to reserve inventory for your items. Please try again.");
    }

    // Atomically claim coupon slot with race-condition protection
    if (appliedCoupon) {
      const updateRes = await sql`
        UPDATE coupons
        SET used_count = used_count + 1, updated_at = NOW()
        WHERE id = ${appliedCoupon.id}
          AND is_active = true
          AND (usage_limit IS NULL OR used_count < usage_limit)
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (expires_at IS NULL OR expires_at >= NOW())
        RETURNING id, used_count
      `;

      if (!updateRes || updateRes.length === 0) {
        // Rollback inventory reservation if coupon slot was snatched concurrently
        await restoreOrderInventory(orderId, "Coupon limit reached during checkout", authCtx.userId).catch(() => {});
        throw new Error("The coupon has reached its maximum usage limit or has expired.");
      }
    }

    await sql`
      INSERT INTO orders (
        id, user_id, order_number, subtotal, discount_amount, discount_code, coupon_id,
        discount_type, discount_value, eligible_amount, original_subtotal, final_subtotal,
        shipping_charge, tax_amount, total_amount, currency, status, payment_status,
        payment_method, stock_state, shipping_name, shipping_email, shipping_phone, shipping_address
      ) VALUES (
        ${orderId}, ${String(authCtx.userId)}, ${orderNumber}, ${itemsTotal}, ${discountAmount}, ${appliedCoupon ? appliedCoupon.code : null}, ${appliedCoupon ? appliedCoupon.id : null},
        ${appliedCoupon ? appliedCoupon.discountType : null}, ${appliedCoupon ? appliedCoupon.discountValue : null}, ${eligibleAmount}, ${itemsTotal}, ${finalSubtotal},
        ${shipping}, 0, ${total}, ${data.currency}, 'Pending', 'Pending', 'COD', 'Deducted',
        ${data.shippingName}, ${data.shippingEmail}, ${data.shippingPhone}, ${data.shippingAddress}
      );
    `;

    // Record coupon usage history
    if (appliedCoupon) {
      const usageId = `usg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      await sql`
        INSERT INTO coupon_usage (
          id, coupon_id, order_id, customer_id, customer_email, coupon_code, discount_amount, order_amount, used_at
        ) VALUES (
          ${usageId}, ${appliedCoupon.id}, ${orderId}, ${String(authCtx.userId)}, ${data.shippingEmail.toLowerCase().trim()},
          ${appliedCoupon.code}, ${discountAmount}, ${total}, NOW()
        );
      `;
    }

    for (const i of items) {
      const itemId = `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      await sql`
        INSERT INTO order_items (
          id, order_id, product_id, design_submission_id, product_name, product_image, quantity, price, selected_size, selected_color, subtotal
        ) VALUES (
          ${itemId}, ${orderId}, ${i.productId}, ${i.designSubmissionId}, ${i.productName}, ${i.resolvedProductImage},
          ${i.quantity}, ${i.price}, ${i.selectedSize}, ${i.selectedColor}, ${i.subtotal}
        );
      `;
    }

    // Clear cart in Neon DB
    await sql`
      INSERT INTO carts (user_id, items, updated_at)
      VALUES (${authCtx.userId}, '[]'::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET items = '[]'::jsonb, updated_at = NOW();
    `;

    const templateData = {
      orderNumber,
      createdAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      customerName: data.shippingName,
      customerEmail: data.shippingEmail,
      customerPhone: data.shippingPhone || null,
      shippingAddress: data.shippingAddress,
      paymentMethod: "Cash on Delivery (COD)",
      subtotal: itemsTotal.toLocaleString("en-IN"),
      discountAmount: discountAmount > 0 ? discountAmount.toLocaleString("en-IN") : null,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      shippingCharge: shipping.toLocaleString("en-IN"),
      total: total.toLocaleString("en-IN"),
      currency: data.currency,
      hasCustomDesign: items.some((i) => !!i.designSubmissionId),
      items: items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        size: i.selectedSize || null,
        color: i.selectedColor || null,
        price: i.price.toLocaleString("en-IN"),
        subtotal: i.subtotal.toLocaleString("en-IN"),
        isCustomDesign: !!i.designSubmissionId,
      })),
    };

    // Send customer order confirmation via Brevo (fire and forget)
    sendOrderConfirmation({
      to: data.shippingEmail,
      orderNumber,
      orderId,
      customerName: data.shippingName,
      shippingAddress: data.shippingAddress,
      items: items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        size: i.selectedSize ?? null,
        color: i.selectedColor ?? null,
        price: i.price.toLocaleString("en-IN"),
      })),
      subtotal: itemsTotal.toLocaleString("en-IN"),
      discountAmount: discountAmount > 0 ? discountAmount.toLocaleString("en-IN") : null,
      discountCode: appliedCoupon ? appliedCoupon.code : null,
      shippingCharge: shipping.toLocaleString("en-IN"),
      total: total.toLocaleString("en-IN"),
      currency: "₹",
      paymentMethod: "Cash on Delivery (COD)",
      paymentStatus: "Confirmed",
      userId: String(authCtx.userId),
    }).catch((err) => console.warn("[Order Service] Customer email notice:", err));

    // Send store owner / admin notification via legacy template (fire and forget)
    const adminTemplateData = {
      orderNumber,
      createdAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      customerName: data.shippingName,
      customerEmail: data.shippingEmail,
      customerPhone: data.shippingPhone || null,
      shippingAddress: data.shippingAddress,
      paymentMethod: "Cash on Delivery (COD)",
      subtotal: itemsTotal.toLocaleString("en-IN"),
      discountAmount: discountAmount > 0 ? discountAmount.toLocaleString("en-IN") : null,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      shippingCharge: shipping.toLocaleString("en-IN"),
      total: total.toLocaleString("en-IN"),
      currency: data.currency,
      hasCustomDesign: items.some((i) => !!i.designSubmissionId),
      items: items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        size: i.selectedSize || null,
        color: i.selectedColor || null,
        price: i.price.toLocaleString("en-IN"),
        subtotal: i.subtotal.toLocaleString("en-IN"),
        isCustomDesign: !!i.designSubmissionId,
      })),
    };
    sendTemplateEmail("admin-order-notification", "princevekariya9898@gmail.com", {
      templateData: adminTemplateData,
    }).catch((err) => console.warn("[Order Service] Admin email notice:", err));

    // Automated Forward Shipment fulfillment via Zippyy
    syncOrderToZippyy(orderId).catch((err) =>
      console.warn("[Zippyy Auto-Dispatch] Error for COD order:", err),
    );

    return {
      ok: true,
      orderId,
      orderNumber,
      total,
      shipping,
      discountAmount,
      couponCode: appliedCoupon?.code ?? null,
    };
  });

export const createOnlineOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: PlaceOrderInput) => {
    const name = str(d?.shippingName, 120);
    const email = str(d?.shippingEmail, 255);
    const address = str(d?.shippingAddress, 1000);
    if (!name || !email || !address) throw new Error("Missing shipping details");
    if (!Array.isArray(d.items) || d.items.length === 0) throw new Error("Your bag is empty");
    if (d.items.length > 50) throw new Error("Order item limit exceeded (maximum 50 items allowed per order).");
    return {
      shippingName: name,
      shippingEmail: email,
      shippingPhone: d.shippingPhone ? String(d.shippingPhone).replace(/[^\d+\-\s()]/g, "").slice(0, 20) : null,
      shippingAddress: address,
      currency: str(d.currency, 8) || "INR",
      shipping: Number.isFinite(d.shipping) ? Number(d.shipping) : 0,
      couponCode: d.couponCode ? str(d.couponCode, 50).toUpperCase().replace(/\s+/g, "") : null,
      items: d.items.map((i) => ({
        productId: typeof i.productId === "string" ? i.productId : null,
        designSubmissionId: typeof i.designSubmissionId === "string" ? i.designSubmissionId : null,
        productName: str(i.productName, 200) || "Item",
        productImage: typeof i.productImage === "string" ? i.productImage.slice(0, 2000) : null,
        quantity: Math.max(1, Math.min(99, Math.round(Number(i.quantity) || 1))),
        selectedSize: str(i.selectedSize, 40) || null,
        selectedColor: str(i.selectedColor, 40) || null,
      })),
    };
  })
  .handler(async ({ data, context }) => {
    await ensureDbSchema();
    const sql = getSql();
    const authCtx = context as any;

    const productIds = data.items.map((i) => i.productId).filter((v): v is string => !!v);
    const priceById = new Map<string, number>();
    const imageById = new Map<string, string>();
    if (productIds.length) {
      const prods = await sql`
        SELECT id, slug, name, price, images FROM products
        WHERE id::text = ANY(${productIds}::text[]) OR slug::text = ANY(${productIds}::text[])
      `;
      for (const p of prods as any[]) {
        const pId = String(p.id);
        const pSlug = p.slug ? String(p.slug) : "";
        const pName = p.name ? String(p.name).toLowerCase().trim() : "";
        priceById.set(pId, Number(p.price || 0));
        if (pSlug) priceById.set(pSlug, Number(p.price || 0));

        let primaryImg =
          extractPrimaryImage(p.images) ||
          getFallbackProductImage(pId) ||
          (pSlug ? getFallbackProductImage(pSlug) : null);
        if (primaryImg) {
          if (primaryImg.startsWith("data:image/")) {
            primaryImg = `/api/public/product-image?id=${encodeURIComponent(pId)}&idx=0`;
          }
          imageById.set(pId, primaryImg);
          if (pSlug) imageById.set(pSlug, primaryImg);
          if (pName) imageById.set(`name:${pName}`, primaryImg);
        }
      }
    }

    const CUSTOM_PRICE = 1499;
    const items = data.items.map((i) => {
      const price =
        (i.productId ? priceById.get(i.productId) : null) ??
        (i.productName ? priceById.get(i.productName) : null) ??
        CUSTOM_PRICE;

      const productPrimaryImg =
        (i.productId ? imageById.get(i.productId) : null) ||
        (i.productName ? imageById.get(`name:${i.productName.toLowerCase().trim()}`) : null) ||
        getFallbackProductImage(i.productId) ||
        getFallbackProductImageByName(i.productName);

      let finalSnapshot = typeof i.productImage === "string" ? i.productImage.trim() : null;
      if (
        !finalSnapshot ||
        finalSnapshot.length < 5 ||
        finalSnapshot.includes("[object Object]") ||
        finalSnapshot.endsWith("/placeholder-tee.jpg") ||
        finalSnapshot === "placeholder-tee.jpg" ||
        /^\d+$/.test(finalSnapshot)
      ) {
        finalSnapshot = productPrimaryImg;
      }
      if (!finalSnapshot && !i.designSubmissionId) {
        finalSnapshot = productPrimaryImg || "/products/zoro-black-1.jpg";
      }

      return {
        ...i,
        price,
        subtotal: price * i.quantity,
        resolvedProductImage: finalSnapshot,
      };
    });

    const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0);

    // Validate and calculate coupon discount if code was provided
    let discountAmount = 0;
    let appliedCoupon: any = null;
    let eligibleAmount = itemsTotal;

    if (data.couponCode) {
      const couponRes = await validateAndCalculateCoupon({
        code: data.couponCode,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
          productName: i.productName,
        })),
        subtotal: itemsTotal,
        customerEmail: data.shippingEmail,
        customerId: String(authCtx.userId),
      });

      if (!couponRes.valid) {
        throw new Error(couponRes.error || "Invalid coupon code.");
      }

      discountAmount = couponRes.discountAmount;
      appliedCoupon = couponRes.coupon;
      eligibleAmount = couponRes.eligibleSubtotal;
    }

    const finalSubtotal = Math.max(0, itemsTotal - discountAmount);
    const shipping = finalSubtotal >= 1999 || finalSubtotal === 0 ? 0 : 79;
    const total = finalSubtotal + shipping;
    const amountInPaise = Math.round(total * 100);

    const orderId = `ord_${Date.now().toString(36)}_${Math.floor(100000 + Math.random() * 900000)}`;
    const orderNumber = `RIO-${Date.now().toString(36).toUpperCase()}`;

    // Create Razorpay Order via official API
    let razorpayOrder: any;
    try {
      razorpayOrder = await createRazorpayOrder({
        amountInPaise,
        currency: "INR",
        receipt: orderNumber,
        notes: {
          orderId,
          orderNumber,
          userId: String(authCtx.userId),
          customerEmail: data.shippingEmail,
        },
      });
    } catch (rzpErr: any) {
      console.error("[Orders] Failed to create Razorpay order:", rzpErr);
      throw new Error(rzpErr.message || "Failed to initialize payment with Razorpay. Please try again.");
    }

    // Record order in database in Pending payment state
    try {
      await sql`
        INSERT INTO orders (
          id, user_id, order_number, subtotal, discount_amount, discount_code, coupon_id,
          discount_type, discount_value, eligible_amount, original_subtotal, final_subtotal,
          shipping_charge, tax_amount, total_amount, currency, status, payment_status,
          payment_method, stock_state, razorpay_order_id, payment_gateway, shipping_name,
          shipping_email, shipping_phone, shipping_address
        ) VALUES (
          ${orderId}, ${String(authCtx.userId)}, ${orderNumber}, ${itemsTotal}, ${discountAmount},
          ${appliedCoupon ? appliedCoupon.code : null}, ${appliedCoupon ? appliedCoupon.id : null},
          ${appliedCoupon ? appliedCoupon.discountType : null}, ${appliedCoupon ? appliedCoupon.discountValue : null},
          ${eligibleAmount}, ${itemsTotal}, ${finalSubtotal}, ${shipping}, 0, ${total}, ${data.currency},
          'Pending', 'Pending', 'Online Payment', 'Pending', ${razorpayOrder.id}, 'Razorpay',
          ${data.shippingName}, ${data.shippingEmail}, ${data.shippingPhone}, ${data.shippingAddress}
        );
      `;
    } catch (insertErr: any) {
      if (insertErr?.message?.includes("payment_gateway") || insertErr?.message?.includes("razorpay") || insertErr?.message?.includes("column")) {
        console.warn("[Orders] Adding missing columns to orders relation dynamically:", insertErr?.message);
        try {
          await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'Razorpay'`;
          await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`;
          await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT`;
          await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature TEXT`;
          await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE`;
          await sql`CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders (razorpay_order_id)`;
        } catch (alterErr) {
          console.warn("[Orders] Dynamic schema migration warning:", alterErr);
        }
        await sql`
          INSERT INTO orders (
            id, user_id, order_number, subtotal, discount_amount, discount_code, coupon_id,
            discount_type, discount_value, eligible_amount, original_subtotal, final_subtotal,
            shipping_charge, tax_amount, total_amount, currency, status, payment_status,
            payment_method, stock_state, razorpay_order_id, payment_gateway, shipping_name,
            shipping_email, shipping_phone, shipping_address
          ) VALUES (
            ${orderId}, ${String(authCtx.userId)}, ${orderNumber}, ${itemsTotal}, ${discountAmount},
            ${appliedCoupon ? appliedCoupon.code : null}, ${appliedCoupon ? appliedCoupon.id : null},
            ${appliedCoupon ? appliedCoupon.discountType : null}, ${appliedCoupon ? appliedCoupon.discountValue : null},
            ${eligibleAmount}, ${itemsTotal}, ${finalSubtotal}, ${shipping}, 0, ${total}, ${data.currency},
            'Pending', 'Pending', 'Online Payment', 'Pending', ${razorpayOrder.id}, 'Razorpay',
            ${data.shippingName}, ${data.shippingEmail}, ${data.shippingPhone}, ${data.shippingAddress}
          );
        `;
      } else {
        throw insertErr;
      }
    }

    for (const i of items) {
      const itemId = `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      await sql`
        INSERT INTO order_items (
          id, order_id, product_id, design_submission_id, product_name, product_image, quantity, price, selected_size, selected_color, subtotal
        ) VALUES (
          ${itemId}, ${orderId}, ${i.productId}, ${i.designSubmissionId}, ${i.productName}, ${i.resolvedProductImage},
          ${i.quantity}, ${i.price}, ${i.selectedSize}, ${i.selectedColor}, ${i.subtotal}
        );
      `;
    }

    return {
      ok: true,
      orderId,
      orderNumber,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: getRazorpayKeyId(),
      amount: amountInPaise,
      currency: "INR",
      customerName: data.shippingName,
      customerEmail: data.shippingEmail,
      customerPhone: data.shippingPhone || "",
      total,
      discountAmount,
      shipping,
      couponCode: appliedCoupon?.code ?? null,
    };
  });

export type VerifyPaymentInput = {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export const verifyOnlineOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: VerifyPaymentInput) => ({
    orderId: String(d?.orderId || "").trim(),
    razorpayOrderId: String(d?.razorpayOrderId || "").trim(),
    razorpayPaymentId: String(d?.razorpayPaymentId || "").trim(),
    razorpaySignature: String(d?.razorpaySignature || "").trim(),
  }))
  .handler(async ({ data, context }) => {
    if (!data.orderId || !data.razorpayOrderId || !data.razorpayPaymentId || !data.razorpaySignature) {
      throw new Error("Missing required payment verification parameters.");
    }

    const isValid = verifyRazorpayPaymentSignature({
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
    });

    if (!isValid) {
      console.error("[Orders] Invalid Razorpay signature:", data);
      throw new Error("Payment signature verification failed. Please contact support if your money was debited.");
    }

    await ensureDbSchema();
    const sql = getSql();
    const authCtx = context as any;

    const orderRows = await sql`
      SELECT * FROM orders WHERE id::text = ${data.orderId} LIMIT 1
    `;

    if (!orderRows || orderRows.length === 0) {
      throw new Error("Order not found for verification.");
    }

    const order = orderRows[0];

    // Reconcile order's razorpay_order_id against the incoming verification parameter
    if (order.razorpay_order_id && order.razorpay_order_id !== data.razorpayOrderId) {
      console.error("[Orders] Razorpay Order ID mismatch:", {
        expected: order.razorpay_order_id,
        received: data.razorpayOrderId,
      });
      throw new Error("Payment verification failed: Razorpay order ID mismatch.");
    }

    // IDOR check: verify that the user verifying the payment owns the order (or has matching email for guest checkout)
    const userEmail = String(authCtx.user?.email || "").toLowerCase().trim();
    if (
      order.user_id &&
      String(order.user_id) !== String(authCtx.userId) &&
      (!userEmail || String(order.shipping_email || "").toLowerCase().trim() !== userEmail)
    ) {
      throw new Error("Unauthorized: You do not have permission to verify this order.");
    }

    // Idempotency check: if order is already paid, return early
    if (order.payment_status === "Paid") {
      return {
        ok: true,
        alreadyProcessed: true,
        orderId: String(order.id),
        orderNumber: String(order.order_number),
      };
    }

    // Retrieve order items
    const orderItems = await sql`
      SELECT * FROM order_items WHERE order_id::text = ${data.orderId}
    `;

    // Atomically deduct inventory now that payment is confirmed
    try {
      await deductOrderInventory(
        data.orderId,
        (orderItems as any[]).map((i) => ({
          productId: i.product_id,
          productName: i.product_name,
          quantity: Number(i.quantity || 1),
          selectedSize: i.selected_size,
          selectedColor: i.selected_color,
        })),
        String(authCtx.userId),
      );
    } catch (invErr: any) {
      console.warn("[Orders] Inventory deduction during payment confirmation warning:", invErr);
      // Non-fatal if already deducted
    }

    // Atomically claim coupon slot if coupon was applied
    if (order.coupon_id) {
      try {
        await sql`
          UPDATE coupons
          SET used_count = used_count + 1, updated_at = NOW()
          WHERE id = ${order.coupon_id}
        `;
        const usageId = `usg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        await sql`
          INSERT INTO coupon_usage (
            id, coupon_id, order_id, customer_id, customer_email, coupon_code, discount_amount, order_amount, used_at
          ) VALUES (
            ${usageId}, ${order.coupon_id}, ${data.orderId}, ${String(authCtx.userId)}, ${String(order.shipping_email).toLowerCase().trim()},
            ${order.discount_code || ""}, ${Number(order.discount_amount || 0)}, ${Number(order.total_amount || 0)}, NOW()
          ) ON CONFLICT (id) DO NOTHING;
        `;
      } catch (couponErr) {
        console.warn("[Orders] Coupon usage tracking warning:", couponErr);
      }
    }

    // Update order status to Paid & Confirmed
    await sql`
      UPDATE orders
      SET status = 'Confirmed',
          payment_status = 'Paid',
          payment_method = 'Online Payment (Razorpay)',
          razorpay_payment_id = ${data.razorpayPaymentId},
          razorpay_signature = ${data.razorpaySignature},
          paid_at = NOW(),
          stock_state = 'Deducted',
          updated_at = NOW()
      WHERE id::text = ${data.orderId}
    `;

    // Record in payments table
    const paymentRecordId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      await sql`
        INSERT INTO payments (
          id, order_id, customer_id, transaction_id, payment_method, amount, currency,
          status, paid_at, admin_note, created_at, updated_at
        ) VALUES (
          ${paymentRecordId}, ${data.orderId}, ${String(authCtx.userId)}, ${data.razorpayPaymentId},
          'Online Payment (Razorpay)', ${Number(order.total_amount || 0)}, 'INR', 'Paid', NOW(),
          'Verified Razorpay online payment', NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `;
    } catch (payErr) {
      console.warn("[Orders] Payment log insertion warning:", payErr);
    }

    // Clear cart in Neon DB
    await sql`
      INSERT INTO carts (user_id, items, updated_at)
      VALUES (${authCtx.userId}, '[]'::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET items = '[]'::jsonb, updated_at = NOW();
    `;

    // Dispatch customer confirmation email via Brevo (fire and forget)
    sendOrderConfirmation({
      to: String(order.shipping_email),
      orderNumber: String(order.order_number),
      orderId: String(order.id),
      customerName: String(order.shipping_name),
      shippingAddress: String(order.shipping_address),
      items: (orderItems as any[]).map((i) => ({
        name: i.product_name,
        quantity: Number(i.quantity || 1),
        size: i.selected_size ?? null,
        color: i.selected_color ?? null,
        price: Number(i.price || 0).toLocaleString("en-IN"),
      })),
      subtotal: Number(order.subtotal || order.total_amount || 0).toLocaleString("en-IN"),
      discountAmount: Number(order.discount_amount || 0) > 0 ? Number(order.discount_amount).toLocaleString("en-IN") : null,
      discountCode: order.discount_code || null,
      shippingCharge: Number(order.shipping_charge || 0).toLocaleString("en-IN"),
      total: Number(order.total_amount || 0).toLocaleString("en-IN"),
      currency: "₹",
      paymentMethod: "Online Payment (Razorpay)",
      paymentStatus: "Paid",
      userId: String(authCtx.userId),
    }).catch((err) => console.warn("[Order Service] Customer email notice on online payment:", err));

    // Send store owner / admin notification
    const adminTemplateData = {
      orderNumber: String(order.order_number),
      createdAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      customerName: String(order.shipping_name),
      customerEmail: String(order.shipping_email),
      customerPhone: order.shipping_phone || null,
      shippingAddress: String(order.shipping_address),
      paymentMethod: "Online Payment (Razorpay)",
      subtotal: Number(order.subtotal || order.total_amount || 0).toLocaleString("en-IN"),
      discountAmount: Number(order.discount_amount || 0) > 0 ? Number(order.discount_amount).toLocaleString("en-IN") : null,
      couponCode: order.discount_code || null,
      shippingCharge: Number(order.shipping_charge || 0).toLocaleString("en-IN"),
      total: Number(order.total_amount || 0).toLocaleString("en-IN"),
      currency: "INR",
      hasCustomDesign: (orderItems as any[]).some((i) => !!i.design_submission_id),
      items: (orderItems as any[]).map((i) => ({
        name: i.product_name,
        quantity: Number(i.quantity || 1),
        size: i.selected_size || null,
        color: i.selected_color || null,
        price: Number(i.price || 0).toLocaleString("en-IN"),
        subtotal: Number(i.subtotal || 0).toLocaleString("en-IN"),
        isCustomDesign: !!i.design_submission_id,
      })),
    };
    sendTemplateEmail("admin-order-notification", "princevekariya9898@gmail.com", {
      templateData: adminTemplateData,
    }).catch((err) => console.warn("[Order Service] Admin email notice:", err));

    // Automated Forward Shipment fulfillment via Zippyy
    syncOrderToZippyy(String(order.id)).catch((err) =>
      console.warn("[Zippyy Auto-Dispatch] Error for online order:", err),
    );

    return {
      ok: true,
      orderId: String(order.id),
      orderNumber: String(order.order_number),
      total: Number(order.total_amount || 0),
    };
  });

export const recordPaymentFailure = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { orderId: string; reason?: string }) => ({
    orderId: String(d?.orderId || "").trim(),
    reason: d?.reason ? String(d.reason).slice(0, 300) : "Customer payment dismissed or failed",
  }))
  .handler(async ({ data }) => {
    await ensureDbSchema();
    const sql = getSql();
    try {
      await sql`
        UPDATE orders
        SET payment_status = 'Failed',
            admin_notes = COALESCE(admin_notes || ' | ', '') || ${data.reason},
            updated_at = NOW()
        WHERE id::text = ${data.orderId}
          AND payment_status = 'Pending'
      `;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message };
    }
  });

export const cancelMyOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { orderId: string; reason?: string }) => ({
    orderId: String(d.orderId),
    reason: d.reason ? String(d.reason).slice(0, 200) : "Cancelled by customer",
  }))
  .handler(async ({ data, context }) => {
    await ensureDbSchema();
    const sql = getSql();
    const authCtx = context as any;
    const userEmail = String(authCtx.user?.email || "").toLowerCase().trim();
    const rows = await sql`
      SELECT id, user_id, status, order_number FROM orders
      WHERE id::text = ${data.orderId}
        AND (user_id::text = ${String(authCtx.userId)}
          OR (user_id IS NULL AND LOWER(shipping_email) = ${userEmail})
          OR user_id::text = ${userEmail})
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error("Order not found or you are not authorized to cancel it");
    if (["Shipped", "Delivered", "Cancelled", "Returned"].includes(rows[0].status)) {
      throw new Error(
        `Order cannot be cancelled because it is already ${rows[0].status.toLowerCase()}`,
      );
    }
    const res = await restoreOrderInventory(data.orderId, data.reason, authCtx.userId);
    return { ok: true, restored: res.restoredCount, alreadyRestored: res.alreadyRestored };
  });

