/**
 * TypeScript definitions for Zippyy Logistics API
 */

export interface ZippyyAuthConfig {
  baseUrl: string;
  email: string;
  password: string;
  warehouseId?: string;
  pickupPincode?: string;
  webhookSecret?: string;
  isSandbox?: boolean;
}

export interface ZippyyAuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number; // in seconds
}

export interface ZippyyCourierServiceability {
  courierId: string;
  courierName: string;
  mode: "Surface" | "Air" | "Express";
  isServiceable: boolean;
  estimatedDeliveryDays: number;
  estimatedDeliveryDate?: string;
  rate: number;
  codAvailable: boolean;
  minWeightKg: number;
  maxWeightKg: number;
}

export interface ZippyyQuickQuoteRequest {
  pickupPincode: string;
  deliveryPincode: string;
  weightGrams: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  isCod?: boolean;
  orderValue?: number;
}

export interface ZippyyQuickQuoteResponse {
  isServiceable: boolean;
  pickupPincode: string;
  deliveryPincode: string;
  availableCouriers: ZippyyCourierServiceability[];
  cheapestRate: number;
  fastestDays: number;
  recommendedCourier?: ZippyyCourierServiceability;
}

export interface ZippyyOrderItem {
  name: string;
  sku?: string;
  units: number;
  sellingPrice: number;
  discount?: number;
  tax?: number;
  hsn?: string;
  productImage?: string;
}

export interface ZippyyForwardShipmentV2Request {
  orderId: string;
  orderNumber?: string;
  orderDate?: string;
  pickupWarehouseId: string;
  paymentType: "PREPAID" | "COD";
  orderValue: number;
  collectableAmount?: number; // for COD
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  billingAddress?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  items: ZippyyOrderItem[];
  packageDetails: {
    weightGrams: number;
    lengthCm: number;
    breadthCm: number;
    heightCm: number;
  };
  preferredCourierId?: string;
}

export interface ZippyyForwardShipmentResponse {
  success: boolean;
  orderId: string;
  zippyyOrderId: string;
  zippyyShipmentId: string;
  awbNumber: string;
  courierName: string;
  courierId: string;
  shippingLabelUrl?: string;
  manifestUrl?: string;
  status: string;
  estimatedDeliveryDate?: string;
  message?: string;
}

export interface ZippyyShippingLabelResponse {
  success: boolean;
  shipmentId: string;
  awbNumber: string;
  labelUrl: string;
  barcodeData?: string;
}

export type ZippyyWebhookEventType =
  | "SHIPMENT_CREATED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "NDR_RAISED"
  | "NDR_REATTEMPT"
  | "RTO_INITIATED"
  | "RTO_IN_TRANSIT"
  | "RTO_DELIVERED"
  | "CANCELLED";

export interface ZippyyWebhookPayload {
  event: ZippyyWebhookEventType;
  timestamp: string;
  data: {
    orderId: string;
    zippyyOrderId: string;
    zippyyShipmentId: string;
    awbNumber: string;
    courierName: string;
    status: string;
    statusCode?: string;
    location?: string;
    activity?: string;
    eventTime?: string;
    ndrReason?: string;
    ndrAttemptCount?: number;
    signature?: string;
  };
}

export interface ZippyyNdrActionRequest {
  shipmentId?: string;
  awbNumber?: string;
  action: "REATTEMPT" | "RTO";
  remarks?: string;
  deferredDate?: string; // YYYY-MM-DD
  updatedPhone?: string;
  updatedAddress?: string;
}

export interface ZippyyNdrActionResponse {
  success: boolean;
  shipmentId: string;
  awbNumber: string;
  actionTaken: "REATTEMPT" | "RTO";
  message: string;
  status: string;
}
