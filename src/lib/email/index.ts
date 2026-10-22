/**
 * RIOTOUS Transactional Email Index
 * Server-only convenience functions. Never import from client components.
 *
 * All email functions use Brevo exclusively and are structured to never throw,
 * returning structured { sent: boolean; messageId?: string; reason?: string } objects.
 * Callers must await these promises to prevent Cloudflare Worker runtime cancellation.
 */

import {
  sendBrevoEmail,
  hasEmailBeenSent,
  BREVO_SENDER_AUTH,
  BREVO_SENDER_ORDERS,
  BREVO_REPLY_TO,
  maskEmail,
} from "./brevo";
import { getAdminNotificationEmail, getEmailMode, getEmailFrom } from "@/lib/env.server";
import { getSql } from "@/lib/db";

import {
  templateLoginOtp,
  templateForgotPasswordOtp,
  templateWelcomeEmail,
  templateOrderConfirmation,
  templatePaymentConfirmation,
  templateOrderShipped,
  templateOutForDelivery,
  templateOrderDelivered,
  templateOrderCancelled,
  templateReturnRequested,
  templateReturnApproved,
  templateReturnRejected,
  templateRefundProcessed,
  templatePasswordReset,
  templatePasswordChanged,
  templateAdminNewRegistration,
  templateAdminNewOrder,
  templateAdminPaymentEvent,
  templateAdminNewReview,
  templateAdminReturnRequested,
  templateAdminSupportInquiry,
  templateAdminTestEmail,
  type OrderItem,
} from "./templates";

export type { OrderItem };

// ─── ADMIN EMAIL RESOLVER ─────────────────────────────────────────────────────

/**
 * Resolves the private administrator recipient email address securely on the server.
 * Priority:
 * 1. Environment secret (ADMIN_NOTIFICATION_EMAIL / ADMIN_EMAIL / STORE_OWNER_EMAIL)
 * 2. store_settings table in database (notification_email or store_email)
 *
 * Kept strictly server-side: NEVER exposed in frontend code or client responses.
 */
