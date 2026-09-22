import { createFileRoute } from "@tanstack/react-router";
import { ensureDbSchema, getSql } from "@/lib/db";
import { getZippyyConfig } from "@/lib/zippyy/client";
import type { ZippyyWebhookPayload } from "@/lib/zippyy/types";

export const Route = createFileRoute("/api/zippyy/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const config = getZippyyConfig();
          const rawBody = await request.text();

          // Optional secret/signature verification if secret is configured
          if (config.webhookSecret) {
            const authHeader =
              request.headers.get("x-zippyy-signature") ||
              request.headers.get("x-webhook-secret") ||
              request.headers.get("authorization") ||
              "";

            if (!authHeader.includes(config.webhookSecret)) {
              console.warn("[Zippyy Webhook] Unauthorized webhook attempt rejected");
              return new Response(JSON.stringify({ error: "Invalid webhook signature or secret" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
              });
            }
          }

          let payload: ZippyyWebhookPayload;
          try {
            payload = JSON.parse(rawBody);
          } catch {
            return new Response(JSON.stringify({ error: "Malformed JSON payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const event = payload.event;
          const data = payload.data || (payload as any);
          const awb = data.awbNumber || (data as any).awb_number || "";
          const orderId = data.orderId || (data as any).order_id || "";
          const status = (data.status || event || "").toUpperCase();

          console.log(`[Zippyy Webhook] Received ${event} for Order: ${orderId}, AWB: ${awb}, Status: ${status}`);

          await ensureDbSchema();
          const sql = getSql();

          // 1. Map Zippyy status to our internal Shipment Status
          let internalStatus = "In Transit";
          let isDelivered = false;
          let isNdr = false;
          let isRto = false;
          const ndrReason = data.ndrReason || (data as any).reason || null;

          if (event === "DELIVERED" || status === "DELIVERED") {
            internalStatus = "Delivered";
            isDelivered = true;
          } else if (event === "OUT_FOR_DELIVERY" || status === "OUT_FOR_DELIVERY") {
            internalStatus = "Out for Delivery";
          } else if (event === "PICKED_UP" || event === "IN_TRANSIT" || status === "IN_TRANSIT" || status === "PICKED_UP") {
            internalStatus = "In Transit";
          } else if (event === "NDR_RAISED" || event === "NDR_REATTEMPT" || status.includes("NDR") || status.includes("UNDELIVERED")) {
            internalStatus = "Failed";
            isNdr = true;
          } else if (event === "RTO_INITIATED" || event === "RTO_DELIVERED" || status.includes("RTO")) {
            internalStatus = "Returned";
            isRto = true;
          } else if (event === "CANCELLED" || status === "CANCELLED") {
            internalStatus = "Cancelled";
          }

          // 2. Update shipments table if record exists
          if (awb || orderId) {
            const ndrStatusVal = isNdr ? "Action_Required" : isRto ? "RTO_Initiated" : "None";
            const nowIso = new Date().toISOString();

            try {
              if (awb) {
                await sql`
                  UPDATE shipments
                  SET 
                    status = ${internalStatus},
                    tracking_number = COALESCE(tracking_number, ${awb}),
                    carrier = COALESCE(carrier, ${data.courierName || "Delhivery"}),
                    actual_delivery_date = CASE WHEN ${isDelivered} THEN ${nowIso}::timestamptz ELSE actual_delivery_date END,
                    ndr_status = ${ndrStatusVal},
                    ndr_last_reason = COALESCE(${ndrReason}, ndr_last_reason),
                    ndr_attempts = CASE WHEN ${isNdr} THEN COALESCE(ndr_attempts, 0) + 1 ELSE ndr_attempts END,
                    updated_at = NOW()
                  WHERE tracking_number = ${awb} OR order_id = ${orderId}
                `;
              }

              // Update main orders table status
              if (orderId) {
                await sql`
                  UPDATE orders
                  SET 
                    status = CASE 
                      WHEN ${isDelivered} THEN 'Delivered'
                      WHEN ${isRto} THEN 'Returned'
                      WHEN ${internalStatus === 'In Transit'} THEN 'In Transit'
                      WHEN ${internalStatus === 'Out for Delivery'} THEN 'Out for Delivery'
                      ELSE status
                    END,
                    delivered_at = CASE WHEN ${isDelivered} THEN ${nowIso}::timestamptz ELSE delivered_at END,
                    updated_at = NOW()
                  WHERE id = ${orderId} OR order_number = ${orderId}
                `;
              }

              // 3. Log event to shipment_tracking_events
              const eventId = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              await sql`
                INSERT INTO shipment_tracking_events (
                  id, order_id, awb_number, status, location, activity, event_time, raw_payload, created_at
                ) VALUES (
                  ${eventId},
                  ${orderId || "unknown"},
                  ${awb || "unknown"},
                  ${internalStatus},
                  ${data.location || null},
                  ${data.activity || (data as any).status_description || event},
                  ${data.eventTime ? new Date(data.eventTime).toISOString() : nowIso},
                  ${JSON.stringify(payload)}::jsonb,
                  NOW()
                )
              `;
            } catch (dbErr) {
              console.error("[Zippyy Webhook] Database update error:", dbErr);
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "Webhook event processed successfully",
              receivedEvent: event,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err: any) {
          console.error("[Zippyy Webhook] Unhandled exception:", err);
          return new Response(
            JSON.stringify({ error: "Internal server error processing webhook", details: err?.message }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
