import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { BrandName } from "@/components/brand-name";

export function ProductCard({
  product,
  priority = false,
}: {
  product: CatalogProduct;
  priority?: boolean;
}) {
  const p = product.node;
  const images = p.images.edges;
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const currentImg = images[activeImgIdx]?.node ?? images[0]?.node;
  const price = p.priceRange.minVariantPrice;
  const soldOut = p.variants.edges.every((v) => !v.node.availableForSale);

  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const liked = isFavorite(p.handle);

  const tag = p.tags.find((t) =>
    ["new", "trending", "best seller", "limited"].includes(t.toLowerCase()),
  );

  const onLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Sign in to save favorites");
      return;
    }
    toggle({
      handle: p.handle,
      title: p.title,
      image: currentImg?.url ?? null,
      price: Number(price.amount),
      currency: price.currencyCode,
    });
  };

  const onPrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length <= 1) return;
    setActiveImgIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const onNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length <= 1) return;
    setActiveImgIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };
  const isApiImage = Boolean(currentImg?.url && currentImg.url.startsWith("/api/public/product-image"));
  const srcSet = isApiImage && currentImg?.url
    ? `${currentImg.url}&w=400 400w, ${currentImg.url}&w=800 800w`
    : undefined;
  const imageSizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px";

  return (
    <Link
      to="/product/$handle"
      params={{ handle: p.handle }}
      className="group block"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 420px" }}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-secondary/60 flex items-center justify-center p-4">
        {currentImg && (
          <img
            key={currentImg.url}
            src={currentImg.url}
            srcSet={srcSet}
            sizes={imageSizes}
            alt={currentImg.altText ?? p.title}
            width={400}
            height={400}
            decoding="async"
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            {...(priority ? { fetchPriority: "high" } : {})}
            onError={(e) => {
              const target = e.currentTarget;
              if (
                target.src !== window.location.origin + "/placeholder-tee.jpg" &&
                !target.src.endsWith("/placeholder-tee.jpg")
              ) {
                target.src = "/placeholder-tee.jpg";
              }
            }}
          />
        )}

        {/* Moving Prev/Next Navigation Arrows on Card */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={onPrevImage}
              aria-label="Previous image"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md shadow-md border border-border/30 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-background hover:scale-115 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={onNextImage}
              aria-label="Next image"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md shadow-md border border-border/30 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-background hover:scale-115 active:scale-95"
            >
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 backdrop-blur-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {images.slice(0, 6).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-200 ${
                    activeImgIdx === i ? "w-3 bg-brand-red" : "w-1 bg-foreground/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {tag && (
          <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur">
            {tag}
          </span>
        )}
        {soldOut && (
          <span className="absolute right-4 top-4 rounded-full bg-foreground px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-background">
            Sold out
          </span>
        )}
        <button
          type="button"
          onClick={onLike}
          suppressHydrationWarning
          className={`absolute ${soldOut ? "right-4 top-14" : "right-4 top-4"} flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur transition-all hover:bg-background hover:scale-110`}
          aria-label={liked ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${liked ? "fill-brand-red text-brand-red" : "text-foreground"}`}
          />
        </button>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{p.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{p.productType || <BrandName />}</p>
        </div>
        <p className="whitespace-nowrap text-sm font-semibold">
          {formatPrice(price.amount, price.currencyCode)}
        </p>
      </div>
    </Link>
  );
}
