import { createHmac } from "node:crypto";

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
    throw new Error(
      "Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the server. Please set them in your environment variables.",
    );
  }

  const authPayload = `${keyId}:${keySecret}`;
  const authBase64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(authPayload).toString("base64")
      : btoa(authPayload);
  const authHeader = `Basic ${authBase64}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch("https://api.razorpay.com/v1/orders", {
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
      signal: controller.signal,
    });
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    if (netErr?.name === "AbortError") {
      throw new Error("Razorpay Orders API request timed out after 10 seconds.");
    }
    throw new Error(`Razorpay Orders API network error: ${netErr?.message || netErr}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = "Failed to create Razorpay order";
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error?.description || parsed.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage} (${response.status}): ${errorBody}`;
    }
    console.error("[Razorpay Server] Create Order API error:", response.status, errorMessage);
    throw new Error(errorMessage);
  }

  return (await response.json()) as RazorpayOrderResponse;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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
    console.error("[Razorpay Server] Cannot verify payment: RAZORPAY_KEY_SECRET is not configured.");
    return false;
  }

  try {
    const body = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
    const expectedSignature = createHmac("sha256", keySecret).update(body).digest("hex");

    return timingSafeEqualStr(expectedSignature, params.razorpaySignature);
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

    return timingSafeEqualStr(expectedSignature, params.signature);
  } catch (error) {
    console.error("[Razorpay Server] Webhook signature verification error:", error);
    return false;
  }
}

