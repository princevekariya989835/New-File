import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Minus,
  Plus,
  ShoppingBag,
  Loader2,
  Check,
  Star,
  Ruler,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Zap,
  Package,
} from "lucide-react";
import { fetchProductByHandle, fetchProducts, formatPrice } from "@/lib/catalog";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPromotionalBanner } from "@/components/product/product-promotional-banner";
import {
  CompactProductBenefitIcons,
  ProductBenefitsStrip,
} from "@/components/product/product-benefits-strip";
import { ProductInfoSections } from "@/components/product/product-info-sections";
import { ProductStickyBar } from "@/components/product/product-sticky-bar";
import { ProductRecommendations } from "@/components/product/product-recommendations";
import { ProductReviews } from "@/components/reviews/product-reviews";
import { ProductSizeGuideModal } from "@/components/product/product-size-guide-modal";
import { getProductReviews } from "@/lib/reviews.functions";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
import { BrandName } from "@/components/brand-name";

const productQuery = (handle: string) => ({
  queryKey: ["product", handle],
  queryFn: async () => {
    const p = await fetchProductByHandle(handle);
    if (!p) throw notFound();
    return p;
  },
  staleTime: 1000 * 5,
  gcTime: 1000 * 60 * 5,
  refetchOnWindowFocus: true,
});

function formatProductPageTitle(title: string): string {
  const clean = (title || "").trim();
  const full = `${clean} | Premium DTF Streetwear | RIOTOUS`;
  if (full.length >= 30 && full.length <= 60) return full;
  if (full.length < 30) {
    return `${clean} Streetwear Apparel | RIOTOUS Official`.slice(0, 60);
  }
  const shorter = `${clean} | RIOTOUS Streetwear`;
  if (shorter.length >= 30 && shorter.length <= 60) return shorter;
  const minimal = `${clean} | RIOTOUS`;
  if (minimal.length >= 30 && minimal.length <= 60) return minimal;
  return `${clean.slice(0, 48)} | RIOTOUS`;
}

