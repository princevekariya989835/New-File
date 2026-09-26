export interface WebsiteHeroAnimationSettings {
  enabled: boolean;
  speed: "slow" | "normal" | "fast" | number;
  direction: "normal" | "reverse";
  scale: number;
  desktopEnabled: boolean;
  mobileEnabled: boolean;
  textPosition: "top" | "center" | "bottom";
  textAlignment: "left" | "center" | "right";
  primaryButtonVisible: boolean;
  secondaryButtonVisible: boolean;
  tshirtCount?: number;
}

export interface WebsiteHeroConfig {
  active: boolean;
  enabled?: boolean;
  badge: string;
  heading: string;
  subheading: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  mediaType: "video" | "image";
  mediaUrl?: string;
  videoUrl: string;
  imageUrl: string;
  mediaFileName?: string;
  mediaFileSize?: number;
  alignment: "left" | "center" | "right";
  animation?: "none" | "fade" | "zoom" | "subtle" | "default" | string;
  showTShirtBadge?: boolean;
  animationSettings?: WebsiteHeroAnimationSettings;
}

export interface WebsiteAnnouncementConfig {
  enabled: boolean;
  text: string;
  link: string;
  linkText: string;
  backgroundColor: string;
  textColor: string;
}

export interface WebsiteCollectionItem {
  id: string;
  title: string;
  tag: string;
  link: string;
  imageUrl?: string;
  bgColor?: string;
  enabled: boolean;
}

export interface WebsiteFeaturedProductsConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  limit: number;
  productIds: string[];
}

export interface WebsiteWhyUsItem {
  id: string;
  iconName: string;
  title: string;
  description: string;
}

export interface WebsiteBuy2Get1OfferConfig {
  enabled: boolean;
  title: string;
  supportingText: string;
  appliesTo: "all" | "categories" | "products";
  categoryNames?: string[];
  productIds?: string[];
  maxFreeItemsPerOrder?: number;
  startDate?: string;
  endDate?: string;
}

export interface WebsitePromoBannerConfig {
  enabled: boolean;
  badge: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  status: "draft" | "active" | "scheduled" | "disabled";
}

export interface WebsiteReviewsSectionConfig {
  enabled: boolean;
  badge: string;
  title: string;
}

export interface WebsiteNavItem {
  id: string;
  label: string;
  to: string;
  enabled: boolean;
  isExternal?: boolean;
}

export interface WebsiteFooterColumn {
  id: string;
  title: string;
  links: Array<{ label: string; to: string; id: string }>;
}

export interface WebsiteFooterConfig {
  heading: string;
  subheading: string;
  brandTagline?: string;
  newsletterEnabled: boolean;
  columns: WebsiteFooterColumn[];
  copyrightText: string;
  socialLinks: {
    instagram: string;
    youtube: string;
    facebook: string;
    twitter: string;
    whatsapp: string;
  };
}

export interface WebsiteSeoConfig {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  keywords: string;
  homepageTitle?: string;
  homepageDescription?: string;
  shopTitle?: string;
  shopDescription?: string;
  ogImageUrl?: string;
  googleSearchConsoleCode?: string;
}

export interface WebsiteCartContent {
  heading: string;
  emptyMessage: string;
  emptySubmessage: string;
  continueShoppingText: string;
  removeText: string;
  quantityLabel: string;
  subtotalLabel: string;
  checkoutButtonText: string;
  viewCartText: string;
  freeShippingMessage: string;
}

export interface WebsiteShopContent {
  pageTitle: string;
  pageDescription: string;
  allProductsLabel: string;
  newArrivalsLabel: string;
  bestSellersLabel: string;
  filterLabel: string;
  sortLabel: string;
  loadMoreLabel: string;
  noProductsFoundText: string;
}

export interface WebsiteProductContent {
  addToCartLabel: string;
  buyNowLabel: string;
  selectSizeLabel: string;
  selectColorLabel: string;
  quantityLabel: string;
  sizeGuideLabel: string;
  descriptionLabel: string;
  reviewsLabel: string;
  relatedProductsLabel: string;
  outOfStockLabel: string;
  notifyMeLabel: string;
}

export interface WebsiteContactContent {
  pageTitle: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  businessHours: string;
  instagram: string;
  wholesaleText: string;
}

export interface WebsiteGeneralSettings {
  storeName: string;
  tagline?: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  currencySymbol: string;
  contactEmail: string;
  contactPhone: string;
  freeShippingThreshold: number;
}

