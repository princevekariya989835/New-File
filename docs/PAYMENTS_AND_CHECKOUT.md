# RIOTOUS Payments & Checkout Guide

> **Gateway**: Razorpay Payment Gateway (`razorpay` Node SDK)  
> **Key Files**: `src/lib/razorpay.server.ts`, `src/routes/api/razorpay.webhook.ts`, `src/routes/checkout.tsx`

This guide explains the multi-step checkout workflow, coupon validation, Razorpay order creation, client modal integration, cryptographic payment verification, and webhook handling in the RIOTOUS platform.

---

## 1. Checkout Workflow (`src/routes/checkout.tsx`)

The checkout page coordinates customer details, discounts, and payment initiation:
1. **Bag Inspection**: Reads active items from Zustand store (`src/stores/cart-store.ts`). If the bag is empty, redirects to `/shop`.
2. **Shipping Address Collection**: Collects customer full name, email, phone number, street address, city, state, and postal code.
3. **Coupon Code Application**:
   - Calls `validateCouponServerFn` in `src/lib/coupons.functions.ts`.
   - Validates minimum order value, expiry date, and customer usage limits.
   - Computes flat or percentage discount (capped by `maximum_discount` if defined).
4. **Shipping Fee Computation**:
   - Computes standard shipping fees or applies free shipping when cart subtotal meets the promotional threshold.
5. **Order Record Creation**:
   - Invokes `createOrderServerFn` to generate an order in `orders` with `status = 'Pending'` and locks stock in `product_variants.reserved_stock`.

---

## 2. Razorpay Order Creation (`src/lib/razorpay.server.ts`)

Server-side order creation uses the official Razorpay credentials:
```typescript
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createRazorpayOrder(amountInInr: number, receiptId: string) {
  const options = {
    amount: Math.round(amountInInr * 100), // Amount in paise
    currency: "INR",
    receipt: receiptId,
    payment_capture: 1, // Auto-capture payment
  };
  return await razorpay.orders.create(options);
}
```

---

## 3. Client Modal Launch & Supported Payment Methods

When the customer clicks **Proceed to Pay**:
1. The client dynamically loads `https://checkout.razorpay.com/v1/checkout.js`.
2. Configures the checkout options:
   - `key`: Public `RAZORPAY_KEY_ID`.
   - `order_id`: Razorpay Order ID generated in step 2.
   - `name`: `'RIOTOUS Store'`.
   - `description`: `'Order ORD-XXXX'`.
   - `image`: `'https://riotous.store/assets/riotous-logo.png'`.
   - `prefill`: Customer name, email, and phone number.
   - `theme`: Primary brand red (`#F00B11`).
3. **Supported Indian Payment Methods**:
   - **UPI**: Instant QR code & intent flow for Google Pay, PhonePe, Paytm, BHIM, CRED.
   - **Cards**: Credit & Debit cards (Visa, MasterCard, RuPay, Maestro, American Express).
   - **NetBanking**: Direct integration across all major Indian banks (HDFC, ICICI, SBI, Axis, Kotak).
   - **Wallets & PayLater**: Mobikwik, Freecharge, Amazon Pay, LazyPay.

---

## 4. Cryptographic Signature Verification

To prevent client-side payment tampering, Razorpay requires HMAC SHA-256 signature verification on the server before marking an order paid:
```typescript
import crypto from "crypto";

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");
  return expectedSignature === signature;
}
```

---

## 5. Razorpay Webhook Ingestion (`src/routes/api/razorpay.webhook.ts`)

The webhook provides bulletproof payment reconciliation even if the customer's browser closes before the client callback finishes:
1. **Signature Verification**:
   - Reads header `x-razorpay-signature`.
   - Validates using HMAC SHA-256 against `RAZORPAY_WEBHOOK_SECRET`.
2. **Idempotency Guard**:
   - Checks `orders.payment_status`. If already `'Paid'`, exits immediately with HTTP 200 without double-deducting inventory.
3. **Event `payment.captured`**:
   - Sets `orders.payment_status = 'Paid'` and `orders.status = 'Processing'`.
   - Records payment transaction in `payments` table.
   - Deducts stock via `deductStockForOrder()` in `src/lib/inventory.service.ts`.
   - Generates GST tax invoice via `generateInvoiceForOrderServerFn()`.
   - Sends confirmation email via Brevo/Resend.
4. **Event `payment.failed`**:
   - Sets `orders.payment_status = 'Failed'`.
   - Releases locked stock via `releaseReservedStock()`.
