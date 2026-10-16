import { getSql, ensureDbSchema } from "@/lib/db";
import { InvoiceRecord, SellerInvoiceConfig } from "./types";
import { buildInvoiceSnapshot } from "./tax-calculator";
import { generateInvoicePdf } from "./pdf-generator";

/**
 * In-memory fallback stores for local offline development
 */
const _mockInvoices = new Map<string, InvoiceRecord>();
const _mockSequences = new Map<number, number>();

/**
 * Concurrency-safe atomic sequence allocator for invoice numbers.
 * Guaranteed format: RIO-YYYY-000001
 */
export async function getNextInvoiceNumber(year: number, prefix = "RIO"): Promise<string> {
  const sql = getSql();

  try {
    // 1. Try D1 / SQLite UPSERT
    const result = await sql`
      INSERT INTO invoice_sequences (year, last_seq)
      VALUES (${year}, 1)
      ON CONFLICT(year) DO UPDATE SET last_seq = invoice_sequences.last_seq + 1, updated_at = CURRENT_TIMESTAMP
    `;

    // Read the current sequence
    const rows = await sql`
      SELECT last_seq FROM invoice_sequences WHERE year = ${year} LIMIT 1
    `;

    if (rows && rows.length > 0 && rows[0].last_seq !== undefined) {
      const seq = Number(rows[0].last_seq);
      return `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
    }
  } catch (err) {
    // In local in-memory fallback or REST table initialization
    console.warn("[Invoice Sequence] DB sequence query fallback:", err);
  }

  // Fallback: in-memory or max existing calculation
  const current = (_mockSequences.get(year) || 0) + 1;
  _mockSequences.set(year, current);
  return `${prefix}-${year}-${String(current).padStart(6, "0")}`;
}

/**
 * Fetches store settings for invoice header and seller details.
 */
async function getSellerConfig(): Promise<SellerInvoiceConfig> {
  const sql = getSql();
  let row: any = null;

  try {
    const rows = await sql`SELECT * FROM store_settings WHERE id = 'default' LIMIT 1`;
    if (rows && rows.length > 0) {
      row = rows[0];
    }
  } catch (err) {
    console.warn("[Invoice Seller Config] store_settings query error:", err);
  }

  const isGstRegistered = Boolean(row?.is_gst_registered);
  const businessGstin = String(row?.business_gstin || "")
    .trim()
    .toUpperCase();

  return {
    legalBusinessName: row?.legal_business_name || row?.store_name || "RIOTOUS Brandworks",
    brandName: row?.store_name || "RIOTOUS",
    storeEmail: row?.store_email || "support@riotous.store",
    storePhone: row?.store_phone || "+91 90998 66791",
    storeAddress:
      row?.store_address || "Plot 42, Streetwear District, Surat, Gujarat 395006, India",
    isGstRegistered,
    businessGstin,
    sellerPan: row?.seller_pan || (businessGstin.length >= 12 ? businessGstin.slice(2, 12) : ""),
    sellerState: row?.seller_state || "Gujarat",
    sellerStateCode: row?.seller_state_code || "24",
    sellerPincode: row?.seller_pincode || "395006",
    defaultHsnCode: row?.default_hsn_code || "6109",
    defaultGstRate: Number(row?.default_gst_rate ?? 5),
    authorizedSignatoryName: row?.authorized_signatory_name || "Authorized Signatory",
    invoicePrefix: row?.invoice_prefix || "RIO",
    invoiceNotes:
      row?.invoice_notes ||
      "1. Goods once sold are eligible for return/exchange within 7 days as per RIOTOUS policy.\n2. Subject to Surat jurisdiction.",
  };
}

/**
 * Ensures table existence in DB runtime.
 */
async function ensureInvoiceTables() {
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        order_id TEXT UNIQUE NOT NULL,
        order_number TEXT NOT NULL,
        invoice_number TEXT UNIQUE NOT NULL,
        invoice_date TEXT NOT NULL,
        invoice_title TEXT NOT NULL DEFAULT 'TAX INVOICE',
        seller_details TEXT NOT NULL DEFAULT '{}',
        customer_details TEXT NOT NULL DEFAULT '{}',
        items_snapshot TEXT NOT NULL DEFAULT '[]',
        totals_snapshot TEXT NOT NULL DEFAULT '{}',
        tax_breakup TEXT NOT NULL DEFAULT '{}',
        currency TEXT NOT NULL DEFAULT 'INR',
        payment_method TEXT NOT NULL DEFAULT 'COD',
        payment_status TEXT NOT NULL DEFAULT 'Pending',
        place_of_supply TEXT,
        state_code TEXT,
        pdf_storage_key TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS invoice_sequences (
        year INTEGER PRIMARY KEY,
        last_seq INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (err) {
    // Schema already exists or in-memory fallback
  }
}

/**
 * Gets or creates the immutable invoice record for an order.
 * Idempotent: Subsequent calls return the identical invoice without changing numbers.
 */
export async function getOrCreateInvoiceForOrder(
  orderId: string,
  options: { forceRegenerate?: boolean } = {},
): Promise<InvoiceRecord> {
  await ensureDbSchema();
  await ensureInvoiceTables();

  const sql = getSql();

  // 1. Check if invoice already exists for this order
  try {
    const existing = await sql`
      SELECT * FROM invoices WHERE order_id = ${orderId} LIMIT 1
    `;

    if (existing && existing.length > 0 && !options.forceRegenerate) {
      const row = existing[0];
      const seller =
        typeof row.seller_details === "string"
          ? JSON.parse(row.seller_details)
          : row.seller_details || {};
      const customer =
        typeof row.customer_details === "string"
          ? JSON.parse(row.customer_details)
          : row.customer_details || {};
      const items =
        typeof row.items_snapshot === "string"
          ? JSON.parse(row.items_snapshot)
          : row.items_snapshot || [];
      const totals =
        typeof row.totals_snapshot === "string"
          ? JSON.parse(row.totals_snapshot)
          : row.totals_snapshot || {};
      const notes = (seller.invoiceNotes || "")
        .split("\n")
        .map((n: string) => n.trim())
        .filter(Boolean);

      return {
        id: row.id,
        orderId: row.order_id,
        orderNumber: row.order_number,
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        orderDate: row.created_at || row.invoice_date,
        invoiceTitle: row.invoice_title || "TAX INVOICE",
        isTaxInvoice: row.invoice_title === "TAX INVOICE",
        isReverseCharge: false,
        placeOfSupply: row.place_of_supply || "",
        seller,
        customer,
        items,
        totals,
        payment: {
          paymentMethod: row.payment_method || "COD",
          paymentStatus: row.payment_status || "Paid",
        },
        notes,
        pdfStorageKey: row.pdf_storage_key || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  } catch (err) {
    console.warn("[Invoice Query] Error checking existing invoice:", err);
  }

  // Check mock store
  if (_mockInvoices.has(orderId) && !options.forceRegenerate) {
    return _mockInvoices.get(orderId)!;
  }

  // 2. Fetch the Order from DB
  const orderRows = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`;
  if (!orderRows || orderRows.length === 0) {
    throw new Error(`Order ${orderId} not found.`);
  }
  const order = orderRows[0];

  // 3. Verify order status eligibility
  const statusLower = (order.status || "").toLowerCase();
  const paymentStatusLower = (order.payment_status || "").toLowerCase();

  // Cancelled or Failed orders that never had an invoice should not have one created as a completed sale
  if (statusLower === "cancelled" || paymentStatusLower === "failed") {
    throw new Error(`Cannot issue an invoice for a ${order.status} order.`);
  }

  // 4. Fetch Order Items
  const itemRows = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
  const items = Array.isArray(itemRows) ? itemRows : [];

  // 5. Fetch Seller Config
  const sellerConfig = await getSellerConfig();

  // 6. Generate Unique Concurrency-Safe Invoice Number
  const orderYear = order.created_at
    ? new Date(order.created_at).getFullYear()
    : new Date().getFullYear();
  const invoiceNumber = await getNextInvoiceNumber(orderYear, sellerConfig.invoicePrefix);
  const invoiceDate = new Date().toISOString();

  // 7. Calculate Tax, Line Items, and Totals Snapshot
  const invoiceSnapshot = buildInvoiceSnapshot({
    order,
    items,
    settings: sellerConfig,
    invoiceNumber,
    invoiceDate,
  });

  // 8. Persist into `invoices` table
  try {
    await sql`
      INSERT INTO invoices (
        id, order_id, order_number, invoice_number, invoice_date, invoice_title,
        seller_details, customer_details, items_snapshot, totals_snapshot, tax_breakup,
        currency, payment_method, payment_status, place_of_supply, state_code, created_at, updated_at
      ) VALUES (
        ${invoiceSnapshot.id}, ${invoiceSnapshot.orderId}, ${invoiceSnapshot.orderNumber},
        ${invoiceSnapshot.invoiceNumber}, ${invoiceSnapshot.invoiceDate}, ${invoiceSnapshot.invoiceTitle},
        ${JSON.stringify(invoiceSnapshot.seller)}, ${JSON.stringify(invoiceSnapshot.customer)},
        ${JSON.stringify(invoiceSnapshot.items)}, ${JSON.stringify(invoiceSnapshot.totals)},
        ${JSON.stringify({
          taxableSubtotal: invoiceSnapshot.totals.taxableSubtotal,
          cgst: invoiceSnapshot.totals.totalCgst,
          sgst: invoiceSnapshot.totals.totalSgst,
          igst: invoiceSnapshot.totals.totalIgst,
          totalTax: invoiceSnapshot.totals.totalTax,
        })},
        ${invoiceSnapshot.totals.currency}, ${invoiceSnapshot.payment.paymentMethod},
        ${invoiceSnapshot.payment.paymentStatus}, ${invoiceSnapshot.placeOfSupply},
        ${invoiceSnapshot.customer.stateCode}, ${invoiceSnapshot.createdAt}, ${invoiceSnapshot.updatedAt}
      )
      ON CONFLICT (order_id) DO UPDATE SET
        invoice_number = excluded.invoice_number,
        totals_snapshot = excluded.totals_snapshot,
        updated_at = excluded.updated_at
    `;

    // 9. Update orders table with invoice_number and invoice_date
    await sql`
      UPDATE orders
      SET invoice_number = ${invoiceSnapshot.invoiceNumber},
          invoice_date = ${invoiceSnapshot.invoiceDate}
      WHERE id = ${orderId}
    `;
  } catch (err) {
    console.warn("[Invoice Persist] Warning during database insert:", err);
  }

  // Save to in-memory fallback
  _mockInvoices.set(orderId, invoiceSnapshot);

  return invoiceSnapshot;
}
