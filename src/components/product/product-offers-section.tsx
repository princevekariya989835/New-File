import React, { useState } from "react";
import {
  Tag,
  Percent,
  Gift,
  IndianRupee,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type ProductOffer } from "@/lib/catalog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ProductOffersSectionProps {
  offers?: ProductOffer[];
  sellingPrice: number;
  currency?: string;
  productTitle?: string;
}

export const DEFAULT_PRODUCT_OFFERS: ProductOffer[] = [
  {
    id: "off-riotous20-canonical",
    title: "Buy 3 Get 20% OFF",
    description: "Get 20% off when you buy 3 or more streetwear pieces.",
    discountType: "percentage",
    discountValue: 20,
    promoCode: "RIOTOUS20",
    minimumQuantity: 3,
    isActive: true,
    displayOrder: 1,
    termsAndConditions:
      "• Add 3 or more apparel items to your cart.\n• Apply promo code RIOTOUS20 during checkout.\n• Get an instant 20% discount on the eligible cart subtotal.\n• Valid on all RIOTOUS streetwear tees and apparel.",
  },
  {
    id: "off-b2g1-canonical",
    title: "Buy 2 Get 1 FREE",
    description: "Add any 3 items to your bag and get 1 free automatically at checkout.",
    discountType: "buy_x_get_y",
    discountValue: 1,
    minimumQuantity: 3,
    isActive: true,
    displayOrder: 2,
    termsAndConditions:
      "• Add any 3 qualifying items to your bag.\n• The lowest-priced qualifying item will be automatically discounted to ₹0 at checkout.\n• No promo code needed—discount applies automatically.\n• Can be combined with eligible automated store promotions.",
  },
  {
    id: "off-save200-canonical",
    title: "Flat ₹200 OFF",
    description: "Flat ₹200 discount on your order.",
    discountType: "fixed_amount",
    discountValue: 200,
    promoCode: "SAVE200",
    minimumQuantity: 1,
    isActive: true,
    displayOrder: 3,
    termsAndConditions:
      "• Use promo code SAVE200 at checkout.\n• Flat ₹200 instant discount deducted from order total.\n• Applicable on all orders across the entire catalog.\n• Limited to one use per customer account.",
  },
];

interface OfferThemeConfig {
  theme: "rose" | "emerald" | "amber";
  icon: React.ElementType;
  primaryBadge: string | null;
  primaryBadgeClass: string;
  secondaryBadge: string | null;
  secondaryBadgeClass: string;
  cardBgClass: string;
  iconBgClass: string;
  codeBoxClass: string;
  actionClass: string;
}

function getOfferThemeConfig(offer: ProductOffer, _index: number): OfferThemeConfig {
  const title = (offer.title || "").toUpperCase();
  const code = (offer.promoCode || "").toUpperCase();
  const type = offer.discountType;

  // Unified clean card styling for all offers
  const baseCardBg = "bg-card border-border/80 hover:border-foreground/30 hover:bg-secondary/20";
  const baseIconBg = "bg-brand-red/10 text-brand-red";
  const baseCodeBox = "border-border/80 bg-secondary/50 hover:bg-secondary hover:border-foreground/40 text-foreground";
  const baseAction = "text-brand-red hover:underline";

  if (type === "buy_x_get_y" || title.includes("GET 1") || title.includes("BUY 2")) {
    return {
      theme: "emerald",
      icon: Gift,
      primaryBadge: "SPECIAL BUNDLE",
      primaryBadgeClass: "bg-secondary text-foreground border border-border/60",
      secondaryBadge: null,
      secondaryBadgeClass: "",
      cardBgClass: baseCardBg,
      iconBgClass: baseIconBg,
      codeBoxClass: baseCodeBox,
      actionClass: baseAction,
    };
  }

  if (type === "percentage" || title.includes("%") || code === "RIOTOUS20") {
    return {
      theme: "rose",
      icon: Percent,
      primaryBadge: offer.discountValue ? `${offer.discountValue}% OFF` : "SPECIAL DEAL",
      primaryBadgeClass: "bg-brand-red text-white",
      secondaryBadge: null,
      secondaryBadgeClass: "",
      cardBgClass: baseCardBg,
      iconBgClass: baseIconBg,
      codeBoxClass: baseCodeBox,
      actionClass: baseAction,
    };
  }

  if (type === "fixed_amount" || type === "flat_price" || title.includes("₹") || title.includes("FLAT")) {
    return {
      theme: "amber",
      icon: IndianRupee,
      primaryBadge: offer.discountValue ? `FLAT ₹${offer.discountValue} OFF` : "INSTANT SAVINGS",
      primaryBadgeClass: "bg-secondary text-foreground border border-border/60",
      secondaryBadge: null,
      secondaryBadgeClass: "",
      cardBgClass: baseCardBg,
      iconBgClass: baseIconBg,
      codeBoxClass: baseCodeBox,
      actionClass: baseAction,
    };
  }

  return {
    theme: "amber",
    icon: Tag,
    primaryBadge: offer.promoCode ? "PROMO CODE" : "SPECIAL OFFER",
    primaryBadgeClass: "bg-secondary text-foreground border border-border/60",
    secondaryBadge: null,
    secondaryBadgeClass: "",
    cardBgClass: baseCardBg,
    iconBgClass: baseIconBg,
    codeBoxClass: baseCodeBox,
    actionClass: baseAction,
  };
}

