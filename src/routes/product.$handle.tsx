import { createFileRoute, notFound, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Minus,
  Plus,
  ArrowUpRight,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Ruler,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchProductByHandle } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
import { BrandName } from "@/components/brand-name";
import { ProductReviews } from "@/components/reviews/product-reviews";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";

const productQuery = (handle: string) => ({
  queryKey: ["product", handle],
  queryFn: async () => {
    const p = await fetchProductByHandle(handle);
    if (!p) throw notFound();
    return p;
  },
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
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
  loader: ({ context, params }) => context.queryClient.ensureQueryData(productQuery(params.handle)),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product Not Found | RIOTOUS Streetwear Store" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData;
    const pageTitle = formatProductPageTitle(p.title);
    const img = p.images.edges[0]?.node.url;
    return {
      meta: [
        { title: pageTitle },
        {
          name: "description",
          content: p.description?.slice(0, 155) || `${p.title} by RIOTOUS.`,
        },
        { property: "og:title", content: pageTitle },
        {
          property: "og:description",
          content: p.description?.slice(0, 155) || `${p.title} by RIOTOUS.`,
        },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `/product/${p.handle}` },
        ...(img
          ? ([
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ] as const)
          : []),
      ],
      links: [{ rel: "canonical", href: `/product/${p.handle}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.title,
            sku: p.productId || p.handle,
            category: p.productType || "Apparel & Accessories > Clothing > Shirts & Tops",
            description: p.description || `${p.title} by RIOTOUS.`,
            image: p.images.edges.map((e) => e.node.url),
            brand: { "@type": "Brand", name: "RIOTOUS" },
            url: `https://riotous.store/product/${p.handle}`,
            offers: p.variants.edges.map((v) => ({
              "@type": "Offer",
              name: v.node.title,
              sku: v.node.id || `${p.handle}-${v.node.title.replace(/[\s/]+/g, "-").toLowerCase()}`,
              price: v.node.price.amount,
              priceCurrency: v.node.price.currencyCode,
              priceValidUntil: "2027-12-31",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: "RIOTOUS" },
              url: `https://riotous.store/product/${p.handle}`,
              availability: v.node.availableForSale
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            })),
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { handle } = Route.useParams();
  const { data: p } = useQuery({
    ...productQuery(handle),
  });
  if (!p) throw notFound();

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
    return initial;
  });
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const currentVariant = useMemo(() => {
    const hasUnselectedOption = p.options.some((o) => !selected[o.name]);
    if (hasUnselectedOption) return null;

    return (
      variants.find((v) => v.selectedOptions.every((o) => selected[o.name] === o.value)) ??
      null
    );
  }, [variants, selected, p.options]);

  /** Units still buyable for the picked size/colour. */
  const available = currentVariant?.available ?? 0;
  const maxQty = Math.max(1, Math.min(10, available || 1));

  useEffect(() => {
    setQty((q) => Math.min(q, Math.max(1, available || 1)));
  }, [available]);

  /** Is any variant with this option value still in stock? */
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
  const isLoading = useCartStore((s) => s.isLoading);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { config } = usePublishedWebsiteConfig();
  const prodTxt = config?.productContent;
  const addToCartLabel = prodTxt?.addToCartLabel || "Add to Bag";
  const outOfStockLabel = prodTxt?.outOfStockLabel || "Sold out";
  const sizeGuideLabel = prodTxt?.sizeGuideLabel || "Size Guide";
  const sizeGuideTitle = prodTxt?.sizeGuideLabel || "Oversized Fit Size Guide";
  const selectSizeLabel = prodTxt?.selectSizeLabel || "Select Size";
  const quantityLabel = prodTxt?.quantityLabel || "Quantity";
  const detailsLabel = prodTxt?.descriptionLabel || "Details";

  const handleAdd = async () => {
    if (isLoading || isPurchasing) return;
    const sizeOpt = p.options.find((o) => o.name.toLowerCase() === "size");
    if (sizeOpt && !selected[sizeOpt.name]) {
      setSizeError(true);
      toast.error("Please select a size");
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
    await addItem({
      variantId: currentVariant.id,
      productId: p.productId,
      productHandle: p.handle,
      productTitle: p.title,
      variantTitle: currentVariant.title,
      imageUrl: currentVariant.image?.url ?? p.images.edges[0]?.node.url ?? null,
      price: currentVariant.price,
      quantity: qty,
      selectedOptions: currentVariant.selectedOptions,
    });
    setJustAdded(true);
    toast.success("Added to bag");
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handlePurchaseNow = async () => {
    if (isPurchasing || isLoading) return;

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
          productTitle: p.title,
          variantTitle: currentVariant.title,
          imageUrl: currentVariant.image?.url ?? p.images.edges[0]?.node.url ?? null,
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

  const images = p.images.edges;

  const router = useRouter();
  const navigate = useNavigate();

  // Swipe handlers for mobile touch interaction
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const handlePrevImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (images.length <= 1) return;
    setActiveImage((curr) => (curr > 0 ? curr - 1 : images.length - 1));
  }, [images.length]);

  const handleNextImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (images.length <= 1) return;
    setActiveImage((curr) => (curr < images.length - 1 ? curr + 1 : 0));
  }, [images.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > 45 && images.length > 1) {
      // Swiped left -> next
      handleNextImage();
    } else if (distance < -45 && images.length > 1) {
      // Swiped right -> prev
      handlePrevImage();
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-10 py-6 sm:py-10 md:py-16">
      <div className="grid gap-6 md:grid-cols-2 md:gap-16 md:items-start">
        {/* Gallery */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <button
            onClick={() => router.history.back()}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center self-start rounded-full hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <div
            className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-secondary select-none shadow-sm"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {images[activeImage] && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group/img block h-full w-full cursor-zoom-in focus:outline-none"
                aria-label="Open full-size image"
              >
                <img
                  key={images[activeImage].node.url}
                  src={images[activeImage].node.url}
                  alt={images[activeImage].node.altText ?? p.title}
                  width={600}
                  height={750}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-contain transition-transform duration-500 group-hover/img:scale-[1.02]"
                />
              </button>
            )}

            {/* Moving Prev/Next Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous product image"
                  className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-md shadow-md border border-border/40 transition-all duration-200 hover:bg-background hover:scale-110 active:scale-95 sm:opacity-90 sm:hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next product image"
                  className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-md shadow-md border border-border/40 transition-all duration-200 hover:bg-background hover:scale-110 active:scale-95 sm:opacity-90 sm:hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
                </button>

                {/* Floating Pagination Dots */}
                <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-background/75 px-2.5 sm:px-3 py-1 sm:py-1.5 backdrop-blur-md shadow-xs border border-border/30">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage(i);
                      }}
                      aria-label={`Go to image ${i + 1} of ${images.length}`}
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        activeImage === i
                          ? "w-5 sm:w-6 bg-brand-red"
                          : "w-1.5 sm:w-2 bg-foreground/30 hover:bg-foreground/60"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-none">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  className={`h-14 w-14 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-lg sm:rounded-xl border-2 transition-colors ${
                    activeImage === i ? "border-foreground" : "border-transparent"
                  }`}
                >
                  <img
                    src={img.node.url}
                    alt=""
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="md:sticky md:top-24 md:self-start">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            {p.productType || <BrandName />}
          </p>
          <h1 className="mt-1.5 sm:mt-2 text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight break-words">{p.title}</h1>
          <p className="mt-2.5 sm:mt-4 text-xl sm:text-2xl font-semibold">
            {formatPrice(
              currentVariant?.price.amount ?? p.priceRange.minVariantPrice.amount,
              currentVariant?.price.currencyCode ?? p.priceRange.minVariantPrice.currencyCode,
            )}
          </p>

          {/* Options & Size Selection */}
          <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
            {p.options.map((opt) => {
              const isSize = opt.name.toLowerCase() === "size";

              return (
                <div key={opt.name} className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold tracking-wide">
                        {isSize ? selectSizeLabel : opt.name}:
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSize && sizeError && !selected[opt.name]
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {selected[opt.name] || (isSize ? "None selected" : "")}
                      </span>
                    </div>

                    {isSize && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Ruler className="h-3.5 w-3.5" /> {sizeGuideLabel}
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-lg font-bold">
                              {sizeGuideTitle}
                            </DialogTitle>
                          </DialogHeader>
                          <p className="text-xs text-muted-foreground">
                            All measurements are in inches. Designed for a boxy streetwear drape
                            with dropped shoulders.
                          </p>
                          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-left text-xs min-w-[280px]">
                              <thead className="bg-secondary text-foreground font-semibold">
                                <tr>
                                  <th className="p-2.5">Size</th>
                                  <th className="p-2.5">Chest (in)</th>
                                  <th className="p-2.5">Length (in)</th>
                                  <th className="p-2.5">Shoulder (in)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                <tr>
                                  <td className="p-2.5 font-bold">S</td>
                                  <td className="p-2.5">42"</td>
                                  <td className="p-2.5">28"</td>
                                  <td className="p-2.5">20.5"</td>
                                </tr>
                                <tr>
                                  <td className="p-2.5 font-bold">M</td>
                                  <td className="p-2.5">44"</td>
                                  <td className="p-2.5">29"</td>
                                  <td className="p-2.5">21.5"</td>
                                </tr>
                                <tr>
                                  <td className="p-2.5 font-bold">L</td>
                                  <td className="p-2.5">46"</td>
                                  <td className="p-2.5">30"</td>
                                  <td className="p-2.5">22.5"</td>
                                </tr>
                                <tr>
                                  <td className="p-2.5 font-bold">XL</td>
                                  <td className="p-2.5">48"</td>
                                  <td className="p-2.5">31"</td>
                                  <td className="p-2.5">23.5"</td>
                                </tr>
                                <tr>
                                  <td className="p-2.5 font-bold">XXL</td>
                                  <td className="p-2.5">50"</td>
                                  <td className="p-2.5">32"</td>
                                  <td className="p-2.5">24.5"</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <p className="mt-3 text-[11px] text-muted-foreground">
                            Tip: For a classic regular fit, size down one size. For the intended
                            boxy oversized streetwear look, choose your regular size.
                          </p>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {isSize && sizeError && !selected[opt.name] && (
                    <p className="text-xs font-medium text-destructive">
                      Please select a size to proceed
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2.5">
                    {opt.values.map((v) => {
                      const active = selected[opt.name] === v;
                      const inStock = optionAvailable(opt.name, v);

                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={!inStock}
                          title={inStock ? `Select size ${v}` : `${v} (Out of Stock)`}
                          onClick={() => {
                            setSelected((s) => ({
                              ...s,
                              [opt.name]: s[opt.name] === v ? "" : v,
                            }));
                            if (isSize) setSizeError(false);
                          }}
                          className={`relative flex h-11 min-w-[3.25rem] px-4 items-center justify-center rounded-xl border text-sm font-bold tracking-wider transition-all ${
                            active
                              ? "border-foreground bg-foreground text-background shadow-sm ring-2 ring-foreground/20"
                              : inStock
                                ? `border-border bg-card text-foreground hover:border-foreground hover:bg-secondary/60 ${
                                    isSize && sizeError && !selected[opt.name]
                                      ? "border-destructive/60"
                                      : ""
                                  }`
                                : "cursor-not-allowed border-border/40 bg-secondary/30 text-muted-foreground line-through opacity-40"
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Quantity */}
            <div>
              <span className="mb-3 block text-sm font-medium">{quantityLabel}</span>
              <div className="inline-flex items-center gap-4 rounded-full border border-border px-2 py-1">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-4 text-center text-sm">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(maxQty, qty + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Increase quantity"
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {available <= 0
                  ? "Out of stock in this size/colour"
                  : available <= 5
                    ? `Only ${available} left in ${currentVariant?.title ?? "this option"}`
                    : `In stock · ${available} available`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleAdd}
              disabled={
                isLoading ||
                isPurchasing ||
                !currentVariant?.availableForSale ||
                available <= 0
              }
              className="flex h-12 sm:h-14 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isLoading && !isPurchasing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : justAdded ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : currentVariant?.availableForSale && available > 0 ? (
                addToCartLabel
              ) : (
                outOfStockLabel
              )}
            </button>
            <button
              type="button"
              onClick={handlePurchaseNow}
              disabled={
                isLoading ||
                isPurchasing ||
                !currentVariant?.availableForSale ||
                available <= 0
              }
              className="flex h-12 sm:h-14 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isPurchasing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Purchase Now"
              )}
            </button>
          </div>

          {/* Description */}
          {p.description && (
            <div className="mt-10 border-t border-border pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest">{detailsLabel}</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Free shipping</p>
              <p>Orders over ₹1499</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">7-day returns</p>
              <p>No questions asked</p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold text-foreground">Estimated delivery</p>
              <p>5-7 business days</p>
            </div>
          </div>
        </div>
      </div>

      <ProductReviews productId={p.productId} productTitle={p.title} />

      {lightboxOpen && images[activeImage] && (
        <Lightbox
          images={images.map((e) => ({ url: e.node.url, alt: e.node.altText ?? p.title }))}
          index={activeImage}
          onIndex={setActiveImage}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: { url: string; alt: string }[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const resetZoom = useCallback(() => {
    setZoomed(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const prev = useCallback(() => {
    resetZoom();
    onIndex((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndex, resetZoom]);

  const next = useCallback(() => {
    resetZoom();
    onIndex((index + 1) % images.length);
  }, [index, images.length, onIndex, resetZoom]);

  const toggleZoom = () => {
    if (zoomed) {
      resetZoom();
    } else {
      setZoomed(true);
      setScale(2.5);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!zoomed) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !zoomed) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (!zoomed) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setScale((s) => {
      const nextScale = Math.min(4, Math.max(1, s + delta));
      if (nextScale <= 1) resetZoom();
      return nextScale;
    });
  };

  useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!zoomed) {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomed, onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={() => {
        if (!zoomed) onClose();
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && !zoomed && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous"
            className="absolute left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:left-8"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next"
            className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:right-8"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className={`relative flex h-full w-full items-center justify-center ${zoomed ? "cursor-move" : "cursor-zoom-in"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          ref={imageRef}
          src={images[index].url}
          alt={images[index].alt}
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            toggleZoom();
          }}
          className="max-h-[92vh] max-w-[92vw] object-contain transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/80">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
