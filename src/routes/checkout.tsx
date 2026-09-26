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

  useEffect(() => {
    setMounted(true);
    // Preload Razorpay Checkout script
    loadRazorpayScript().catch(() => {});
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
    if (!name.trim() || !email.trim() || !address.trim()) {
      toast.error("Please fill in your name, email and shipping address");
      return;
    }

    const orderPayload = {
      shippingName: name,
      shippingEmail: email,
      shippingPhone: phone,
      shippingAddress: address,
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
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:pt-40">
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">Your bag is empty</h1>
          <p className="mb-8 text-muted-foreground">Add something before you check out.</p>
          <Button onClick={() => navigate({ to: "/shop" })} size="lg" className="rounded-full">
            Browse the shop
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-28 md:px-10 md:pt-36">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Step 1 of 1 · Review &amp; place order
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Checkout</h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
        {/* LEFT — items + info */}
        <div className="space-y-8">
          <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 className="mb-6 text-lg font-semibold">Your items</h2>
            <ul className="divide-y divide-border">
              {displayItems.map((item) => {
                const freeCount =
                  b2g1.freeCountByVariantId[item.variantId] ||
                  (item.productId ? b2g1.freeCountByProductId[item.productId] : 0) ||
                  0;

                return (
                  <li key={item.variantId} className="flex gap-4 py-5 first:pt-0 last:pb-0">
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
                            {freeCount === item.quantity ? "BUY 2 GET 1 FREE item" : `${freeCount} of ${item.quantity} FREE`}
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
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Truck className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Shipping &amp; address</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ship-name">Full name</Label>
                <Input
                  id="ship-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ship-email">Email</Label>
                <Input
                  id="ship-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ship-phone">Phone</Label>
                <Input
                  id="ship-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 …"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ship-pincode">PIN Code</Label>
                  {checkingServiceability && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking delivery...
                    </span>
                  )}
                </div>
                <Input
                  id="ship-pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit PIN code (e.g. 400001)"
                  maxLength={6}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ship-address">Shipping address</Label>
                <Textarea
                  id="ship-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House / street, area, city, state"
                  rows={3}
                />
              </div>
            </div>

            {/* Dynamic Zippyy Serviceability & Courier Rate Indicator */}
            {shippingQuote && shippingQuote.isServiceable && (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Delivery Serviceable via {shippingQuote.recommendedCourier?.courierName || "Zippyy Express"}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                    Est. {shippingQuote.fastestDays || 3} Business Days
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-emerald-300/80">
                  Real-time shipping rate: {shipping === 0 ? "FREE" : formatPrice(shipping, currency)} (Standard Surface/Air Transit)
                </p>
              </div>
            )}

            {pincode.length === 6 && shippingQuote && !shippingQuote.isServiceable && (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                ⚠️ Pincode {pincode} might have limited delivery serviceability. We will attempt standard postal delivery.
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              Free shipping on orders over {formatPrice(1999, currency)}. Instant dispatch within 24 hours.
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-brand-red" />
                <h2 className="text-lg font-semibold">Payment Method</h2>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                256-Bit SSL Encrypted
              </span>
            </div>

            <div className="space-y-3">
              {/* Online Payment Option */}
              <div
                onClick={() => setPaymentMethod("ONLINE")}
                className={`relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
                  paymentMethod === "ONLINE"
                    ? "border-brand-red/80 bg-brand-red/5 ring-1 ring-brand-red/50 shadow-sm"
                    : "border-border/80 bg-background/50 hover:border-border hover:bg-background"
                }`}
              >
                <div className="mt-0.5 flex items-center">
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Online Payment</span>
                      <span className="rounded-full bg-brand-red/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-red">
                        Instant · Recommended
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking &amp; Wallets via Razorpay
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["UPI", "Google Pay", "PhonePe", "Cards", "NetBanking"].map((badge) => (
                      <span
                        key={badge}
                        className="rounded-md border border-border/80 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-foreground"
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
                className={`relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
                  paymentMethod === "COD"
                    ? "border-brand-red/80 bg-brand-red/5 ring-1 ring-brand-red/50 shadow-sm"
                    : "border-border/80 bg-background/50 hover:border-border hover:bg-background"
                }`}
              >
                <div className="mt-0.5 flex items-center">
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
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pay in cash when your order is delivered to your doorstep.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Your payment information is handled securely via Razorpay's PCI-DSS compliant infrastructure.
            </div>
          </section>
        </div>

        {/* RIGHT — summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 className="mb-6 text-lg font-semibold">Order summary</h2>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Subtotal ({displayItems.reduce((s, i) => s + (Number(i?.quantity) || 0), 0)}{" "}
                  items)
                </dt>
                <dd>{formatPrice(subtotal, currency)}</dd>
              </div>
              {b2g1Discount > 0 && (
                <div className="flex justify-between text-emerald-500 font-medium">
                  <dt className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>BUY 2 GET 1 FREE</span>
                  </dt>
                  <dd>-{formatPrice(b2g1Discount, currency)}</dd>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <dt className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Coupon ({appliedCoupon.code})</span>
                  </dt>
                  <dd>-{formatPrice(couponDiscount, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{shipping === 0 ? "Free" : formatPrice(shipping, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Taxes</dt>
                <dd className="text-muted-foreground">Included</dd>
              </div>
            </dl>

            {/* Coupon Code Section */}
            <div className="my-6 border-t border-b border-border py-4">
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
                      className="h-10 text-xs font-mono uppercase tracking-wider bg-secondary/50 border-border/80"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={applyCoupon}
                      disabled={!couponInput.trim() || applyingCoupon}
                      className="h-10 px-4 text-xs font-bold uppercase tracking-wider rounded-xl shrink-0"
                    >
                      {applyingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-xs font-medium text-destructive mt-1.5">{couponError}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
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
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-3xl font-semibold tracking-tight">
                {formatPrice(total, currency)}
              </span>
            </div>

            <Button
              onClick={proceed}
              size="lg"
              disabled={isLoading || isSyncing || placing}
              className="mt-6 h-12 w-full rounded-full text-sm font-semibold shadow-lg shadow-brand-red/20 transition-all hover:scale-[1.01]"
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
              className="mt-6 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
