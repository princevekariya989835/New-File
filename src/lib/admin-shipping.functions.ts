import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { ensureDbSchema, getSql } from "@/lib/db";
import { sendOrderShipped, sendOutForDelivery, sendOrderDelivered } from "@/lib/email";
import { syncOrderToZippyy, actionZippyyNdr } from "@/lib/zippyy";

export type ShipmentStatus =
  | "Pending"
  | "Processing"
  | "Packed"
  | "Shipped"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Failed"
  | "Cancelled"
  | "Returned";

export type ShippingMethod = "Standard" | "Express" | "Same Day" | "Free Shipping";
export type Carrier = "Delhivery" | "Blue Dart" | "DTDC" | "Ecom Express" | "India Post" | "Other";

export type AdminShipment = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  trackingNumber: string | null;
  carrier: Carrier;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  status: ShipmentStatus;
  shippingAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  adminNote: string | null;
  updatedBy: string | null;
  zippyyOrderId?: string | null;
  zippyyShipmentId?: string | null;
  shippingLabelUrl?: string | null;
  manifestUrl?: string | null;
  ndrStatus?: string | null;
  ndrLastReason?: string | null;
  ndrAttempts?: number | null;
  orderItems: Array<{
    id: string;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
};

export const VALID_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  Pending: ["Processing", "Cancelled", "Packed"],
  Processing: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["In Transit", "Failed", "Delivered"],
  "In Transit": ["Out for Delivery", "Failed", "Delivered"],
  "Out for Delivery": ["Delivered", "Failed"],
  Delivered: ["Returned"],
  Failed: ["Processing", "Shipped", "Cancelled"],
  Cancelled: [],
  Returned: [],
};