export async function resolveAdminNotificationEmail(): Promise<string | null> {
  // 1. Check server environment / Cloudflare worker secrets
  const envEmail = getAdminNotificationEmail();
  if (envEmail && envEmail.includes("@")) {
    return envEmail.trim();
  }

  // 2. Fallback to store_settings configured in Admin panel
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT notification_email, store_email FROM store_settings WHERE id = 'default' LIMIT 1
    `;
    if (rows && rows.length > 0) {
      const notifyEmail = rows[0].notification_email;
      if (notifyEmail && typeof notifyEmail === "string" && notifyEmail.includes("@")) {
        return notifyEmail.trim();
      }
      const storeEmail = rows[0].store_email;
      if (storeEmail && typeof storeEmail === "string" && storeEmail.includes("@")) {
        return storeEmail.trim();
      }
    }
  } catch {
    /* non-fatal fallback */
  }

  return null;
}

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

/** Send password recovery email with single-use reset URL and backup OTP code. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  name?: string | null;
  resetUrl: string;
  expirationMinutes?: number;
  otp?: string;
  userId?: string | null;
}) {
  const tpl = templatePasswordReset({
    name: opts.name,
    resetUrl: opts.resetUrl,
    expirationMinutes: opts.expirationMinutes,
    otp: opts.otp,
  });
  return sendBrevoEmail({
    sender: BREVO_SENDER_AUTH,
    to: [{ email: opts.to, name: opts.name ?? undefined }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "PASSWORD_RESET", userId: opts.userId },
  });
}

/** Send confirmation alert that password has been changed. */
export async function sendPasswordChangedNotification(opts: {
  to: string;
  name?: string | null;
  changedAt?: string;
  ipAddress?: string;
  userId?: string | null;
}) {
  const tpl = templatePasswordChanged({
    name: opts.name,
    changedAt: opts.changedAt,
    ipAddress: opts.ipAddress,
  });
  return sendBrevoEmail({
    sender: BREVO_SENDER_AUTH,
    to: [{ email: opts.to, name: opts.name ?? undefined }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "PASSWORD_CHANGED", userId: opts.userId },
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

// ─── ADMIN NOTIFICATION EMAILS ────────────────────────────────────────────────

/**
 * Sends a private notification to the store owner when a new customer registers.
 * Idempotent per customer ID.
 */
export async function sendAdminNewCustomerNotification(opts: {
  customerName?: string | null;
  customerEmail: string;
  customerId: string;
  registeredAt?: string;
  ipAddress?: string;
}) {
  const adminEmail = await resolveAdminNotificationEmail();
  if (!adminEmail) {
    console.warn("[Admin Notification] Admin notification email not configured. Registration alert skipped.");
    return { sent: false, reason: "Admin notification email not configured" };
  }

  // Idempotency: verify this customer registration hasn't already been notified
  if (await hasEmailBeenSent(opts.customerId, "ADMIN_REGISTRATION_NOTIFICATION")) {
    return { sent: true };
  }

  const registeredAt = opts.registeredAt || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const tpl = templateAdminNewRegistration({
    customerName: opts.customerName,
    customerEmail: opts.customerEmail,
    customerId: opts.customerId,
    registeredAt,
    ipAddress: opts.ipAddress,
  });

  return sendBrevoEmail({
    sender: BREVO_SENDER_AUTH,
    to: [{ email: adminEmail, name: "RIOTOUS Administrator" }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: {
      emailType: "ADMIN_REGISTRATION_NOTIFICATION",
      userId: opts.customerId,
    },
  });
}

/**
 * Sends a private notification to the store owner for newly placed or confirmed orders.
 * Idempotent per order ID.
 */
export async function sendAdminNewOrderNotification(opts: {
  orderNumber: string;
  orderId: string;
  createdAt?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus?: string;
  subtotal: string | number;
  discountAmount?: string | number | null;
  couponCode?: string | null;
  shippingCharge: string | number;
  total: string | number;
  currency?: string;
  hasCustomDesign?: boolean;
  items: Array<{
    name: string;
    quantity: number;
    size?: string | null;
    color?: string | null;
    price: string | number;
    subtotal?: string | number;
    isCustomDesign?: boolean;
  }>;
}) {
  const adminEmail = await resolveAdminNotificationEmail();
  if (!adminEmail) {
    console.warn("[Admin Notification] Admin notification email not configured. Order alert skipped.");
    return { sent: false, reason: "Admin notification email not configured" };
  }

  // Idempotency check: only send once per order
  if (await hasEmailBeenSent(opts.orderId, "ADMIN_ORDER_NOTIFICATION")) {
    return { sent: true };
  }

  const createdAt = opts.createdAt || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const tpl = templateAdminNewOrder({
    ...opts,
    createdAt,
  });

  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: adminEmail, name: "RIOTOUS Administrator" }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: {
      emailType: "ADMIN_ORDER_NOTIFICATION",
      orderId: opts.orderId,
    },
  });
}

/**
 * Sends a private notification to the store owner on payment events (success or failure).
 */
export async function sendAdminPaymentEventNotification(opts: {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number | string;
  currency?: string;
  paymentMethod: string;
  transactionId?: string | null;
  status: "success" | "failed";
  failureReason?: string | null;
  timestamp?: string;
}) {
  const adminEmail = await resolveAdminNotificationEmail();
  if (!adminEmail) {
    return { sent: false, reason: "Admin notification email not configured" };
  }

  const emailType = opts.status === "success" ? "ADMIN_PAYMENT_SUCCESS" : "ADMIN_PAYMENT_FAILED";
  // Idempotency check for successful payment alerts
  if (opts.status === "success" && (await hasEmailBeenSent(opts.orderId, emailType))) {
    return { sent: true };
  }

  const tpl = templateAdminPaymentEvent(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: adminEmail, name: "RIOTOUS Administrator" }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: {
      emailType,
      orderId: opts.orderId,
    },
  });
}

/**
 * Sends a private notification to the store owner when a customer leaves a review.
 */
export async function sendAdminNewReviewNotification(opts: {
  reviewId: string;
  productName: string;
  productId: string;
  authorName: string;
  customerEmail?: string | null;
  rating: number;
  title?: string | null;
  reviewText: string;
  isVerifiedPurchase?: boolean;
}) {
  const adminEmail = await resolveAdminNotificationEmail();
  if (!adminEmail) {
    return { sent: false, reason: "Admin notification email not configured" };
  }

  const tpl = templateAdminNewReview(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_AUTH,
    to: [{ email: adminEmail, name: "RIOTOUS Administrator" }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: {
      emailType: "ADMIN_REVIEW_NOTIFICATION",
      userId: opts.customerEmail ?? null,
    },
  });
}

/**
 * Sends a private notification to the store owner when a customer requests a return.
 */
export async function sendAdminReturnRequestNotification(opts: {
  returnNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productName?: string | null;
  reason: string;
  quantity: number;
}) {
  const adminEmail = await resolveAdminNotificationEmail();
  if (!adminEmail) {
    return { sent: false, reason: "Admin notification email not configured" };
  }

  const tpl = templateAdminReturnRequested(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: adminEmail, name: "RIOTOUS Administrator" }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: {
      emailType: "ADMIN_RETURN_NOTIFICATION",
      orderId: opts.orderNumber,
    },
  });
}

/**
 * Sends a private notification to the store owner when a customer submits a support inquiry.
 */
export async function sendAdminSupportInquiryNotification(opts: {
  inquiryId: string;
  requestType: string;
  customerName?: string | null;
  customerEmail: string;
  orderName?: string | null;
  reason?: string | null;
  details: string;
}) {
  const adminEmail = await resolveAdminNotificationEmail();
  if (!adminEmail) {
    return { sent: false, reason: "Admin notification email not configured" };
  }

  const tpl = templateAdminSupportInquiry(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_AUTH,
    to: [{ email: adminEmail, name: "RIOTOUS Administrator" }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: {
      emailType: "ADMIN_SUPPORT_INQUIRY",
    },
  });
}

/**
 * Sends a test email to verify Brevo integration end-to-end.
 */
export async function sendAdminTestEmail(targetEmail: string) {
  const tpl = templateAdminTestEmail({
    recipient: targetEmail,
    sentAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    environment: getEmailMode(),
    senderEmail: getEmailFrom(),
  });

  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: targetEmail }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: {
      emailType: "ADMIN_TEST_VERIFICATION",
    },
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
  invoiceNumber?: string | null;
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

/** Send order cancellation notice to customer. */
export async function sendOrderCancelled(opts: {
  to: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  reason?: string | null;
  refundNote?: string | null;
  userId?: string | null;
}) {
  if (await hasEmailBeenSent(opts.orderId, "ORDER_CANCELLED")) return { sent: true };
  const tpl = templateOrderCancelled(opts);
  return sendBrevoEmail({
    sender: BREVO_SENDER_ORDERS,
    to: [{ email: opts.to, name: opts.customerName }],
    subject: tpl.subject,
    htmlContent: tpl.html,
    textContent: tpl.text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: "ORDER_CANCELLED", orderId: opts.orderId, userId: opts.userId },
  });
}

// ─── RETURN / REFUND EMAILS ───────────────────────────────────────────────────

/** Send return-requested notification to customer. */
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

/** Send return-approved notification to customer. */
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

/** Send return-rejected notification to customer. */
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

/** Send refund-processed notification to customer. */
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
export {
  sendBrevoEmail,
  hasEmailBeenSent,
  BREVO_SENDER_AUTH,
  BREVO_SENDER_ORDERS,
  maskEmail,
};
