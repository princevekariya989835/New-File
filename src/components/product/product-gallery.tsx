import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Heart, X, ZoomIn } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { CatalogImage } from "@/lib/catalog";

export interface ProductGalleryProps {
  images: Array<{ node: CatalogImage }>;
  activeImage: number;
  onSelectImage: (index: number) => void;
  productTitle: string;
  productHandle: string;
  price?: number;
  currency?: string;
}

export function ProductGallery({
  images,
  activeImage,
  onSelectImage,
  productTitle,
  productHandle,
  price,
  currency = "INR",
}: ProductGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const safeActiveIndex = Math.min(activeImage, Math.max(0, images.length - 1));
  const currentImage = images[safeActiveIndex]?.node;

  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const liked = isFavorite(productHandle);

  // Mobile touch swipe handling
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (images.length <= 1) return;
      onSelectImage(safeActiveIndex > 0 ? safeActiveIndex - 1 : images.length - 1);
    },
    [images.length, onSelectImage, safeActiveIndex],
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (images.length <= 1) return;
      onSelectImage(safeActiveIndex < images.length - 1 ? safeActiveIndex + 1 : 0);
    },
    [images.length, onSelectImage, safeActiveIndex],
  );

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
      handleNext();
    } else if (distance < -45 && images.length > 1) {
      handlePrev();
    }
  };

  const onToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to save favorites");
      return;
    }
    toggle({
      handle: productHandle,
      title: productTitle,
      image: currentImage?.url ?? null,
      price: price ?? 0,
      currency,
    });
  };

  // Thumbnail rail scroll ref for auto-scrolling active thumb into view
  const thumbRailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!thumbRailRef.current) return;
    const activeThumb = thumbRailRef.current.children[safeActiveIndex] as HTMLElement;
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [safeActiveIndex]);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 lg:gap-5 md:sticky md:top-24 md:self-start select-none">
        {/* DESKTOP VERTICAL THUMBNAIL RAIL (Approved layout: left rail on desktop) */}
        {images.length > 1 && (
          <div
            ref={thumbRailRef}
            className="hidden md:flex md:flex-col gap-3 max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-none py-1 pr-1 w-20 lg:w-22 shrink-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Product thumbnails"
          >
            {images.map((img, idx) => {
              const isActive = safeActiveIndex === idx;
              return (
                <button
                  key={`${img.node.url}-${idx}`}
                  type="button"
                  onClick={() => onSelectImage(idx)}
                  aria-label={`Select product image ${idx + 1} of ${images.length}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`group relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "border-foreground shadow-sm ring-1 ring-foreground/20 scale-[1.02]"
                      : "border-border/70 hover:border-foreground/50 opacity-75 hover:opacity-100"
                  } bg-[#F6F5F2] dark:bg-card/50`}
                >
                  <img
                    src={img.node.url}
                    alt={img.node.altText ?? `${productTitle} thumbnail ${idx + 1}`}
                    width={88}
                    height={110}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-tee.jpg";
                    }}
                  />
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-5 rounded-full bg-brand-red" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* MAIN IMAGE PANEL */}
        <div className="relative flex-1">
          <div
            className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl md:rounded-3xl bg-[#F6F5F2] dark:bg-card/40 border border-border/60 shadow-xs"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {currentImage && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block h-full w-full cursor-zoom-in focus:outline-none"
                aria-label="Enlarge product image"
              >
                <img
                  key={currentImage.url}
                  src={currentImage.url}
                  alt={currentImage.altText ?? productTitle}
                  width={800}
                  height={1000}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-contain p-4 md:p-6 transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-tee.jpg";
                  }}
                />
              </button>
            )}

            {/* FLOATING TOP-RIGHT WISHLIST HEART BUTTON */}
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
              className="absolute right-3.5 top-3.5 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur-md shadow-sm border border-border/40 transition-all duration-200 hover:bg-background hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  liked
                    ? "fill-brand-red text-brand-red stroke-brand-red"
                    : "text-foreground hover:text-brand-red"
                }`}
              />
            </button>

            {/* PREVIOUS & NEXT ARROWS (Desktop & Mobile) */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous product image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-md shadow-md border border-border/40 transition-all duration-200 hover:bg-background hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next product image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-md shadow-md border border-border/40 transition-all duration-200 hover:bg-background hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
                </button>
              </>
            )}

            {/* IMAGE COUNTER BADGE */}
            {images.length > 1 && (
              <div className="absolute bottom-3.5 right-3.5 z-10 rounded-full bg-background/85 px-3 py-1 text-xs font-bold text-foreground backdrop-blur-md shadow-xs border border-border/40 tracking-wider">
                {safeActiveIndex + 1} / {images.length}
              </div>
            )}

            {/* QUICK ZOOM HINT ICON (Desktop) */}
            <div className="hidden sm:flex absolute bottom-3.5 left-3.5 z-10 items-center gap-1.5 rounded-full bg-background/75 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-md shadow-2xs border border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <ZoomIn className="h-3 w-3" />
              <span>Click to zoom</span>
            </div>
          </div>

          {/* MOBILE HORIZONTAL THUMBNAIL RAIL (Below main image on narrow viewports) */}
          {images.length > 1 && (
            <div className="flex md:hidden gap-2.5 overflow-x-auto pb-1 pt-3 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((img, idx) => {
                const isActive = safeActiveIndex === idx;
                return (
                  <button
                    key={`${img.node.url}-mobile-${idx}`}
                    type="button"
                    onClick={() => onSelectImage(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                      isActive
                        ? "border-brand-red ring-2 ring-brand-red/20 scale-105"
                        : "border-border/70 opacity-70 hover:opacity-100"
                    } bg-[#F6F5F2] dark:bg-card/50`}
                  >
                    <img
                      src={img.node.url}
                      alt={`${productTitle} thumb ${idx + 1}`}
                      width={64}
                      height={64}
                      loading="lazy"
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-tee.jpg";
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxOpen && currentImage && (
        <GalleryLightbox
          images={images.map((e) => ({
            url: e.node.url,
            alt: e.node.altText ?? productTitle,
          }))}
          index={safeActiveIndex}
          onIndex={onSelectImage}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

function GalleryLightbox({
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in-50 duration-200"
      onClick={() => {
        if (!zoomed) onClose();
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close enlarged preview"
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
      >
        <X className="h-6 w-6 stroke-[2.5]" />
      </button>

      {images.length > 1 && !zoomed && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous image"
            className="absolute left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all md:left-8 cursor-pointer"
          >
            <ChevronLeft className="h-7 w-7 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next image"
            className="absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all md:right-8 cursor-pointer"
          >
            <ChevronRight className="h-7 w-7 stroke-[2.5]" />
          </button>
        </>
      )}

      <div
        className={`relative flex h-full w-full items-center justify-center p-4 ${
          zoomed ? "cursor-move" : "cursor-zoom-in"
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[index].url}
          alt={images[index].alt}
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            toggleZoom();
          }}
          className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-300 ease-out select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white tracking-widest backdrop-blur-md">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
