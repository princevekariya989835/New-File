/**
 * Server functions for Storefront Shipping Rate & Serviceability Calculation
 */
import { createServerFn } from "@tanstack/react-start";
import { checkCourierServiceabilityAndQuote } from "@/lib/zippyy";
import type { ZippyyQuickQuoteResponse } from "@/lib/zippyy/types";

export type ShippingEstimateInput = {
  pincode: string;
  weightGrams?: number;
  isCod?: boolean;
  orderValue?: number;
};

export const getShippingEstimate = createServerFn({ method: "POST" })
  .inputValidator((d: ShippingEstimateInput) => ({
    pincode: String(d?.pincode || "").trim().slice(0, 10),
    weightGrams: Number(d?.weightGrams || 500),
    isCod: Boolean(d?.isCod),
    orderValue: Number(d?.orderValue || 0),
  }))
  .handler(async ({ data }): Promise<ZippyyQuickQuoteResponse> => {
    return checkCourierServiceabilityAndQuote({
      pickupPincode: process.env.ZIPPYY_PICKUP_PINCODE || "395006",
      deliveryPincode: data.pincode,
      weightGrams: data.weightGrams,
      isCod: data.isCod,
      orderValue: data.orderValue,
    });
  });
