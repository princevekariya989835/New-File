export interface SellerInvoiceConfig {
  legalBusinessName: string;
  brandName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  isGstRegistered: boolean;
  businessGstin: string;
  sellerPan: string;
  sellerState: string;
  sellerStateCode: string;
  sellerPincode: string;
  defaultHsnCode: string;
  defaultGstRate: number;
  authorizedSignatoryName: string;
  invoicePrefix: string;
  invoiceNotes: string;
}

export interface CustomerInvoiceDetails {
  name: string;
  email: string;
  phone: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  billingAddress: string;
  state: string;
  stateCode: string;
  placeOfSupply: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string | null;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  hsnCode: string;
  quantity: number;
  grossUnitPrice: number;
  itemDiscount: number;
  netUnitPrice: number;
  taxableAmount: number;
  gstRate: number;
  taxType: "INTRA_STATE" | "INTER_STATE" | "NONE";
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  lineTotal: number;
}

export interface InvoiceTotals {
  taxableSubtotal: number;
  totalDiscount: number;
  discountCode?: string | null;
  shippingCharge: number;
  shippingTaxable: number;
  shippingTax: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  amountInWords: string;
  currency: string;
}

export interface InvoicePaymentInfo {
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string | null;
  paidAt?: string | null;
  paymentGateway?: string | null;
}

export interface InvoiceRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  orderDate: string;
  invoiceTitle: "TAX INVOICE" | "BILL OF SUPPLY" | "COMMERCIAL INVOICE";
  isTaxInvoice: boolean;
  isReverseCharge: boolean;
  placeOfSupply: string;
  seller: SellerInvoiceConfig;
  customer: CustomerInvoiceDetails;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  payment: InvoicePaymentInfo;
  notes: string[];
  pdfStorageKey?: string | null;
  createdAt: string;
  updatedAt: string;
}
