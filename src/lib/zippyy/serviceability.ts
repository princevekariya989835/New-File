/**
 * Zippyy Dynamic Serviceability & Quick Quote API
 */
import { getZippyyConfig, isZippyyConfigured, zippyyRequest } from "./client";
import type {
  ZippyyCourierServiceability,
  ZippyyQuickQuoteRequest,
  ZippyyQuickQuoteResponse,
} from "./types";

export function calculateEstimatedDeliveryDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Checks courier serviceability and returns dynamic shipping quotes for a given delivery pincode.
 */
export async function checkCourierServiceabilityAndQuote(
  req: ZippyyQuickQuoteRequest,
): Promise<ZippyyQuickQuoteResponse> {
  const config = getZippyyConfig();
  const pickupPincode = req.pickupPincode || config.pickupPincode || "395006";
  const deliveryPincode = req.deliveryPincode.trim();

  // Validate standard 6-digit Indian PIN code format
  if (!/^[1-9][0-9]{5}$/.test(deliveryPincode)) {
    return {
      isServiceable: false,
      pickupPincode,
      deliveryPincode,
      availableCouriers: [],
      cheapestRate: 0,
      fastestDays: 0,
    };
  }

  // If live Zippyy credentials exist, call API
  if (isZippyyConfigured()) {
    try {
      // 1. Check Carrier Serviceability via official GET endpoint
      const serviceabilityList = await zippyyRequest<any>(
        `/v1/external/carrier/serviceability?origin_pin=${encodeURIComponent(pickupPincode)}&destination_pin=${encodeURIComponent(deliveryPincode)}`,
        { method: "GET" }
      ).catch(() => null);

      // 2. Fetch live Rates via official POST endpoint
      const quoteRes = await zippyyRequest<any>("/v1/external/shipments/rates", {
        method: "POST",
        body: JSON.stringify({
          height: req.heightCm || 5,
          length: req.lengthCm || 15,
          breadth: req.breadthCm || 10,
          weight: String(Math.max((req.weightGrams || 500) / 1000, 0.5)),
          delivery_type: "FORWARD",
          order_type: req.isCod ? "COD" : "PREPAID",
          pickup_pincode: pickupPincode,
          drop_pincode: deliveryPincode,
          invoice_value: String(req.orderValue || 500),
        }),
      }).catch(() => null);

      const rawRates = quoteRes?.rates || quoteRes?.data || [];
      const rawCarriers = Array.isArray(serviceabilityList) ? serviceabilityList : [];

      if (rawRates.length > 0) {
        const couriers: ZippyyCourierServiceability[] = rawRates.map((r: any) => ({
          courierId: String(r.id || r.carrier_account_id || "c_delhivery"),
          courierName: r.carrier || r.carrierService || "Delhivery",
          mode: r.service === "Air" ? "Air" : r.service === "Express" ? "Express" : "Surface",
          isServiceable: true,
          estimatedDeliveryDays: Number(r.est_delivery_days || r.delivery_days || 3),
          estimatedDeliveryDate: calculateEstimatedDeliveryDate(Number(r.est_delivery_days || 3)),
          rate: Number(r.rate || r.forwardFreightCharges || 70),
          codAvailable: Boolean(req.isCod ? true : true),
          minWeightKg: Number(r.min_chargeable_weight || 0.5),
          maxWeightKg: 20,
        }));

        const sortedByRate = [...couriers].sort((a, b) => a.rate - b.rate);
        const sortedByDays = [...couriers].sort((a, b) => a.estimatedDeliveryDays - b.estimatedDeliveryDays);

        return {
          isServiceable: true,
          pickupPincode,
          deliveryPincode,
          availableCouriers: couriers,
          cheapestRate: sortedByRate[0].rate,
          fastestDays: sortedByDays[0].estimatedDeliveryDays,
          recommendedCourier: sortedByRate[0],
        };
      } else if (rawCarriers.length > 0) {
        const couriers: ZippyyCourierServiceability[] = rawCarriers.map((c: any) => ({
          courierId: String(c.carrier || "c_delhivery"),
          courierName: c.carrier || "Delhivery",
          mode: "Surface",
          isServiceable: Boolean(req.isCod ? c.codActive : c.prepaidActive),
          estimatedDeliveryDays: 3,
          estimatedDeliveryDate: calculateEstimatedDeliveryDate(3),
          rate: 70,
          codAvailable: Boolean(c.codActive),
          minWeightKg: 0.5,
          maxWeightKg: 20,
        }));

        const serviceable = couriers.filter((c) => c.isServiceable);
        if (serviceable.length > 0) {
          return {
            isServiceable: true,
            pickupPincode,
            deliveryPincode,
            availableCouriers: serviceable,
            cheapestRate: 70,
            fastestDays: 3,
            recommendedCourier: serviceable[0],
          };
        }
      }
    } catch (err) {
      console.warn("[Zippyy Serviceability] API call failed or in sandbox, using fallback dynamic calculator:", err);
    }
  }

  // Fallback dynamic rate & courier calculator (e.g. for Sandbox / Dev Mode / Offline resilient)
  return getFallbackDynamicQuote(pickupPincode, deliveryPincode, req.weightGrams || 500, req.isCod);
}

