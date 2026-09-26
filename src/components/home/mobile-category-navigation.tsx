import React from "react";
import type { WebsiteCollectionItem } from "@/lib/website-config.types";

export interface MobileCategoryItem {
  id: string;
  name: string;
  link: string;
  imageUrl: string;
  fallbackUrl?: string;
}

// Default categories matching Reference Image 1 with genuine RIOTOUS assets & routes
const DEFAULT_MOBILE_CATEGORIES: MobileCategoryItem[] = [
  {
    id: "mob-cat-tshirt",
    name: "PREMIUM T-SHIRT",
    link: "/shop?q=t-shirt",
    imageUrl: "/assets/tee-black-front.webp",
    fallbackUrl: "/products/zoro-black-1.jpg",
  },
  {
    id: "mob-cat-hoodie",
    name: "HOODIE & SWEATSHIRT",
    link: "/shop?q=hoodie",
    imageUrl: "/assets/hero-model.jpg",
    fallbackUrl: "/products/zenitsu-maroon-1.jpg",
  },
  {
    id: "mob-cat-cargos",
    name: "JOGGERS & CARGOS",
    link: "/shop?q=cargos",
    imageUrl: "/products/zoro-olive-1.jpg",
    fallbackUrl: "/assets/tee-olive-front.webp",
  },
  {
    id: "mob-cat-polo",
    name: "PREMIUM POLO",
    link: "/shop?q=polo",
    imageUrl: "/products/zenitsu-maroon-1.jpg",
    fallbackUrl: "/products/zoro-black-1.jpg",
  },
  {
    id: "mob-cat-oversized",
    name: "OVERSIZED TEES",
    link: "/shop?q=oversized",
    imageUrl: "/assets/tee-olive-front.webp",
    fallbackUrl: "/products/zoro-olive-1.jpg",
  },
  {
    id: "mob-cat-custom",
    name: "CUSTOM PRINTING",
    link: "/design",
    imageUrl: "/assets/hero-model.jpg",
    fallbackUrl: "/products/zoro-black-1.jpg",
  },
  {
    id: "mob-cat-bestsellers",
    name: "BEST SELLERS",
    link: "/shop",
    imageUrl: "/assets/tee-maroon-front.webp",
    fallbackUrl: "/products/zenitsu-maroon-1.jpg",
  },
];

interface MobileCategoryNavigationProps {
  collections?: WebsiteCollectionItem[];
}

export function MobileCategoryNavigation({ collections }: MobileCategoryNavigationProps) {
  // Use collections if admin customized, while ensuring the 4 core categories from Reference 1 are always represented
  const items = React.useMemo(() => {
    if (collections && collections.length > 0) {
      const customMatches = collections
        .filter((c) => c.enabled !== false)
        .map((c) => ({
          id: `col-${c.id}`,
          name: c.title.toUpperCase(),
          link: c.link || "/shop",
          imageUrl: c.imageUrl || "/products/zoro-black-1.jpg",
          fallbackUrl: "/products/zoro-black-1.jpg",
        }));

      // Check if custom collections differ from default 4
      const isDefaultFour =
        collections.length === 4 &&
        collections.some((c) => c.title.toLowerCase().includes("dtf")) &&
        collections.some((c) => c.title.toLowerCase().includes("custom"));

      if (!isDefaultFour && customMatches.length >= 4) {
        return customMatches;
      }
    }
    return DEFAULT_MOBILE_CATEGORIES;
  }, [collections]);

  return (
    <div className="relative -mx-6 w-[calc(100%+3rem)] max-w-[100vw] overflow-hidden">
      {/* Horizontally scrollable single row of cards */}
      <div
        className="flex w-full flex-nowrap items-stretch gap-2.5 overflow-x-auto scroll-smooth px-6 pb-2 pt-1 sm:gap-3.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain touch-pan-x"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
        }}
      >
        {items.map((cat, idx) => (
          <a
            key={cat.id || idx}
            href={cat.link}
            aria-label={`Browse ${cat.name} category`}
            className="group relative flex h-[94px] w-[106px] min-w-[106px] max-w-[115px] shrink-0 flex-col items-center justify-between overflow-hidden rounded-2xl border border-sky-300/70 bg-gradient-to-b from-[#68b7ed] via-[#b5e0fa] to-[#eef7fc] p-1.5 shadow-xs transition-all duration-200 hover:border-sky-400 hover:shadow-sm active:scale-95 sm:h-[102px] sm:w-[116px] sm:min-w-[116px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
          >
            {/* Top: Category Image Container with aspect ratio preservation */}
            <div className="relative flex h-[58px] w-full items-end justify-center overflow-hidden sm:h-[64px]">
              <img
                src={cat.imageUrl}
                alt={cat.name}
                loading="lazy"
                decoding="async"
                className="h-full w-auto max-w-[92%] object-contain object-bottom drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  if (cat.fallbackUrl && e.currentTarget.src !== cat.fallbackUrl) {
                    e.currentTarget.src = cat.fallbackUrl;
                  }
                }}
              />
            </div>

            {/* Bottom: Category Name Text */}
            <div className="flex w-full min-h-[24px] items-center justify-center px-1 text-center sm:min-h-[26px]">
              <span className="line-clamp-2 text-center text-[9.5px] font-bold uppercase leading-[1.15] tracking-tight text-neutral-900 select-none sm:text-[10px]">
                {cat.name}
              </span>
            </div>
          </a>
        ))}

        {/* Trailing spacer so the last card has comfortable right padding on scroll */}
        <div className="w-1.5 shrink-0 sm:w-2" aria-hidden="true" />
      </div>
    </div>
  );
}
