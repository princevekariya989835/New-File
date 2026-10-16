import {
  InvoiceItem,
  InvoiceTotals,
  InvoiceRecord,
  SellerInvoiceConfig,
  CustomerInvoiceDetails,
  InvoicePaymentInfo,
} from "./types";
import { resolveIndianState } from "./indian-states";
import { numberToIndianRupeesWords } from "./number-to-words";

export interface BuildInvoiceSnapshotParams {
  order: any;
  items: any[];
  settings: Partial<SellerInvoiceConfig>;
  invoiceNumber: string;
  invoiceDate?: string;
}

/**
 * Calculates complete Indian tax breakdown, itemized line items, and totals
 * based on verified seller GST registration and place-of-supply rules.
 */
export function buildInvoiceSnapshot(params: BuildInvoiceSnapshotParams): InvoiceRecord {
  const { order, items, settings, invoiceNumber } = params;

  // 1. Seller Configuration Snapshot
  const isGstRegistered = Boolean(settings.isGstRegistered);
  const rawGstin = (settings.businessGstin || "").trim().toUpperCase();
  const hasValidGstin = isGstRegistered && rawGstin.length >= 15;

  // Extract PAN from GSTIN (chars 3 to 12) if not explicitly set
  let sellerPan = (settings.sellerPan || "").trim().toUpperCase();
  if (!sellerPan && rawGstin.length >= 12) {
    sellerPan = rawGstin.slice(2, 12);
  }

  const sellerState = settings.sellerState || "Gujarat";
  const sellerStateCode = settings.sellerStateCode || "24";

  const seller: SellerInvoiceConfig = {
    legalBusinessName: settings.legalBusinessName || "RIOTOUS Brandworks",
    brandName: settings.brandName || "RIOTOUS",
    storeEmail: settings.storeEmail || "support@riotous.store",
    storePhone: settings.storePhone || "+91 90998 66791",
    storeAddress:
      settings.storeAddress || "Plot 42, Streetwear District, Surat, Gujarat 395006, India",
    isGstRegistered: hasValidGstin,
    businessGstin: hasValidGstin ? rawGstin : "",
    sellerPan,
    sellerState,
    sellerStateCode,
    sellerPincode: settings.sellerPincode || "395006",
    defaultHsnCode: settings.defaultHsnCode || "6109",
    defaultGstRate: Number(settings.defaultGstRate ?? 5),
    authorizedSignatoryName: settings.authorizedSignatoryName || "Authorized Signatory",
    invoicePrefix: settings.invoicePrefix || "RIO",
    invoiceNotes:
      settings.invoiceNotes ||
      "1. Goods once sold are eligible for return/exchange within 7 days as per RIOTOUS policy.\n2. Subject to Surat jurisdiction.",
  };

  // 2. Customer & Place of Supply
  const rawCustAddress = order.shipping_address || order.billing_address || "";
  const rawCustState = order.shipping_state || "";
  const resolvedState = resolveIndianState(rawCustState, rawCustAddress);

  const customer: CustomerInvoiceDetails = {
    name: order.shipping_name || order.shipping_full_name || "Valued Customer",
    email: order.shipping_email || "",
    phone: order.shipping_phone || "",
    shippingAddress: rawCustAddress,
    shippingCity: order.shipping_city || "",
    shippingState: resolvedState.name,
    shippingPincode: order.shipping_pincode || "",
    billingAddress: order.billing_address || rawCustAddress,
    state: resolvedState.name,
    stateCode: resolvedState.code,
    placeOfSupply: `${resolvedState.name} (${resolvedState.code})`,
  };

  // 3. Tax Classification: Intra-State vs Inter-State
  // If seller is registered:
  // Same State -> Intra-State (CGST + SGST)
  // Different State -> Inter-State (IGST)
  // If seller is NOT registered: NONE (Bill of Supply)
  const isTaxInvoice = hasValidGstin;
  const isIntraState = isTaxInvoice && customer.stateCode === seller.sellerStateCode;
  const taxType = !isTaxInvoice ? "NONE" : isIntraState ? "INTRA_STATE" : "INTER_STATE";

  const invoiceTitle = isTaxInvoice ? "TAX INVOICE" : "BILL OF SUPPLY";

  // 4. Prorate Order-Level Discount across Line Items
  const totalOrderDiscount = Number(order.discount_amount) || 0;
  const rawOrderSubtotal =
    Number(order.subtotal) ||
    items.reduce((acc, i) => acc + (Number(i.subtotal) || Number(i.price) * Number(i.quantity)), 0) ||
    1;

  // 5. Calculate Itemized Line Items
  const invoiceItems: InvoiceItem[] = items.map((rawItem, idx) => {
    const qty = Number(rawItem.quantity) || 1;
    const itemSubtotal = Number(rawItem.subtotal) || Number(rawItem.price) * qty;

    // Prorated discount for this item
    const discountFraction = rawOrderSubtotal > 0 ? itemSubtotal / rawOrderSubtotal : 0;
    const itemDiscount = Math.round((totalOrderDiscount * discountFraction + Number.EPSILON) * 100) / 100;

    const netLineTotal = Math.max(0, itemSubtotal - itemDiscount);
    const grossUnitPrice = Math.round(((itemSubtotal / qty) + Number.EPSILON) * 100) / 100;
    const netUnitPrice = Math.round(((netLineTotal / qty) + Number.EPSILON) * 100) / 100;

    const gstRate = isTaxInvoice ? seller.defaultGstRate : 0;
    const rateFactor = 1 + gstRate / 100;

    // Retail prices include GST; extract taxable net value
    const taxableAmount = isTaxInvoice
      ? Math.round(((netLineTotal / rateFactor) + Number.EPSILON) * 100) / 100
      : netLineTotal;

    const totalTaxForLine = Math.round((netLineTotal - taxableAmount + Number.EPSILON) * 100) / 100;

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isTaxInvoice) {
      if (taxType === "INTRA_STATE") {
        cgstRate = gstRate / 2;
        sgstRate = gstRate / 2;
        cgstAmount = Math.round(((totalTaxForLine / 2) + Number.EPSILON) * 100) / 100;
        sgstAmount = Math.round((totalTaxForLine - cgstAmount + Number.EPSILON) * 100) / 100;
      } else {
        igstRate = gstRate;
        igstAmount = totalTaxForLine;
      }
    }

    return {
      id: rawItem.id || `item_${idx + 1}`,
      productId: rawItem.product_id || "",
      productName: rawItem.product_name || "RIOTOUS Streetwear Apparel",
      variantId: rawItem.variant_id || null,
      size: rawItem.selected_size || rawItem.size || null,
      color: rawItem.selected_color || rawItem.color || null,
      sku: rawItem.sku || null,
      hsnCode: rawItem.hsn_code || seller.defaultHsnCode,
      quantity: qty,
      grossUnitPrice,
      itemDiscount,
      netUnitPrice,
      taxableAmount,
      gstRate,
      taxType,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      lineTotal: netLineTotal,
    };
  });

  // 6. Aggregate Totals
  const taxableSubtotal =
    Math.round(invoiceItems.reduce((acc, i) => acc + i.taxableAmount, 0) * 100) / 100;
  const totalCgst = Math.round(invoiceItems.reduce((acc, i) => acc + i.cgstAmount, 0) * 100) / 100;
  const totalSgst = Math.round(invoiceItems.reduce((acc, i) => acc + i.sgstAmount, 0) * 100) / 100;
  const totalIgst = Math.round(invoiceItems.reduce((acc, i) => acc + i.igstAmount, 0) * 100) / 100;
  const totalTax = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;

  const shippingCharge = Number(order.shipping_charge) || 0;
  // Shipping tax if applicable
  const shippingTaxable = shippingCharge;
  const shippingTax = 0;

  const grandTotal =
    Math.round((Number(order.total_amount) || taxableSubtotal + totalTax + shippingCharge) * 100) / 100;

  const paymentStatus = order.payment_status || "Pending";
  const amountPaid = paymentStatus.toLowerCase() === "paid" ? grandTotal : 0;
  const amountDue = Math.max(0, grandTotal - amountPaid);

  const totals: InvoiceTotals = {
    taxableSubtotal,
    totalDiscount: totalOrderDiscount,
    discountCode: order.discount_code || null,
    shippingCharge,
    shippingTaxable,
    shippingTax,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    amountPaid,
    amountDue,
    amountInWords: numberToIndianRupeesWords(grandTotal),
    currency: order.currency || "INR",
  };

  // 7. Payment Info
  const payment: InvoicePaymentInfo = {
    paymentMethod: order.payment_method || "COD",
    paymentStatus: order.payment_status || "Pending",
    transactionId: order.razorpay_payment_id || null,
    paidAt: order.paid_at || null,
    paymentGateway: order.payment_gateway || "Razorpay",
  };

  const invoiceDate = params.invoiceDate || new Date().toISOString();
  const orderDate = order.created_at || new Date().toISOString();

  const notes = seller.invoiceNotes
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  return {
    id: `inv_${order.id}`,
    orderId: order.id,
    orderNumber: order.order_number,
    invoiceNumber,
    invoiceDate,
    orderDate,
    invoiceTitle,
    isTaxInvoice,
    isReverseCharge: false,
    placeOfSupply: customer.placeOfSupply,
    seller,
    customer,
    items: invoiceItems,
    totals,
    payment,
    notes,
    createdAt: invoiceDate,
    updatedAt: invoiceDate,
  };
}
