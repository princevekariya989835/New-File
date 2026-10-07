import type { WebsiteBuy2Get1OfferConfig } from "./website-config.types";

export interface PromotionItemInput {
  productId?: string | null;
  productTitle?: string;
  productName?: string;
  price: number | string | { amount?: string | number; currencyCode?: string };
  quantity: number;
  variantId?: string;
  category?: string;
}

export interface Buy2Get1CalculationResult {
  enabled: boolean;
  eligible: boolean;
  eligibleUnitsCount: number;
  freeUnitsCount: number;
  discountAmount: number;
  freeItemsDetails: Array<{
    productId: string | null;
    variantId?: string;
    productTitle: string;
    price: number;
  }>;
  freeVariantIds: string[];
  freeCountByVariantId: Record<string, number>;
  freeCountByProductId: Record<string, number>;
  neededForNextFree: number;
  progressCount: number; // 0, 1, 2, or 3 (for progress dots)
  supportingText: string;
}

/**
 * Checks if a specific product or item is eligible for the BUY 2 GET 1 FREE offer.
 * By default, apparel/t-shirts qualify (matching prompt specifications).
 */
export function isItemEligibleForB2G1(
  item: {
    productId?: string | null;
    productTitle?: string;
    productName?: string;
    category?: string;
  },
  config?: WebsiteBuy2Get1OfferConfig,
): boolean {
  if (config && config.enabled === false) return false;

  const title = (item.productTitle || item.productName || "").toLowerCase().trim();
  const cat = (item.category || "").toLowerCase().trim();
  const pId = item.productId ? String(item.productId).toLowerCase().trim() : "";

  // If specific productIds configured
  if (config?.appliesTo === "products" && config.productIds && config.productIds.length > 0) {
    return config.productIds.some((id) => id.toLowerCase().trim() === pId);
  }

  // If specific categories configured
  if (
    config?.appliesTo === "categories" &&
    config.categoryNames &&
    config.categoryNames.length > 0
  ) {
    return config.categoryNames.some((c) => {
      const matchKey = c.toLowerCase().trim();
      return cat.includes(matchKey) || title.includes(matchKey);
    });
  }

  // Default apparel / t-shirt keywords matching RIOTOUS collections
  const APPAREL_KEYWORDS = [
    "tee",
    "shirt",
    "t-shirt",
    "oversized",
    "hoodie",
    "sweatshirt",
    "polo",
    "cargos",
    "joggers",
    "apparel",
    "oni zoro",
    "thunder breath",
    "katana ronin",
    "acid wash",
    "cyberpunk",
    "heavyweight",
    "drop shoulder",
  ];

  if (cat) {
    if (APPAREL_KEYWORDS.some((kw) => cat.includes(kw))) return true;
  }

  // Check title
  if (APPAREL_KEYWORDS.some((kw) => title.includes(kw))) return true;

  // Fallback: If not explicitly excluded (e.g. gift card / service), consider apparel eligible
  return true;
}

/**
 * Calculates the Buy 2 Get 1 Free discount.
 * Rule: For every 3 eligible items, the lowest-priced eligible item is FREE.
 */
