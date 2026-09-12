import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { ensureDbSchema, getSql } from "@/lib/db";

export type PaymentStatus =
  "Pending" | "Processing" | "Paid" | "Failed" | "Cancelled" | "Partially Refunded" | "Refunded";

export type PaymentMethod =
  "Cash on Delivery" | "UPI" | "Credit Card" | "Debit Card" | "Net Banking" | "Wallet" | "Other";

export type AdminPayment = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  transactionId: string | null;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  refundAmount: number;
  adminNote: string | null;
  updatedBy: string | null;
};

export const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  Pending: ["Processing", "Paid", "Failed", "Cancelled"],
  Processing: ["Paid", "Failed", "Cancelled"],
  Paid: ["Partially Refunded", "Refunded"],
  Failed: ["Pending", "Processing"],
  Cancelled: [],
  "Partially Refunded": ["Refunded"],
  Refunded: [],
};

async function seedPaymentsIfEmpty() {
  const sql = getSql();
  const countRes = await sql`SELECT COUNT(*) as count FROM payments`;
  const count = Number(countRes[0]?.count || 0);
  if (count === 0) {
    const orders = await sql`
      SELECT id, order_number, user_id, shipping_name, shipping_email, total_amount, payment_method, payment_status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 15
    `;

    const methods: PaymentMethod[] = [
      "Cash on Delivery",
      "UPI",
      "Credit Card",
      "Debit Card",
      "Net Banking",
      "Wallet",
    ];
    const statuses: PaymentStatus[] = [
      "Pending",
      "Processing",
      "Paid",
      "Failed",
      "Partially Refunded",
      "Refunded",
    ];

    let i = 0;
    for (const o of orders as any[]) {
      const pId = `pay_${o.id || Math.random().toString(36).slice(2, 9)}`;
      const method = methods[i % methods.length];
      const status = statuses[i % statuses.length];
      const amount = Number(o.total_amount || 999);
      const isPaid = status === "Paid" || status === "Partially Refunded" || status === "Refunded";
      const txId = isPaid ? `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}` : null;
      const refundAmt =
        status === "Refunded"
          ? amount
          : status === "Partially Refunded"
            ? Math.round(amount / 2)
            : 0;
      const paidD = isPaid ? o.created_at : null;

      try {
        await sql`
          INSERT INTO payments (
            id, order_id, customer_id, transaction_id, payment_method, amount, currency,
            status, paid_at, refund_amount, admin_note, created_at, updated_at
          ) VALUES (
            ${pId}, ${o.id}, ${o.user_id || "usr_guest"}, ${txId}, ${method}, ${amount}, 'INR',
            ${status}, ${paidD}, ${refundAmt}, ${i % 4 === 0 ? "Verified transaction" : null}, ${o.created_at}, NOW()
          ) ON CONFLICT (id) DO NOTHING
        `;
      } catch (err) {
        console.error("Error seeding payment:", err);
      }
      i++;
    }
  }
}

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminPayment[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    await seedPaymentsIfEmpty();

    const sql = getSql();
    const paymentsRows = await sql`
      SELECT p.*, o.order_number, o.shipping_email, o.shipping_name
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      ORDER BY p.created_at DESC
    `;

    return paymentsRows.map((p: any) => ({
      id: String(p.id),
      orderId: String(p.order_id || ""),
      orderNumber: String(p.order_number || p.order_id || "ORD-XXXX"),
      customerId: String(p.customer_id || ""),
      customerName: String(p.shipping_name || "Customer"),
      customerEmail: p.shipping_email || undefined,
      transactionId: p.transaction_id || null,
      paymentMethod: (p.payment_method as PaymentMethod) || "Cash on Delivery",
      amount: Number(p.amount || 0),
      currency: String(p.currency || "INR"),
      status: (p.status as PaymentStatus) || "Pending",
      paidAt: p.paid_at ? new Date(p.paid_at).toISOString() : null,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString(),
      refundAmount: Number(p.refund_amount || 0),
      adminNote: p.admin_note || null,
      updatedBy: p.updated_by || null,
    }));
  });

export const adminUpdatePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      paymentId: string;
      newStatus: PaymentStatus;
      refundAmount?: number;
      adminNote?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();
    const authCtx = context as any;

    const current =
      await sql`SELECT status, amount, refund_amount FROM payments WHERE id = ${data.paymentId} LIMIT 1`;
    if (current.length === 0) {
      throw new Error("Payment not found");
    }
    const currentStatus = current[0].status as PaymentStatus;
    const totalAmount = Number(current[0].amount || 0);
    const currentRefund = Number(current[0].refund_amount || 0);

    const allowed = VALID_PAYMENT_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(data.newStatus) && currentStatus !== data.newStatus) {
      throw new Error(
        `Invalid payment status transition from ${currentStatus} to ${data.newStatus}`,
      );
    }

    let newRefund = currentRefund;
    if (data.refundAmount !== undefined) {
      if (data.refundAmount < 0 || data.refundAmount > totalAmount) {
        throw new Error("Invalid refund amount. Cannot exceed total payment or be negative.");
      }
      newRefund = data.refundAmount;
    } else if (data.newStatus === "Refunded" && newRefund === 0) {
      newRefund = totalAmount;
    }

    const now = new Date().toISOString();
    let paidAtSql = null;
    if (data.newStatus === "Paid") {
      paidAtSql = now;
    }

    await sql`
      UPDATE payments
      SET status = ${data.newStatus},
          refund_amount = ${newRefund},
          updated_at = NOW(),
          updated_by = ${authCtx.userId},
          paid_at = COALESCE(${paidAtSql}, paid_at),
          admin_note = COALESCE(${data.adminNote || null}, admin_note)
      WHERE id = ${data.paymentId}
    `;

    await logAudit(context as any, "payment.status_update", "payment", data.paymentId, {
      from: currentStatus,
      to: data.newStatus,
      refundAmount: newRefund,
    });

    return { ok: true as const };
  });
