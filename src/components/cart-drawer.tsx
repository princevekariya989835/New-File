import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus, Trash2, Loader2, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/catalog";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";
import { calculateBuy2Get1Discount } from "@/lib/promotions";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { items, isLoading, isSyncing, updateQuantity, removeItem, syncCart } = useCartStore();
  const { config } = usePublishedWebsiteConfig();
  const cartTxt = config?.cartContent;

  const cartHeading = cartTxt?.heading || "Your bag";
  const emptyMsg = cartTxt?.emptyMessage || "Your bag is empty.";
  const emptySub = cartTxt?.emptySubmessage || "Nothing here yet.";
  const removeLabel = cartTxt?.removeText || "Remove";
  const subtotalLabel = cartTxt?.subtotalLabel || "Subtotal";
  const checkoutBtn = cartTxt?.checkoutButtonText || "Checkout";

  useEffect(() => {
    setMounted(true);
  }, []);

  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = mounted ? safeItems.reduce((s, i) => s + (Number(i?.quantity) || 0), 0) : 0;
  const displayItems = mounted ? safeItems : [];
  const currency = displayItems[0]?.price?.currencyCode ?? "INR";
  const totalPrice = displayItems.reduce(
    (s, i) => s + (parseFloat(i?.price?.amount || "0") || 0) * (Number(i?.quantity) || 0),
    0,
  );

  const b2g1 = calculateBuy2Get1Discount(displayItems, config?.buy2get1Offer);
  const finalCartTotal = Math.max(0, totalPrice - b2g1.discountAmount);

  useEffect(() => {
    if (open) syncCart();
  }, [open, syncCart]);

  const checkout = () => {
    setOpen(false);
    navigate({ to: "/checkout" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          suppressHydrationWarning
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-brand-red hover:text-white"
          aria-label={`Cart, ${totalItems} items`}
        >
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
              {totalItems}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col sm:max-w-lg">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-2xl tracking-tight">{cartHeading}</SheetTitle>
          <SheetDescription>
            {totalItems === 0
              ? emptyMsg
              : `${totalItems} item${totalItems !== 1 ? "s" : ""}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col pt-6">
          {displayItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{emptySub}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-5">
                  {displayItems.map((item) => {
                    const freeCount =
                      b2g1.freeCountByVariantId[item.variantId] ||
                      (item.productId ? b2g1.freeCountByProductId[item.productId] : 0) ||
                      0;

                    return (
                      <div key={item.variantId} className="flex gap-4">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary relative">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.productTitle}
                              className="h-full w-full object-cover"
                            />
                          )}
                          {freeCount > 0 && (
                            <span className="absolute bottom-1 left-1 rounded bg-brand-red px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-medium leading-snug">{item.productTitle}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.selectedOptions.map((o) => o.value).join(" · ")}
                              </p>
                              {freeCount > 0 && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  {freeCount === item.quantity ? "BUY 2 GET 1 FREE item" : `${freeCount} of ${item.quantity} FREE`}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(item.variantId)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 rounded-full border border-border">
                              <button
                                className="flex h-7 w-7 items-center justify-center"
                                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-xs">{item.quantity}</span>
                              <button
                                className="flex h-7 w-7 items-center justify-center"
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-right">
                              {freeCount > 0 && (
                                <span className="block text-[11px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                                  FREE
                                </span>
                              )}
                              <span className="text-sm font-semibold">
                                {formatPrice(
                                  parseFloat(item.price.amount) * item.quantity,
                                  item.price.currencyCode,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-shrink-0 space-y-3 border-t border-border pt-4">
                {b2g1.eligibleUnitsCount > 0 && b2g1.neededForNextFree > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-xs border border-border/50">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-brand-red" />
                      Add {b2g1.neededForNextFree} more to unlock
                    </span>
                    <span className="font-bold text-brand-red uppercase tracking-wider text-[11px]">
                      FREE ITEM
                    </span>
                  </div>
                )}

                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">{subtotalLabel}</span>
                  <span className="font-medium">
                    {formatPrice(totalPrice, currency)}
                  </span>
                </div>

                {b2g1.discountAmount > 0 && (
                  <div className="flex items-baseline justify-between text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      BUY 2 GET 1 FREE
                    </span>
                    <span>-{formatPrice(b2g1.discountAmount, currency)}</span>
                  </div>
                )}

                <div className="flex items-baseline justify-between border-t border-border/40 pt-2">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold tracking-tight">
                    {formatPrice(finalCartTotal, currency)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Shipping and taxes calculated at checkout.
                </p>
                <Button
                  onClick={checkout}
                  size="lg"
                  className="h-12 w-full rounded-full text-sm font-medium"
                  disabled={isLoading || isSyncing}
                >
                  {isLoading || isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {checkoutBtn} <ArrowUpRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
