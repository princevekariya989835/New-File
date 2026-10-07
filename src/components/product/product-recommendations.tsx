import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, type CatalogProduct, type CatalogProductNode } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface ProductRecommendationsProps {
  currentProduct: CatalogProductNode;
}

/**
 * Reusable recommendation scoring algorithm.
 * Prioritizes:
 * 1. Same product category
 * 2. Shared tags / collections
 * 3. Similar product title keywords
 * 4. Similar price range
 * 5. Best-selling / popular products
 * 6. In-stock products
 *
 * Always excludes the product currently being viewed.
 */
export function getRecommendedProducts(
  currentProduct: CatalogProductNode,
  allProducts: CatalogProduct[],
  limit = 4,
): CatalogProduct[] {
  if (!allProducts || allProducts.length === 0) return [];

  const currentId = String(currentProduct.id || currentProduct.productId || "").toLowerCase();
  const currentHandle = String(currentProduct.handle || "").toLowerCase();
  const currentCategory = String(currentProduct.productType || "").toLowerCase().trim();
  const currentPrice = parseFloat(currentProduct.priceRange?.minVariantPrice?.amount || "0");
  const currentTags = new Set(
    (currentProduct.tags || []).map((t) => String(t).toLowerCase().trim()),
  );

  // 1. Exclude the product currently being viewed
  const candidates = allProducts.filter((p) => {
    const pId = String(p.node.id || p.node.productId || "").toLowerCase();
    const pHandle = String(p.node.handle || "").toLowerCase();
    return pId !== currentId && pHandle !== currentHandle;
  });

  if (candidates.length === 0) return [];

  // 2. Score candidates based on relevance
  const scored = candidates.map((cand) => {
    const node = cand.node;
    let score = 0;

    const candCategory = String(node.productType || "").toLowerCase().trim();
    // 1. Same product category
    if (candCategory && currentCategory && candCategory === currentCategory) {
      score += 100;
    } else if (
      candCategory &&
      currentCategory &&
      (candCategory.includes(currentCategory) || currentCategory.includes(candCategory))
    ) {
      score += 60;
    }

    // 2. Matching tags / collections
    if (node.tags && Array.isArray(node.tags)) {
      for (const tag of node.tags) {
        const cleanTag = String(tag).toLowerCase().trim();
        if (currentTags.has(cleanTag)) {
          score += 30;
        }
        // Popular / best seller status
        if (["bestseller", "trending", "featured", "popular", "limited"].includes(cleanTag)) {
          score += 15;
        }
      }
    }

    // 3. Similar product type keyword in title
    const currentTitleWords = currentProduct.title.toLowerCase().split(/\s+/);
    const candTitle = node.title.toLowerCase();
    for (const word of currentTitleWords) {
      if (word.length > 3 && candTitle.includes(word)) {
        score += 20;
      }
    }

    // 4. Similar price range
    const candPrice = parseFloat(node.priceRange?.minVariantPrice?.amount || "0");
    if (currentPrice > 0 && candPrice > 0) {
      const diff = Math.abs(currentPrice - candPrice);
      if (diff <= 200) score += 20;
      else if (diff <= 500) score += 10;
    }

    // In-stock preference
    if (node.available > 0) {
      score += 25;
    }

    return { product: cand, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Return top products up to limit
  return scored.slice(0, limit).map((s) => s.product);
}

export function ProductRecommendations({ currentProduct }: ProductRecommendationsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use cached catalog products query
  const { data: rawProducts } = useQuery({
    queryKey: ["products", "catalog", 50],
    queryFn: () => fetchProducts(50),
    staleTime: 1000 * 60 * 5,
  });

  // Dynamically compute recommendations for the current product
  const recommendations = useMemo(() => {
    if (!rawProducts || !Array.isArray(rawProducts)) return [];
    return getRecommendedProducts(currentProduct, rawProducts, 6);
  }, [currentProduct, rawProducts]);

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section
      aria-labelledby="recommendations-heading"
      className="mt-16 sm:mt-20 md:mt-28 mb-12 sm:mb-16 md:mb-20 border-t border-border/70 pt-12 sm:pt-16 md:pt-20"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 md:mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curated For You</span>
          </div>
          <h2
            id="recommendations-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground"
          >
            You may also like.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-normal">
            More pieces worth adding to your rotation.
          </p>
        </div>

        {/* Mobile / Scroll arrows for easy navigation */}
        {recommendations.length > 2 && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll recommendations left"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-secondary active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll recommendations right"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-secondary active:scale-95 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Product Cards Layout:
          - Mobile (< sm): Smooth touch horizontal carousel showing ~1.5 - 2 cards with peek
          - Tablet (sm): 2 columns
          - Desktop (md / lg): 4 columns grid
      */}
      <div className="relative -mx-6 px-6 sm:mx-0 sm:px-0">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-6 sm:overflow-visible sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain touch-pan-x"
        >
          {recommendations.slice(0, 4).map((item, idx) => (
            <div
              key={item.node.id || idx}
              className="w-[68vw] min-w-[210px] max-w-[270px] shrink-0 snap-start sm:w-auto sm:max-w-none"
            >
              <ProductCard product={item} priority={false} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
