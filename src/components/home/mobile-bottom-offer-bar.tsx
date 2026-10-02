import React, { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock, LockOpen, ChevronUp, ChevronDown } from "lucide-react";
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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = !dismissed;
    setDismissed(next);
    try {
      if (typeof window !== "undefined") {
        if (next) {
          sessionStorage.setItem(DISMISS_KEY, "true");
        } else {
          sessionStorage.removeItem(DISMISS_KEY);
        }
      }
    } catch {
      // ignore
    }
  };

  // Only run if offer is enabled in website config and has valid promotion content (Issue 5)
  const isEnabled = offerConfig ? offerConfig.enabled !== false : true;
  const hasPromoContent = Boolean(offerConfig?.title || offerConfig?.subtitle || "BUY 2 GET 1 FREE");
  if (!mounted || !isEnabled || !hasPromoContent) return null;

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

  const { eligibleUnitsCount, freeUnitsCount, progressCount } = calculation;
  const isUnlocked = freeUnitsCount > 0;

  // Normalize long all-caps category subtitle to sentence/title case (Issue 6)
  const rawCategoryLabel = offerConfig?.subtitle || "Oversized Printed T-Shirts";
  const categoryLabel =
    rawCategoryLabel === rawCategoryLabel.toUpperCase() && rawCategoryLabel.length > 12
      ? rawCategoryLabel
          .toLowerCase()
          .replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase())
      : rawCategoryLabel;

  // Dynamic supporting text matching reference format
  let dynamicSubtitle = offerConfig?.supportingText || `Add 3 ${categoryLabel.toLowerCase()} to unlock this offer`;
  if (eligibleUnitsCount === 1) {
    dynamicSubtitle = `Add 2 more ${categoryLabel.toLowerCase()} to unlock this offer`;
  } else if (eligibleUnitsCount === 2) {
    dynamicSubtitle = `Add 1 more ${categoryLabel.toLowerCase()} to unlock your FREE item`;
  } else if (eligibleUnitsCount >= 3) {
    dynamicSubtitle = "Offer unlocked! 1 item is FREE";
  }

  // Circular progress calculations for the left lock icon ring
  // Circumference = 2 * PI * 17 = 106.81
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = isUnlocked ? 1 : Math.min(1, Math.max(0, progressCount / 3));
  const strokeOffset = circumference - progressRatio * circumference;

  // Angle for indicator dot (0 is 12 o'clock = -90 deg)
  const angleDeg = -90 + progressRatio * 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  const dotX = 22 + radius * Math.cos(angleRad);
  const dotY = 22 + radius * Math.sin(angleRad);

  // Minimized collapsed tab matching the reference pill theme
  if (dismissed) {
    return (
      <div
        className="block md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <button
          onClick={handleToggle}
          type="button"
          aria-label="Expand BUY 2 GET 1 FREE offer"
          className="group flex items-center gap-2 rounded-full border border-[#344186] bg-gradient-to-b from-[#1c245c] to-[#151c4a] px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_8px_25px_rgba(0,0,0,0.6)] backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/10"
        >
          <div className="flex size-5 items-center justify-center rounded-full bg-[#c5d0ed] text-[#182363]">
            <ChevronUp className="size-3.5 stroke-[2.5]" />
          </div>
          {/* Issue 7: Increased to at least 12px (text-xs) */}
          <span className="text-xs font-black uppercase tracking-wider text-white">
            {offerConfig?.title || "BUY 2 GET 1 FREE"}
          </span>
          {isUnlocked && (
            <span className="flex size-2 rounded-full bg-emerald-400 animate-ping" />
          )}
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
      <div className="relative pointer-events-auto">
        {/* MAIN PILL CARD with visually integrated minimize control (Issue 5) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/shop" })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/shop" });
            }
          }}
          className="relative flex items-center gap-2.5 sm:gap-3 overflow-hidden rounded-full border border-[#35458a] bg-gradient-to-b from-[#182363] to-[#131b4d] px-3.5 py-2 sm:px-4 sm:py-2.5 text-white shadow-[0_12px_36px_rgba(0,0,0,0.65)] backdrop-blur-xl transition-all duration-300 hover:border-[#4357ab] active:scale-[0.99] cursor-pointer"
        >
          {/* Subtle top edge metallic shine */}
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* Left: Circular Lock Icon with Progress Ring */}
          <div className="relative size-10 shrink-0 flex items-center justify-center">
            {/* SVG Circular Progress Track */}
            <svg
              className="absolute inset-0 size-full -rotate-90"
              viewBox="0 0 44 44"
              aria-hidden="true"
            >
              {/* Inactive background track */}
              <circle
                cx="22"
                cy="22"
                r={radius}
                className="stroke-[#2d3a7e]"
                strokeWidth="2.5"
                fill="none"
              />
              {/* Active progress stroke */}
              <circle
                cx="22"
                cy="22"
                r={radius}
                className={isUnlocked ? "stroke-emerald-400" : "stroke-white"}
                strokeWidth="2.5"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 0.4s ease-out, stroke 0.3s ease",
                }}
              />
              {/* Progress Indicator Dot on Ring */}
              <circle
                cx={dotX}
                cy={dotY}
                r="2.2"
                fill="#ffffff"
                className="drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]"
              />
            </svg>

            {/* Inner Dark Circle with Lock Icon */}
            <div className="flex size-7 items-center justify-center rounded-full bg-[#162058] border border-[#2b377b] text-white shadow-inner">
              {isUnlocked ? (
                <LockOpen className="size-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <Lock className="size-3.5 text-white" />
              )}
            </div>
          </div>

          {/* Middle: Promotion Copy & Bottom Progress Dots */}
          <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
            {/* Headline with Pipe separator - text-xs (12px) (Issue 7 & 8) */}
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden leading-snug">
              <span className="font-black text-xs sm:text-[13px] uppercase tracking-wide text-white truncate">
                {offerConfig?.title || "BUY 2 GET 1 FREE"}
              </span>
              <span className="text-white/40 font-bold text-xs shrink-0">|</span>
              {/* Sentence/title case for category label (Issue 6) */}
              <span className="font-semibold text-xs sm:text-[13px] tracking-wide text-white/95 truncate">
                {categoryLabel}
              </span>
            </div>

            {/* Supporting Subtitle - text-xs (12px) (Issue 8) */}
            <p className="mt-0.5 truncate text-xs sm:text-[13px] font-medium text-[#c5d0ed] leading-tight">
              {dynamicSubtitle}
            </p>

            {/* Bottom Progress Dashes/Dots (— • • matching reference) */}
            <div
              role="img"
              className="mt-1 flex items-center justify-center gap-1.5 shrink-0"
              aria-label={`Offer progress: ${progressCount} of 3 items eligible`}
            >
              {[0, 1, 2].map((idx) => {
                const isCompleted = progressCount > idx;
                const isCurrentTarget = progressCount === idx;

                return (
                  <span
                    key={idx}
                    className={`h-[3px] rounded-full transition-all duration-300 ${isCompleted
                        ? isUnlocked
                          ? "w-3.5 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                          : "w-3.5 bg-white"
                        : isCurrentTarget
                          ? "w-3.5 bg-white"
                          : "size-[3px] bg-white/40"
                      }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Visually Associated Minimize Button (Issue 5) */}
          <button
            onClick={handleToggle}
            type="button"
            aria-label="Minimize promotional offer"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-90 cursor-pointer ml-0.5"
          >
            <ChevronDown className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
