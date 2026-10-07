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
    <div className="relative -mx-6 overflow-hidden">
      {/* Horizontally scrollable single row of cards */}
      <div
        className="flex w-full flex-nowrap items-start gap-2.5 overflow-x-auto scroll-smooth px-6 pb-2 pt-1 sm:gap-3.5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain touch-pan-x"
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
            className="group flex flex-col items-center shrink-0 w-[100px] min-w-[100px] max-w-[108px] snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
          >
            {/* Top: Rounded rectangular image area with sky-blue gradient matching reference screenshot */}
            <div className="relative flex h-[82px] w-full items-end justify-center overflow-hidden rounded-2xl border border-sky-300/80 bg-gradient-to-b from-[#68b7ed] via-[#b5e0fa] to-[#eef7fc] p-1 shadow-xs transition-transform duration-200 group-hover:scale-105 group-active:scale-95 sm:h-[90px]">
              <img
                src={cat.imageUrl}
                alt={cat.name}
                loading="lazy"
                decoding="async"
                className="h-full w-auto max-w-[92%] object-contain object-bottom drop-shadow-xs transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  if (cat.fallbackUrl && e.currentTarget.src !== cat.fallbackUrl) {
                    e.currentTarget.src = cat.fallbackUrl;
                  }
                }}
              />
            </div>

            {/* Bottom: Small uppercase category title underneath */}
            <div className="mt-1.5 flex w-full min-h-[26px] items-start justify-center px-0.5 text-center">
              <span className="line-clamp-2 text-center text-[9.5px] sm:text-[10px] font-bold uppercase leading-tight tracking-tight text-foreground select-none">
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
