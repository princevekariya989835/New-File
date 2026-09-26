import React, { useState } from "react";
import { Tag, Sparkles, Copy, Check, Info, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type ProductOffer } from "@/lib/catalog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductOffersSectionProps {
  offers?: ProductOffer[];
  sellingPrice: number;
  currency?: string;
  productTitle?: string;
}

export function ProductOffersSection({
  offers = [],
  sellingPrice,
  currency = "INR",
  productTitle = "Product",
}: ProductOffersSectionProps) {
  const [selectedOfferForTc, setSelectedOfferForTc] = useState<ProductOffer | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeOffers = (offers || [])
    .filter((o) => o.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  if (activeOffers.length === 0) {
    return null;
  }

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Coupon code "${code}" copied to clipboard!`);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2500);
    } catch {
      toast.error("Failed to copy coupon code");
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-5 backdrop-blur-xs">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-red/10 text-brand-red">
          <Tag className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
          Save Extra With These Offers
        </h3>
      </div>

      {/* Offers List */}
      <div className="space-y-3">
        {activeOffers.map((offer, idx) => {
          const hasLowPrice = offer.computedLowPrice && offer.computedLowPrice > 0 && offer.computedLowPrice < sellingPrice;
          const isCopied = copiedCode === offer.promoCode;

          return (
            <div
              key={offer.id || `offer-${idx}`}
              className="relative overflow-hidden rounded-xl border border-border/70 bg-secondary/30 p-3.5 sm:p-4 transition-all hover:border-foreground/30 hover:bg-secondary/50"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  {/* "Get it for as low as" Price Highlight */}
                  {hasLowPrice && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        Get it for as low as{" "}
                        <strong className="text-sm font-extrabold text-foreground">
                          {formatPrice(offer.computedLowPrice!, currency)}
                        </strong>
                      </span>
                    </div>
                  )}

                  {/* Offer Title */}
                  <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                    <span>{offer.title}</span>
                    {offer.discountType === "buy_x_get_y" && (
                      <span className="rounded-md bg-brand-red/15 px-2 py-0.5 text-[10px] font-bold text-brand-red uppercase tracking-wider">
                        Special Bundle
                      </span>
                    )}
                  </h4>

                  {/* Description */}
                  {offer.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {offer.description}
                    </p>
                  )}
                </div>

                {/* Actions: Coupon copy + T&C */}
                <div className="mt-2 sm:mt-0 flex flex-wrap items-center gap-2.5 sm:self-center">
                  {offer.promoCode && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(offer.promoCode!, e)}
                      title={`Copy code ${offer.promoCode}`}
                      className="group flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-card px-2.5 py-1.5 text-xs font-mono font-bold text-foreground transition-all hover:border-foreground hover:bg-secondary active:scale-95"
                    >
                      <span className="text-muted-foreground text-[10px] font-sans uppercase">Code:</span>
                      <span className="text-foreground tracking-wider">{offer.promoCode}</span>
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedOfferForTc(offer)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors py-1 px-1"
                  >
                    <span>Offer Details</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Offer Terms & Conditions Modal */}
      <Dialog
        open={Boolean(selectedOfferForTc)}
        onOpenChange={(open) => !open && setSelectedOfferForTc(null)}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-brand-red text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Offer Details & Terms</span>
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight">
              {selectedOfferForTc?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedOfferForTc && (
            <div className="space-y-4 pt-2 text-xs sm:text-sm">
              {selectedOfferForTc.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {selectedOfferForTc.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border/80 bg-secondary/30 p-3.5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Discount Rule
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {selectedOfferForTc.discountType === "percentage"
                      ? `${selectedOfferForTc.discountValue}% OFF`
                      : selectedOfferForTc.discountType === "fixed_amount"
                        ? `Save ${formatPrice(selectedOfferForTc.discountValue, currency)}`
                        : selectedOfferForTc.discountType === "buy_x_get_y"
                          ? `Buy ${selectedOfferForTc.minimumQuantity - selectedOfferForTc.discountValue} Get ${selectedOfferForTc.discountValue} Free`
                          : selectedOfferForTc.discountType === "flat_price"
                            ? `Flat ${formatPrice(selectedOfferForTc.discountValue, currency)}`
                            : "Promotional Offer"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Min Quantity
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {selectedOfferForTc.minimumQuantity > 1
                      ? `${selectedOfferForTc.minimumQuantity} Items`
                      : "1 Item"}
                  </span>
                </div>

                {selectedOfferForTc.promoCode && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Coupon Code
                    </span>
                    <span className="font-mono font-bold text-foreground mt-0.5 block">
                      {selectedOfferForTc.promoCode}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Eligibility
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    Applicable on this product
                  </span>
                </div>
              </div>

              {/* Explicit Terms & Conditions text */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Terms & Conditions
                </h5>
                <div className="rounded-xl border border-border/60 bg-card p-3.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {selectedOfferForTc.termsAndConditions ||
                    `• Offer is valid on eligible items while supplies last.\n• Discount will be automatically calculated and verified during checkout.\n• Cannot be combined with other promotional credits unless explicitly stated.\n• RIOTOUS reserves the right to modify or terminate this offer at any time without prior notice.`}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOfferForTc(null)}
                  className="rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 transition-opacity"
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
