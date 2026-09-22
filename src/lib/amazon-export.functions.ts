/**
 * amazon-export.functions.ts
 *
 * Server functions for the RIOTOUS Amazon-compatible order export system.
 * The system is fully metadata-driven: admins upload any Amazon template file,
 * the detected headers are stored, and admins map RIOTOUS fields to Amazon columns.
 * At export time, the mapping is applied to generate a file that matches the
 * exact structure of the uploaded template.
 *
 * IMPORTANT: No Amazon column names are hardcoded here. All column structure
 * comes exclusively from the template uploaded by the administrator.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin } from "@/lib/admin-utils";
import { ensureDbSchema, getSql } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AmazonTemplate = {
  id: string;
  name: string;
  purpose: string;
  fileName: string;
  fileFormat: string;
  headers: string[];
  mapping: Record<string, string>; // { amazonColumnHeader: riotousFieldKey }
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export type ExportValidationWarning = {
  row: number;
  orderNumber: string;
  column: string;
  message: string;
};

export type AmazonExportResult = {
  ok: boolean;
  fileName: string;
  base64: string;
  mimeType: string;
  rowCount: number;
  warnings: ExportValidationWarning[];
};

export type ParseHeadersResult = {
  headers: string[];
  detectedFormat: string;
  sheetName?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// RIOTOUS field definitions
// These are the right-hand-side values that admins map Amazon columns TO.
// Order-level fields repeat on every row for the same order.
// Item-level fields come from each individual order_item.
// ─────────────────────────────────────────────────────────────────────────────

export const RIOTOUS_FIELD_KEYS: Record<string, string> = {
  // Order-level
  "order.order_number": "Order Number",
  "order.created_at": "Order Date (ISO)",
  "order.created_at_date": "Order Date (DD/MM/YYYY)",
  "order.created_at_time": "Order Time",
  "order.status": "Order Status",
  "order.payment_status": "Payment Status",
  "order.payment_method": "Payment Method",
  "order.total_amount": "Order Total",
  "order.subtotal": "Subtotal",
  "order.shipping_charge": "Shipping Charge",
  "order.tax_amount": "Tax Amount",
  "order.discount_amount": "Discount Amount",
  "order.discount_code": "Discount Code",
  "order.currency": "Currency",
  "order.courier_name": "Courier / Carrier",
  "order.tracking_number": "Tracking Number",
  "order.tracking_url": "Tracking URL",
  "order.admin_notes": "Admin Notes",
  // Shipping
  "order.shipping_name": "Recipient Full Name",
  "order.shipping_email": "Recipient Email",
  "order.shipping_phone": "Recipient Phone",
  "order.shipping_address": "Full Shipping Address (multiline)",
  "order.shipping_address_inline": "Full Shipping Address (single line)",
  // Item-level (one row per item)
  "item.product_name": "Product Name",
  "item.product_id": "Product ID",
  "item.selected_size": "Size",
  "item.selected_color": "Color",
  "item.quantity": "Quantity",
  "item.price": "Unit Price",
  "item.subtotal": "Item Subtotal",
  "item.item_index": "Item Index (1-based)",
  "item.item_count": "Total Items in Order",
  // Computed helpers
  "computed.blank": "(Leave blank)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Field resolver
// ─────────────────────────────────────────────────────────────────────────────

function resolveField(
  fieldKey: string,
  order: any,
  item: any,
  itemIndex: number,
  itemCount: number,
): string {
  if (!fieldKey || fieldKey === "computed.blank") return "";

  const d = new Date(order.created_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  switch (fieldKey) {
    // Order-level
    case "order.order_number":
      return String(order.order_number ?? "");
    case "order.created_at":
      return order.created_at ?? "";
    case "order.created_at_date":
      return dateStr;
    case "order.created_at_time":
      return timeStr;
    case "order.status":
      return String(order.status ?? "");
    case "order.payment_status":
      return String(order.payment_status ?? "");
    case "order.payment_method":
      return String(order.payment_method ?? "");
    case "order.total_amount":
      return String(Number(order.total_amount ?? 0));
    case "order.subtotal":
      return String(Number(order.subtotal ?? 0));
    case "order.shipping_charge":
      return String(Number(order.shipping_charge ?? 0));
    case "order.tax_amount":
      return String(Number(order.tax_amount ?? 0));
    case "order.discount_amount":
      return String(Number(order.discount_amount ?? 0));
    case "order.discount_code":
      return String(order.discount_code ?? "");
    case "order.currency":
      return String(order.currency ?? "INR");
    case "order.courier_name":
      return String(order.courier_name ?? "");
    case "order.tracking_number":
      return String(order.tracking_number ?? "");
    case "order.tracking_url":
      return String(order.tracking_url ?? "");
    case "order.admin_notes":
      return String(order.admin_notes ?? "");
    // Shipping
    case "order.shipping_name":
      return String(order.shipping_name ?? "");
    case "order.shipping_email":
      return String(order.shipping_email ?? "");
    case "order.shipping_phone":
      return String(order.shipping_phone ?? "");
    case "order.shipping_address":
      return String(order.shipping_address ?? "");
    case "order.shipping_address_inline":
      return String(order.shipping_address ?? "").replace(/\n/g, ", ");
    // Item-level
    case "item.product_name":
      return String(item?.product_name ?? "");
    case "item.product_id":
      return String(item?.product_id ?? "");
    case "item.selected_size":
      return String(item?.selected_size ?? "");
    case "item.selected_color":
      return String(item?.selected_color ?? "");
    case "item.quantity":
      return String(Number(item?.quantity ?? 1));
    case "item.price":
      return String(Number(item?.price ?? 0));
    case "item.subtotal":
      return String(Number(item?.subtotal ?? 0));
    case "item.item_index":
      return String(itemIndex + 1);
    case "item.item_count":
      return String(itemCount);
    default:
      return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapRowToTemplate(r: any): AmazonTemplate {
  const headers = Array.isArray(r.headers)
    ? r.headers
    : typeof r.headers === "string"
      ? JSON.parse(r.headers)
      : [];
  const mapping =
    r.mapping && typeof r.mapping === "object" && !Array.isArray(r.mapping)
      ? r.mapping
      : typeof r.mapping === "string"
        ? JSON.parse(r.mapping)
        : {};
  return {
    id: String(r.id),
    name: r.name,
    purpose: r.purpose ?? "General",
    fileName: r.file_name,
    fileFormat: r.file_format,
    headers,
    mapping,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : "",
    createdBy: r.created_by ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Server function: Parse headers from uploaded template file (base64)
// ─────────────────────────────────────────────────────────────────────────────

export const amazonParseTemplateHeaders = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      base64: string;
      fileName: string;
    }) => ({
      base64: String(d.base64 ?? ""),
      fileName: String(d.fileName ?? ""),
    }),
  )
  .handler(async ({ data, context }): Promise<ParseHeadersResult> => {
    await assertAdmin(context as any);

    const ext = data.fileName.split(".").pop()?.toLowerCase() ?? "";
    let headers: string[] = [];
    let sheetName: string | undefined;
    let detectedFormat = ext;

    const buffer = Buffer.from(data.base64, "base64");

    if (ext === "csv") {
      // Parse CSV first row as headers
      const text = buffer.toString("utf-8");
      const firstLine = text.split(/\r?\n/)[0] ?? "";
      headers = firstLine.split(",").map((h) => h.replace(/^"|"$/g, "").trim());
      detectedFormat = "csv";
    } else if (ext === "txt" || ext === "tsv") {
      // Tab-delimited
      const text = buffer.toString("utf-8");
      const firstLine = text.split(/\r?\n/)[0] ?? "";
      headers = firstLine.split("\t").map((h) => h.trim());
      detectedFormat = "tsv";
    } else {
      // Excel (.xlsx / .xls)
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("No sheets found in uploaded workbook.");
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      // First non-empty row = headers
      const headerRow = rows.find((r) => r.some((c) => String(c ?? "").trim() !== ""));
      headers = (headerRow ?? []).map((h: any) => String(h ?? "").trim()).filter(Boolean);
      detectedFormat = ext === "xls" ? "xls" : "xlsx";
    }

    if (headers.length === 0) {
      throw new Error(
        "Could not detect any column headers. Make sure the template has headers in the first row.",
      );
    }

    return { headers, detectedFormat, sheetName };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Server function: Save (create) a new template
// ─────────────────────────────────────────────────────────────────────────────

export const amazonSaveTemplate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      name: string;
      purpose: string;
      fileName: string;
      fileFormat: string;
      headers: string[];
      mapping?: Record<string, string>;
    }) => ({
      name: String(d.name ?? "").trim().slice(0, 120),
      purpose: String(d.purpose ?? "General").trim().slice(0, 80),
      fileName: String(d.fileName ?? "").trim().slice(0, 200),
      fileFormat: String(d.fileFormat ?? "xlsx").trim().slice(0, 10),
      headers: Array.isArray(d.headers) ? d.headers.map(String) : [],
      mapping: d.mapping && typeof d.mapping === "object" ? d.mapping : {},
    }),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; id: string }> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    const authCtx = context as any;

    if (!data.name) throw new Error("Template name is required.");
    if (data.headers.length === 0) throw new Error("Template must have at least one column header.");

    const id = `amz_tmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    await sql`
      INSERT INTO amazon_export_templates
        (id, name, purpose, file_name, file_format, headers, mapping, is_active, created_by)
      VALUES (
        ${id},
        ${data.name},
        ${data.purpose},
        ${data.fileName},
        ${data.fileFormat},
        ${JSON.stringify(data.headers)}::jsonb,
        ${JSON.stringify(data.mapping)}::jsonb,
        true,
        ${authCtx.userEmail ?? authCtx.userId ?? "Admin"}
      )
    `;

    return { ok: true, id };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Server function: List all active templates
// ─────────────────────────────────────────────────────────────────────────────

export const amazonListTemplates = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AmazonTemplate[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT id, name, purpose, file_name, file_format, headers, mapping, is_active, created_at, updated_at, created_by
      FROM amazon_export_templates
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    return rows.map(mapRowToTemplate);
  });

// ─────────────────────────────────────────────────────────────────────────────
// Server function: Update mapping for a template
// ─────────────────────────────────────────────────────────────────────────────

export const amazonUpdateMapping = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      templateId: string;
      mapping: Record<string, string>;
      name?: string;
      purpose?: string;
    }) => ({
      templateId: String(d.templateId ?? ""),
      mapping: d.mapping && typeof d.mapping === "object" ? d.mapping : {},
      name: d.name ? String(d.name).trim().slice(0, 120) : undefined,
      purpose: d.purpose ? String(d.purpose).trim().slice(0, 80) : undefined,
    }),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as any);
    const sql = getSql();

    if (!data.templateId) throw new Error("Template ID is required.");

    await sql`
      UPDATE amazon_export_templates
      SET
        mapping = ${JSON.stringify(data.mapping)}::jsonb,
        name = COALESCE(${data.name ?? null}, name),
        purpose = COALESCE(${data.purpose ?? null}, purpose),
        updated_at = NOW()
      WHERE id = ${data.templateId}
    `;

    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Server function: Delete (soft-delete) a template
// ─────────────────────────────────────────────────────────────────────────────

export const amazonDeleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { templateId: string }) => ({
    templateId: String(d.templateId ?? ""),
  }))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as any);
    const sql = getSql();

    if (!data.templateId) throw new Error("Template ID is required.");

    await sql`
      UPDATE amazon_export_templates
      SET is_active = false, updated_at = NOW()
      WHERE id = ${data.templateId}
    `;

    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Server function: Export orders using a template
// ─────────────────────────────────────────────────────────────────────────────

export const amazonExportOrders = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      templateId: string;
      orderIds?: string[];
      filters?: {
        status?: string;
        paymentStatus?: string;
        from?: string;
        to?: string;
      };
    }) => ({
      templateId: String(d.templateId ?? ""),
      orderIds: Array.isArray(d.orderIds) ? d.orderIds.map(String) : [],
      filters: {
        status: d.filters?.status ? String(d.filters.status) : undefined,
        paymentStatus: d.filters?.paymentStatus ? String(d.filters.paymentStatus) : undefined,
        from: d.filters?.from ? String(d.filters.from) : undefined,
        to: d.filters?.to ? String(d.filters.to) : undefined,
      },
    }),
  )
  .handler(async ({ data, context }): Promise<AmazonExportResult> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    // 1. Load template
    if (!data.templateId) throw new Error("Template ID is required.");
    const tmplRows = await sql`
      SELECT id, name, purpose, file_name, file_format, headers, mapping
      FROM amazon_export_templates
      WHERE id = ${data.templateId} AND is_active = true
      LIMIT 1
    `;
    if (tmplRows.length === 0) throw new Error("Template not found or has been deleted.");
    const template = mapRowToTemplate(tmplRows[0]);

    // 2. Load orders
    const orders = await sql`
      SELECT id, order_number, created_at, total_amount, subtotal, discount_amount, discount_code,
        shipping_charge, tax_amount, currency, status, payment_status, payment_method,
        shipping_name, shipping_email, shipping_phone, shipping_address,
        courier_name, tracking_number, tracking_url, admin_notes
      FROM orders
      WHERE 1=1
        ${data.orderIds.length > 0 ? sql`AND id::text = ANY(${data.orderIds}::text[])` : sql``}
        ${data.filters.status ? sql`AND status = ${data.filters.status}` : sql``}
        ${data.filters.paymentStatus ? sql`AND payment_status = ${data.filters.paymentStatus}` : sql``}
        ${data.filters.from ? sql`AND created_at >= ${new Date(data.filters.from).toISOString()}` : sql``}
        ${data.filters.to ? sql`AND created_at < ${new Date(new Date(data.filters.to).getTime() + 86400000).toISOString()}` : sql``}
      ORDER BY created_at DESC
      LIMIT 2000
    `;

    if (orders.length === 0) {
      throw new Error("No orders match the selected filters.");
    }

    const orderIds = orders.map((o: any) => String(o.id));
    const items = await sql`
      SELECT i.id, i.order_id, i.product_id, i.product_name, i.quantity, i.price,
        i.selected_size, i.selected_color, i.subtotal,
        v.sku as variant_sku
      FROM order_items i
      LEFT JOIN product_variants v ON i.variant_id::text = v.id::text
      WHERE i.order_id::text = ANY(${orderIds}::text[])
      ORDER BY i.created_at ASC
    `;

    // Group items by order
    const itemsByOrder = new Map<string, any[]>();
    for (const item of items) {
      const oid = String(item.order_id);
      if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
      // Attach variant SKU to item
      (item as any).sku = item.variant_sku ?? item.product_id ?? "";
      itemsByOrder.get(oid)!.push(item);
    }

    // 3. Build rows — one per order item (explode)
    const warnings: ExportValidationWarning[] = [];
    const dataRows: string[][] = [];
    let globalRowIndex = 0;

    for (const order of orders) {
      const orderItems = itemsByOrder.get(String(order.id)) ?? [];
      // If an order has no items, still export one row
      const rowItems = orderItems.length > 0 ? orderItems : [null];

      rowItems.forEach((item: any, itemIndex: number) => {
        const row: string[] = template.headers.map((header) => {
          const fieldKey = template.mapping[header];
          if (!fieldKey) return ""; // unmapped column → blank

          // Override item.sku resolution to use variant_sku
          if (fieldKey === "item.sku") {
            return String(item?.sku ?? item?.product_id ?? "");
          }

          const value = resolveField(fieldKey, order, item, itemIndex, rowItems.length);

          // Validation: flag empty values for mapped columns
          if (value === "" && fieldKey !== "computed.blank") {
            warnings.push({
              row: globalRowIndex + 2, // +1 for header, +1 for 1-based
              orderNumber: String(order.order_number ?? ""),
              column: header,
              message: `No value for "${header}" (mapped to: ${RIOTOUS_FIELD_KEYS[fieldKey] ?? fieldKey})`,
            });
          }

          return value;
        });

        dataRows.push(row);
        globalRowIndex++;
      });
    }

    // 4. Generate file
    const fmt = template.fileFormat;
    let base64 = "";
    let mimeType = "application/octet-stream";
    let outputFileName = `riotous-amazon-export-${new Date().toISOString().slice(0, 10)}`;

    if (fmt === "csv") {
      const csvContent = [template.headers, ...dataRows]
        .map((row) =>
          row
            .map((cell) => {
              const s = String(cell ?? "");
              const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
              return `"${safe.replace(/"/g, '""')}"`;
            })
            .join(","),
        )
        .join("\n");
      base64 = Buffer.from(csvContent, "utf-8").toString("base64");
      mimeType = "text/csv";
      outputFileName += ".csv";
    } else if (fmt === "tsv") {
      const tsvContent = [template.headers, ...dataRows]
        .map((row) => row.map((cell) => String(cell ?? "").replace(/\t/g, " ")).join("\t"))
        .join("\n");
      base64 = Buffer.from(tsvContent, "utf-8").toString("base64");
      mimeType = "text/tab-separated-values";
      outputFileName += ".txt";
    } else {
      // xlsx / xls
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const wsData = [template.headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Force text format on all cells in data rows to preserve leading zeros,
      // postal codes, order numbers, SKUs etc.
      const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
      for (let R = 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[addr] && ws[addr].v !== undefined) {
            ws[addr].t = "s"; // force string type
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Export");
      const outBuffer = XLSX.write(wb, { type: "buffer", bookType: fmt === "xls" ? "xls" : "xlsx" });
      base64 = Buffer.from(outBuffer).toString("base64");
      mimeType =
        fmt === "xls"
          ? "application/vnd.ms-excel"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      outputFileName += fmt === "xls" ? ".xls" : ".xlsx";
    }

    return {
      ok: true,
      fileName: outputFileName,
      base64,
      mimeType,
      rowCount: dataRows.length,
      warnings,
    };
  });
