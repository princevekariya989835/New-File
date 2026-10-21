import React, { useState } from "react";
import { Gift, Sparkles, Copy, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { isItemEligibleForB2G1 } from "@/lib/promotions";
import type { ProductOffer } from "@/lib/catalog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ProductPromotionalBannerProps {
  offers?: ProductOffer[];
  productId?: string;
  productTitle: string;
  category?: string;
}

export function ProductPromotionalBanner({
  offers = [],
  productId,
  productTitle,
  category,
}: ProductPromotionalBannerProps) {
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // 1. Check for product-specific active offer in database
  const activeOffer = offers.find((o) => {
    if (!o.isActive) return false;
    const now = Date.now();
    if (o.startDate && new Date(o.startDate).getTime() > now) return false;
    if (o.endDate && new Date(o.endDate).getTime() < now) return false;
    return true;
  });

  // 2. Check storewide B2G1 eligibility
  const qualifiesForB2G1 = isItemEligibleForB2G1({
    productId,
    productTitle,
    category,
  });

  // Resolve banner content (admin configured offer takes priority, otherwise B2G1 apparel promotion)
  let heading = "SPECIAL OFFER";
  let title = "Buy 2 Get 1 Free";
  let description = "Add any 3 t-shirts to your bag to get 1 free. Discount applied automatically at checkout.";
  let promoCode: string | null = null;
  let terms: string | null =
    "• Add any 3 qualifying streetwear items to your cart.\n• The lowest-priced qualifying piece will be discounted to ₹0 automatically at checkout.\n• No coupon code required.\n• Can be combined with storewide free shipping on orders above ₹999.";

  if (activeOffer) {
    heading = activeOffer.discountType === "buy_x_get_y" ? "SPECIAL OFFER" : "SPECIAL OFFER";
    title = activeOffer.title;
    if (activeOffer.description) {
      description = activeOffer.description;
    }
    promoCode = activeOffer.promoCode || null;
    if (activeOffer.termsAndConditions) {
      terms = activeOffer.termsAndConditions;
    }
  } else if (!qualifiesForB2G1) {
    // If not eligible for B2G1 and no explicit offer, omit banner cleanly
    return null;
  }

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!promoCode) return;
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(true);
    toast.success(`Coupon code ${promoCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-red-200/80 bg-[#FFF0F2] dark:bg-red-950/20 p-4 sm:p-5 transition-all shadow-xs">
        {/* Soft decorative background glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-red/10 blur-2xl" />

        <div className="relative flex items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
            {/* Red Gift Icon Badge */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red text-white shadow-xs">
              <Gift className="h-5 w-5 stroke-[2.2]" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Header pill */}
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-brand-red">
                <Sparkles className="h-3 w-3" />
                <span>{heading}</span>
              </div>

              {/* Offer Title */}
              <h2 className="mt-0.5 text-base sm:text-lg font-black tracking-tight text-foreground">
                {title}
              </h2>

              {/* Explanatory Text */}
              <p className="mt-0.5 text-xs sm:text-[13px] leading-relaxed text-muted-foreground/90">
                {description}
              </p>

              {/* Optional Promo Code & Terms Links */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {promoCode && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-red/30 bg-background px-2.5 py-1 text-xs font-bold text-brand-red hover:bg-brand-red/5 transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>CODE: {promoCode}</span>
                      </>
                    )}
                  </button>
                )}

                {terms && (
                  <button
                    type="button"
                    onClick={() => setTermsModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline underline-offset-4 py-0.5"
                  >
                    <Info className="h-3 w-3 text-brand-red" />
                    <span>Offer Details</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE DECORATIVE STREETWEAR TEES GRAPHIC */}
          <div className="hidden sm:flex shrink-0 items-center justify-center relative w-24 h-20 overflow-hidden rounded-xl bg-white/60 dark:bg-card/40 border border-red-200/50 p-1 shadow-2xs">
            <img
              src="/products/zoro-black-1.jpg"
              alt="Promo streetwear tee"
              className="absolute -left-1 top-1 h-16 w-14 object-cover rounded shadow-xs rotate-[-8deg]"
            />
            <img
              src="/products/satoru-gojo-white-1.jpg"
              alt="Promo streetwear tee"
              className="absolute right-0 top-2 h-16 w-14 object-cover rounded shadow-md rotate-[6deg]"
            />
          </div>
        </div>
      </div>

      {/* Offer Terms Dialog */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-brand-red mb-1">
              <Gift className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Promotion Details</span>
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">{title}</DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/80 pt-4">
            {terms}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