export type WebsiteSectionType =
  | "announcement"
  | "hero"
  | "collections"
  | "featuredProducts"
  | "whyUs"
  | "promoBanner"
  | "reviews"
  | "footer";

export interface WebsiteSectionOrderItem {
  id: WebsiteSectionType;
  name: string;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface WebsiteSectionOrderConfig {
  sections: WebsiteSectionOrderItem[];
}

export interface WebsiteConfig {
  general: WebsiteGeneralSettings;
  settings?: Record<string, any>;
  seo: WebsiteSeoConfig;
  announcement: WebsiteAnnouncementConfig;
  hero: WebsiteHeroConfig;
  navigation: WebsiteNavItem[];
  collections: WebsiteCollectionItem[];
  featuredProducts: WebsiteFeaturedProductsConfig;
  whyUs: {
    badge: string;
    title: string;
    items: WebsiteWhyUsItem[];
  };
  promoBanner: WebsitePromoBannerConfig;
  reviewsSection: WebsiteReviewsSectionConfig;
  footer: WebsiteFooterConfig;
  sectionOrder: WebsiteSectionOrderConfig;
  cartContent?: WebsiteCartContent;
  shopContent?: WebsiteShopContent;
  productContent?: WebsiteProductContent;
  contactContent?: WebsiteContactContent;
  buy2get1Offer?: WebsiteBuy2Get1OfferConfig;
}

export interface WebsiteVersion {
  id: string;
  versionNumber: number;
  config: WebsiteConfig;
  publishedBy: string;
  publishedAt: string;
  changeSummary?: string;
  status: "published" | "restored" | "archived";
}

export interface WebsiteStateResponse {
  published: {
    config: WebsiteConfig;
    versionNumber: number;
    publishedAt: string | null;
    publishedBy: string | null;
  };
  draft: {
    config: WebsiteConfig;
    versionNumber: number;
    updatedAt: string | null;
    updatedBy: string | null;
    hasUnsavedAgainstPublished: boolean;
  };
  latestVersions: WebsiteVersion[];
}

export const DEFAULT_WEBSITE_CONFIG: WebsiteConfig = {
  general: {
    storeName: "RIOTOUS",
    tagline: "We Don't Follow Trends. We Print Them.",
    maintenanceMode: false,
    maintenanceMessage: "We are currently updating the store. Please check back shortly.",
    currencySymbol: "₹",
    contactEmail: "support@riotous.store",
    contactPhone: "+91 98765 43211",
    freeShippingThreshold: 1499,
  },
  settings: {
    siteName: "RIOTOUS",
    tagline: "We Don't Follow Trends. We Print Them.",
    maintenanceMode: false,
    currency: "INR",
    storeEmail: "support@riotous.store",
    storePhone: "+91 98765 43211",
  },
  seo: {
    metaTitle: "RIOTOUS — We Don't Follow Trends. We Print Them.",
    metaDescription:
      "Premium DTF printed streetwear made in India. Custom apparel for creators, dreamers, and streetwear lovers.",
    ogTitle: "RIOTOUS — Premium DTF Streetwear",
    ogDescription: "Premium DTF printed streetwear made in India. Custom apparel for creators.",
    canonicalUrl: "https://riotous.store",
    keywords:
      "streetwear, DTF printing, oversized tees, graphic tees, custom apparel, made in India",
    homepageTitle: "RIOTOUS — We Don't Follow Trends. We Print Them.",
    homepageDescription:
      "Premium DTF printed streetwear made in India. Custom apparel for creators, dreamers, and streetwear lovers.",
    shopTitle: "Shop Oversized Streetwear & Graphic Tees | RIOTOUS",
    shopDescription: "Browse the full RIOTOUS collection. DTF printed tees, oversized fits, and limited drops.",
    ogImageUrl: "/assets/riotous-hero-graphic-clean.jpg",
    googleSearchConsoleCode: "",
  },
  announcement: {
    enabled: false,
    text: "🔥 Free shipping on all orders over ₹1499 · Use code RIOT10 for 10% off 🔥",
    link: "/shop",
    linkText: "Shop Drop",
    backgroundColor: "#e11d48",
    textColor: "#ffffff",
  },
  hero: {
    active: true,
    badge: "Premium DTF Apparel · Made in India",
    heading: "We Don't Follow Trends.\nWe Print Them.",
    subheading: "Wear the print. Not the trend.",
    description:
      "Premium DTF printed apparel made for creators, dreamers and streetwear lovers. Oversized tees and graphic prints, designed and made in India.",
    primaryCtaText: "Shop Now",
    primaryCtaLink: "/shop",
    secondaryCtaText: "Design Your Own",
    secondaryCtaLink: "/design",
    mediaType: "image",
    mediaUrl: "/assets/riotous-hero-graphic-clean.jpg",
    imageUrl: "/assets/riotous-hero-graphic-clean.jpg",
    videoUrl: "",
    alignment: "left",
    animationSettings: {
      enabled: true,
      speed: "normal",
      direction: "normal",
      scale: 1,
      desktopEnabled: true,
      mobileEnabled: true,
      textPosition: "center",
      textAlignment: "center",
      primaryButtonVisible: true,
      secondaryButtonVisible: true,
      tshirtCount: 12,
    },
  },
  navigation: [
    { id: "nav_shop", label: "Shop", to: "/shop", enabled: true },
    { id: "nav_design", label: "Design Your Own", to: "/design", enabled: true },
    { id: "nav_about", label: "About", to: "/about", enabled: true },
    { id: "nav_contact", label: "Contact", to: "/contact", enabled: true },
  ],
  collections: [
    {
      id: "col_1",
      title: "DTF Printed Tees",
      tag: "Signature",
      link: "/shop",
      imageUrl: "/products/zoro-black-1.jpg",
      bgColor: "bg-neutral-900",
      enabled: true,
    },
    {
      id: "col_2",
      title: "Custom Printing",
      tag: "Design your own",
      link: "/design",
      imageUrl: "/assets/hero-model.jpg",
      bgColor: "bg-neutral-900",
      enabled: true,
    },
    {
      id: "col_3",
      title: "Oversized",
      tag: "New silhouettes",
      link: "/shop",
      imageUrl: "/products/zoro-olive-1.jpg",
      bgColor: "bg-neutral-900",
      enabled: true,
    },
    {
      id: "col_4",
      title: "Best Sellers",
      tag: "Community favorites",
      link: "/shop",
      imageUrl: "/products/zenitsu-maroon-1.jpg",
      bgColor: "bg-neutral-900",
      enabled: true,
    },
  ],
  featuredProducts: {
    enabled: true,
    title: "Featured.",
    subtitle: "Handpicked drops from our latest release.",
    limit: 8,
    productIds: [],
  },
  whyUs: {
    badge: "Why RIOTOUS",
    title: "Built for the ones who create.",
    items: [
      {
        id: "why_1",
        iconName: "Sparkles",
        title: "Premium fabric",
        description: "Heavyweight combed cotton. Cut and sewn for durability and drape.",
      },
      {
        id: "why_2",
        iconName: "Package",
        title: "Long-lasting DTF prints",
        description: "Ultra-vibrant direct-to-film prints that survive the wash and the mosh.",
      },
      {
        id: "why_3",
        iconName: "Truck",
        title: "Fast shipping",
        description: "Free shipping over ₹1499. Dispatched within 24 hours across India.",
      },
      {
        id: "why_4",
        iconName: "RotateCcw",
        title: "Easy returns",
        description: "7-day no-questions returns. If you don't love it, send it back.",
      },
      {
        id: "why_5",
        iconName: "MapPin",
        title: "Made in India",
        description: "Designed, printed, and packed by our team. Fair wages, fair work.",
      },
      {
        id: "why_6",
        iconName: "Package",
        title: "Premium packaging",
        description:
          "Every drop arrives in signature RIOTOUS packaging. Unboxing is part of the fit.",
      },
    ],
  },
  promoBanner: {
    enabled: true,
    badge: "Design Studio",
    title: "Your art. Our shirt.\nZero limits.",
    description:
      "Upload artwork, add text, place it front, back or sleeve — see it live before you order.",
    buttonText: "Open the Studio",
    buttonLink: "/design",
    status: "active",
  },
  reviewsSection: {
    enabled: true,
    badge: "Reviews",
    title: "Straight from the community.",
  },
  footer: {
    heading: "Wear the print.\nNot the trend.",
    subheading:
      "Join our streetwear community for secret drops, exclusive discounts, and studio access.",
    brandTagline:
      "RIOTOUS creates heavyweight, DTF-printed streetwear made in India. Built for creators, artists, and culture shifters.",
    newsletterEnabled: true,
    copyrightText: "Made in India. All rights reserved.",
    columns: [
      {
        id: "foot_shop",
        title: "Shop",
        links: [
          { id: "f1", label: "All Products", to: "/shop" },
          { id: "f2", label: "Design Your Own", to: "/design" },
          { id: "f3", label: "Best Sellers", to: "/shop" },
          { id: "f4", label: "New Arrivals", to: "/shop" },
        ],
      },
      {
        id: "foot_company",
        title: "Company",
        links: [
          { id: "f5", label: "About", to: "/about" },
          { id: "f6", label: "Contact", to: "/contact" },
          { id: "f7", label: "Terms of Service", to: "/terms" },
        ],
      },
      {
        id: "foot_support",
        title: "Support",
        links: [
          { id: "f8", label: "Help Center", to: "/contact" },
          { id: "f9", label: "Shipping Policy", to: "/shipping-policy" },
          { id: "f10", label: "Returns & Refunds", to: "/refund-policy" },
          { id: "f11", label: "Privacy Policy", to: "/privacy" },
        ],
      },
    ],
    socialLinks: {
      instagram: "https://www.instagram.com/riotous_store",
      youtube: "https://youtube.com",
      facebook: "https://facebook.com",
      twitter: "",
      whatsapp: "https://wa.me/919099866791",
    },
  },
  sectionOrder: {
    sections: [
      { id: "announcement", name: "Announcement Bar", enabled: true },
      { id: "hero", name: "Hero Section", enabled: true },
      { id: "collections", name: "Collections Grid", enabled: true },
      { id: "featuredProducts", name: "Featured Products", enabled: true },
      { id: "whyUs", name: "Why RIOTOUS", enabled: true },
      { id: "promoBanner", name: "Design Studio CTA Banner", enabled: true },
      { id: "reviews", name: "Community Reviews", enabled: true },
      { id: "footer", name: "Footer", enabled: true },
    ],
  },
  cartContent: {
    heading: "Your bag",
    emptyMessage: "Your bag is empty.",
    emptySubmessage: "Nothing here yet.",
    continueShoppingText: "Continue Shopping",
    removeText: "Remove",
    quantityLabel: "Quantity",
    subtotalLabel: "Subtotal",
    checkoutButtonText: "Checkout",
    viewCartText: "View Bag",
    freeShippingMessage: "Free shipping on orders over ₹1499",
  },
  shopContent: {
    pageTitle: "The full collection.",
    pageDescription: "Heavyweight DTF printed streetwear crafted in India.",
    allProductsLabel: "All Products",
    newArrivalsLabel: "New Arrivals",
    bestSellersLabel: "Best Sellers",
    filterLabel: "Filter",
    sortLabel: "Sort by",
    loadMoreLabel: "Load More",
    noProductsFoundText: "No products found matching your criteria.",
  },
  productContent: {
    addToCartLabel: "Add to Bag",
    buyNowLabel: "Buy Now",
    selectSizeLabel: "Select Size",
    selectColorLabel: "Select Colour",
    quantityLabel: "Quantity",
    sizeGuideLabel: "Oversized Fit Size Guide",
    descriptionLabel: "Details",
    reviewsLabel: "Customer Reviews",
    relatedProductsLabel: "You Might Also Like",
    outOfStockLabel: "Sold out",
    notifyMeLabel: "Notify Me When Available",
  },
  contactContent: {
    pageTitle: "Say hi.",
    description:
      "Custom prints, wholesale, press, or you just want to nerd out about fabric — reach out.",
    email: "support@riotous.store",
    phone: "+91 98765 43211",
    address: "Studio RIOTOUS, Surat, Gujarat, India",
    businessHours: "Mon — Sat · 10:00 — 19:00 IST",
    instagram: "@riotous_store",
    wholesaleText:
      "Looking for custom runs, band merch, or wholesale orders? Let's talk.",
  },
  buy2get1Offer: {
    enabled: true,
    title: "BUY 2 GET 1 FREE",
    supportingText: "Add 3 eligible T-shirts to unlock your free item",
    appliesTo: "all",
    categoryNames: ["t-shirt", "tees", "oversized", "hoodie", "polo", "apparel"],
    productIds: [],
    maxFreeItemsPerOrder: 1,
  },
};