function getFallbackDynamicQuote(
  pickupPincode: string,
  deliveryPincode: string,
  weightGrams: number,
  isCod?: boolean,
): ZippyyQuickQuoteResponse {
  // Determine zone based on pincode prefix
  const isLocal = pickupPincode.slice(0, 2) === deliveryPincode.slice(0, 2);
  const isMetro = ["11", "12", "40", "56", "60", "70", "50", "38"].includes(deliveryPincode.slice(0, 2));

  const weightKg = Math.max(weightGrams / 1000, 0.5);
  const baseStandardRate = isLocal ? 45 : isMetro ? 65 : 85;
  const weightMultiplier = Math.ceil(weightKg / 0.5);
  const standardCost = baseStandardRate + (weightMultiplier - 1) * 30 + (isCod ? 35 : 0);
  const expressCost = Math.round(standardCost * 1.5);
  const airCost = Math.round(standardCost * 1.8);

  const couriers: ZippyyCourierServiceability[] = [
    {
      courierId: "c_delhivery_surface",
      courierName: "Delhivery Surface",
      mode: "Surface",
      isServiceable: true,
      estimatedDeliveryDays: isLocal ? 2 : isMetro ? 3 : 5,
      estimatedDeliveryDate: calculateEstimatedDeliveryDate(isLocal ? 2 : isMetro ? 3 : 5),
      rate: standardCost,
      codAvailable: true,
      minWeightKg: 0.5,
      maxWeightKg: 20,
    },
    {
      courierId: "c_bluedart_air",
      courierName: "Blue Dart Air",
      mode: "Air",
      isServiceable: true,
      estimatedDeliveryDays: isLocal ? 1 : isMetro ? 2 : 3,
      estimatedDeliveryDate: calculateEstimatedDeliveryDate(isLocal ? 1 : isMetro ? 2 : 3),
      rate: airCost,
      codAvailable: true,
      minWeightKg: 0.5,
      maxWeightKg: 10,
    },
    {
      courierId: "c_dtdc_express",
      courierName: "DTDC Express",
      mode: "Express",
      isServiceable: true,
      estimatedDeliveryDays: isLocal ? 1 : isMetro ? 2 : 4,
      estimatedDeliveryDate: calculateEstimatedDeliveryDate(isLocal ? 1 : isMetro ? 2 : 4),
      rate: expressCost,
      codAvailable: true,
      minWeightKg: 0.5,
      maxWeightKg: 15,
    },
  ];

  return {
    isServiceable: true,
    pickupPincode,
    deliveryPincode,
    availableCouriers: couriers,
    cheapestRate: standardCost,
    fastestDays: couriers[1].estimatedDeliveryDays,
    recommendedCourier: couriers[0],
  };
}
