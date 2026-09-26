import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { X, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";
import { calculateBuy2Get1Discount } from "@/lib/promotions";

const DISMISS_KEY = "riotous_b2g1_dismissed_session";

export function MobileBottomOfferBar() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const { items } = useCartStore();
  const { config } = usePublishedWebsiteConfig();
  const offerConfig = config?.buy2get1Offer;

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== "undefined") {
        const isDismissed = sessionStorage.getItem(DISMISS_KEY) === "true";
        setDismissed(isDismissed);
      }
    } catch {
      // ignore storage access issues
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissed(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(DISMISS_KEY, "true");
      }
    } catch {
      // ignore
    }
  };

  const handleReopen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissed(false);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DISMISS_KEY);
      }
    } catch {
      // ignore
    }
  };

  // Only run if offer is enabled in website config (defaults to enabled)
  const isEnabled = offerConfig ? offerConfig.enabled !== false : true;
  if (!mounted || !isEnabled) return null;

  // Calculate real B2G1 offer status from current cart
  const cartItems = Array.isArray(items) ? items : [];
  const calculation = calculateBuy2Get1Discount(
    cartItems.map((i) => ({
      productId: i.productId,
      productTitle: i.productTitle,
      price: parseFloat(i.price.amount) || 0,
      quantity: i.quantity,
      variantId: i.variantId,
    })),
    offerConfig,
  );

  const { eligibleUnitsCount, freeUnitsCount, progressCount, supportingText } = calculation;
  const isUnlocked = freeUnitsCount > 0;

  // Minimized floating pill (mobile only)
  if (dismissed) {
    return (
      <div
        className="block md:hidden fixed bottom-4 right-3 z-40 transition-all duration-300 animate-in fade-in zoom-in-95"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <button
          onClick={handleReopen}
          type="button"
          aria-label="View BUY 2 GET 1 FREE offer"
          className="group flex items-center gap-1.5 rounded-full border border-brand-red/40 bg-neutral-950/90 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/10"
        >
          <span className="flex size-2 rounded-full bg-brand-red animate-ping" />
          <span className="text-[11px] font-bold tracking-wide">
            {isUnlocked ? "FREE ITEM UNLOCKED" : "B2G1 FREE"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Promotional offer: Buy 2 Get 1 Free"
      className="block md:hidden fixed bottom-3 inset-x-2.5 sm:bottom-4 sm:inset-x-4 z-40 max-w-md mx-auto pointer-events-none transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-5"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.15rem)",
      }}
    >
      <div
        onClick={() => navigate({ to: "/shop" })}
        className="pointer-events-auto group relative flex items-center justify-between gap-2.5 overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/95 px-3 py-2.5 sm:px-3.5 sm:py-2.5 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/25 active:scale-[0.99] cursor-pointer"
        style={{
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px -3px rgba(240, 11, 17, 0.2)",
        }}
      >
        {/* Subtle top edge metallic shine */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* Left: Circular icon with brand red badge */}
        <div className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full bg-brand-red/20 text-brand-red border border-brand-red/30 shadow-xs">
          <Sparkles className="size-4 animate-pulse" />
          {isUnlocked && (
            <span className="absolute -top-0.5 -right-0.5 flex size-2.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
          )}
        </div>

        {/* Middle: Promotion Copy & Dynamic Progress */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
              {offerConfig?.title || "BUY 2 GET 1 FREE"}
            </span>

            {/* 3 Progress Dots Indicator */}
            <div
              className="flex items-center gap-1 shrink-0"
              aria-label={`Offer progress: ${progressCount} of 3 items eligible`}
            >
              {[1, 2, 3].map((dotIndex) => {
                const filled = progressCount >= dotIndex;
                return (
                  <span
                    key={dotIndex}
                    className={`inline-block size-1.5 rounded-full transition-all duration-300 ${
                      filled
                        ? isUnlocked
                          ? "bg-emerald-400 ring-1 ring-emerald-400/50"
                          : "bg-brand-red ring-1 ring-brand-red/50 scale-110"
                        : "bg-white/25"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Dynamic supporting text */}
          <p className="mt-0.5 truncate text-[10.5px] sm:text-[11px] font-medium text-white/80">
            {supportingText}
          </p>
        </div>

        {/* Right: Action & Close Button */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to="/shop"
            onClick={(e) => e.stopPropagation()}
            aria-label="Browse eligible T-shirts for offer"
            className="flex size-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 transition-colors text-white/90"
          >
            <ArrowRight className="size-3.5" />
          </Link>

          <button
            onClick={handleDismiss}
            type="button"
            aria-label="Dismiss BUY 2 GET 1 FREE offer"
            className="flex size-7 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
