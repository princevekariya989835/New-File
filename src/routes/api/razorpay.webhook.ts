import { createFileRoute } from "@tanstack/react-router";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay.server";
import { ensureDbSchema, getSql } from "@/lib/db";
import { deductOrderInventory } from "@/lib/inventory.service";
import { sendOrderConfirmation } from "@/lib/email";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { syncOrderToZippyy } from "@/lib/zippyy";

export const Route = createFileRoute("/api/razorpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const signature = request.headers.get("x-razorpay-signature") || "";
          const rawBody = await request.text();

          if (!signature) {
            return new Response(JSON.stringify({ error: "Missing x-razorpay-signature header" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const isValid = verifyRazorpayWebhookSignature({
            rawBody,
            signature,
          });

          if (!isValid) {
            console.error("[Razorpay Webhook] Invalid signature rejected");
            return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          let eventData: any;
          try {
            eventData = JSON.parse(rawBody);
          } catch {
            return new Response(JSON.stringify({ error: "Malformed JSON" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const event = eventData.event;
          console.log("[Razorpay Webhook] Received event:", event);

          await ensureDbSchema();
          const sql = getSql();

          if (event === "payment.captured" || event === "order.paid") {
            const paymentEntity = eventData.payload?.payment?.entity;
            const orderEntity = eventData.payload?.order?.entity;

            const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
            const rzpPaymentId = paymentEntity?.id || eventData.payload?.payment?.entity?.id;

            if (rzpOrderId) {
              const orderRows = await sql`
                SELECT * FROM orders WHERE razorpay_order_id::text = ${rzpOrderId} LIMIT 1
              `;

              if (orderRows && orderRows.length > 0) {
                const order = orderRows[0];

                if (order.payment_status !== "Paid") {
                  const expectedPaise = Math.round(Number(order.total_amount || 0) * 100);
                  const actualPaise = paymentEntity?.amount ? Number(paymentEntity.amount) : expectedPaise;
                  if (actualPaise < expectedPaise) {
                    console.error("[Razorpay Webhook] Captured amount is less than order total:", {
                      expectedPaise,
                      actualPaise,
                      orderId: order.id,
                    });
                    return new Response(JSON.stringify({ error: "Payment amount mismatch" }), {
                      status: 400,
                      headers: { "Content-Type": "application/json" },
                    });
                  }

                  const orderItems = await sql`
                    SELECT * FROM order_items WHERE order_id::text = ${order.id}
                  `;

                  // Deduct inventory idempotently
                  try {
                    await deductOrderInventory(
                      String(order.id),
                      (orderItems as any[]).map((i) => ({
                        productId: i.product_id,
                        productName: i.product_name,
                        quantity: Number(i.quantity || 1),
                        selectedSize: i.selected_size,
                        selectedColor: i.selected_color,
                      })),
                      String(order.user_id || "system"),
                    );
                  } catch (invErr) {
                    console.warn("[Razorpay Webhook] Inventory deduction warning:", invErr);
                  }

                  // Claim coupon if applicable
                  if (order.coupon_id) {
                    try {
                      await sql`
                        UPDATE coupons
                        SET used_count = used_count + 1, updated_at = NOW()
                        WHERE id = ${order.coupon_id}
                      `;
                    } catch {
                      /* non-fatal */
                    }
                  }

                  // Update order state
                  await sql`
                    UPDATE orders
                    SET status = 'Confirmed',
                        payment_status = 'Paid',
                        payment_method = 'Online Payment (Razorpay)',
                        razorpay_payment_id = COALESCE(${rzpPaymentId || null}, razorpay_payment_id),
                        paid_at = COALESCE(paid_at, NOW()),
                        stock_state = 'Deducted',
                        updated_at = NOW()
                    WHERE id::text = ${order.id}
                  `;

                  // Record in payments table
                  if (rzpPaymentId) {
                    const paymentRecordId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
                    try {
                      await sql`
                        INSERT INTO payments (
                          id, order_id, customer_id, transaction_id, payment_method, amount, currency,
                          status, paid_at, admin_note, created_at, updated_at
                        ) VALUES (
                          ${paymentRecordId}, ${order.id}, ${order.user_id || "usr_guest"}, ${rzpPaymentId},
                          'Online Payment (Razorpay)', ${Number(order.total_amount || 0)}, 'INR', 'Paid', NOW(),
                          'Webhook confirmed Razorpay payment', NOW(), NOW()
                        ) ON CONFLICT (id) DO NOTHING;
                      `;
                    } catch (payErr) {
                      console.warn("[Razorpay Webhook] Payment log insertion warning:", payErr);
                    }
                  }

                  // Send customer confirmation email
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
                    userId: String(order.user_id || ""),
                  }).catch((err) => console.warn("[Razorpay Webhook] Customer email error:", err));

                  // Send admin notification
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
                  }).catch((err) => console.warn("[Razorpay Webhook] Admin email notice:", err));

                  // Automated Forward Shipment fulfillment via Zippyy
                  syncOrderToZippyy(String(order.id)).catch((err) =>
                    console.warn("[Zippyy Webhook Auto-Dispatch] Error:", err),
                  );
                }
              }
            }
          } else if (event === "payment.failed") {
            const paymentEntity = eventData.payload?.payment?.entity;
            const rzpOrderId = paymentEntity?.order_id;
            const errorDesc = paymentEntity?.error_description || "Payment failed via Razorpay";

            if (rzpOrderId) {
              await sql`
                UPDATE orders
                SET payment_status = 'Failed',
                    admin_notes = COALESCE(admin_notes || ' | ', '') || ${errorDesc},
                    updated_at = NOW()
                WHERE razorpay_order_id::text = ${rzpOrderId}
                  AND payment_status = 'Pending'
              `;
            }
          }

          return new Response(JSON.stringify({ status: "ok", event }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          console.error("[Razorpay Webhook] Error processing webhook:", error);
          return new Response(JSON.stringify({ error: error?.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
