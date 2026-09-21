import { createHmac, timingSafeEqual } from "node:crypto";

export type CreateRazorpayOrderParams = {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type RazorpayOrderResponse = {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
};

export function getRazorpayKeyId(): string {
  return (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "").trim();
}

export function getRazorpayKeySecret(): string {
  return (process.env.RAZORPAY_KEY_SECRET || "").trim();
}

export function getRazorpayWebhookSecret(): string {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
}

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

/**
 * Creates a Razorpay order using the official Razorpay Orders API.
 */
export async function createRazorpayOrder(
  params: CreateRazorpayOrderParams,
): Promise<RazorpayOrderResponse> {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    // If running in development without Razorpay keys, generate a deterministic test order
    console.warn(
      "[Razorpay Server] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set. Generating fallback order for development.",
    );
    return {
      id: `order_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      entity: "order",
      amount: params.amountInPaise,
      amount_paid: 0,
      amount_due: params.amountInPaise,
      currency: params.currency || "INR",
      receipt: params.receipt,
      status: "created",
      attempts: 0,
      notes: params.notes || {},
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: Math.round(params.amountInPaise),
      currency: params.currency || "INR",
      receipt: params.receipt.slice(0, 40),
      notes: params.notes || {},
      payment_capture: 1,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = "Failed to create Razorpay order";
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error?.description || parsed.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage}: ${errorBody}`;
    }
    console.error("[Razorpay Server] Create Order API error:", response.status, errorMessage);
    throw new Error(errorMessage);
  }

  return (await response.json()) as RazorpayOrderResponse;
}

/**
 * Verifies the Razorpay payment signature returned by Razorpay Checkout.
 * Expected formula: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret) === razorpay_signature
 */
export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const keySecret = getRazorpayKeySecret();
  if (!keySecret) {
    // If in development mode without secrets, allow mock payment IDs starting with 'pay_mock_'
    if (params.razorpayPaymentId.startsWith("pay_mock_") || params.razorpaySignature === "mock_signature") {
      console.warn("[Razorpay Server] Allowing mock payment in development mode.");
      return true;
    }
    console.error("[Razorpay Server] Cannot verify payment: RAZORPAY_KEY_SECRET is not configured.");
    return false;
  }

  try {
    const body = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
    const expectedSignature = createHmac("sha256", keySecret).update(body).digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(params.razorpaySignature, "utf8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error("[Razorpay Server] Signature verification error:", error);
    return false;
  }
}

/**
 * Verifies a Razorpay Webhook signature against the raw body.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): boolean {
  const webhookSecret = getRazorpayWebhookSecret();
  if (!webhookSecret) {
    console.error("[Razorpay Server] RAZORPAY_WEBHOOK_SECRET is not configured.");
    return false;
  }

  try {
    const expectedSignature = createHmac("sha256", webhookSecret).update(params.rawBody).digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(params.signature, "utf8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error("[Razorpay Server] Webhook signature verification error:", error);
    return false;
  }
}
