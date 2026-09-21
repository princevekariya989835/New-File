/**
 * RIOTOUS Return Email Notifications (Brevo)
 * Server-only — never import from client components.
 *
 * Replaces legacy Resend-based return email delivery.
 * Records each return event in return_notifications for idempotency.
 * Email delivery is via the central Brevo service.
 * Never throws: email failures must not break return workflows.
 */
import type { ReturnEmailEvent } from "@/lib/returns-shared";
import { sendBrevoEmail, BREVO_SENDER_ORDERS, BREVO_REPLY_TO } from "@/lib/email/brevo";
import { ensureDbSchema, getSql } from "@/lib/db";

type ReturnLike = {
  id: string;
  return_number: string;
  order_number: string | null;
  product_name: string;
  quantity: number;
  reason: string;
  status: string;
  rejection_reason: string | null;
  admin_message: string | null;
  pickup_details: string | null;
  refund_amount: number | null;
  refund_reference: string | null;
  refunded_at: string | null;
  currency: string;
};

const BRAND = "RIOTOUS";

export function emailContent(event: ReturnEmailEvent, r: ReturnLike) {
  const orderId = r.order_number ?? r.id.slice(0, 8);
  const base = [
    `Return ID: ${r.return_number}`,
    `Order ID: ${orderId}`,
    `Product: ${r.product_name}`,
    `Quantity: ${r.quantity}`,
    `Reason: ${r.reason}`,
    `Current status: ${r.status}`,
  ];

  switch (event) {
    case "requested":
      return {
        subject: `Return Request Received - Order #${orderId}`,
        lines: [
          "We've received your return request.",
          "",
          ...base,
          "",
          "What happens next: our team reviews your request, then you'll get an email once it's approved or rejected. If approved we'll schedule a pickup.",
        ],
      };
    case "approved":
      return {
        subject: `Your Return Has Been Approved - Return #${r.return_number}`,
        lines: [
          "Good news — your return has been approved.",
          "",
          ...base,
          r.admin_message ? `\nNote from our team: ${r.admin_message}` : "",
          "",
          "Next steps: keep the item with its original packaging. We'll email you again once the pickup is scheduled.",
        ],
      };
    case "rejected":
      return {
        subject: `Return Request Update - Return #${r.return_number}`,
        lines: [
          "Your return request could not be approved.",
          "",
          ...base,
          `\nReason: ${r.rejection_reason ?? "Not specified"}`,
          "",
          "If you think this is a mistake, reply to this email or raise a support request from your account.",
        ],
      };
    case "pickup_scheduled":
      return {
        subject: `Return Pickup Scheduled - Return #${r.return_number}`,
        lines: [
          "Your return pickup has been scheduled.",
          "",
          ...base,
          r.pickup_details ? `\nPickup details: ${r.pickup_details}` : "",
        ],
      };
    case "received":
      return {
        subject: `Returned Item Received - Return #${r.return_number}`,
        lines: ["We've received your returned item. ", "", ...base],
      };
    case "refund_processing":
      return {
        subject: `Your Refund Is Being Processed - Return #${r.return_number}`,
        lines: ["Your refund is now being processed.", "", ...base],
      };
    case "refunded":
      return {
        subject: `Refund Completed - Return #${r.return_number}`,
        lines: [
          "Your refund has been completed.",
          "",
          ...base,
          r.refund_amount != null
            ? `\nRefund amount: ${r.currency} ${Number(r.refund_amount).toFixed(2)}`
            : "",
          r.refunded_at ? `Refund date: ${new Date(r.refunded_at).toUTCString()}` : "",
          r.refund_reference ? `Reference: ${r.refund_reference}` : "",
        ],
      };
  }
}

/**
 * Records + sends one return email exactly once per (return, event).
 * Never throws: email problems must not break the return workflow.
 */
export async function notifyReturnEvent(
  event: ReturnEmailEvent,
  ret: ReturnLike,
  recipient: string,
): Promise<{ sent: boolean; reason?: string }> {
  const content = emailContent(event, ret);
  const subject = content.subject;
  const text = `${BRAND}\n\n${content.lines.filter(Boolean).join("\n")}\n\n— Team ${BRAND}`;

  try {
    await ensureDbSchema();
    const sql = getSql();

    // Dedupe: unique (return_id, event)
    const existingRows = await sql`
      SELECT id, status, attempts FROM return_notifications
      WHERE return_id = ${ret.id} AND event = ${event}
      LIMIT 1
    `;
    const existing = existingRows[0] as
      | { id: string; status: string; attempts: number }
      | undefined;

    if (existing?.status === "sent") return { sent: true };

    let rowId = existing?.id;
    if (!rowId) {
      rowId = `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      await sql`
        INSERT INTO return_notifications (id, return_id, event, recipient, subject, status)
        VALUES (${rowId}, ${ret.id}, ${event}, ${recipient}, ${subject}, 'pending')
      `;
    }

    // Build minimal HTML for Brevo
    const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#09090b;margin-bottom:16px;">${BRAND}</h2>
      <p style="white-space:pre-line;font-size:14px;line-height:1.6;color:#3f3f46;">${content.lines.filter(Boolean).join("\n")}</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
      <p style="font-size:12px;color:#71717a;">RIOTOUS Streetwear · support@riotous.store</p>
    </div>`;

    const result = await sendBrevoEmail({
      sender: BREVO_SENDER_ORDERS,
      to: [{ email: recipient }],
      subject,
      htmlContent,
      textContent: text,
      replyTo: BREVO_REPLY_TO,
      meta: {
        emailType: `RETURN_${event.toUpperCase()}`,
        orderId: ret.order_number ?? undefined,
      },
    });

    if (rowId) {
      const attempts = (Number(existing?.attempts) || 0) + 1;
      if (result.sent) {
        await sql`
          UPDATE return_notifications
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error = NULL, attempts = ${attempts}
          WHERE id = ${rowId}
        `;
      } else {
        await sql`
          UPDATE return_notifications
          SET status = 'failed', error = ${result.reason ?? "Brevo send failed"}, attempts = ${attempts}
          WHERE id = ${rowId}
        `;
      }
    }

    return result.sent ? { sent: true } : { sent: false, reason: result.reason ?? "failed" };
  } catch {
    return { sent: false, reason: "log_failed" };
  }
}
