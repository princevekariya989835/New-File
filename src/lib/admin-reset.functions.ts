import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { getSql } from "@/lib/db";
import { invalidateCatalogCache } from "@/lib/catalog";

export type AdminResetSection =
  | "dashboard"
  | "orders"
  | "products"
  | "inventory"
  | "customers"
  | "marketing"
  | "reviews"
  | "returns"
  | "shipping"
  | "payments"
  | "designs"
  | "activity"
  | "analytics"
  | "website";

const ADMIN_RESET_PASSWORD = "Prince@955123";

export const adminResetSectionData = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { section: AdminResetSection; password: string }) => ({
    section: d.section,
    password: String(d.password ?? "").trim(),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    if (data.password !== ADMIN_RESET_PASSWORD) {
      throw new Error("Invalid security password. Data erase operation rejected.");
    }

    const sql = getSql();
    const sec = data.section;

    switch (sec) {
      case "dashboard":
      case "analytics": {
        // Clear all operational/transactional records while keeping admin accounts & categories intact
        await sql`DELETE FROM return_notifications`;
        await sql`DELETE FROM returns`;
        await sql`DELETE FROM shipments`;
        await sql`DELETE FROM payments`;
        await sql`DELETE FROM order_items`;
        await sql`DELETE FROM orders`;
        await sql`DELETE FROM campaigns`;
        await sql`DELETE FROM reviews`;
        await sql`DELETE FROM design_submissions`;
        await sql`DELETE FROM carts`;
        await sql`DELETE FROM favorites`;
        await sql`DELETE FROM inventory_transactions`;
        await sql`DELETE FROM admin_audit_log`;
        break;
      }

      case "orders": {
        await sql`DELETE FROM return_notifications`;
        await sql`DELETE FROM returns`;
        await sql`DELETE FROM shipments`;
        await sql`DELETE FROM payments`;
        await sql`DELETE FROM order_items`;
        await sql`DELETE FROM orders`;
        break;
      }

      case "products": {
        await sql`DELETE FROM product_variants`;
        await sql`DELETE FROM products`;
        invalidateCatalogCache();
        break;
      }

      case "inventory": {
        await sql`DELETE FROM inventory_transactions`;
        await sql`
          UPDATE product_variants
          SET stock_quantity = 0, reserved_stock = 0
        `;
        await sql`
          UPDATE products
          SET stock_quantity = 0, reserved_stock = 0
        `;
        invalidateCatalogCache();
        break;
      }

      case "customers": {
        // Erase non-admin customers, keeping the active admin accounts intact
        await sql`DELETE FROM addresses WHERE user_id IN (SELECT id FROM profiles WHERE role != 'admin')`;
        await sql`DELETE FROM carts WHERE user_id IN (SELECT id FROM profiles WHERE role != 'admin')`;
        await sql`DELETE FROM favorites WHERE user_id IN (SELECT id FROM profiles WHERE role != 'admin')`;
        await sql`DELETE FROM profiles WHERE role != 'admin' AND email NOT IN ('princevekariya9898@gmail.com')`;
        break;
      }

      case "marketing": {
        await sql`DELETE FROM campaigns`;
        break;
      }

      case "reviews": {
        await sql`DELETE FROM reviews`;
        break;
      }

      case "returns": {
        await sql`DELETE FROM return_notifications`;
        await sql`DELETE FROM returns`;
        break;
      }

      case "shipping": {
        await sql`DELETE FROM shipments`;
        await sql`
          UPDATE orders
          SET courier_name = NULL, tracking_number = NULL, tracking_url = NULL, shipped_at = NULL, delivered_at = NULL
        `;
        break;
      }

      case "payments": {
        await sql`DELETE FROM payments`;
        await sql`
          UPDATE orders
          SET payment_status = 'Pending'
          WHERE payment_status != 'Pending'
        `;
        break;
      }

      case "designs": {
        await sql`DELETE FROM design_submissions`;
        break;
      }

      case "activity": {
        await sql`DELETE FROM admin_audit_log`;
        break;
      }

      case "website": {
        await sql`DELETE FROM website_draft`;
        await sql`DELETE FROM website_versions`;
        break;
      }

      default:
        throw new Error(`Unsupported reset section: ${sec}`);
    }

    if (sec !== "activity" && sec !== "dashboard" && sec !== "analytics") {
      try {
        await logAudit(context as any, "data.erase", sec, sec, {
          section: sec,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // ignore audit failure
      }
    }

    return {
      ok: true,
      message: `All ${sec} data has been successfully erased.`,
    };
  });