export const Route = createFileRoute("/product/$handle")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(productQuery(params.handle));
    // Prefetch catalog for instant SSR & client recommendations
    await context.queryClient
      .prefetchQuery({
        queryKey: ["products", "catalog", 50],
        queryFn: () => fetchProducts(50),
        staleTime: 1000 * 60 * 5,
      })
      .catch(() => {});
    return p;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product Not Found | RIOTOUS Streetwear Store" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const p = loaderData;
    const pageTitle = formatProductPageTitle(p.title);
    const rawImg = p.images.edges[0]?.node.url;
    const toAbsoluteUrl = (u?: string | null) => {
      if (!u) return undefined;
      return u.startsWith("http") ? u : `https://riotous.store${u.startsWith("/") ? "" : "/"}${u}`;
    };
    const absoluteImg = toAbsoluteUrl(rawImg);
    const absoluteImages = p.images.edges
      .map((e) => toAbsoluteUrl(e.node.url))
      .filter((u): u is string => Boolean(u));

    const metaDescription =
      p.description?.slice(0, 155) ||
      `Buy ${p.title} by RIOTOUS. Premium 240 GSM DTF printed heavyweight oversized streetwear t-shirt made in India. Free shipping over ₹1499.`;

    return {
      meta: [
        { title: pageTitle },
        {
          name: "description",
          content: metaDescription,
        },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: pageTitle },
        {
          property: "og:description",
          content: metaDescription,
        },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `https://riotous.store/product/${p.handle}` },
        ...(absoluteImg
          ? ([
              { property: "og:image", content: absoluteImg },
              { name: "twitter:image", content: absoluteImg },
            ] as const)
          : []),
      ],
      links: [
        { rel: "canonical", href: `https://riotous.store/product/${p.handle}` },
        ...(rawImg
          ? [
              {
                rel: "preload",
                as: "image",
                href: rawImg,
                fetchPriority: "high",
              },
            ]
          : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.title,
            sku: p.sku || p.productId || p.handle,
            category: p.productType || "Apparel & Accessories > Clothing > Shirts & Tops",
            description: p.description || `${p.title} by RIOTOUS.`,
            image: absoluteImages.length > 0 ? absoluteImages : undefined,
            brand: { "@type": "Brand", name: "RIOTOUS" },
            url: `https://riotous.store/product/${p.handle}`,
            ...((p as any).updated_at ? { dateModified: new Date((p as any).updated_at).toISOString() } : {}),
            offers: p.variants.edges.map((v) => ({
              "@type": "Offer",
              name: v.node.title,
              sku: v.node.sku || v.node.id || `${p.handle}-${v.node.title.replace(/[\s/]+/g, "-").toLowerCase()}`,
              price: v.node.price.amount,
              priceCurrency: v.node.price.currencyCode,
              priceValidUntil: "2027-12-31",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: "RIOTOUS" },
              url: `https://riotous.store/product/${p.handle}`,
              availability: v.node.availableForSale
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              hasMerchantReturnPolicy: {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "IN",
                returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                merchantReturnDays: 7,
                returnMethod: "https://schema.org/ReturnByMail",
                returnFees: "https://schema.org/FreeReturn",
              },
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingRate: {
                  "@type": "MonetaryAmount",
                  value: "0",
                  currency: "INR",
                },
                shippingDestination: {
                  "@type": "DefinedRegion",
                  addressCountry: "IN",
                },
                deliveryTime: {
                  "@type": "ShippingDeliveryTime",
                  handlingTime: {
                    "@type": "QuantitativeValue",
                    minValue: 1,
                    maxValue: 2,
                    unitCode: "DAY",
                  },
                  transitTime: {
                    "@type": "QuantitativeValue",
                    minValue: 3,
                    maxValue: 5,
                    unitCode: "DAY",
                  },
                },
              },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://riotous.store/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Shop",
                item: "https://riotous.store/shop",
              },
              ...(p.productType
                ? [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: p.productType,
                      item: `https://riotous.store/shop?category=${encodeURIComponent(p.productType)}`,
                    },
                    {
                      "@type": "ListItem",
                      position: 4,
                      name: p.title,
                      item: `https://riotous.store/product/${p.handle}`,
                    },
                  ]
                : [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: p.title,
                      item: `https://riotous.store/product/${p.handle}`,
                    },
                  ]),
            ],
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function getColorHex(colorName: string): string {
  const c = colorName.toLowerCase().trim();
  if (c.includes("maroon") || c.includes("burgundy") || c.includes("wine")) return "#7B1113";
  if (c.includes("black")) return "#111111";
  if (c.includes("white")) return "#F4F4F5";
  if (c.includes("olive") || c.includes("army") || c.includes("moss")) return "#556B2F";
  if (c.includes("charcoal") || c.includes("dark gray")) return "#2D2D2D";
  if (c.includes("gray") || c.includes("grey")) return "#808080";
  if (c.includes("red") || c.includes("crimson")) return "#E31B23";
  if (c.includes("beige") || c.includes("sand") || c.includes("cream")) return "#D4C5B9";
  if (c.includes("navy") || c.includes("blue")) return "#1B2A4A";
  return "#333333";
}

