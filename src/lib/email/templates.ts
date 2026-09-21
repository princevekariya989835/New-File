/**
 * RIOTOUS Transactional Email Templates
 * Clean, responsive HTML with off-white bg, dark card, red accent.
 * Server-only: never import from client components.
 */

export interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

const BRAND_URL = "https://riotous.store";
const SUPPORT_EMAIL = "support@riotous.store";
const BRAND_FOOTER = "RIOTOUS Streetwear Official · Gujarat, India · https://riotous.store";

function esc(text: unknown): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function base(opts: { title: string; preheader?: string; body: string; footerNote?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.title)}</title>
<style>
body{margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;}
.wrap{max-width:600px;margin:28px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 2px 12px rgba(0,0,0,.06);}
.hdr{background:#09090b;padding:22px 32px;text-align:center;border-bottom:2px solid #ef4444;}
.logo{font-size:24px;font-weight:900;letter-spacing:4px;color:#fff;text-decoration:none;}
.logo-r{color:#ef4444;}
.body{padding:36px 32px;}
.ftr{background:#fafafa;padding:22px 32px;text-align:center;font-size:12px;color:#71717a;border-top:1px solid #f0f0f0;}
.btn-dark{display:inline-block;background:#09090b;color:#fff !important;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:6px;letter-spacing:.5px;}
.btn-red{display:inline-block;background:#ef4444;color:#fff !important;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:6px;}
.otp-box{background:#f8f9fa;border:1px dashed #d4d4d8;border-radius:8px;padding:22px;text-align:center;margin:24px 0;}
.otp-code{font-size:36px;font-weight:800;letter-spacing:8px;color:#09090b;font-family:'Courier New',monospace;margin:0;}
.card{background:#f8f9fa;border-radius:8px;padding:16px 20px;margin-bottom:20px;border:1px solid #e4e4e7;}
.card-green{background:#f0fdf4;border-color:#bbf7d0;}
.card-amber{background:#fffbeb;border-color:#fde68a;}
.card-red{background:#fef2f2;border-color:#fecaca;}
table.items{width:100%;border-collapse:collapse;margin:16px 0;}
table.items th{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#71717a;padding-bottom:8px;border-bottom:1px solid #e4e4e7;text-align:left;}
table.items td{padding:11px 0;border-bottom:1px solid #f4f4f5;font-size:14px;vertical-align:top;}
table.items td.r{text-align:right;font-weight:600;}
@media(max-width:620px){.wrap{margin:0;border-radius:0;border:none;}.body,.hdr,.ftr{padding:22px 18px !important;}}
</style>
</head>
<body>
${opts.preheader ? `<div style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${esc(opts.preheader)}</div>` : ""}
<div style="background:#f4f4f6;padding:16px 0;">
<div class="wrap">
  <div class="hdr">
    <a href="${BRAND_URL}" class="logo">RIOT<span class="logo-r">O</span>US</a>
  </div>
  <div class="body">
    ${opts.body}
  </div>
  <div class="ftr">
    ${opts.footerNote ? `<p style="margin:0 0 10px;color:#52525b;">${opts.footerNote}</p>` : ""}
    <strong style="color:#27272a;font-size:13px;">RIOTOUS STREETWEAR</strong><br>
    Premium Streetwear &amp; Custom Drops<br>
    <span style="font-size:11px;color:#a1a1aa;">
      Help: <a href="mailto:${SUPPORT_EMAIL}" style="color:#ef4444;text-decoration:none;">${SUPPORT_EMAIL}</a>
      &nbsp;|&nbsp; &copy; ${new Date().getFullYear()} RIOTOUS
    </span>
  </div>
</div>
</div>
</body>
</html>`;
}

// ─── 1. LOGIN OTP ─────────────────────────────────────────────────────────────
export function templateLoginOtp(d: { otp: string; expirationMinutes?: number }): EmailTemplateResult {
  const exp = d.expirationMinutes ?? 10;
  const subject = "Your RIOTOUS Login Verification Code";
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 10px;color:#09090b;">Verify Your Login</h1>
    <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 20px;">
      Use the 6-digit code below to complete your RIOTOUS sign-in.
    </p>
    <div class="otp-box">
      <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;color:#71717a;text-transform:uppercase;margin-bottom:8px;">Verification Code</div>
      <div class="otp-code">${esc(d.otp)}</div>
    </div>
    <p style="font-size:13px;line-height:1.5;color:#71717a;margin:0;">
      ⏱ This code expires in <strong>${exp} minutes</strong>.<br>
      If you didn't request this, ignore this email.
    </p>`;
  const text = `Your RIOTOUS verification code is:\n\n${d.otp}\n\nThis code expires in ${exp} minutes.\nIf you did not request this, ignore this email.\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Your code: ${d.otp}`, body }), text };
}

// ─── 2. FORGOT PASSWORD OTP ───────────────────────────────────────────────────
export function templateForgotPasswordOtp(d: { otp: string; expirationMinutes?: number }): EmailTemplateResult {
  const exp = d.expirationMinutes ?? 10;
  const subject = "Reset Your RIOTOUS Password";
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 10px;color:#09090b;">Reset Your Password</h1>
    <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 20px;">
      Enter the code below to set a new password for your RIOTOUS account.
    </p>
    <div class="otp-box">
      <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;color:#71717a;text-transform:uppercase;margin-bottom:8px;">Password Reset Code</div>
      <div class="otp-code">${esc(d.otp)}</div>
    </div>
    <p style="font-size:13px;line-height:1.5;color:#71717a;margin:0;">
      ⏱ Expires in <strong>${exp} minutes</strong>.<br>
      If you didn't request a reset, contact support immediately.
    </p>`;
  const text = `Reset Your RIOTOUS Password\n\nYour password reset code is:\n\n${d.otp}\n\nExpires in ${exp} minutes.\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Reset code: ${d.otp}`, body }), text };
}

// ─── 3. WELCOME ───────────────────────────────────────────────────────────────
export function templateWelcomeEmail(d: { name?: string | null }): EmailTemplateResult {
  const name = d.name ? esc(d.name) : "there";
  const subject = "Welcome to RIOTOUS";
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 10px;color:#09090b;">Welcome to RIOTOUS, ${name}.</h1>
    <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 16px;">Your account has been successfully created.</p>
    <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 28px;">Explore exclusive streetwear, custom drops, and limited graphic tees.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${BRAND_URL}/shop" class="btn-red">Explore Collection ↗</a>
    </div>
    <div class="card">
      <strong style="font-size:13px;">With your account you can:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#52525b;line-height:1.6;">
        <li>Design &amp; customize oversized graphic tees</li>
        <li>Save favourites to your wishlist</li>
        <li>Track orders in real-time</li>
      </ul>
    </div>`;
  const text = `Welcome to RIOTOUS, ${d.name || "there"}.\n\nYour account has been created.\n\nShop now: ${BRAND_URL}/shop\n\nThank you for joining RIOTOUS.\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: "Your streetwear journey starts now.", body }), text };
}

// ─── 4. ORDER CONFIRMATION ────────────────────────────────────────────────────
export interface OrderItem { name: string; quantity: number; size?: string | null; color?: string | null; price: string | number; }

export function templateOrderConfirmation(d: {
  orderNumber: string;
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
}): EmailTemplateResult {
  const cur = d.currency || "₹";
  const subject = `RIOTOUS Order Confirmed — #${d.orderNumber}`;
  const itemRows = d.items.map(i => {
    const v = [i.size ? `Size: ${i.size}` : "", i.color ? `Color: ${i.color}` : ""].filter(Boolean).join(" · ");
    return `<tr>
      <td><strong>${esc(i.name)}</strong>${v ? `<br><small style="color:#71717a;">${esc(v)} · Qty: ${i.quantity}</small>` : `<br><small style="color:#71717a;">Qty: ${i.quantity}</small>`}</td>
      <td class="r">${cur} ${i.price}</td>
    </tr>`;
  }).join("");
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Order Confirmed! 🎉</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Thank you, <strong>${esc(d.customerName)}</strong>. We're packing your order.</p>
    <div class="card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#71717a;">Order Number</td><td align="right"><strong>#${esc(d.orderNumber)}</strong></td></tr>
        <tr><td style="font-size:12px;color:#71717a;padding-top:6px;">Payment</td><td align="right" style="padding-top:6px;font-size:12px;">${esc(d.paymentMethod || "COD")} · <span style="color:#16a34a;font-weight:600;">${esc(d.paymentStatus || "Confirmed")}</span></td></tr>
      </table>
    </div>
    <h2 style="font-size:15px;font-weight:700;margin:0 0 10px;color:#09090b;">Items</h2>
    <table class="items">
      <thead><tr><th>Item</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;padding-top:12px;margin-top:4px;">
      <tr><td style="font-size:13px;color:#71717a;padding:3px 0;">Subtotal</td><td align="right" style="font-size:13px;padding:3px 0;">${cur} ${d.subtotal}</td></tr>
      ${d.discountAmount ? `<tr><td style="font-size:13px;color:#16a34a;padding:3px 0;">Discount${d.discountCode ? ` (${esc(d.discountCode)})` : ""}</td><td align="right" style="font-size:13px;color:#16a34a;padding:3px 0;">−${cur} ${d.discountAmount}</td></tr>` : ""}
      <tr><td style="font-size:13px;color:#71717a;padding:3px 0;">Shipping</td><td align="right" style="font-size:13px;padding:3px 0;">${Number(d.shippingCharge) > 0 ? `${cur} ${d.shippingCharge}` : "FREE"}</td></tr>
      <tr><td style="font-size:16px;font-weight:800;padding-top:12px;color:#09090b;">Total</td><td align="right" style="font-size:18px;font-weight:800;padding-top:12px;color:#ef4444;">${cur} ${d.total}</td></tr>
    </table>
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid #f4f4f5;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#09090b;margin-bottom:6px;">Shipping Address</div>
      <p style="font-size:13px;line-height:1.5;color:#52525b;margin:0;">${esc(d.shippingAddress)}</p>
    </div>
    <div style="text-align:center;margin:30px 0 0;">
      <a href="${BRAND_URL}/account" class="btn-dark">Track Order ↗</a>
    </div>`;
  const text = `RIOTOUS Order Confirmed — #${d.orderNumber}\n\nThank you, ${d.customerName}!\nTotal: ${cur} ${d.total}\nPayment: ${d.paymentMethod || "COD"}\nShipping to: ${d.shippingAddress}\n\nItems:\n${d.items.map(i => `- ${i.name} x${i.quantity} — ${cur} ${i.price}`).join("\n")}\n\nView order: ${BRAND_URL}/account\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Order #${d.orderNumber} confirmed. We're on it!`, body }), text };
}

// ─── 5. PAYMENT CONFIRMATION ──────────────────────────────────────────────────
export function templatePaymentConfirmation(d: {
  orderNumber: string; customerName: string; total: number | string; currency?: string; paymentMethod: string; transactionId?: string | null;
}): EmailTemplateResult {
  const cur = d.currency || "₹";
  const subject = `Payment Confirmed — RIOTOUS Order #${d.orderNumber}`;
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Payment Received ✅</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Hi ${esc(d.customerName)}, your payment for Order <strong>#${esc(d.orderNumber)}</strong> was successful.</p>
    <div class="card card-green">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:13px;color:#166534;">Amount Paid</td><td align="right" style="font-size:18px;font-weight:800;color:#15803d;">${cur} ${d.total}</td></tr>
        <tr><td style="font-size:12px;color:#166534;padding-top:6px;">Method</td><td align="right" style="font-size:12px;color:#166534;padding-top:6px;">${esc(d.paymentMethod)}</td></tr>
        ${d.transactionId ? `<tr><td style="font-size:12px;color:#166534;padding-top:4px;">Transaction ID</td><td align="right" style="font-size:11px;font-family:monospace;color:#166534;padding-top:4px;">${esc(d.transactionId)}</td></tr>` : ""}
      </table>
    </div>`;
  const text = `Payment Confirmed — RIOTOUS Order #${d.orderNumber}\n\nHi ${d.customerName},\nPayment of ${cur} ${d.total} received.\nMethod: ${d.paymentMethod}\n${d.transactionId ? `Transaction ID: ${d.transactionId}` : ""}\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Payment of ${cur} ${d.total} received.`, body }), text };
}

// ─── 6. ORDER SHIPPED ─────────────────────────────────────────────────────────
export function templateOrderShipped(d: {
  orderNumber: string; customerName: string; courierName?: string | null; trackingNumber?: string | null; trackingUrl?: string | null;
}): EmailTemplateResult {
  const subject = `Your RIOTOUS Order Has Shipped — #${d.orderNumber}`;
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Your Order is On the Way 🚀</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Hi ${esc(d.customerName)}, your RIOTOUS package has been handed to our delivery partner.</p>
    <div class="card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#71717a;">Order</td><td align="right"><strong>#${esc(d.orderNumber)}</strong></td></tr>
        ${d.courierName ? `<tr><td style="font-size:12px;color:#71717a;padding-top:6px;">Courier</td><td align="right" style="padding-top:6px;font-weight:600;">${esc(d.courierName)}</td></tr>` : ""}
        ${d.trackingNumber ? `<tr><td style="font-size:12px;color:#71717a;padding-top:6px;">Tracking AWB</td><td align="right" style="padding-top:6px;font-family:monospace;font-weight:700;">${esc(d.trackingNumber)}</td></tr>` : ""}
      </table>
    </div>
    ${d.trackingUrl ? `<div style="text-align:center;margin:24px 0;"><a href="${esc(d.trackingUrl)}" class="btn-red">Track Live ↗</a></div>` : ""}
    <p style="font-size:13px;color:#71717a;">Deliveries typically take 2–4 business days.</p>`;
  const text = `Your RIOTOUS Order Has Shipped — #${d.orderNumber}\n\nHi ${d.customerName},\nOrder #${d.orderNumber} has shipped!\n${d.courierName ? `Courier: ${d.courierName}` : ""}\n${d.trackingNumber ? `Tracking: ${d.trackingNumber}` : ""}\n${d.trackingUrl ? `Track: ${d.trackingUrl}` : ""}\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Order #${d.orderNumber} is on its way!`, body }), text };
}

// ─── 7. OUT FOR DELIVERY ──────────────────────────────────────────────────────
export function templateOutForDelivery(d: { orderNumber: string; customerName: string }): EmailTemplateResult {
  const subject = `Your RIOTOUS Order Is Out for Delivery — #${d.orderNumber}`;
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Out for Delivery Today! 📦</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Hi ${esc(d.customerName)}, Order <strong>#${esc(d.orderNumber)}</strong> is with our courier executive and will arrive today.</p>
    <div class="card card-amber">
      <p style="margin:0;font-size:13px;color:#92400e;">⚡ Please ensure someone is available at the delivery address to receive the package.</p>
    </div>`;
  const text = `Your RIOTOUS Order Is Out for Delivery — #${d.orderNumber}\n\nHi ${d.customerName},\nOrder #${d.orderNumber} is out for delivery today!\nPlease be available to receive the package.\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Order #${d.orderNumber} arrives today!`, body }), text };
}

// ─── 8. DELIVERED ─────────────────────────────────────────────────────────────
export function templateOrderDelivered(d: { orderNumber: string; customerName: string }): EmailTemplateResult {
  const subject = `Your RIOTOUS Order Has Been Delivered — #${d.orderNumber}`;
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Delivered! 🎉</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 16px;">Hi ${esc(d.customerName)}, Order <strong>#${esc(d.orderNumber)}</strong> has been delivered successfully.</p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 28px;">We hope you love your new RIOTOUS drop! Tag us on Instagram <a href="https://www.instagram.com/riotous_store" style="color:#ef4444;font-weight:600;text-decoration:none;">@riotous_store</a>.</p>
    <div style="text-align:center;margin:28px 0 0;"><a href="${BRAND_URL}/account" class="btn-dark">Leave a Review ↗</a></div>`;
  const text = `Your RIOTOUS Order Has Been Delivered — #${d.orderNumber}\n\nHi ${d.customerName},\nOrder #${d.orderNumber} delivered. Thank you!\nTag us @riotous_store on Instagram.\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Order #${d.orderNumber} delivered.`, body }), text };
}

// ─── 9. RETURN REQUESTED ──────────────────────────────────────────────────────
export function templateReturnRequested(d: { orderNumber: string; returnNumber: string; customerName: string; productName?: string; reason?: string }): EmailTemplateResult {
  const subject = `RIOTOUS Return Request Received — #${d.orderNumber}`;
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Return Request Received</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Hi ${esc(d.customerName)}, we've received your return request <strong>#${esc(d.returnNumber)}</strong>.</p>
    <div class="card">
      <p style="margin:0 0 4px;font-size:13px;"><strong>Order:</strong> #${esc(d.orderNumber)}</p>
      ${d.productName ? `<p style="margin:0 0 4px;font-size:13px;"><strong>Product:</strong> ${esc(d.productName)}</p>` : ""}
      ${d.reason ? `<p style="margin:0;font-size:13px;color:#71717a;"><strong>Reason:</strong> ${esc(d.reason)}</p>` : ""}
    </div>
    <p style="font-size:13px;color:#71717a;line-height:1.5;">Our team will review your request within 24–48 hours and update you via email.</p>`;
  const text = `RIOTOUS Return Request Received — #${d.orderNumber}\n\nHi ${d.customerName},\nReturn #${d.returnNumber} received for order #${d.orderNumber}.\nOur team will review within 24–48 hours.\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Return #${d.returnNumber} received.`, body }), text };
}

// ─── 10. RETURN APPROVED ──────────────────────────────────────────────────────
export function templateReturnApproved(d: { orderNumber: string; returnNumber: string; customerName: string; instructions?: string }): EmailTemplateResult {
  const subject = `RIOTOUS Return Approved — #${d.orderNumber}`;
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Return Approved ✅</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Hi ${esc(d.customerName)}, return <strong>#${esc(d.returnNumber)}</strong> for Order <strong>#${esc(d.orderNumber)}</strong> has been approved.</p>
    <div class="card card-green">
      <strong style="font-size:13px;color:#166534;">Next Steps for Pickup:</strong>
      <p style="margin:6px 0 0;font-size:13px;color:#166534;line-height:1.5;">${d.instructions ? esc(d.instructions) : "Keep the item in its original condition with tags and packaging intact. Our courier will schedule a pickup shortly."}</p>
    </div>`;
  const text = `RIOTOUS Return Approved — #${d.orderNumber}\n\nHi ${d.customerName},\nReturn #${d.returnNumber} has been approved.\nPlease keep the item with original tags for courier pickup.\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Return #${d.returnNumber} approved.`, body }), text };
}

// ─── 11. RETURN REJECTED ──────────────────────────────────────────────────────
export function templateReturnRejected(d: { orderNumber: string; returnNumber: string; customerName: string; reason?: string }): EmailTemplateResult {
  const subject = `RIOTOUS Return Update — #${d.orderNumber}`;
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Return Request Update</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Hi ${esc(d.customerName)}, after reviewing return <strong>#${esc(d.returnNumber)}</strong>, we could not approve the request.</p>
    ${d.reason ? `<div class="card card-red"><strong style="font-size:13px;color:#991b1b;">Reason:</strong><p style="margin:4px 0 0;font-size:13px;color:#991b1b;line-height:1.5;">${esc(d.reason)}</p></div>` : ""}
    <p style="font-size:13px;color:#71717a;line-height:1.5;">If you believe this is in error, reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#ef4444;">${SUPPORT_EMAIL}</a>.</p>`;
  const text = `RIOTOUS Return Update — #${d.orderNumber}\n\nHi ${d.customerName},\nReturn #${d.returnNumber} could not be approved.\nReason: ${d.reason || "Does not meet return criteria"}\nContact: ${SUPPORT_EMAIL}\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Return update for order #${d.orderNumber}`, body }), text };
}

// ─── 12. REFUND PROCESSED ─────────────────────────────────────────────────────
export function templateRefundProcessed(d: { orderNumber: string; returnNumber?: string; customerName: string; refundAmount: number | string; currency?: string; refundReference?: string | null }): EmailTemplateResult {
  const cur = d.currency || "₹";
  const subject = `RIOTOUS Refund Processed — #${d.orderNumber}`;
  const body = `
    <h1 style="font-size:21px;font-weight:700;margin:0 0 8px;color:#09090b;">Refund Processed 💰</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 20px;">Hi ${esc(d.customerName)}, your refund for Order <strong>#${esc(d.orderNumber)}</strong> has been processed.</p>
    <div class="card card-green">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:13px;color:#166534;">Refund Amount</td><td align="right" style="font-size:18px;font-weight:800;color:#15803d;">${cur} ${d.refundAmount}</td></tr>
        ${d.refundReference ? `<tr><td style="font-size:12px;color:#166534;padding-top:6px;">Reference</td><td align="right" style="font-size:11px;font-family:monospace;color:#166534;padding-top:6px;">${esc(d.refundReference)}</td></tr>` : ""}
      </table>
    </div>
    <p style="font-size:13px;color:#71717a;line-height:1.5;">Funds typically reflect within 3–7 business days depending on your payment method.</p>`;
  const text = `RIOTOUS Refund Processed — #${d.orderNumber}\n\nHi ${d.customerName},\nRefund of ${cur} ${d.refundAmount} processed.\n${d.refundReference ? `Reference: ${d.refundReference}` : ""}\nFunds take 3–7 business days.\n\n--\n${BRAND_FOOTER}`;
  return { subject, html: base({ title: subject, preheader: `Refund of ${cur} ${d.refundAmount} processed.`, body }), text };
}
