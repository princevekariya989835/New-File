import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { ensureDbSchema, getSql } from "@/lib/db";

export type SupportRequest = {
  id: string;
  request_type: "return" | "refund" | "support";
  order_name: string | null;
  reason: string | null;
  details: string;
  status: string;
  created_at: string;
};

export const getMySupportRequests = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<SupportRequest[]> => {
    try {
      await ensureDbSchema();
      const sql = getSql();
      const authCtx = context as any;
      const rows = await sql`
        SELECT id, request_type, order_name, reason, details, status, created_at
        FROM support_requests
        WHERE user_id = ${authCtx.userId}
        ORDER BY created_at DESC
      `;
      return rows.map((r: any) => ({
        id: r.id,
        request_type: r.request_type,
        order_name: r.order_name || null,
        reason: r.reason || null,
        details: r.details || "",
        status: r.status || "Open",
        created_at: new Date(r.created_at).toISOString(),
      }));
    } catch {
      return [];
    }
  });

export const submitSupportRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      request_type: string;
      order_name?: string | null;
      reason?: string | null;
      details: string;
      contact_email?: string | null;
    }) => {
      const allowedTypes = ["return", "refund", "support"];
      const reqType = allowedTypes.includes(String(d?.request_type).toLowerCase())
        ? (String(d.request_type).toLowerCase() as "return" | "refund" | "support")
        : "support";
      const details = String(d?.details || "").trim().slice(0, 2000);
      if (!details) {
        throw new Error("Please provide details for your support request.");
      }
      return {
        request_type: reqType,
        order_name: d.order_name ? String(d.order_name).trim().slice(0, 100) : null,
        reason: d.reason ? String(d.reason).trim().slice(0, 100) : null,
        details,
        contact_email: d.contact_email ? String(d.contact_email).trim().slice(0, 255) : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await ensureDbSchema();
    const sql = getSql();
    const authCtx = context as any;
    const reqId = `sup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    await sql`
      INSERT INTO support_requests (
        id, user_id, request_type, order_name, reason, details, contact_email
      ) VALUES (
        ${reqId}, ${authCtx.userId}, ${data.request_type}, ${data.order_name || null}, ${data.reason || null}, ${data.details}, ${data.contact_email || authCtx.user?.email || "Customer"}
      );
    `;

    return { ok: true, id: reqId };
  });
