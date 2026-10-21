import React, { useEffect, useState } from "react";
import { ShoppingBag, Loader2, Check } from "lucide-react";
import { formatPrice } from "@/lib/catalog";

export interface ProductStickyBarProps {
  title: string;
  thumbnailUrl?: string | null;
  price: number;
  currency?: string;
  selectedVariantTitle?: string;
  isAvailable: boolean;
  isLoading: boolean;
  justAdded: boolean;
  onAddToCart: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

export function ProductStickyBar({
  title,
  thumbnailUrl,
  price,
  currency = "INR",
  selectedVariantTitle,
  isAvailable,
  isLoading,
  justAdded,
  onAddToCart,
  triggerRef,
}: ProductStickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      // Show sticky bar when the main CTA buttons are scrolled above viewport
      if (rect.bottom < 0) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [triggerRef]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/80 bg-background/95 backdrop-blur-md px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5 duration-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        {/* Thumbnail Preview */}
        {thumbnailUrl && (
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-secondary/50">
            <img
              src={thumbnailUrl}
              alt={title}
              width={48}
              height={48}
              className="h-full w-full object-contain p-0.5"
              onError={(e) => {
                e.currentTarget.src = "/placeholder-tee.jpg";
              }}
            />
          </div>
        )}

        {/* Title and Price */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-bold text-foreground">{title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-extrabold text-foreground">
              {formatPrice(price, currency)}
            </span>
            {selectedVariantTitle && (
              <span className="text-[11px] text-muted-foreground truncate font-medium">
                · {selectedVariantTitle}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!isAvailable || isLoading}
          className="shrink-0 flex h-11 items-center justify-center gap-1.5 rounded-xl bg-brand-red px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-brand-red/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : justAdded ? (
            <>
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Added</span>
            </>
          ) : isAvailable ? (
            <>
              <ShoppingBag className="h-4 w-4" />
              <span>Add to Bag</span>
            </>
          ) : (
            <span>Sold Out</span>
          )}
        </button>
      </div>
    </div>
  );
}