export function ProductOffersSection({
  offers = [],
  sellingPrice,
  currency = "INR",
  productTitle = "Product",
}: ProductOffersSectionProps) {
  const [selectedOffer, setSelectedOffer] = useState<ProductOffer | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Extract and sort active offers strictly from props (database source of truth)
  const now = new Date();
  const activeOffers = (offers || [])
    .filter((o) => {
      if (o.isActive === false) return false;
      if (o.startDate && new Date(o.startDate).getTime() > now.getTime()) return false;
      if (o.endDate && new Date(o.endDate).getTime() < now.getTime()) return false;
      return true;
    })
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  // If no active offers are configured for this product in the database, render NOTHING
  if (activeOffers.length === 0) {
    return null;
  }

  const handleCopyCode = async (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedCode(code);
      toast.success(`Coupon code "${code}" copied to clipboard!`);
      setTimeout(() => {
        setCopiedCode((curr) => (curr === code ? null : curr));
      }, 2500);
    } catch {
      toast.error("Failed to copy coupon code");
    }
  };

  return (
    <section
      aria-label="Available Offers"
      className="mt-6 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs"
    >
      {/* 1. SECTION HEADER */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red mt-0.5">
          <Tag className="h-4.5 w-4.5" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Available Offers
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-normal">
            Save more on your favourite streetwear.
          </p>
        </div>
      </div>

      {/* OFFERS LIST */}
      <div className="space-y-3">
        {activeOffers.map((offer, idx) => {
          const config = getOfferThemeConfig(offer, idx);
          const Icon = config.icon;
          const isCopied = copiedCode === offer.promoCode;

          return (
            <div
              key={offer.id || `offer-${idx}`}
              className="group relative flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card transition-all duration-200 hover:border-foreground/20 hover:shadow-2xs"
            >
              {/* Top Row: Icon + Title + Description */}
              <div className="flex items-start gap-3 min-w-0">
                {/* Circular Icon Container */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red shadow-2xs mt-0.5"
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>

                {/* Offer Details Block */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground leading-snug">
                      {offer.title}
                    </h3>
                    {config.primaryBadge && (
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${config.primaryBadgeClass}`}
                      >
                        {config.primaryBadge}
                      </span>
                    )}
                  </div>

                  {offer.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {offer.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Row: Fixed Height, Consistent Internal Alignment Across ALL Cards */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 min-h-[36px]">
                {/* Left: Code Box OR Automatic Savings Indicator */}
                <div className="flex items-center">
                  {offer.promoCode ? (
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(offer.promoCode!, e)}
                      aria-label={`Copy coupon code ${offer.promoCode}`}
                      title={`Click to copy code ${offer.promoCode}`}
                      className="group/btn relative inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border/80 bg-secondary/50 hover:bg-secondary px-2.5 py-1 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer text-foreground"
                    >
                      <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-muted-foreground">
                        Code:
                      </span>
                      <span className="tracking-wider text-foreground font-extrabold">
                        {offer.promoCode}
                      </span>
                      <span className="flex items-center ml-0.5">
                        {isCopied ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3 stroke-[2.5]" />
                            <span>Copied!</span>
                          </span>
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
                        )}
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Sparkles className="h-3 w-3 text-brand-red shrink-0" />
                      <span>Auto-applied at checkout</span>
                    </span>
                  )}
                </div>

                {/* Right: View Offer Details Action - Always in the exact same anchored position */}
                <button
                  type="button"
                  onClick={() => setSelectedOffer(offer)}
                  aria-label={`View offer details for ${offer.title}`}
                  className="group/link inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:underline underline-offset-4 transition-colors py-1 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md"
                >
                  <span>Details</span>
                  <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. OFFER DETAILS MODAL */}
      <Dialog
        open={Boolean(selectedOffer)}
        onOpenChange={(open) => !open && setSelectedOffer(null)}
      >
        <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border border-border/80 bg-background shadow-xl rounded-2xl">
          {selectedOffer && (() => {
            const config = getOfferThemeConfig(selectedOffer, 0);
            const Icon = config.icon;
            const isCopied = copiedCode === selectedOffer.promoCode;

            return (
              <div className="flex flex-col">
                {/* Header Banner */}
                <div className={`p-5 sm:p-6 border-b ${config.cardBgClass}`}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full shadow-2xs ${config.iconBgClass}`}
                    >
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {config.primaryBadge && (
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${config.primaryBadgeClass}`}
                          >
                            {config.primaryBadge}
                          </span>
                        )}
                        {config.secondaryBadge && (
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${config.secondaryBadgeClass}`}
                          >
                            {config.secondaryBadge}
                          </span>
                        )}
                      </div>
                      <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                        {selectedOffer.title}
                      </DialogTitle>
                    </div>
                  </div>
                  {selectedOffer.description && (
                    <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {selectedOffer.description}
                    </p>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
                  {/* Key Parameters Grid */}
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/80 bg-secondary/30 p-3.5 sm:p-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Discount Rule
                      </span>
                      <span className="font-bold text-foreground mt-0.5 block">
                        {selectedOffer.discountType === "percentage"
                          ? `${selectedOffer.discountValue}% OFF`
                          : selectedOffer.discountType === "fixed_amount"
                            ? `Save ${formatPrice(selectedOffer.discountValue, currency)}`
                            : selectedOffer.discountType === "buy_x_get_y"
                              ? "Buy 2 Get 1 Free (Lowest Item Free)"
                              : "Promotional Discount"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Minimum Quantity
                      </span>
                      <span className="font-bold text-foreground mt-0.5 block">
                        {selectedOffer.minimumQuantity > 1
                          ? `${selectedOffer.minimumQuantity} Items`
                          : "1 Item"}
                      </span>
                    </div>

                    {selectedOffer.promoCode && (
                      <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border/50">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Coupon Code
                          </span>
                          <span className="font-mono text-sm font-extrabold text-foreground mt-0.5 block">
                            {selectedOffer.promoCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(selectedOffer.promoCode!, e)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-card px-3 py-1.5 text-xs font-mono font-bold text-foreground hover:border-foreground hover:bg-secondary transition-all active:scale-95 cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                              <span className="text-emerald-600 font-sans font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-sans font-semibold">Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="col-span-2 pt-2 border-t border-border/50">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Eligibility
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        Applicable on {productTitle} & eligible streetwear catalog
                      </span>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-red" />
                      <span>Terms & Conditions</span>
                    </h5>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {selectedOffer.termsAndConditions ||
                        `• Offer is valid on eligible items while supplies last.\n• Discount will be automatically calculated and verified during checkout.\n• Cannot be combined with other promotional credits unless explicitly stated.\n• RIOTOUS reserves the right to modify or terminate this offer at any time.`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOffer(null)}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-brand-red px-6 text-xs sm:text-sm font-bold text-white hover:bg-brand-red/90 transition-all cursor-pointer"
                    >
                      Got It
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
}
