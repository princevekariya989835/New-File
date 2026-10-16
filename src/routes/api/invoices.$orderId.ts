import { createFileRoute } from "@tanstack/react-router";
import { generateInvoicePdf } from "@/lib/invoice/pdf-generator";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/invoices/$orderId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { orderId } = params;
          if (!orderId || typeof orderId !== "string") {
            return new Response("Missing orderId parameter", { status: 400 });
          }

          // 1. Authenticate user from cookie or Authorization header
          let token: string | null = null;
          const authH =
            request.headers.get("authorization") || request.headers.get("Authorization");
          if (authH && authH.startsWith("Bearer ")) {
            token = authH.substring(7).trim();
          }

          if (!token) {
            const cookieH = request.headers.get("cookie") || "";
            const match = cookieH.match(/riotous_session=([^;]+)/);
            if (match) {
              token = decodeURIComponent(match[1]);
            }
          }

          if (!token) {
            // Also check query param ?token=
            const url = new URL(request.url);
            token = url.searchParams.get("token");
          }

          if (!token) {
            return new Response("Unauthorized. Please log in to download this invoice.", {
              status: 401,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }

          const { verifyAndDecodeToken } = await import("@/lib/auth.server");
          const decoded = await verifyAndDecodeToken(token);
          if (!decoded || !decoded.id) {
            return new Response("Invalid or expired session token.", { status: 401 });
          }

          // 2. Fetch the order to verify authorization
          const sql = getSql();
          const rows = await sql`SELECT * FROM orders WHERE id::text = ${orderId} LIMIT 1`;
          if (!rows || rows.length === 0) {
            return new Response("Order not found.", { status: 404 });
          }
          const order = rows[0];

          // 3. Verify user is owner or admin
          const orderUserId = order.user_id ? String(order.user_id).trim() : "";
          const authUserId = String(decoded.id || "").trim();
          const orderEmail = order.shipping_email
            ? String(order.shipping_email).toLowerCase().trim()
            : "";
          const authEmail = decoded.email ? String(decoded.email).toLowerCase().trim() : "";

          const isOwner =
            Boolean(
              orderUserId &&
              (orderUserId === authUserId || (authEmail && orderUserId === authEmail)),
            ) || Boolean(orderEmail && authEmail && orderEmail === authEmail);

          const role = String(decoded.role || "").toLowerCase();
          const isAdmin = role === "super admin" || role === "admin" || role === "staff";

          if (!isOwner && !isAdmin) {
            return new Response("Forbidden. You are not authorized to view this invoice.", {
              status: 403,
            });
          }

          // 4. Retrieve or generate the invoice
          const { getOrCreateInvoiceForOrder } = await import("@/lib/invoice/invoice.server");
          const invoice = await getOrCreateInvoiceForOrder(orderId);

          // 5. Generate PDF
          const pdfBytes = generateInvoicePdf(invoice);
          const filename = `RIOTOUS-Invoice-${invoice.invoiceNumber}.pdf`;

          return new Response(pdfBytes as unknown as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Cache-Control": "private, no-cache, no-store, must-revalidate",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch (err: any) {
          console.error("[API /api/invoices/$orderId] Error generating invoice:", err);
          return new Response(
            `Error generating invoice: ${err?.message || "Internal server error"}`,
            {
              status: 500,
            },
          );
        }
      },
    },
  },
});
