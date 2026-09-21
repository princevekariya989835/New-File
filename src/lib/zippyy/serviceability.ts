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
      const response = await zippyyRequest<any>("/v1/external/courier/serviceability", {
        method: "POST",
        body: JSON.stringify({
          pickup_pincode: pickupPincode,
          delivery_pincode: deliveryPincode,
          weight: Math.max((req.weightGrams || 500) / 1000, 0.5), // in kg
          is_cod: Boolean(req.isCod),
          order_value: req.orderValue || 500,
          length: req.lengthCm || 15,
          breadth: req.breadthCm || 10,
          height: req.heightCm || 5,
        }),
      });

      const rawCouriers = response.couriers || response.data || [];
      const couriers: ZippyyCourierServiceability[] = rawCouriers.map((c: any) => ({
        courierId: String(c.courier_id || c.id || "c_delhivery"),
        courierName: c.courier_name || c.name || "Delhivery",
        mode: c.mode === "Air" ? "Air" : c.mode === "Express" ? "Express" : "Surface",
        isServiceable: Boolean(c.serviceable ?? true),
        estimatedDeliveryDays: Number(c.etd_days || c.transit_days || 3),
        estimatedDeliveryDate: c.etd_date || calculateEstimatedDeliveryDate(Number(c.etd_days || 3)),
        rate: Number(c.rate || c.freight_charge || 70),
        codAvailable: Boolean(c.cod_available ?? true),
        minWeightKg: Number(c.min_weight || 0.5),
        maxWeightKg: Number(c.max_weight || 20),
      }));

      const serviceableCouriers = couriers.filter((c) => c.isServiceable);
      if (serviceableCouriers.length > 0) {
        const sortedByRate = [...serviceableCouriers].sort((a, b) => a.rate - b.rate);
        const sortedByDays = [...serviceableCouriers].sort((a, b) => a.estimatedDeliveryDays - b.estimatedDeliveryDays);

        return {
          isServiceable: true,
          pickupPincode,
          deliveryPincode,
          availableCouriers: serviceableCouriers,
          cheapestRate: sortedByRate[0].rate,
          fastestDays: sortedByDays[0].estimatedDeliveryDays,
          recommendedCourier: sortedByRate[0],
        };
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
