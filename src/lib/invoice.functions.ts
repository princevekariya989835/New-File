import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { getSql } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/invoice/pdf-generator";
import { getOrCreateInvoiceForOrder } from "@/lib/invoice/invoice.server";

// Helper: Assert admin access
async function assertAdmin(context: any) {
  const user = context?.user;
  if (!user) {
    throw new Error("Authentication required.");
  }
  const role = String(user.role || "").toLowerCase();
  const isAdmin =
    role === "super admin" ||
    role === "admin" ||
    role === "administrator" ||
    role === "staff";
  if (!isAdmin) {
    throw new Error("Admin privileges required.");
  }
}

/**
 * Downloads invoice PDF for the authenticated customer.
 * Security: Validates that the order belongs to the authenticated user.
 */
export const getCustomerInvoicePdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: { orderId: string }) => {
    if (!data?.orderId || typeof data.orderId !== "string") {
      throw new Error("Valid Order ID is required.");
    }
    return data;
  })
  .handler(async ({ context, data }) => {
    const authUser = context.user;
    if (!authUser) {
      throw new Error("You must be logged in to access invoices.");
    }

    const sql = getSql();
    const rows = await sql`SELECT * FROM orders WHERE id = ${data.orderId} LIMIT 1`;
    if (!rows || rows.length === 0) {
      throw new Error("Order not found.");
    }
    const order = rows[0];

    // Authorization check: User must own the order or be an admin
    const isOwner =
      (order.user_id && String(order.user_id) === String(authUser.id)) ||
      (order.shipping_email && order.shipping_email.toLowerCase() === authUser.email.toLowerCase());

    const isAdmin =
      authUser.role === "Super Admin" ||
      authUser.role === "Admin" ||
      authUser.role === "Staff";

    if (!isOwner && !isAdmin) {
      throw new Error("Access denied: You are not authorized to download this invoice.");
    }

    // Retrieve or generate invoice
    const invoice = await getOrCreateInvoiceForOrder(data.orderId);

    // Generate PDF
    const pdfBytes = generateInvoicePdf(invoice);

    // Convert to base64
    let base64 = "";
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(pdfBytes).toString("base64");
    } else {
      let binary = "";
      const len = pdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      base64 = btoa(binary);
    }

    const filename = `RIOTOUS-Invoice-${invoice.invoiceNumber}.pdf`;

    return {
      success: true,
      filename,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      pdfBase64: base64,
      base64,
    };
  });

/**
 * Downloads invoice PDF for any order. Protected by admin privileges.
 */
export const getAdminInvoicePdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: { orderId: string; forceRegenerate?: boolean }) => {
    if (!data?.orderId || typeof data.orderId !== "string") {
      throw new Error("Valid Order ID is required.");
    }
    return data;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    // Retrieve or generate invoice
    const invoice = await getOrCreateInvoiceForOrder(data.orderId, {
      forceRegenerate: data.forceRegenerate,
    });

    // Generate PDF
    const pdfBytes = generateInvoicePdf(invoice);

    let base64 = "";
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(pdfBytes).toString("base64");
    } else {
      let binary = "";
      const len = pdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      base64 = btoa(binary);
    }

    const filename = `RIOTOUS-Invoice-${invoice.invoiceNumber}.pdf`;

    return {
      success: true,
      filename,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      pdfBase64: base64,
      base64,
    };
  });

/**
 * Admin retry/regenerate invoice snapshot and serial number.
 */
export const adminRetryGenerateInvoice = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: { orderId: string }) => {
    if (!data?.orderId || typeof data.orderId !== "string") {
      throw new Error("Valid Order ID is required.");
    }
    return data;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    const invoice = await getOrCreateInvoiceForOrder(data.orderId, {
      forceRegenerate: true,
    });

    return {
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      message: `Invoice ${invoice.invoiceNumber} successfully generated for order.`,
    };
  });