async function seedShipmentsIfEmpty() {
  const sql = getSql();
  const countRes = await sql`SELECT COUNT(*) as count FROM shipments`;
  const count = Number(countRes[0]?.count || 0);
  if (count === 0) {
    const orders = await sql`
      SELECT id, order_number, user_id, shipping_name, shipping_email, shipping_phone, shipping_address, shipping_charge, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 15
    `;
    const carriers: Carrier[] = ["Delhivery", "Blue Dart", "DTDC", "Ecom Express", "India Post"];
    const methods: ShippingMethod[] = ["Standard", "Express", "Same Day", "Free Shipping"];
    const statuses: ShipmentStatus[] = [
      "Pending",
      "Processing",
      "Packed",
      "Shipped",
      "In Transit",
      "Out for Delivery",
      "Delivered",
      "Failed",
      "Returned",
    ];

    let i = 0;
    for (const o of orders as any[]) {
      const sId = `shp_${o.id || Math.random().toString(36).slice(2, 9)}`;
      const carrier = carriers[i % carriers.length];
      const method = methods[i % methods.length];
      const status = statuses[i % statuses.length];
      const tracking =
        status !== "Pending" ? `TRK${Math.floor(100000000 + Math.random() * 900000000)}` : null;
      const cost = Number(
        o.shipping_charge || (method === "Express" ? 150 : method === "Same Day" ? 250 : 0),
      );

      const createdD = new Date(o.created_at || Date.now());
      const estD = new Date(createdD.getTime() + 4 * 24 * 60 * 60 * 1000);
      const shippedD = [
        "Shipped",
        "In Transit",
        "Out for Delivery",
        "Delivered",
        "Returned",
      ].includes(status)
        ? new Date(createdD.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const deliveredD =
        status === "Delivered"
          ? new Date(createdD.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : null;

      try {
        await sql`
          INSERT INTO shipments (
            id, order_id, customer_id, customer_name, tracking_number, carrier, shipping_method,
            shipping_cost, estimated_delivery_date, actual_delivery_date, status, shipping_address,
            city, state, postal_code, country, shipped_at, delivered_at, admin_note, created_at, updated_at
          ) VALUES (
            ${sId}, ${o.id}, ${o.user_id || "usr_guest"}, ${o.shipping_name || "Customer"}, ${tracking},
            ${carrier}, ${method}, ${cost}, ${estD.toISOString()}, ${deliveredD}, ${status},
            ${o.shipping_address || "123 MG Road"}, 'Mumbai', 'Maharashtra', '400001', 'India',
            ${shippedD}, ${deliveredD}, ${i % 3 === 0 ? "Handle with care" : null}, ${o.created_at}, NOW()
          ) ON CONFLICT (id) DO NOTHING
        `;
      } catch (err) {
        console.error("Error seeding shipment:", err);
      }
      i++;
    }
  }
}

export const adminListShipments = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminShipment[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    await seedShipmentsIfEmpty();

    const sql = getSql();
    const shipmentsRows = await sql`
      SELECT s.*, o.order_number, o.shipping_email, o.shipping_phone
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      ORDER BY s.created_at DESC
    `;

    const orderIds = shipmentsRows.map((s: any) => s.order_id).filter(Boolean);
    const itemsMap = new Map<string, any[]>();
    if (orderIds.length > 0) {
      const itemsRows = await sql`
        SELECT id, order_id, product_name, product_image, quantity, price, selected_size, selected_color
        FROM order_items
        WHERE order_id = ANY(${orderIds})
      `;
      for (const item of itemsRows as any[]) {
        const list = itemsMap.get(item.order_id) || [];
        list.push({
          id: String(item.id),
          productName: item.product_name || "Product",
          productImage: item.product_image || undefined,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          size: item.selected_size || undefined,
          color: item.selected_color || undefined,
        });
        itemsMap.set(item.order_id, list);
      }
    }

    return shipmentsRows.map((s: any) => ({
      id: String(s.id),
      orderId: String(s.order_id || ""),
      orderNumber: String(s.order_number || s.order_id || "ORD-XXXX"),
      customerId: String(s.customer_id || ""),
      customerName: String(s.customer_name || "Customer"),
      customerEmail: s.shipping_email || undefined,
      customerPhone: s.shipping_phone || undefined,
      trackingNumber: s.tracking_number || null,
      carrier: (s.carrier as Carrier) || "Delhivery",
      shippingMethod: (s.shipping_method as ShippingMethod) || "Standard",
      shippingCost: Number(s.shipping_cost || 0),
      estimatedDeliveryDate: s.estimated_delivery_date
        ? new Date(s.estimated_delivery_date).toISOString()
        : null,
      actualDeliveryDate: s.actual_delivery_date
        ? new Date(s.actual_delivery_date).toISOString()
        : null,
      status: (s.status as ShipmentStatus) || "Pending",
      shippingAddress: String(s.shipping_address || ""),
      city: String(s.city || "Mumbai"),
      state: String(s.state || "Maharashtra"),
      postalCode: String(s.postal_code || "400001"),
      country: String(s.country || "India"),
      createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
      shippedAt: s.shipped_at ? new Date(s.shipped_at).toISOString() : null,
      deliveredAt: s.delivered_at ? new Date(s.delivered_at).toISOString() : null,
      updatedAt: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString(),
      adminNote: s.admin_note || null,
      updatedBy: s.updated_by || null,
      orderItems: itemsMap.get(s.order_id) || [],
    }));
  });

export const adminUpdateShipmentStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { shipmentId: string; newStatus: ShipmentStatus; adminNote?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const authCtx = context as any;

    const current = await sql`SELECT status FROM shipments WHERE id = ${data.shipmentId} LIMIT 1`;
    if (current.length === 0) {
      throw new Error("Shipment not found");
    }
    const currentStatus = current[0].status as ShipmentStatus;
    const allowed = VALID_SHIPMENT_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(data.newStatus) && currentStatus !== data.newStatus) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${data.newStatus}`);
    }

    const now = new Date().toISOString();
    let shippedAtSql = null;
    let deliveredAtSql = null;

    if (data.newStatus === "Shipped") {
      shippedAtSql = now;
    }
    if (data.newStatus === "Delivered") {
      deliveredAtSql = now;
    }

    await sql`
      UPDATE shipments
      SET status = ${data.newStatus},
          updated_at = NOW(),
          updated_by = ${authCtx.userId},
          shipped_at = COALESCE(${shippedAtSql}, shipped_at),
          delivered_at = COALESCE(${deliveredAtSql}, delivered_at),
          actual_delivery_date = COALESCE(${deliveredAtSql}, actual_delivery_date),
          admin_note = COALESCE(${data.adminNote || null}, admin_note)
      WHERE id = ${data.shipmentId}
    `;

    await logAudit(context as any, "shipment.status_update", "shipment", data.shipmentId, {
      from: currentStatus,
      to: data.newStatus,
    });

    // Fire status-transition transactional emails (fire and forget, idempotent)
    if (currentStatus !== data.newStatus) {
      try {
        // Fetch order + customer details for the email
        const orderRow = await sql`
          SELECT o.id, o.order_number, o.shipping_email, o.shipping_name, o.user_id,
                 o.courier_name, o.tracking_number, o.tracking_url
          FROM shipments s
          JOIN orders o ON s.order_id = o.id
          WHERE s.id = ${data.shipmentId}
          LIMIT 1
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
          if (data.newStatus === "Shipped") {
            sendOrderShipped({
              ...baseOpts,
              courierName: o.courier_name || null,
              trackingNumber: o.tracking_number || null,
              trackingUrl: o.tracking_url || null,
            }).catch((e) => console.warn("[Shipping] Shipped email failed:", e));
          } else if (data.newStatus === "Out for Delivery") {
            sendOutForDelivery(baseOpts).catch((e) =>
              console.warn("[Shipping] Out-for-delivery email failed:", e),
            );
          } else if (data.newStatus === "Delivered") {
            sendOrderDelivered(baseOpts).catch((e) =>
              console.warn("[Shipping] Delivered email failed:", e),
            );
          }
        }
      } catch (emailErr) {
        console.warn("[Shipping] Email dispatch lookup failed (non-fatal):", emailErr);
      }
    }

    return { ok: true as const };
  });

