/**
 * RIOTOUS Transactional Email Index
 * Server-only convenience functions. Never import from client components.
 *
 * All email functions are fire-and-forget safe — they never throw.
 * Hook these into business flows (auth, orders, shipping, returns) without
 * wrapping in try/catch; they handle all errors internally.
 */

import {
  sendBrevoEmail,
  hasEmailBeenSent,
  BREVO_SENDER_AUTH,
  BREVO_SENDER_ORDERS,
  BREVO_REPLY_TO,
} from "./brevo";

import {
  templateLoginOtp,
  templateForgotPasswordOtp,
  templateWelcomeEmail,
  templateOrderConfirmation,
  templatePaymentConfirmation,
  templateOrderShipped,
  templateOutForDelivery,
  templateOrderDelivered,
  templateReturnRequested,
  templateReturnApproved,
  templateReturnRejected,
  templateRefundProcessed,
  type OrderItem,
} from "./templates";

export type { OrderItem };

// ─── AUTH EMAILS ──────────────────────────────────────────────────────────────

/** Send a login / signup OTP email. */
export async function sendLoginOtp(opts: {
  to: string;
  otp: string;
  userId?: string | null;
  expirationMinutes?: number;
}) {
  const tpl = templateLoginOtp({ otp: opts.otp, expirationMinutes: opts.expirationMinutes });
  return sendBrevoEmail({
    sender: BREVO_SENDER_AUTH,
    to: [{ email: opts.to }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "LOGIN_OTP", userId: opts.userId },
  });
}

/** Send a forgot-password OTP email. */
export async function sendForgotPasswordOtp(opts: {
  to: string;
  otp: string;
  userId?: string | null;
  expirationMinutes?: number;
}) {
  const tpl = templateForgotPasswordOtp({ otp: opts.otp, expirationMinutes: opts.expirationMinutes });
  return sendBrevoEmail({
    sender: BREVO_SENDER_AUTH,
    to: [{ email: opts.to }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "FORGOT_PASSWORD_OTP", userId: opts.userId },
  });
}

/** Send a welcome email after account creation. */
export async function sendWelcomeEmail(opts: {
  to: string;
  name?: string | null;
  userId?: string | null;
}) {
  const tpl = templateWelcomeEmail({ name: opts.name });
  return sendBrevoEmail({
    sender: BREVO_SENDER_AUTH,
    to: [{ email: opts.to, name: opts.name ?? undefined }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "WELCOME", userId: opts.userId },
  });
}

// ─── ORDER EMAILS ─────────────────────────────────────────────────────────────

/** Send order confirmation to customer. Idempotent per order. */
export async function sendOrderConfirmation(opts: {
  to: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  shippingAddress: string;
  items: OrderItem[];
  subtotal: number | string;
  discountAmount?: number | string | null;
  discountCode?: string | null;
  shippingCharge: number | string;
  total: number | string;
  currency?: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  userId?: string | null;
}) {
  if (await hasEmailBeenSent(opts.orderId, "ORDER_CONFIRMATION")) return { sent: true };
  const tpl = templateOrderConfirmation(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "ORDER_CONFIRMATION", orderId: opts.orderId, userId: opts.userId },
  });
}

/** Send payment confirmation. Idempotent per order. */
export async function sendPaymentConfirmation(opts: {
  to: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  total: number | string;
  currency?: string;
  paymentMethod: string;
  transactionId?: string | null;
  userId?: string | null;
}) {
  if (await hasEmailBeenSent(opts.orderId, "PAYMENT_CONFIRMATION")) return { sent: true };
  const tpl = templatePaymentConfirmation(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "PAYMENT_CONFIRMATION", orderId: opts.orderId, userId: opts.userId },
  });
}

/** Send shipped notification. Idempotent per order. */
export async function sendOrderShipped(opts: {
  to: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  userId?: string | null;
}) {
  if (await hasEmailBeenSent(opts.orderId, "ORDER_SHIPPED")) return { sent: true };
  const tpl = templateOrderShipped(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "ORDER_SHIPPED", orderId: opts.orderId, userId: opts.userId },
  });
}

/** Send out-for-delivery notification. Idempotent per order. */
export async function sendOutForDelivery(opts: {
  to: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  userId?: string | null;
}) {
  if (await hasEmailBeenSent(opts.orderId, "OUT_FOR_DELIVERY")) return { sent: true };
  const tpl = templateOutForDelivery({ orderNumber: opts.orderNumber, customerName: opts.customerName });
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "OUT_FOR_DELIVERY", orderId: opts.orderId, userId: opts.userId },
  });
}

/** Send delivery confirmation. Idempotent per order. */
export async function sendOrderDelivered(opts: {
  to: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  userId?: string | null;
}) {
  if (await hasEmailBeenSent(opts.orderId, "ORDER_DELIVERED")) return { sent: true };
  const tpl = templateOrderDelivered({ orderNumber: opts.orderNumber, customerName: opts.customerName });
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "ORDER_DELIVERED", orderId: opts.orderId, userId: opts.userId },
  });
}

// ─── RETURN / REFUND EMAILS ───────────────────────────────────────────────────

/** Send return-requested notification. */
export async function sendReturnRequested(opts: {
  to: string;
  orderNumber: string;
  returnNumber: string;
  orderId?: string;
  customerName: string;
  productName?: string;
  reason?: string;
  userId?: string | null;
}) {
  const tpl = templateReturnRequested({
    orderNumber: opts.orderNumber,
    returnNumber: opts.returnNumber,
    customerName: opts.customerName,
    productName: opts.productName,
    reason: opts.reason,
  });
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "RETURN_REQUESTED", orderId: opts.orderId, userId: opts.userId },
  });
}

/** Send return-approved notification. */
export async function sendReturnApproved(opts: {
  to: string;
  orderNumber: string;
  returnNumber: string;
  orderId?: string;
  customerName: string;
  instructions?: string;
  userId?: string | null;
}) {
  const tpl = templateReturnApproved({
    orderNumber: opts.orderNumber,
    returnNumber: opts.returnNumber,
    customerName: opts.customerName,
    instructions: opts.instructions,
  });
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "RETURN_APPROVED", orderId: opts.orderId, userId: opts.userId },
  });
}

/** Send return-rejected notification. */
export async function sendReturnRejected(opts: {
  to: string;
  orderNumber: string;
  returnNumber: string;
  orderId?: string;
  customerName: string;
  reason?: string;
  userId?: string | null;
}) {
  const tpl = templateReturnRejected({
    orderNumber: opts.orderNumber,
    returnNumber: opts.returnNumber,
    customerName: opts.customerName,
    reason: opts.reason,
  });
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "RETURN_REJECTED", orderId: opts.orderId, userId: opts.userId },
  });
}

/** Send refund-processed notification. */
export async function sendRefundProcessed(opts: {
  to: string;
  orderNumber: string;
  returnNumber?: string;
  orderId?: string;
  customerName: string;
  refundAmount: number | string;
  currency?: string;
  refundReference?: string | null;
  userId?: string | null;
}) {
  const tpl = templateRefundProcessed(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "REFUND_PROCESSED", orderId: opts.orderId, userId: opts.userId },
  });
}

// Re-export low-level helpers for advanced use
export { sendBrevoEmail, hasEmailBeenSent, BREVO_SENDER_AUTH, BREVO_SENDER_ORDERS };
