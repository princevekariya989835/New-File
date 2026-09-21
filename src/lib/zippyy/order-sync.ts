/**
 * Automated Zippyy Order Synchronization & Fulfillment Trigger
 */
import { ensureDbSchema, getSql } from "@/lib/db";
import { createForwardShipmentV2, generateShippingLabel } from "./fulfillment";
import type { ZippyyForwardShipmentResponse } from "./types";

/**
 * Triggers automated forward shipment dispatch with Zippyy for a confirmed/paid order.
 */
export async function syncOrderToZippyy(orderId: string): Promise<ZippyyForwardShipmentResponse | null> {
  try {
    await ensureDbSchema();
    const sql = getSql();

    // 1. Fetch order
    const orderRows = await sql`
      SELECT * FROM orders WHERE id::text = ${orderId} LIMIT 1
    `;
    if (!orderRows || orderRows.length === 0) {
      console.warn(`[Zippyy Sync] Order ${orderId} not found`);
      return null;
    }
    const order = orderRows[0];

    // 2. Fetch order items
    const items = await sql`
      SELECT * FROM order_items WHERE order_id::text = ${orderId}
    `;

    // 3. Extract shipping address & pincode
    const shippingAddrStr = String(order.shipping_address || "");
    const pincodeMatch = shippingAddrStr.match(/\b([1-9][0-9]{5})\b/);
    const pincode = pincodeMatch ? pincodeMatch[1] : "400001";

    const isCod = order.payment_method?.includes("COD") || order.payment_method === "Cash on Delivery";

    // 4. Dispatch forward shipment to Zippyy
    const forwardRes = await createForwardShipmentV2({
      orderId: String(order.id),
      orderNumber: String(order.order_number),
      pickupWarehouseId: process.env.ZIPPYY_DEFAULT_WAREHOUSE_ID || "wh_default_01",
      paymentType: isCod ? "COD" : "PREPAID",
      orderValue: Number(order.total_amount || 0),
      collectableAmount: isCod ? Number(order.total_amount || 0) : 0,
      customerName: String(order.shipping_name || "Customer"),
      customerEmail: String(order.shipping_email || "customer@example.com"),
      customerPhone: String(order.shipping_phone || "9876543210"),
      shippingAddress: {
        address1: shippingAddrStr,
        city: String(order.shipping_city || "City"),
        state: String(order.shipping_state || "State"),
        pincode: pincode,
        country: "India",
      },
      items: (items as any[]).map((i) => ({
        name: i.product_name,
        units: Number(i.quantity || 1),
        sellingPrice: Number(i.price || 0),
      })),
      packageDetails: {
        weightGrams: Math.max((items as any[]).reduce((sum, item) => sum + (Number(item.quantity || 1) * 350), 0), 500),
        lengthCm: 25,
        breadthCm: 20,
        heightCm: 5,
      },
    });

    // 5. Fetch shipping label
    let labelUrl = forwardRes.shippingLabelUrl;
    if (forwardRes.zippyyShipmentId) {
      const labelRes = await generateShippingLabel(forwardRes.zippyyShipmentId, forwardRes.awbNumber);
      if (labelRes.labelUrl) {
        labelUrl = labelRes.labelUrl;
      }
    }

    // 6. Update orders table with tracking & Zippyy references
    await sql`
      UPDATE orders
      SET 
        courier_name = ${forwardRes.courierName},
        tracking_number = ${forwardRes.awbNumber},
        tracking_url = ${`https://zippyy.in/track/${forwardRes.awbNumber}`},
        zippyy_order_id = ${forwardRes.zippyyOrderId},
        zippyy_shipment_id = ${forwardRes.zippyyShipmentId},
        shipping_label_url = ${labelUrl || null},
        updated_at = NOW()
      WHERE id::text = ${orderId}
    `;

    // 7. Insert or update shipments table
    const shipmentRowId = `shp_${orderId.replace(/^ord_/, "")}`;
    const estDelivery = forwardRes.estimatedDeliveryDate
      ? new Date(forwardRes.estimatedDeliveryDate).toISOString()
      : new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO shipments (
        id, order_id, customer_id, customer_name, tracking_number, carrier, shipping_method,
        shipping_cost, estimated_delivery_date, status, shipping_address,
        city, state, postal_code, country, zippyy_order_id, zippyy_shipment_id,
        shipping_label_url, manifest_url, ndr_status, created_at, updated_at
      ) VALUES (
        ${shipmentRowId}, ${order.id}, ${order.user_id || "usr_guest"}, ${order.shipping_name},
        ${forwardRes.awbNumber}, ${forwardRes.courierName}, 'Standard', ${Number(order.shipping_charge || 0)},
        ${estDelivery}::timestamptz, 'Packed', ${shippingAddrStr},
        ${order.shipping_city || 'City'}, ${order.shipping_state || 'State'}, ${pincode}, 'India',
        ${forwardRes.zippyyOrderId}, ${forwardRes.zippyyShipmentId}, ${labelUrl || null},
        ${forwardRes.manifestUrl || null}, 'None', NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        tracking_number = EXCLUDED.tracking_number,
        carrier = EXCLUDED.carrier,
        status = 'Packed',
        zippyy_order_id = EXCLUDED.zippyy_order_id,
        zippyy_shipment_id = EXCLUDED.zippyy_shipment_id,
        shipping_label_url = EXCLUDED.shipping_label_url,
        manifest_url = EXCLUDED.manifest_url,
        updated_at = NOW()
    `;

    // 8. Record initial event in tracking events
    const eventId = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await sql`
      INSERT INTO shipment_tracking_events (
        id, order_id, awb_number, status, location, activity, event_time, raw_payload, created_at
      ) VALUES (
        ${eventId}, ${order.id}, ${forwardRes.awbNumber}, 'Packed', 'Warehouse Hub',
        'Shipment booked on Zippyy & AWB allocated', NOW(),
        ${JSON.stringify(forwardRes)}::jsonb, NOW()
      )
    `;

    return forwardRes;
  } catch (err) {
    console.error(`[Zippyy Sync] Automated order sync error for ${orderId}:`, err);
    return null;
  }
}