export function calculateBuy2Get1Discount(
  items: PromotionItemInput[],
  config?: WebsiteBuy2Get1OfferConfig,
): Buy2Get1CalculationResult {
  const isEnabled = config ? config.enabled !== false : true;

  if (!isEnabled || !Array.isArray(items) || items.length === 0) {
    return {
      enabled: isEnabled,
      eligible: false,
      eligibleUnitsCount: 0,
      freeUnitsCount: 0,
      discountAmount: 0,
      freeItemsDetails: [],
      freeVariantIds: [],
      freeCountByVariantId: {},
      freeCountByProductId: {},
      neededForNextFree: 3,
      progressCount: 0,
      supportingText: config?.supportingText || "Add 3 eligible T-shirts to unlock your free item",
    };
  }

  // Check date bounds if configured
  const now = new Date();
  if (config?.startDate && new Date(config.startDate) > now) {
    return {
      enabled: false,
      eligible: false,
      eligibleUnitsCount: 0,
      freeUnitsCount: 0,
      discountAmount: 0,
      freeItemsDetails: [],
      freeVariantIds: [],
      freeCountByVariantId: {},
      freeCountByProductId: {},
      neededForNextFree: 3,
      progressCount: 0,
      supportingText: "Offer starts soon",
    };
  }
  if (config?.endDate && new Date(config.endDate) < now) {
    return {
      enabled: false,
      eligible: false,
      eligibleUnitsCount: 0,
      freeUnitsCount: 0,
      discountAmount: 0,
      freeItemsDetails: [],
      freeVariantIds: [],
      freeCountByVariantId: {},
      freeCountByProductId: {},
      neededForNextFree: 3,
      progressCount: 0,
      supportingText: "Offer has ended",
    };
  }

  // Expand eligible units
  interface Unit {
    productId: string | null;
    variantId?: string;
    productTitle: string;
    price: number;
  }

  const eligibleUnits: Unit[] = [];

  for (const item of items) {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const rawPrice =
      typeof item.price === "object" && item.price !== null
        ? (item.price as any).amount
        : item.price;
    const price = Math.max(0, parseFloat(String(rawPrice ?? 0)) || 0);
    const title = item.productTitle || item.productName || "Product";

    if (qty > 0 && isItemEligibleForB2G1(item, config)) {
      for (let q = 0; q < qty; q++) {
        eligibleUnits.push({
          productId: item.productId ? String(item.productId) : null,
          variantId: item.variantId,
          productTitle: title,
          price,
        });
      }
    }
  }

  const totalEligible = eligibleUnits.length;
  if (totalEligible === 0) {
    return {
      enabled: true,
      eligible: false,
      eligibleUnitsCount: 0,
      freeUnitsCount: 0,
      discountAmount: 0,
      freeItemsDetails: [],
      freeVariantIds: [],
      freeCountByVariantId: {},
      freeCountByProductId: {},
      neededForNextFree: 3,
      progressCount: 0,
      supportingText: config?.supportingText || "Buy 2, get 1 FREE",
    };
  }

  // Number of free items earned: 1 free for every 3 items
  let freeCount = Math.floor(totalEligible / 3);

  // Enforce max free items if configured (0 or undefined = unlimited multiples)
  if (config?.maxFreeItemsPerOrder && config.maxFreeItemsPerOrder > 0) {
    freeCount = Math.min(freeCount, config.maxFreeItemsPerOrder);
  }

  // Sort eligible units ascending by price (cheapest units become free)
  eligibleUnits.sort((a, b) => a.price - b.price);

  const freeItems = eligibleUnits.slice(0, freeCount);
  const discountAmount = freeItems.reduce((sum, u) => sum + u.price, 0);
  const freeVariantIds = freeItems.map((u) => u.variantId).filter((v): v is string => !!v);

  const freeCountByVariantId: Record<string, number> = {};
  const freeCountByProductId: Record<string, number> = {};

  for (const item of freeItems) {
    if (item.variantId) {
      freeCountByVariantId[item.variantId] = (freeCountByVariantId[item.variantId] || 0) + 1;
    }
    if (item.productId) {
      freeCountByProductId[item.productId] = (freeCountByProductId[item.productId] || 0) + 1;
    }
  }

  // Dynamic supporting text & progress calculation
  const remainder = totalEligible % 3;
  let neededForNextFree = 3 - remainder;
  if (remainder === 0 && totalEligible > 0) {
    neededForNextFree = 0;
  }

  // Progress count: 0, 1, 2, or 3
  const progressCount = freeCount > 0 ? 3 : remainder;

  let supportingText = "";
  if (totalEligible === 0) {
    supportingText = "Buy 2, get 1 FREE";
  } else if (totalEligible === 1) {
    supportingText = "Add 2 more to unlock BUY 2 GET 1 FREE";
  } else if (totalEligible === 2) {
    supportingText = "Add 1 more to unlock your FREE T-shirt";
  } else {
    supportingText = "BUY 2 GET 1 FREE unlocked!";
  }

  return {
    enabled: true,
    eligible: true,
    eligibleUnitsCount: totalEligible,
    freeUnitsCount: freeCount,
    discountAmount,
    freeItemsDetails: freeItems,
    freeVariantIds,
    freeCountByVariantId,
    freeCountByProductId,
    neededForNextFree,
    progressCount,
    supportingText,
  };
}
