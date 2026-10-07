/**
 * Automated Zippyy Order Synchronization & Fulfillment Trigger
 */
import { ensureDbSchema, getSql } from "@/lib/db";
import { createForwardShipmentV2, generateShippingLabel } from "./fulfillment";
import type { ZippyyForwardShipmentResponse } from "./types";

/**
 * Triggers automated forward shipment dispatch with Zippyy for a confirmed/paid order.
 */
export async function syncOrderToZippyy(orderId: string): Promise<ZippyyForwardShipmentResponse> {
  await ensureDbSchema();
  const sql = getSql();

  // 1. Fetch order
  const orderRows = await sql`
    SELECT * FROM orders WHERE id::text = ${orderId} LIMIT 1
  `;
  if (!orderRows || orderRows.length === 0) {
    console.warn(`[Zippyy Sync] Order ${orderId} not found`);
    throw new Error(`Order ${orderId} was not found in database.`);
  }
  const order = (orderRows as any[]).find((o: any) => String(o.id) === String(orderId)) || orderRows[0];

  // 2. Fetch order items
  let items: any[] = [];
  try {
    items = (await sql`
      SELECT * FROM order_items WHERE order_id::text = ${orderId}
    `) as any[];
  } catch {
    // If order_items query fails or is empty, use default item
  }

  if (!items || items.length === 0) {
    items = [
      {
        product_name: "Streetwear Apparel",
        quantity: 1,
        price: Number(order.total_amount || 0),
        sku: "ITEM-01",
      },
    ];
  }

  // 3. Extract shipping address & pincode
  const shippingAddrStr = String(order.shipping_address || order.shipping_address_line1 || "Street Address");
  const pincodeMatch = shippingAddrStr.match(/\b([1-9][0-9]{5})\b/);
  const pincode = order.shipping_pincode || (pincodeMatch ? pincodeMatch[1] : "395006");

  const isCod =
    order.payment_method?.includes("COD") ||
    order.payment_method === "Cash on Delivery";

  // 4. Dispatch forward shipment to Zippyy
  const forwardRes = await createForwardShipmentV2({
    orderId: String(order.id),
    orderNumber: String(order.order_number || order.id),
    pickupWarehouseId: process.env.ZIPPYY_DEFAULT_WAREHOUSE_ID || "wh_default_01",
    paymentType: isCod ? "COD" : "PREPAID",
    orderValue: Number(order.total_amount || 0),
    collectableAmount: isCod ? Number(order.total_amount || 0) : 0,
    customerName: String(order.shipping_name || order.shipping_full_name || "Customer"),
    customerEmail: String(order.shipping_email || "customer@example.com"),
    customerPhone: String(order.shipping_phone || "9876543210"),
    shippingAddress: {
      address1: shippingAddrStr,
      city: String(order.shipping_city || "City"),
      state: String(order.shipping_state || "State"),
      pincode: String(pincode),
      country: "India",
    },
    items: items.map((i: any) => ({
      name: i.product_name || i.name || "Apparel",
      units: Number(i.quantity || 1),
      sellingPrice: Number(i.price || 0),
      sku: i.sku || "SKU-ITEM",
    })),
    packageDetails: {
      weightGrams: Math.max(
        items.reduce(
          (sum: number, item: any) => sum + Number(item.quantity || 1) * 350,
          0,
        ),
        500,
      ),
      lengthCm: 25,
      breadthCm: 20,
      heightCm: 5,
    },
  });

  // 5. Fetch shipping label
  let labelUrl = forwardRes.shippingLabelUrl;
  if (forwardRes.zippyyShipmentId) {
    try {
      const labelRes = await generateShippingLabel(
        forwardRes.zippyyShipmentId,
        forwardRes.awbNumber,
      );
      if (labelRes?.labelUrl) {
        labelUrl = labelRes.labelUrl;
      }
    } catch {
      // Keep existing labelUrl
    }
  }

  // 6. Update orders table with tracking & Zippyy references safely
  try {
    await sql`
      UPDATE orders
      SET 
        courier_name = ${forwardRes.courierName},
        tracking_number = ${forwardRes.awbNumber},
        tracking_url = ${`https://zippyy.in/track/${forwardRes.awbNumber}`},
        status = 'Shipped',
        shipped_at = COALESCE(shipped_at, NOW()),
        updated_at = NOW()
      WHERE id::text = ${String(orderId)}
    `;
  } catch (updateErr) {
    console.warn("[Zippyy Sync] Order update note:", updateErr);
  }

  // 7. Insert or update shipments table safely
  try {
    const shipmentRowId = `shp_${String(orderId).replace(/^ord_/, "")}`;
    const estDelivery = forwardRes.estimatedDeliveryDate
      ? new Date(forwardRes.estimatedDeliveryDate).toISOString()
      : new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO shipments (
        id, order_id, customer_id, customer_name, tracking_number, carrier, shipping_method,
        shipping_cost, estimated_delivery_date, status, shipping_address,
        city, state, postal_code, country, shipped_at, created_at, updated_at
      ) VALUES (
        ${shipmentRowId}, ${order.id}, ${order.user_id || "usr_guest"}, ${order.shipping_name || "Customer"},
        ${forwardRes.awbNumber}, ${forwardRes.courierName}, 'Standard', ${Number(order.shipping_charge || 0)},
        ${estDelivery}, 'Packed', ${shippingAddrStr},
        ${order.shipping_city || "City"}, ${order.shipping_state || "State"}, ${String(pincode)}, 'India',
        NOW(), NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        tracking_number = EXCLUDED.tracking_number,
        carrier = EXCLUDED.carrier,
        status = 'Packed',
        updated_at = NOW()
    `;
  } catch (shipmentErr) {
    console.warn("[Zippyy Sync] Shipments table notice:", shipmentErr);
  }

  // 8. Record initial event in tracking events safely
  try {
    const eventId = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await sql`
      INSERT INTO shipment_tracking_events (
        id, order_id, awb_number, status, location, activity, event_time, raw_payload, created_at
      ) VALUES (
        ${eventId}, ${order.id}, ${forwardRes.awbNumber}, 'Packed', 'Warehouse Hub',
        'Shipment booked on Zippyy & AWB allocated', NOW(),
        ${JSON.stringify(forwardRes)}, NOW()
      )
    `;
  } catch (trkErr) {
    console.warn("[Zippyy Sync] Tracking event notice:", trkErr);
  }

  return {
    ...forwardRes,
    shippingLabelUrl: labelUrl,
  };
}