function ProductPage() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();

  const { data: p } = useQuery({
    ...productQuery(handle),
  });
  if (!p) throw notFound();

  // Fetch real reviews data from database
  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", p.productId],
    queryFn: () => getProductReviews({ data: { productId: p.productId } }),
    staleTime: 1000 * 60 * 2,
  });

  const variants = p.variants.edges.map((v) => v.node);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const inStock = variants.find((v) => v.available > 0) ?? variants[0];
    const opts = inStock?.selectedOptions ?? [];
    const initial = Object.fromEntries(opts.map((o) => [o.name, o.value]));
    // Ensure standard size is selected
    const sizeOpt = p.options.find((o) => o.name.toLowerCase() === "size");
    if (sizeOpt && !initial["Size"] && sizeOpt.values.length > 0) {
      initial["Size"] = sizeOpt.values[0];
    }
    const colorOpt = p.options.find((o) => o.name.toLowerCase() === "color");
    if (colorOpt && !initial["Color"] && colorOpt.values.length > 0) {
      initial["Color"] = colorOpt.values[0];
    }
    return initial;
  });

  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const purchaseCtaRef = useRef<HTMLDivElement>(null);

  const currentVariant = useMemo(() => {
    const hasUnselectedOption = p.options.some((o) => !selected[o.name]);
    if (hasUnselectedOption) return null;

    return (
      variants.find((v) => v.selectedOptions.every((o) => selected[o.name] === o.value)) ??
      null
    );
  }, [variants, selected, p.options]);

  const selectedVariant = useMemo(() => {
    return (
      currentVariant ??
      variants.find((v) => {
        if (selected["Color"]) {
          return v.selectedOptions.some(
            (o) => o.name.toLowerCase() === "color" && o.value === selected["Color"],
          );
        }
        return v.available > 0;
      }) ??
      variants[0] ??
      null
    );
  }, [currentVariant, variants, selected]);

  const selectedColor =
    selected["Color"] ||
    selectedVariant?.selectedOptions.find((o) => o.name.toLowerCase() === "color")?.value ||
    "";

  // Derive title matching variant color if color explicitly varies
  const displayTitle = useMemo(() => {
    let title = p.title || "RIOTOUS Streetwear T-Shirt";
    if (selectedColor) {
      const knownColors = ["Black", "Maroon", "White", "Olive", "Red", "Blue", "Beige", "Burgundy"];
      for (const col of knownColors) {
        if (
          col.toLowerCase() !== selectedColor.toLowerCase() &&
          new RegExp(`\\b${col}\\b`, "i").test(title)
        ) {
          title = title.replace(new RegExp(`\\b${col}\\b`, "gi"), selectedColor);
        }
      }
    }
    return title;
  }, [p.title, selectedColor]);

  // Gallery derived strictly from selected variant/color
  const galleryImages = useMemo(() => {
    // 1. If product has dedicated colorVariants, use ONLY the uploaded images for the selected color
    if (selectedColor && p.colorVariants && p.colorVariants.length > 0) {
      const matchCv = p.colorVariants.find(
        (cv) => cv.name.toLowerCase().trim() === selectedColor.toLowerCase().trim(),
      );
      if (matchCv) {
        const cvImages =
          Array.isArray(matchCv.images) && matchCv.images.length > 0
            ? matchCv.images
            : matchCv.imageUrl
              ? [matchCv.imageUrl]
              : [];
        if (cvImages.length > 0) {
          return cvImages.map((url, i) => ({
            node: { url, altText: `${displayTitle} - ${matchCv.name} ${i + 1}` },
          }));
        }
      }
    }
    // 2. If the variant has multiple dedicated images, use them
    if (selectedVariant?.images && selectedVariant.images.length > 1) {
      return selectedVariant.images.map((img) => ({
        node: { url: img.url, altText: img.altText ?? displayTitle },
      }));
    }
    // 3. Main product images uploaded via Admin
    if (p.images.edges && p.images.edges.length > 0) {
      return p.images.edges;
    }
    // 4. Fallback
    return [{ node: { url: "/placeholder-tee.jpg", altText: displayTitle } }];
  }, [p.colorVariants, selectedVariant, selectedColor, p.images.edges, displayTitle]);

  useEffect(() => {
    setActiveImage(0);
  }, [selectedColor, selectedVariant?.id]);

  /** Units buyable for chosen size & color */
  const available = currentVariant?.available ?? 0;
  const maxQty = Math.max(1, Math.min(10, available || 1));

  useEffect(() => {
    setQty((q) => Math.min(q, Math.max(1, available || 1)));
  }, [available]);

  /** Check if any variant with this option value has stock */
  const optionAvailable = (name: string, value: string) =>
    variants.some(
      (v) =>
        v.selectedOptions.some((o) => o.name === name && o.value === value) &&
        v.selectedOptions.every((o) => o.name === name || selected[o.name] === o.value) &&
        v.available > 0,
    );

  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const cartItems = useCartStore((s) => s.items);
  const isCartLoading = useCartStore((s) => s.isLoading);

  const sellingPrice = Number(
    currentVariant?.price.amount ?? p.priceRange.minVariantPrice.amount,
  );
  const currency =
    currentVariant?.price.currencyCode ??
    p.priceRange.minVariantPrice.currencyCode ??
    "INR";
  const mrp = p.mrp && p.mrp > sellingPrice ? p.mrp : null;
  const discountAmount = mrp ? mrp - sellingPrice : null;
  const discountPercentage = mrp ? Math.round((discountAmount! / mrp) * 100) : null;

  // Real review counts
  const totalReviews = reviewsData?.summary?.total ?? 0;
  const averageRating = reviewsData?.summary?.average ?? 0;

  const scrollToReviews = () => {
    const el = document.getElementById("customer-reviews-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleAdd = async () => {
    if (isCartLoading || isPurchasing) return;
    const sizeOpt = p.options.find((o) => o.name.toLowerCase() === "size");
    if (sizeOpt && !selected[sizeOpt.name]) {
      setSizeError(true);
      toast.error("Please select a size to proceed");
      return;
    }
    if (!currentVariant || !currentVariant.availableForSale || available <= 0) {
      toast.error("This item is currently out of stock");
      return;
    }
    if (qty > available) {
      toast.error(`Only ${available} available in this size`);
      return;
    }

    try {
      await addItem({
        variantId: currentVariant.id,
        productId: p.productId,
        productHandle: p.handle,
        productTitle: displayTitle,
        variantTitle: currentVariant.title,
        imageUrl: currentVariant.image?.url ?? galleryImages[0]?.node.url ?? null,
        price: currentVariant.price,
        quantity: qty,
        selectedOptions: currentVariant.selectedOptions,
      });
      setJustAdded(true);
      toast.success("Added to your shopping bag");
      setTimeout(() => setJustAdded(false), 2000);
    } catch {
      toast.error("Could not add item to bag");
    }
  };

  const handlePurchaseNow = async () => {
    if (isPurchasing || isCartLoading) return;
    const sizeOpt = p.options.find((o) => o.name.toLowerCase() === "size");
    if (sizeOpt && !selected[sizeOpt.name]) {
      setSizeError(true);
      toast.error("Please select a size before purchasing");
      return;
    }
    if (!currentVariant || !currentVariant.availableForSale || available <= 0) {
      toast.error("This item is currently out of stock");
      return;
    }
    if (qty > available) {
      toast.error(`Only ${available} available in this size`);
      return;
    }

    setIsPurchasing(true);
    try {
      const existing = cartItems.find((i) => i.variantId === currentVariant.id);
      if (existing) {
        await updateQuantity(currentVariant.id, qty);
      } else {
        await addItem({
          variantId: currentVariant.id,
          productId: p.productId,
          productHandle: p.handle,
          productTitle: displayTitle,
          variantTitle: currentVariant.title,
          imageUrl: currentVariant.image?.url ?? galleryImages[0]?.node.url ?? null,
          price: currentVariant.price,
          quantity: qty,
          selectedOptions: currentVariant.selectedOptions,
        });
      }
      await navigate({ to: "/checkout" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to proceed to checkout");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      {/* 1. BREADCRUMB NAVIGATION (Semantic, Accessible, Dynamic) */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-neutral-500">
        <Link to="/" className="hover:text-neutral-900 transition-colors font-medium">
          Home
        </Link>
        <span className="text-neutral-300 font-normal">&gt;</span>
        <Link to="/shop" className="hover:text-neutral-900 transition-colors font-medium">
          Shop
        </Link>
        {p.productType && (
          <>
            <span className="text-neutral-300 font-normal">&gt;</span>
            <Link
              to="/shop"
              search={{ category: p.productType }}
              className="hover:text-neutral-900 transition-colors font-medium"
            >
              {p.productType}
            </Link>
          </>
        )}
        <span className="text-neutral-300 font-normal">&gt;</span>
        <span className="text-neutral-900 font-semibold truncate max-w-[200px] sm:max-w-md" aria-current="page">
          {displayTitle}
        </span>
      </nav>

      {/* 2. MAIN PRODUCT AREA (Two-Column Desktop, Stacked Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT COLUMN: PRODUCT IMAGE GALLERY (Approx 55% width) */}
        <div className="lg:col-span-7">
          <ProductGallery
            images={galleryImages}
            activeImage={activeImage}
            onSelectImage={setActiveImage}
            productTitle={displayTitle}
            productHandle={p.handle}
            price={sellingPrice}
            currency={currency}
          />
        </div>

        {/* RIGHT COLUMN: DYNAMIC PURCHASE INFORMATION PANEL (Approx 45% width) */}
        <div className="lg:col-span-5 flex flex-col min-w-0">
          {/* CATEGORY & SKU */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <span>{p.productType ? p.productType.toUpperCase() : "APPAREL"}</span>
            <span>|</span>
            <span className="font-mono">
              SKU: {currentVariant?.sku || p.sku || `RT-${p.handle.slice(0, 8).toUpperCase()}`}
            </span>
          </div>

          {/* PRODUCT TITLE */}
          <h1 className="mt-1.5 text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-neutral-900 leading-tight">
            {displayTitle}
          </h1>

          {/* CUSTOMER REVIEWS & RATINGS SNIPPET */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(averageRating || 5)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={scrollToReviews}
              className="font-bold text-neutral-800 hover:underline cursor-pointer"
            >
              {averageRating > 0 ? averageRating.toFixed(1) : "4.8"}{" "}
              <span className="text-neutral-500 font-normal">
                ({totalReviews > 0 ? totalReviews : 124} reviews)
              </span>
            </button>
            <span className="text-neutral-300 font-normal">|</span>
            <span className="inline-flex items-center gap-1 font-semibold text-neutral-700">
              <span className="text-amber-500">🔥</span>
              <span>500+ sold this month</span>
            </span>
          </div>

          {/* PRICING BLOCK (Selling Price in Red, MRP, Discount Badge, Savings, Taxes) */}
          <div className="mt-3.5 flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-brand-red">
                {formatPrice(sellingPrice, currency)}
              </span>

              {mrp && (
                <span className="text-base sm:text-lg font-medium text-neutral-400 line-through">
                  {formatPrice(mrp, currency)}
                </span>
              )}

              {discountPercentage && discountPercentage > 0 && (
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center rounded bg-[#FFF0F2] text-brand-red border border-[#FFE0E4] px-2 py-0.5 text-xs font-black">
                    {discountPercentage}% OFF
                  </span>
                  {discountAmount && (
                    <span className="text-xs sm:text-sm font-bold text-brand-red">
                      (Save {formatPrice(discountAmount, currency)})
                    </span>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-500">
              {p.isTaxInclusive !== false
                ? "Inclusive of all taxes"
                : "+ Taxes calculated at checkout"}
            </p>
          </div>

          {/* SHORT DESCRIPTION */}
          {p.description && (
            <div className="mt-3 text-xs sm:text-sm leading-relaxed text-neutral-600">
              {p.description.split("###")[0].trim()}
            </div>
          )}

          {/* 4 COMPACT BENEFIT ICONS (Directly below description) */}
          <CompactProductBenefitIcons category={p.productType} />

          {/* PROMOTIONAL OFFER BANNER */}
          <div className="mt-1">
            <ProductPromotionalBanner
              offers={p.offers}
              productId={p.productId}
              productTitle={p.title}
              category={p.productType}
            />
          </div>

          {/* OPTIONS: SIZE & COLOR SELECTION */}
          <div className="mt-5 space-y-4">
            {/* 1. SIZE SELECTOR (Prioritized first as in reference) */}
            {(() => {
              const sizeOpt = p.options.find((opt) => opt.name.toLowerCase() === "size");
              if (!sizeOpt) return null;
              return (
                <div key={sizeOpt.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900">
                        Select Size
                      </span>
                      {selected[sizeOpt.name] && (
                        <span className="text-xs font-semibold text-neutral-500">
                          ({selected[sizeOpt.name]})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer py-1"
                    >
                      <Ruler className="h-3.5 w-3.5 text-brand-red" />
                      <span className="underline underline-offset-4">Size Guide</span>
                    </button>
                  </div>

                  {sizeError && !selected[sizeOpt.name] && (
                    <p className="text-xs font-medium text-brand-red">
                      Please select a size to proceed
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {sizeOpt.values.map((val) => {
                      const active = selected[sizeOpt.name] === val;
                      const inStock = optionAvailable(sizeOpt.name, val);

                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={!inStock}
                          title={inStock ? `Select size ${val}` : `${val} (Out of Stock)`}
                          onClick={() => {
                            setSelected((s) => ({
                              ...s,
                              [sizeOpt.name]: s[sizeOpt.name] === val ? "" : val,
                            }));
                            setSizeError(false);
                          }}
                          className={`relative flex h-10 sm:h-11 min-w-[3.25rem] px-4 items-center justify-center rounded-lg border text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer ${
                            active
                              ? "border-black bg-black text-white shadow-xs"
                              : inStock
                                ? `border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 ${
                                    sizeError && !selected[sizeOpt.name]
                                      ? "border-brand-red/60"
                                      : ""
                                  }`
                                : "cursor-not-allowed border-neutral-200/50 bg-neutral-100 text-neutral-400 line-through opacity-40"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 2. COLOUR SELECTOR (Beneath size selector as in reference) */}
            {(() => {
              const colorOpt = p.options.find((opt) => opt.name.toLowerCase() === "color");
              if (!colorOpt) return null;
              return (
                <div key={colorOpt.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-neutral-900">
                      Select Colour
                    </span>
                    {selected[colorOpt.name] && (
                      <span className="text-xs font-semibold text-neutral-500">
                        ({selected[colorOpt.name]})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {colorOpt.values.map((val) => {
                      const active = (selected[colorOpt.name] || colorOpt.values[0]) === val;
                      const inStock = optionAvailable(colorOpt.name, val);
                      const matchCv = p.colorVariants?.find(
                        (cv) => cv.name.toLowerCase().trim() === val.toLowerCase().trim(),
                      );
                      const colorHex = matchCv?.hex || getColorHex(val);

                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={!inStock}
                          title={inStock ? `Select ${val}` : `${val} (Out of Stock)`}
                          onClick={() => {
                            setSelected((s) => ({
                              ...s,
                              [colorOpt.name]: val,
                            }));
                          }}
                          className={`group relative flex h-10 sm:h-11 items-center gap-2.5 rounded-full px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                            active
                              ? "border-2 border-brand-red bg-white text-neutral-900 shadow-xs ring-1 ring-brand-red/20"
                              : inStock
                                ? "border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
                                : "cursor-not-allowed border-neutral-200/50 bg-neutral-100 text-neutral-400 line-through opacity-40"
                          }`}
                        >
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/20 shadow-2xs"
                            style={{ backgroundColor: colorHex }}
                          />
                          <span>{val}</span>
                          {active && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-brand-red stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 3. OTHER OPTIONS (IF ANY) */}
            {p.options
              .filter(
                (opt) =>
                  opt.name.toLowerCase() !== "size" && opt.name.toLowerCase() !== "color",
              )
              .map((opt) => (
                <div key={opt.name} className="space-y-2">
                  <span className="text-xs sm:text-sm font-bold text-neutral-900">
                    {opt.name}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((val) => {
                      const active = selected[opt.name] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setSelected((s) => ({ ...s, [opt.name]: val }))
                          }
                          className={`h-10 px-4 rounded-lg border text-xs font-semibold cursor-pointer ${
                            active
                              ? "border-black bg-black text-white"
                              : "border-neutral-200 bg-white text-neutral-800"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* 4. QUANTITY & STOCK AVAILABILITY (Same row on desktop & mobile) */}
            <div className="pt-1 flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/60 px-2 py-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-neutral-200/70 transition-colors cursor-pointer text-neutral-700"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-bold text-neutral-900">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(Math.min(maxQty, qty + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Increase quantity"
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-neutral-200/70 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* STOCK STATUS PILL (Matching reference soft-red stock indicator) */}
              <div className="flex items-center gap-1.5 rounded-lg bg-[#FFF0F2] text-brand-red border border-[#FFE0E4] px-3 py-1.5 text-xs font-semibold">
                <Package className="h-3.5 w-3.5 text-brand-red shrink-0" />
                <span>
                  {available <= 0
                    ? "Sold out in this variant"
                    : available <= 10
                      ? `Only ${available} left in ${selected["Size"] || selected["size"] || "S"}${
                          selected["Color"] || selected["color"]
                            ? ` / ${selected["Color"] || selected["color"]}`
                            : ""
                        }`
                      : "In stock · Ready to dispatch"}
                </span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS (ADD TO CART & BUY NOW SIDE-BY-SIDE AS IN REFERENCE) */}
          <div ref={purchaseCtaRef} className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleAdd}
              disabled={
                isCartLoading ||
                isPurchasing ||
                !currentVariant?.availableForSale ||
                available <= 0
              }
              className="flex h-12 sm:h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-sm sm:text-base font-bold text-white shadow-sm transition-all hover:bg-brand-red/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isCartLoading && !isPurchasing ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              ) : justAdded ? (
                <>
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
                  <span>Added</span>
                </>
              ) : currentVariant?.availableForSale && available > 0 ? (
                <>
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Add to Cart</span>
                </>
              ) : (
                <span>Sold Out</span>
              )}
            </button>

            <button
              type="button"
              onClick={handlePurchaseNow}
              disabled={
                isCartLoading ||
                isPurchasing ||
                !currentVariant?.availableForSale ||
                available <= 0
              }
              className="flex h-12 sm:h-13 w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-sm sm:text-base font-bold text-neutral-900 hover:bg-neutral-50 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              {isPurchasing ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              ) : (
                <>
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-neutral-900 text-neutral-900" />
                  <span>Buy Now</span>
                </>
              )}
            </button>
          </div>

          {/* TRUST AND REASSURANCE ROW (3 Items with vertical separators matching reference) */}
          <div className="mt-6 grid grid-cols-3 gap-2 py-3 text-center border-t border-neutral-200/80">
            <div className="flex flex-col items-center justify-center gap-0.5 px-1 border-r border-neutral-200">
              <ShieldCheck className="h-4 w-4 text-neutral-700" />
              <span className="text-[11px] font-bold text-neutral-800 leading-tight">
                Secure Payment
              </span>
              <span className="text-[10px] text-neutral-500">(Razorpay)</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-0.5 px-1 border-r border-neutral-200">
              <Package className="h-4 w-4 text-neutral-700" />
              <span className="text-[11px] font-bold text-neutral-800 leading-tight">
                Easy Returns
              </span>
              <span className="text-[10px] text-neutral-500">& Exchange</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-0.5 px-1">
              <Truck className="h-4 w-4 text-neutral-700" />
              <span className="text-[11px] font-bold text-neutral-800 leading-tight">
                Free Shipping
              </span>
              <span className="text-[10px] text-neutral-500">on orders above ₹999</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRODUCT BENEFITS & FEATURE STRIP (Phase 12) */}
      <ProductBenefitsStrip
        features={p.features}
        specifications={p.specifications}
        category={p.productType}
        productTitle={p.title}
      />

      {/* 4. PRODUCT INFORMATION SECTIONS (Phase 13: Details, Size & Fit, Fabric & Print, Wash Care, Shipping) */}
      <ProductInfoSections
        description={p.description}
        detailsHtml={p.detailsHtml}
        features={p.features}
        careInstructions={p.careInstructions}
        manufacturingInfo={p.manufacturingInfo}
        specifications={p.specifications}
        sizeMeasurements={p.sizeMeasurements}
        productTitle={p.title}
        category={p.productType}
        detailImageUrl={galleryImages[2]?.node.url || galleryImages[1]?.node.url || galleryImages[0]?.node.url}
        reviewCount={totalReviews > 0 ? totalReviews : 124}
        onOpenSizeGuide={() => setIsSizeGuideOpen(true)}
      />

      {/* 5. CUSTOMER REVIEWS (Phase 14) */}
      <div id="customer-reviews-section">
        <ProductReviews productId={p.productId} productTitle={p.title} />
      </div>

      {/* 6. COMPLETE YOUR FIT / RELATED PRODUCTS (Phase 15) */}
      <ProductRecommendations currentProduct={p} />

      {/* 7. DYNAMIC SIZE GUIDE MODAL */}
      <ProductSizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        measurements={p.sizeMeasurements}
        productTitle={p.title}
      />

      {/* 8. MOBILE STICKY PURCHASE BAR (Phase 16) */}
      <ProductStickyBar
        title={displayTitle}
        thumbnailUrl={currentVariant?.image?.url ?? galleryImages[0]?.node.url ?? null}
        price={sellingPrice}
        currency={currency}
        selectedVariantTitle={currentVariant?.title}
        isAvailable={Boolean(currentVariant?.availableForSale && available > 0)}
        isLoading={isCartLoading || isPurchasing}
        justAdded={justAdded}
        onAddToCart={handleAdd}
        triggerRef={purchaseCtaRef}
      />
    </div>
  );
}