export const adminSaveTrackingNumber = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { shipmentId: string; trackingNumber: string; carrier?: Carrier }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const authCtx = context as any;

    await sql`
      UPDATE shipments
      SET tracking_number = ${data.trackingNumber},
          carrier = COALESCE(${data.carrier || null}, carrier),
          updated_at = NOW(),
          updated_by = ${authCtx.userId}
      WHERE id = ${data.shipmentId}
    `;

    await logAudit(context as any, "shipment.tracking_update", "shipment", data.shipmentId, {
      trackingNumber: data.trackingNumber,
    });

    return { ok: true as const };
  });

export const adminCreateShipment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      orderId: string;
      carrier: Carrier;
      shippingMethod: ShippingMethod;
      shippingCost: number;
      trackingNumber?: string;
      estimatedDeliveryDate?: string;
      shippingAddress: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      adminNote?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const authCtx = context as any;

    const orderRes = await sql`
      SELECT id, user_id, shipping_name, shipping_address
      FROM orders
      WHERE id = ${data.orderId}
      LIMIT 1
    `;
    if (orderRes.length === 0) {
      throw new Error("Order not found");
    }
    const order = orderRes[0];
    const sId = `shp_${Math.random().toString(36).slice(2, 10)}`;

    await sql`
      INSERT INTO shipments (
        id, order_id, customer_id, customer_name, tracking_number, carrier, shipping_method,
        shipping_cost, estimated_delivery_date, status, shipping_address, city, state, postal_code,
        country, admin_note, updated_by, created_at, updated_at
      ) VALUES (
        ${sId}, ${order.id}, ${order.user_id || "usr_guest"}, ${order.shipping_name || "Customer"},
        ${data.trackingNumber || null}, ${data.carrier}, ${data.shippingMethod}, ${data.shippingCost},
        ${data.estimatedDeliveryDate || null}, 'Pending', ${data.shippingAddress}, ${data.city},
        ${data.state}, ${data.postalCode}, ${data.country || "India"}, ${data.adminNote || null},
        ${authCtx.userId}, NOW(), NOW()
      )
    `;

    await logAudit(context as any, "shipment.create", "shipment", sId, { orderId: order.id });
    return { ok: true as const, shipmentId: sId };
  });

export const adminSyncZippyyShipment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const result = await syncOrderToZippyy(data.orderId);
    if (!result) {
      throw new Error("Failed to sync shipment with Zippyy.");
    }
    await logAudit(context as any, "shipment.zippyy_sync", "order", data.orderId, {
      awbNumber: result.awbNumber,
      courier: result.courierName,
    });
    return { ok: true as const, shipment: result };
  });

export const adminResolveNdr = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      shipmentId: string;
      awbNumber?: string;
      action: "REATTEMPT" | "RTO";
      remarks?: string;
      deferredDate?: string;
      updatedPhone?: string;
      updatedAddress?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const authCtx = context as any;

    const res = await actionZippyyNdr({
      shipmentId: data.shipmentId,
      awbNumber: data.awbNumber,
      action: data.action,
      remarks: data.remarks,
      deferredDate: data.deferredDate,
      updatedPhone: data.updatedPhone,
      updatedAddress: data.updatedAddress,
    });

    const newNdrStatus = data.action === "REATTEMPT" ? "Reattempt_Requested" : "RTO_Initiated";
    await sql`
      UPDATE shipments
      SET ndr_status = ${newNdrStatus},
          admin_note = COALESCE(admin_note || ' | ', '') || ${`NDR Action: ${data.action} - ${data.remarks || ''}`},
          updated_at = NOW(),
          updated_by = ${authCtx.userId}
      WHERE id = ${data.shipmentId} OR tracking_number = ${data.awbNumber}
    `;

    await logAudit(context as any, "shipment.ndr_action", "shipment", data.shipmentId, {
      action: data.action,
      remarks: data.remarks,
    });

    return { ok: true as const, result: res };
  });

export const adminGetTrackingEvents = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { orderId?: string; awbNumber?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const events = await sql`
      SELECT id, order_id, awb_number, status, location, activity, event_time, created_at
      FROM shipment_tracking_events
      WHERE (${data.orderId || null}::text IS NOT NULL AND order_id = ${data.orderId})
         OR (${data.awbNumber || null}::text IS NOT NULL AND awb_number = ${data.awbNumber})
      ORDER BY event_time DESC, created_at DESC
      LIMIT 50
    `;

    return events as any[];
  });
