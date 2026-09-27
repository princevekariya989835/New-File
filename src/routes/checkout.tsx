import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  Lock,
  ShieldCheck,
  Truck,
  CreditCard,
  Loader2,
  Tag,
  CheckCircle2,
  X,
  Banknote,
  Zap,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/catalog";
import {
  placeOrder,
  createOnlineOrder,
  verifyOnlineOrderPayment,
  recordPaymentFailure,
} from "@/lib/orders.functions";
import { validateCouponCode } from "@/lib/coupons.functions";
import { getShippingEstimate } from "@/lib/shipping.functions";
import { useAuth } from "@/hooks/use-auth";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";
import { calculateBuy2Get1Discount } from "@/lib/promotions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [
      { title: "Secure Checkout | RIOTOUS Official Streetwear Store" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Review your bag, enter your shipping address and place your RIOTOUS order.",
      },
      { property: "og:title", content: "Secure Checkout | RIOTOUS Official Streetwear Store" },
      {
        property: "og:description",
        content: "Review your order and place it in a few seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      setTimeout(() => resolve(Boolean((window as any).Razorpay)), 6000);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    const timer = setTimeout(() => {
      resolve(Boolean((window as any).Razorpay));
    }, 8000);
    script.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, isLoading, isSyncing, clearCart } = useCartStore();
  const { user } = useAuth();
  const { config } = usePublishedWebsiteConfig();
  const placeOrderFn = useServerFn(placeOrder);
  const createOnlineOrderFn = useServerFn(createOnlineOrder);
  const verifyPaymentFn = useServerFn(verifyOnlineOrderPayment);
  const recordFailureFn = useServerFn(recordPaymentFailure);
  const validateCouponFn = useServerFn(validateCouponCode);
  const getShippingEstimateFn = useServerFn(getShippingEstimate);

  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">("ONLINE");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [shippingQuote, setShippingQuote] = useState<{
    isServiceable: boolean;
    availableCouriers: any[];
    cheapestRate: number;
    fastestDays: number;
    recommendedCourier?: any;
  } | null>(null);
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placingText, setPlacingText] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    eligibleSubtotal: number;
    finalSubtotal: number;
    message: string;
  } | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    pincode?: string;
  }>({});
  const clearFieldError = (f: string) =>
    setFieldErrors((prev) => (prev[f as keyof typeof prev] ? { ...prev, [f]: undefined } : prev));

  useEffect(() => {
    setMounted(true);
    // Preload Razorpay Checkout script
    loadRazorpayScript().catch(() => {});

    // Prefill saved address from previous visit if available
    try {
      const saved = localStorage.getItem("riotous_saved_checkout_address");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName((v) => v || parsed.name);
        if (parsed.email) setEmail((v) => v || parsed.email);
        if (parsed.phone) setPhone((v) => v || parsed.phone);
        if (parsed.address) setAddress((v) => v || parsed.address);
        if (parsed.pincode) setPincode((v) => v || parsed.pincode);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    setEmail((v) => v || user.email || "");
    setName((v) => v || ((user.user_metadata?.full_name as string | undefined) ?? ""));
  }, [user]);

  const safeItems = Array.isArray(items) ? items : [];
  const displayItems = mounted ? safeItems : [];
  const currency = displayItems[0]?.price?.currencyCode ?? "INR";
  const subtotal = displayItems.reduce(
    (s, i) => s + (parseFloat(i?.price?.amount || "0") || 0) * (Number(i?.quantity) || 0),
    0,
  );

  const b2g1 = calculateBuy2Get1Discount(displayItems, config?.buy2get1Offer);
  const b2g1Discount = b2g1.discountAmount;
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalDiscount = b2g1Discount + couponDiscount;
  const finalSubtotal = Math.max(0, subtotal - totalDiscount);
  const baseShipping = shippingQuote?.cheapestRate ?? 79;
  const shipping = finalSubtotal >= 1999 || finalSubtotal === 0 ? 0 : baseShipping;
  const total = finalSubtotal + shipping;

  // Check live Zippyy courier serviceability & calculate dynamic shipping rates
  useEffect(() => {
    const pin = pincode.trim() || (address.match(/\b([1-9][0-9]{5})\b/)?.[1] ?? "");
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setShippingQuote(null);
      return;
    }

    let isMounted = true;
    const fetchQuote = async () => {
      setCheckingServiceability(true);
      try {
        const quote = await getShippingEstimateFn({
          data: {
            pincode: pin,
            weightGrams: Math.max(displayItems.length * 400, 500),
            isCod: paymentMethod === "COD",
            orderValue: finalSubtotal,
          },
        });
        if (isMounted) {
          setShippingQuote(quote);
        }
      } catch (err) {
        console.warn("[Checkout] Serviceability check error:", err);
      } finally {
        if (isMounted) setCheckingServiceability(false);
      }
    };

    const debounceTimer = setTimeout(fetchQuote, 400);
    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [pincode, address, paymentMethod, finalSubtotal, displayItems.length]);

  const applyCoupon = async () => {
    const clean = couponInput.toUpperCase().replace(/\s+/g, "").trim();
    if (!clean) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    if (appliedCoupon) {
      toast.error("Only one coupon can be used per order. Remove the current coupon first.");
      return;
    }

    setApplyingCoupon(true);
    setCouponError(null);

    try {
      const res = await validateCouponFn({
        data: {
          code: clean,
          subtotal: Math.max(0, subtotal - b2g1Discount),
          items: displayItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: parseFloat(i.price.amount),
            productName: i.productTitle,
          })),
          customerEmail: email || user?.email || null,
          customerId: user?.id || null,
        },
      });

      if (!res.ok) {
        setCouponError(res.error || "Invalid coupon code.");
        toast.error(res.error || "Invalid coupon code.");
        return;
      }

      setAppliedCoupon(res.coupon);
      setCouponInput("");
      setCouponError(null);
      toast.success(res.coupon.message || `Coupon ${res.coupon.code} applied!`);
    } catch (e) {
      const msg = (e as Error).message || "Could not apply coupon.";
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    toast.info("Coupon removed");
  };

  const proceed = async () => {
    if (!user) {
      toast.error("Please sign in to place your order");
      navigate({ to: "/auth" });
      return;
    }

    const errors: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      pincode?: string;
    } = {};

    if (!name.trim()) errors.name = "Please enter your full name.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Please enter a valid 10-digit mobile number.";
    }
    if (!pincode.trim() || pincode.replace(/\D/g, "").length !== 6) {
      errors.pincode = "Please enter a valid 6-digit PIN code.";
    }
    if (!address.trim()) {
      errors.address = "Please enter your delivery street address.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please check the shipping form for errors.");
      return;
    }

    setFieldErrors({});

    try {
      localStorage.setItem(
        "riotous_saved_checkout_address",
        JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(), pincode: pincode.trim() }),
      );
    } catch {}

    const formattedAddress = pincode && !address.includes(pincode)
      ? `${address.trim()}, PIN: ${pincode.trim()}`
      : address.trim();

    const orderPayload = {
      shippingName: name.trim(),
      shippingEmail: email.trim(),
      shippingPhone: phone.trim(),
      shippingAddress: formattedAddress,
      currency,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      items: displayItems.map((i) => ({
        productId: i.productId,
        designSubmissionId: i.designSubmissionId ?? null,
        productName: i.productTitle,
        productImage: i.imageUrl,
        quantity: i.quantity,
        price: parseFloat(i.price.amount),
        selectedSize:
          i.selectedOptions.find((o) => o.name.toLowerCase() === "size")?.value ?? null,
        selectedColor:
          i.selectedOptions.find((o) => o.name.toLowerCase() === "color")?.value ?? null,
      })),
    };

    setPlacing(true);
    setPlacingText(paymentMethod === "ONLINE" ? "Initializing Razorpay..." : "Placing Order...");

    if (paymentMethod === "COD") {
      // Cash on Delivery flow
      try {
        const res = await placeOrderFn({ data: orderPayload });
        clearCart();
        toast.success(`Order ${res.orderNumber} placed successfully via Cash on Delivery!`);
        navigate({ to: "/account/orders" });
      } catch (e) {
        toast.error((e as Error).message || "Could not place your order");
      } finally {
        setPlacing(false);
        setPlacingText(null);
      }
      return;
    }

    // Online Payment (Razorpay) flow
    try {
      const onlineOrderRes = await createOnlineOrderFn({ data: orderPayload });

      if (!onlineOrderRes) {
        throw new Error("No response received from order creation server.");
      }
      if (!onlineOrderRes.razorpayKeyId) {
        throw new Error("Razorpay Key ID is not configured on the server. Please check RAZORPAY_KEY_ID environment variable.");
      }
      if (!onlineOrderRes.razorpayOrderId) {
        throw new Error("Failed to create Razorpay order ID on the server.");
      }

      setPlacingText("Loading Razorpay Checkout...");
      const isScriptLoaded = await loadRazorpayScript();

      if (!isScriptLoaded || !(window as any).Razorpay) {
        throw new Error("Unable to load Razorpay payment SDK. Please check your internet connection or ad-blocker.");
      }

      const options = {
        key: onlineOrderRes.razorpayKeyId,
        amount: onlineOrderRes.amount,
        currency: onlineOrderRes.currency || "INR",
        name: "RIOTOUS",
        description: `Order ${onlineOrderRes.orderNumber}`,
        image: "/favicon.png",
        order_id: onlineOrderRes.razorpayOrderId,
        prefill: {
          name: onlineOrderRes.customerName || name,
          email: onlineOrderRes.customerEmail || email,
          contact: onlineOrderRes.customerPhone || phone || "",
        },
        theme: {
          color: "#f00b11",
          backdrop_color: "#0a0a0a",
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
            setPlacingText(null);
            toast.info("Payment window was closed. You can retry or choose Cash on Delivery.");
            recordFailureFn({
              data: {
                orderId: onlineOrderRes.orderId,
                reason: "Customer closed Razorpay Checkout modal",
              },
            }).catch(() => {});
          },
          escape: true,
          backdropclose: false,
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setPlacing(true);
            setPlacingText("Verifying payment security...");
            const verifyRes = await verifyPaymentFn({
              data: {
                orderId: onlineOrderRes.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            clearCart();
            toast.success(`Payment verified! Order ${verifyRes.orderNumber} placed.`);
            navigate({ to: "/account/orders" });
          } catch (verifyErr: any) {
            console.error("[Checkout] Payment verification failed:", verifyErr);
            toast.error(
              verifyErr.message ||
                "Payment verification failed. Please check your orders or contact support.",
            );
            navigate({ to: "/account/orders" });
          } finally {
            setPlacing(false);
            setPlacingText(null);
          }
        },
      };

      try {
        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", (failedRes: any) => {
          setPlacing(false);
          setPlacingText(null);
          const reason =
            failedRes?.error?.description ||
            failedRes?.error?.reason ||
            "Payment failed. Please try another card, netbanking, or UPI app.";
          toast.error(reason);
          recordFailureFn({
            data: {
              orderId: onlineOrderRes.orderId,
              reason: `Razorpay payment.failed: ${reason}`,
            },
          }).catch(() => {});
        });

        rzp.open();
        // Unfreeze placing button once modal is requested so the page is not stuck
        setTimeout(() => {
          setPlacing(false);
          setPlacingText(null);
        }, 500);
      } catch (rzpOpenErr: any) {
        setPlacing(false);
        setPlacingText(null);
        throw new Error(rzpOpenErr?.message || "Failed to launch Razorpay Checkout popup.");
      }
    } catch (e: any) {
      setPlacing(false);
      setPlacingText(null);
      console.error("[Checkout] Online payment error:", e);
      toast.error(e?.message || "Could not initialize online payment. Please try again.");
    }
  };


  if (displayItems.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-16 md:px-6 md:pt-40">
        <div className="rounded-3xl border border-border bg-card p-8 md:p-12 text-center">
          <h1 className="mb-3 text-2xl md:text-3xl font-semibold tracking-tight">Your bag is empty</h1>
          <p className="mb-8 text-sm md:text-base text-muted-foreground">Add something before you check out.</p>
          <Button onClick={() => navigate({ to: "/shop" })} size="lg" className="rounded-full">
            Browse the shop
          </Button>
        </div>
      </main>
    );
  }

  const totalQuantity = displayItems.reduce((s, i) => s + (Number(i?.quantity) || 0), 0);

  return (
    <>
      <main className="mx-auto max-w-[1200px] w-full px-3.5 sm:px-6 md:px-10 pb-32 md:pb-24 pt-4 md:pt-36 overflow-x-hidden md:overflow-x-visible">
        {/* MOBILE HEADING & PROGRESS (md:hidden) */}
        <div className="mb-5 md:hidden">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
            <span>Checkout</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-brand-red">Review &amp; Place Order</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Checkout</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Review your items and complete your order.
          </p>
        </div>

        {/* DESKTOP HEADING & PROGRESS (hidden md:block — EXACT ORIGINAL DESKTOP) */}
        <div className="mb-10 hidden md:block">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Step 1 of 1 · Review &amp; place order
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Checkout</h1>
        </div>

        <div className="grid gap-6 md:gap-10 lg:grid-cols-[1fr_420px] min-w-0 w-full">
          {/* LEFT — items + info */}
          <div className="space-y-6 md:space-y-8 min-w-0 w-full">
            {/* 1. ORDER ITEMS */}
            <section className="rounded-2xl md:rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-8 min-w-0 overflow-hidden">
              <div className="mb-4 md:mb-6 flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold">
                  <span className="md:hidden">Your items · {totalQuantity}</span>
                  <span className="hidden md:inline">Your items</span>
                </h2>
              </div>

              <ul className="divide-y divide-border">
                {displayItems.map((item) => {
                  const freeCount =
                    b2g1.freeCountByVariantId[item.variantId] ||
                    (item.productId ? b2g1.freeCountByProductId[item.productId] : 0) ||
                    0;
                  const itemPrice = parseFloat(item.price.amount) || 0;
                  const itemTotal = itemPrice * item.quantity;
                  const isEntirelyFree = freeCount >= item.quantity;
                  const partiallyFree = freeCount > 0 && freeCount < item.quantity;
                  const actualChargedPrice = isEntirelyFree
                    ? 0
                    : partiallyFree
                      ? itemPrice * (item.quantity - freeCount)
                      : itemTotal;
                  const variantText = item.selectedOptions.map((o) => o.value).join(" · ");

                  return (
                    <li key={item.variantId} className="min-w-0">
                      {/* MOBILE ITEM LAYOUT (md:hidden) */}
                      <div className="flex md:hidden gap-3 py-4 first:pt-0 last:pb-0 items-start min-w-0">
                        {/* Mobile Image */}
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary border border-border/40">
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

                        {/* Mobile Details */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch gap-1">
                          <div className="min-w-0">
                            {/* Product title: wraps naturally, no cutoff */}
                            <h3 className="text-sm font-semibold text-foreground leading-snug break-words">
                              {item.productTitle}
                            </h3>
                            {variantText && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {variantText}
                              </p>
                            )}
                            {freeCount > 0 && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <Sparkles className="h-2.5 w-2.5" />
                                {freeCount === item.quantity
                                  ? "BUY 2 GET 1 FREE item"
                                  : `${freeCount} of ${item.quantity} FREE`}
                              </span>
                            )}
                          </div>

                          {/* Mobile Qty & Price Row */}
                          <div className="flex items-baseline justify-between pt-1 mt-auto">
                            <span className="text-xs font-medium text-muted-foreground">
                              Qty {item.quantity}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              {isEntirelyFree ? (
                                <>
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    FREE
                                  </span>
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatPrice(itemTotal, item.price.currencyCode)}
                                  </span>
                                </>
                              ) : partiallyFree ? (
                                <>
                                  <span className="text-sm font-bold text-foreground">
                                    {formatPrice(actualChargedPrice, item.price.currencyCode)}
                                  </span>
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatPrice(itemTotal, item.price.currencyCode)}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-500 uppercase">
                                    ({freeCount} FREE)
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm font-bold text-foreground">
                                  {formatPrice(itemTotal, item.price.currencyCode)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DESKTOP ITEM LAYOUT (hidden md:flex — EXACT ORIGINAL MARKUP) */}
                      <div className="hidden md:flex gap-4 py-5 first:pt-0 last:pb-0">
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-secondary">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.productTitle}
                              className="h-full w-full object-cover"
                            />
                          )}
                          {freeCount > 0 && (
                            <span className="absolute bottom-1.5 left-1.5 rounded bg-brand-red px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <p className="truncate text-sm font-medium">{item.productTitle}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.selectedOptions.map((o) => o.value).join(" · ")}
                            </p>
                            {freeCount > 0 && (
                              <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                                <Sparkles className="h-2.5 w-2.5" />
                                {freeCount === item.quantity
                                  ? "BUY 2 GET 1 FREE item"
                                  : `${freeCount} of ${item.quantity} FREE`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                        </div>
                        <div className="text-right text-sm">
                          {freeCount > 0 && (
                            <span className="block text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                              FREE
                            </span>
                          )}
                          <span className="font-semibold">
                            {formatPrice(
                              parseFloat(item.price.amount) * item.quantity,
                              item.price.currencyCode,
                            )}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* 2. SHIPPING & ADDRESS */}
            <section className="rounded-2xl md:rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-8 min-w-0">
              <div className="mb-4 flex items-center gap-2.5">
                <Truck className="h-5 w-5 text-brand-red shrink-0" />
                <h2 className="text-base md:text-lg font-semibold">Shipping &amp; address</h2>
              </div>
              <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="ship-name" className="text-xs font-medium text-foreground">
                    Full name <span className="text-brand-red">*</span>
                  </Label>
                  <Input
                    id="ship-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError("name");
                    }}
                    placeholder="e.g. Rahul Sharma"
                    className={`h-12 md:h-10 text-sm ${fieldErrors.name ? "border-destructive ring-1 ring-destructive" : ""}`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="ship-phone" className="text-xs font-medium text-foreground">
                    Phone number <span className="text-brand-red">*</span>
                  </Label>
                  <Input
                    id="ship-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      clearFieldError("phone");
                    }}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className={`h-12 md:h-10 text-sm ${fieldErrors.phone ? "border-destructive ring-1 ring-destructive" : ""}`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ship-email" className="text-xs font-medium text-foreground">
                    Email address <span className="text-brand-red">*</span>
                  </Label>
                  <Input
                    id="ship-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    placeholder="you@example.com (for order tracking & updates)"
                    className={`h-12 md:h-10 text-sm ${fieldErrors.email ? "border-destructive ring-1 ring-destructive" : ""}`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ship-pincode" className="text-xs font-medium text-foreground">
                      PIN Code <span className="text-brand-red">*</span>
                    </Label>
                    {checkingServiceability && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking delivery...
                      </span>
                    )}
                  </div>
                  <Input
                    id="ship-pincode"
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      clearFieldError("pincode");
                    }}
                    placeholder="6-digit PIN code (e.g. 400001)"
                    maxLength={6}
                    className={`h-12 md:h-10 text-sm font-mono ${fieldErrors.pincode ? "border-destructive ring-1 ring-destructive" : ""}`}
                  />
                  {fieldErrors.pincode && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.pincode}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ship-address" className="text-xs font-medium text-foreground">
                    Shipping address <span className="text-brand-red">*</span>
                  </Label>
                  <Textarea
                    id="ship-address"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      clearFieldError("address");
                    }}
                    placeholder="House / Flat no., Building, Street, Area, City, State"
                    rows={3}
                    className={`text-sm resize-none ${fieldErrors.address ? "border-destructive ring-1 ring-destructive" : ""}`}
                  />
                  {fieldErrors.address && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.address}</p>
                  )}
                </div>
              </div>

              {/* Dynamic Zippyy Serviceability & Courier Rate Indicator */}
              {shippingQuote && shippingQuote.isServiceable && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-semibold">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="break-words">
                        Delivery Serviceable via {shippingQuote.recommendedCourier?.courierName || "Zippyy Express"}
                      </span>
                    </span>
                    <span className="self-start sm:self-auto shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                      Est. {shippingQuote.fastestDays || 3} Business Days
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-300/80">
                    Real-time shipping rate: {shipping === 0 ? "FREE" : formatPrice(shipping, currency)} (Standard Surface/Air Transit)
                  </p>
                </div>
              )}

              {pincode.length === 6 && shippingQuote && !shippingQuote.isServiceable && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                  ⚠️ Pincode {pincode} might have limited delivery serviceability. We will attempt standard postal delivery.
                </div>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                Free shipping on orders over {formatPrice(1999, currency)}. Instant dispatch within 24 hours.
              </p>
            </section>

            {/* 3. PAYMENT METHOD */}
            <section className="rounded-2xl md:rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-8 min-w-0">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-5 w-5 text-brand-red shrink-0" />
                  <h2 className="text-base md:text-lg font-semibold">Payment Method</h2>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500 shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  256-Bit SSL Encrypted
                </span>
              </div>

              <div className="space-y-3">
                {/* Online Payment Option */}
                <div
                  onClick={() => setPaymentMethod("ONLINE")}
                  className={`relative flex cursor-pointer items-start gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border p-3.5 sm:p-4 transition-all ${
                    paymentMethod === "ONLINE"
                      ? "border-brand-red/90 bg-brand-red/5 ring-1 ring-brand-red/50 shadow-sm"
                      : "border-border/80 bg-background/50 hover:border-border hover:bg-background"
                  }`}
                >
                  <div className="mt-0.5 flex items-center shrink-0">
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        paymentMethod === "ONLINE"
                          ? "border-brand-red bg-brand-red"
                          : "border-muted-foreground/40 bg-transparent"
                      }`}
                    >
                      {paymentMethod === "ONLINE" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-semibold">Online Payment</span>
                      <span className="rounded-full bg-brand-red/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-red">
                        Instant · Recommended
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-normal">
                      UPI (GPay, PhonePe, Paytm), Cards, NetBanking &amp; Wallets via Razorpay
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {["UPI", "Google Pay", "PhonePe", "Cards", "NetBanking"].map((badge) => (
                        <span
                          key={badge}
                          className="rounded-md border border-border/80 bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cash on Delivery Option */}
                <div
                  onClick={() => setPaymentMethod("COD")}
                  className={`relative flex cursor-pointer items-start gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border p-3.5 sm:p-4 transition-all ${
                    paymentMethod === "COD"
                      ? "border-brand-red/90 bg-brand-red/5 ring-1 ring-brand-red/50 shadow-sm"
                      : "border-border/80 bg-background/50 hover:border-border hover:bg-background"
                  }`}
                >
                  <div className="mt-0.5 flex items-center shrink-0">
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        paymentMethod === "COD"
                          ? "border-brand-red bg-brand-red"
                          : "border-muted-foreground/40 bg-transparent"
                      }`}
                    >
                      {paymentMethod === "COD" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">Cash on Delivery (COD)</span>
                      <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pay in cash when your order is delivered to your doorstep.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 md:mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Your payment information is handled securely via Razorpay's PCI-DSS compliant infrastructure.</span>
              </div>
            </section>
          </div>

          {/* RIGHT — summary */}
          <aside className="min-w-0 w-full lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl md:rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-8 min-w-0">
              <h2 className="mb-4 md:mb-6 text-base md:text-lg font-semibold">Order summary</h2>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Subtotal ({totalQuantity} items)
                  </dt>
                  <dd className="font-medium text-foreground">{formatPrice(subtotal, currency)}</dd>
                </div>
                {b2g1Discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <dt className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>BUY 2 GET 1 FREE</span>
                    </dt>
                    <dd>-{formatPrice(b2g1Discount, currency)}</dd>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <dt className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      <span>Coupon ({appliedCoupon.code})</span>
                    </dt>
                    <dd>-{formatPrice(couponDiscount, currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="font-medium text-foreground">
                    {shipping === 0 ? "Free" : formatPrice(shipping, currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Taxes</dt>
                  <dd className="text-muted-foreground">Included</dd>
                </div>
              </dl>

              {/* Coupon Code Section */}
              <div className="my-5 md:my-6 border-t border-b border-border py-4">
                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-brand-red" />
                        Have a coupon?
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="coupon-code-input"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase().replace(/\s+/g, ""));
                          setCouponError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyCoupon();
                          }
                        }}
                        placeholder="ENTER CODE"
                        className="h-11 md:h-10 text-xs font-mono uppercase tracking-wider bg-secondary/50 border-border/80"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={applyCoupon}
                        disabled={!couponInput.trim() || applyingCoupon}
                        className="h-11 md:h-10 px-4 text-xs font-bold uppercase tracking-wider rounded-xl shrink-0"
                      >
                        {applyingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-xs font-medium text-destructive mt-1.5">{couponError}</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-emerald-400 tracking-wider">
                              {appliedCoupon.code}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              Applied
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-400/90 truncate mt-0.5">
                            {appliedCoupon.message}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeCoupon}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">Total</span>
                  <p className="text-[11px] text-muted-foreground">Inclusive of all taxes</p>
                </div>
                <span className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {formatPrice(total, currency)}
                </span>
              </div>

              {/* Desktop Place Order Button (hidden md:flex — EXACT SAME BUTTON AS BEFORE) */}
              <Button
                onClick={proceed}
                size="lg"
                disabled={isLoading || isSyncing || placing}
                className="hidden md:flex mt-6 h-12 w-full rounded-full text-sm font-semibold shadow-lg shadow-brand-red/20 transition-all hover:scale-[1.01]"
              >
                {isLoading || isSyncing || placing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{placingText || (paymentMethod === "ONLINE" ? "Opening Razorpay..." : "Placing Order...")}</span>
                  </div>
                ) : (
                  <>
                    {paymentMethod === "ONLINE" ? (
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4 fill-current" />
                        Pay {formatPrice(total, currency)} with Razorpay
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Place Order (COD)
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    )}
                  </>
                )}
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                You'll be able to track this order in My Orders
              </p>

              <Link
                to="/shop"
                className="mt-4 md:mt-6 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      </main>

      {/* Sticky Mobile Checkout Bar (approx 68px, mobile-only) */}
      <aside
        aria-label="Mobile Checkout Action"
        className="fixed inset-x-0 bottom-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:hidden"
      >
        <div className="flex items-center justify-between gap-3 max-w-[1200px] mx-auto">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total</p>
            <p className="text-lg font-black tracking-tight text-foreground leading-none mt-0.5">
              {formatPrice(total, currency)}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Incl. all taxes</p>
          </div>
          <Button
            onClick={proceed}
            disabled={isLoading || isSyncing || placing}
            className="h-12 px-6 rounded-full bg-brand-red hover:bg-brand-red/90 text-white font-bold text-sm shadow-lg shadow-brand-red/25 active:scale-95 transition-all shrink-0"
          >
            {isLoading || isSyncing || placing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">{placingText || "Placing..."}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {paymentMethod === "ONLINE" ? (
                  <>
                    <Zap className="h-4 w-4 fill-current" />
                    <span>Pay {formatPrice(total, currency)}</span>
                  </>
                ) : (
                  <>
                    <span>Place Order (COD)</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </>
                )}
              </div>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
