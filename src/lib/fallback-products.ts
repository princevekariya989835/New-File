export interface VariantRow {
  id: string;
  size: string;
  color: string;
  sku?: string;
  stock_quantity: number;
  reserved_stock: number;
  low_stock_threshold: number;
}

export interface ProductHighlightRow {
  id: string;
  product_id?: string;
  image_url: string;
  title?: string | null;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductSpecificationRow {
  id: string;
  product_id?: string;
  label: string;
  value: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductOfferRow {
  id: string;
  product_id?: string;
  title: string;
  description?: string | null;
  discount_type: "percentage" | "fixed_amount" | "buy_x_get_y" | "flat_price" | "coupon";
  discount_value: number;
  promo_code?: string | null;
  minimum_quantity: number;
  maximum_quantity?: number | null;
  eligible_products?: string[];
  eligible_categories?: string[];
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  display_order: number;
  terms_and_conditions?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentMeasurement {
  size: string;
  chest: string | number;
  shoulder: string | number;
  length: string | number;
  sleeve: string | number;
  toFitChest?: string | number;
}

export interface ManufacturingInfo {
  country_of_origin?: string;
  manufacturer?: string;
  marketed_by?: string;
  customer_care?: string;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  details_html?: string | null;
  price: number;
  mrp?: number | null;
  compare_at_price?: number | null;
  is_tax_inclusive?: boolean;
  currency: string;
  images: string[];
  category: string | null;
  sizes: string[];
  colors: string[];
  stock_quantity: number;
  is_active: boolean;
  tags: string[];
  updated_at?: string;
  product_variants?: VariantRow[];
  highlights?: ProductHighlightRow[];
  specifications?: ProductSpecificationRow[];
  offers?: ProductOfferRow[];
  features?: string[];
  care_instructions?: string[];
  manufacturing_info?: ManufacturingInfo;
  size_measurements?: GarmentMeasurement[];
}

export const FALLBACK_PRODUCTS: ProductRow[] = [
  {
    id: "prod-oversized-black-tee",
    name: "Oversized Black T-Shirt",
    slug: "oversized-black-t-shirt",
    description:
      "Heavyweight 240 GSM combed cotton oversized streetwear tee in solid black. Drop-shoulder relaxed boxy fit.",
    price: 999,
    mrp: 1999,
    is_tax_inclusive: true,
    currency: "INR",
    images: ["/products/zoro-black-1.jpg", "/products/zoro-black-2.jpg"],
    category: "Oversized Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    stock_quantity: 91,
    is_active: true,
    tags: ["Oversized", "Bestseller", "Essentials"],
    highlights: [
      {
        id: "hl-1",
        image_url: "/products/zoro-black-1.jpg",
        title: "240 GSM Combed Cotton",
        description: "Heavyweight premium cotton built for structure and all-day comfort.",
        display_order: 1,
        is_active: true,
      },
      {
        id: "hl-2",
        image_url: "/products/zoro-black-2.jpg",
        title: "Drop Shoulder Boxy Fit",
        description: "Signature streetwear drape with relaxed armholes and boxy cut.",
        display_order: 2,
        is_active: true,
      },
    ],
    specifications: [
      { id: "sp-1", label: "Fit", value: "Oversized Fit", display_order: 1, is_active: true },
      { id: "sp-2", label: "Fabric", value: "100% Super Combed Cotton", display_order: 2, is_active: true },
      { id: "sp-3", label: "GSM", value: "240 GSM", display_order: 3, is_active: true },
      { id: "sp-4", label: "Neck", value: "Ribbed Crew Neck", display_order: 4, is_active: true },
      { id: "sp-5", label: "Sleeve", value: "Half Drop Sleeve", display_order: 5, is_active: true },
      { id: "sp-6", label: "Pattern", value: "Graphic Screenprint", display_order: 6, is_active: true },
      { id: "sp-7", label: "Country of Origin", value: "India", display_order: 7, is_active: true },
    ],
    offers: [
      {
        id: "off-b2g1-fallback",
        title: "BUY 2 GET 1 FREE",
        description: "Add 3 items to your bag and get 1 free automatically at checkout.",
        discount_type: "buy_x_get_y",
        discount_value: 1,
        minimum_quantity: 3,
        is_active: true,
        display_order: 1,
        terms_and_conditions: "Buy 2 items and get 1 free automatically at checkout. Lowest priced eligible item will be free. Applicable on all oversized and streetwear tees.",
      },
      {
        id: "off-riotous20-fallback",
        title: "BUY 3 GET 20% OFF",
        description: "Get an extra 20% off when you buy 3 or more streetwear pieces.",
        discount_type: "percentage",
        discount_value: 20,
        promo_code: "RIOTOUS20",
        minimum_quantity: 3,
        is_active: true,
        display_order: 2,
        terms_and_conditions: "Use promo code RIOTOUS20 at checkout. Applicable on cart subtotals with 3 or more products. Cannot be combined with other coupons.",
      },
    ],
    features: [
      "100% Super Combed Compact Cotton",
      "240 GSM Heavyweight Dense Fabric Structure",
      "Drop-shoulder boxy relaxed silhouette",
      "Biowashed & Silicon Softened for luxury hand-feel",
      "High-density crack-resistant screen print",
      "Reinforced collar ribbing to prevent neck sagging",
    ],
    care_instructions: [
      "Machine wash cold (30°C) with like colors",
      "Wash inside out to protect print vibrancy",
      "Do not bleach or dry clean",
      "Tumble dry low or hang dry in shade",
      "Warm iron inside-out; do not iron directly on print",
    ],
    manufacturing_info: {
      country_of_origin: "India",
      manufacturer: "RIOTOUS Apparel Co. Pvt Ltd, Tirupur, Tamil Nadu - 641602",
      marketed_by: "RIOTOUS Brandworks LLP, Ahmedabad, Gujarat - 380015",
      customer_care: "care@riotous.in | +91 98765 43210 (Mon-Sat 10am-7pm)",
    },
    size_measurements: [
      { size: "S", chest: 40, shoulder: 18.5, length: 28, sleeve: 8.5, toFitChest: 36 },
      { size: "M", chest: 42, shoulder: 19.5, length: 29, sleeve: 9, toFitChest: 38 },
      { size: "L", chest: 44, shoulder: 20.5, length: 30, sleeve: 9.5, toFitChest: 40 },
      { size: "XL", chest: 46, shoulder: 21.5, length: 31, sleeve: 10, toFitChest: 42 },
      { size: "XXL", chest: 48, shoulder: 22.5, length: 32, sleeve: 10.5, toFitChest: 44 },
    ],
    product_variants: [
      {
        id: "var-obts-blk-s",
        size: "S",
        color: "Black",
        sku: "OBTS-BLK-S",
        stock_quantity: 42,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-obts-blk-m",
        size: "M",
        color: "Black",
        sku: "OBTS-BLK-M",
        stock_quantity: 27,
        reserved_stock: 5,
        low_stock_threshold: 15,
      },
      {
        id: "var-obts-blk-l",
        size: "L",
        color: "Black",
        sku: "OBTS-BLK-L",
        stock_quantity: 18,
        reserved_stock: 3,
        low_stock_threshold: 15,
      },
      {
        id: "var-obts-blk-xl",
        size: "XL",
        color: "Black",
        sku: "OBTS-BLK-XL",
        stock_quantity: 4,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-obts-blk-xxl",
        size: "XXL",
        color: "Black",
        sku: "OBTS-BLK-XXL",
        stock_quantity: 0,
        reserved_stock: 0,
        low_stock_threshold: 8,
      },
    ],
  },
  {
    id: "prod-premium-white-tee",
    name: "Premium White T-Shirt",
    slug: "premium-white-t-shirt",
    description:
      "Clean optic white premium cotton essential tee. Tailored modern streetwear fit with durable reinforced collar.",
    price: 899,
    mrp: 1499,
    is_tax_inclusive: true,
    currency: "INR",
    images: ["/products/zoro-olive-1.jpg", "/products/zoro-olive-2.jpg"],
    category: "Essential Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    stock_quantity: 75,
    is_active: true,
    tags: ["Essential", "White", "Featured"],
    highlights: [
      {
        id: "hl-pwt-1",
        image_url: "/products/zoro-olive-1.jpg",
        title: "180 GSM Ring-Spun Cotton",
        description: "Lightweight and ultra-breathable weave ideal for hot days and layering.",
        display_order: 1,
        is_active: true,
      },
      {
        id: "hl-pwt-2",
        image_url: "/products/zoro-olive-2.jpg",
        title: "Tailored Modern Regular Fit",
        description: "Clean silhouette cut close through the chest and shoulders without clinging.",
        display_order: 2,
        is_active: true,
      },
    ],
    specifications: [
      { id: "sp-pwt-1", label: "Fit", value: "Regular Fit", display_order: 1, is_active: true },
      { id: "sp-pwt-2", label: "Fabric", value: "100% Ring-Spun Cotton", display_order: 2, is_active: true },
      { id: "sp-pwt-3", label: "GSM", value: "180 GSM", display_order: 3, is_active: true },
      { id: "sp-pwt-4", label: "Neck", value: "Round Neck", display_order: 4, is_active: true },
      { id: "sp-pwt-5", label: "Sleeve", value: "Regular Half Sleeve", display_order: 5, is_active: true },
      { id: "sp-pwt-6", label: "Finish", value: "Bio-Washed & Silicon Softened", display_order: 6, is_active: true },
      { id: "sp-pwt-7", label: "Country of Origin", value: "India", display_order: 7, is_active: true },
    ],
    offers: [
      {
        id: "off-pwt-riotous10",
        title: "10% OFF ON ALL ORDERS",
        description: "Get 10% instant discount on your order with coupon code RIOTOUS10.",
        discount_type: "coupon",
        discount_value: 10,
        promo_code: "RIOTOUS10",
        minimum_quantity: 1,
        is_active: true,
        display_order: 1,
        terms_and_conditions: "Use coupon code RIOTOUS10 during checkout. Applies to entire order. Valid for single usage per user.",
      },
      {
        id: "off-pwt-flat100",
        title: "FLAT ₹100 OFF ON 2+ TEES",
        description: "Save ₹100 extra when purchasing any 2 or more essential tees.",
        discount_type: "fixed_amount",
        discount_value: 100,
        promo_code: "DOUBLE100",
        minimum_quantity: 2,
        is_active: true,
        display_order: 2,
        terms_and_conditions: "Add at least 2 tees to your cart and apply coupon DOUBLE100 to get ₹100 off your order total.",
      },
    ],
    features: [
      "100% Long-Staple Ring-Spun Cotton",
      "180 GSM lightweight, ultra-breathable weave",
      "Tailored regular fit designed for all-day comfort",
      "Zero-shrinkage pre-washed fabric",
      "Seamless ribbed crew neck with twin-needle collar stitching",
      "Tagless itch-free printed neck label",
    ],
    care_instructions: [
      "Machine wash cold (30°C) with similar light colors",
      "Use non-chlorine gentle detergent",
      "Tumble dry low or line dry in shade",
      "Iron on medium heat inside out",
      "Do not dry clean",
    ],
    manufacturing_info: {
      country_of_origin: "India",
      manufacturer: "RIOTOUS Mills & Apparel Unit 2, Surat, Gujarat - 395002",
      marketed_by: "RIOTOUS Brandworks LLP, Ahmedabad, Gujarat - 380015",
      customer_care: "support@riotous.in | +91 98765 43210 (Mon-Sat 10am-7pm)",
    },
    size_measurements: [
      { size: "S", chest: 38, shoulder: 17, length: 27, sleeve: 7.5, toFitChest: 36 },
      { size: "M", chest: 40, shoulder: 18, length: 28, sleeve: 8, toFitChest: 38 },
      { size: "L", chest: 42, shoulder: 19, length: 29, sleeve: 8.5, toFitChest: 40 },
      { size: "XL", chest: 44, shoulder: 20, length: 30, sleeve: 9, toFitChest: 42 },
      { size: "XXL", chest: 46, shoulder: 21, length: 31, sleeve: 9.5, toFitChest: 44 },
    ],
    product_variants: [
      {
        id: "var-pwt-wht-s",
        size: "S",
        color: "White",
        sku: "PWT-WHT-S",
        stock_quantity: 35,
        reserved_stock: 1,
        low_stock_threshold: 10,
      },
      {
        id: "var-pwt-wht-m",
        size: "M",
        color: "White",
        sku: "PWT-WHT-M",
        stock_quantity: 0,
        reserved_stock: 0,
        low_stock_threshold: 10,
      },
      {
        id: "var-pwt-wht-l",
        size: "L",
        color: "White",
        sku: "PWT-WHT-L",
        stock_quantity: 22,
        reserved_stock: 2,
        low_stock_threshold: 12,
      },
      {
        id: "var-pwt-wht-xl",
        size: "XL",
        color: "White",
        sku: "PWT-WHT-XL",
        stock_quantity: 3,
        reserved_stock: 1,
        low_stock_threshold: 8,
      },
      {
        id: "var-pwt-wht-xxl",
        size: "XXL",
        color: "White",
        sku: "PWT-WHT-XXL",
        stock_quantity: 15,
        reserved_stock: 0,
        low_stock_threshold: 5,
      },
    ],
  },
  {
    id: "prod-classic-red-tee",
    name: "Classic Red T-Shirt",
    slug: "classic-red-t-shirt",
    description:
      "Vibrant crimson red classic tee crafted from breathable ring-spun cotton. Ideal everyday casual wear.",
    price: 849,
    mrp: 1399,
    is_tax_inclusive: true,
    currency: "INR",
    images: ["/products/zenitsu-maroon-1.jpg", "/products/zenitsu-maroon-2.jpg"],
    category: "Classic Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Red"],
    stock_quantity: 67,
    is_active: true,
    tags: ["Classic", "Red", "Casual"],
    highlights: [
      {
        id: "hl-crts-1",
        image_url: "/products/zenitsu-maroon-1.jpg",
        title: "Rich Crimson Reactive Dye",
        description: "Resistant to wash fading, staying saturated through repeat cycles.",
        display_order: 1,
        is_active: true,
      },
      {
        id: "hl-crts-2",
        image_url: "/products/zenitsu-maroon-2.jpg",
        title: "Everyday Breathable Fit",
        description: "Versatile fit designed for comfort whether relaxing or on the move.",
        display_order: 2,
        is_active: true,
      },
    ],
    specifications: [
      { id: "sp-crts-1", label: "Fit", value: "Classic Fit", display_order: 1, is_active: true },
      { id: "sp-crts-2", label: "Fabric", value: "100% Combed Cotton", display_order: 2, is_active: true },
      { id: "sp-crts-3", label: "GSM", value: "190 GSM", display_order: 3, is_active: true },
      { id: "sp-crts-4", label: "Neck", value: "Crew Neck", display_order: 4, is_active: true },
      { id: "sp-crts-5", label: "Sleeve", value: "Short Sleeve", display_order: 5, is_active: true },
      { id: "sp-crts-6", label: "Pattern", value: "Solid", display_order: 6, is_active: true },
      { id: "sp-crts-7", label: "Country of Origin", value: "India", display_order: 7, is_active: true },
    ],
    offers: [
      {
        id: "off-crts-combo",
        title: "BUY 2 FOR ₹1,499",
        description: "Special bundle pricing when buying 2 classic tees together.",
        discount_type: "flat_price",
        discount_value: 1499,
        minimum_quantity: 2,
        is_active: true,
        display_order: 1,
        terms_and_conditions: "Bundle price of ₹1,499 applies automatically when 2 classic tees are added to bag. No coupon required.",
      },
    ],
    features: [
      "Colorfast reactive dyed yarn resistant to fading",
      "190 GSM comfortable weight cotton",
      "Reinforced neck tape for durability",
      "Tubular body construction without side seams",
      "Soft hand feel with pre-shrunk finish",
    ],
    care_instructions: [
      "Wash separately on first wash",
      "Machine wash cold inside-out",
      "Do not bleach",
      "Dry flat in shade",
      "Warm iron on reverse side",
    ],
    manufacturing_info: {
      country_of_origin: "India",
      manufacturer: "RIOTOUS Textiles Ltd, Coimbatore, Tamil Nadu - 641001",
      marketed_by: "RIOTOUS Brandworks LLP, Ahmedabad, Gujarat - 380015",
      customer_care: "care@riotous.in | +91 98765 43210",
    },
    size_measurements: [
      { size: "S", chest: 39, shoulder: 17.5, length: 27.5, sleeve: 8, toFitChest: 36 },
      { size: "M", chest: 41, shoulder: 18.5, length: 28.5, sleeve: 8.5, toFitChest: 38 },
      { size: "L", chest: 43, shoulder: 19.5, length: 29.5, sleeve: 9, toFitChest: 40 },
      { size: "XL", chest: 45, shoulder: 20.5, length: 30.5, sleeve: 9.5, toFitChest: 42 },
      { size: "XXL", chest: 47, shoulder: 21.5, length: 31.5, sleeve: 10, toFitChest: 44 },
    ],
    product_variants: [
      {
        id: "var-crts-red-s",
        size: "S",
        color: "Red",
        sku: "CRTS-RED-S",
        stock_quantity: 25,
        reserved_stock: 0,
        low_stock_threshold: 8,
      },
      {
        id: "var-crts-red-m",
        size: "M",
        color: "Red",
        sku: "CRTS-RED-M",
        stock_quantity: 8,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-crts-red-l",
        size: "L",
        color: "Red",
        sku: "CRTS-RED-L",
        stock_quantity: 30,
        reserved_stock: 4,
        low_stock_threshold: 10,
      },
      {
        id: "var-crts-red-xl",
        size: "XL",
        color: "Red",
        sku: "CRTS-RED-XL",
        stock_quantity: 12,
        reserved_stock: 1,
        low_stock_threshold: 8,
      },
      {
        id: "var-crts-red-xxl",
        size: "XXL",
        color: "Red",
        sku: "CRTS-RED-XXL",
        stock_quantity: 2,
        reserved_stock: 0,
        low_stock_threshold: 5,
      },
    ],
  },
  {
    id: "prod-heavyweight-grey-tee",
    name: "Heavyweight Grey T-Shirt",
    slug: "heavyweight-grey-t-shirt",
    description:
      "Charcoal heather grey 260 GSM ultra-heavyweight boxy tee. Built for structure and longevity.",
    price: 1149,
    mrp: 2299,
    is_tax_inclusive: true,
    currency: "INR",
    images: ["/products/zoro-black-2.jpg", "/products/zoro-black-1.jpg"],
    category: "Heavyweight Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Grey"],
    stock_quantity: 124,
    is_active: true,
    tags: ["Heavyweight", "Grey", "Streetwear"],
    highlights: [
      {
        id: "hl-hwg-1",
        image_url: "/products/zoro-black-2.jpg",
        title: "260 GSM Ultra-Heavyweight",
        description: "Our thickest jersey fabric holds a crisp architectural silhouette without collapsing.",
        display_order: 1,
        is_active: true,
      },
      {
        id: "hl-hwg-2",
        image_url: "/products/zoro-black-1.jpg",
        title: "1.25\" Chunky Ribbed Neck",
        description: "Heavy-gauge collar ribbing that stays flat and tight wear after wear.",
        display_order: 2,
        is_active: true,
      },
    ],
    specifications: [
      { id: "sp-hwg-1", label: "Fit", value: "Boxy Oversized Fit", display_order: 1, is_active: true },
      { id: "sp-hwg-2", label: "Fabric", value: "90% Cotton, 10% Heather Polyester", display_order: 2, is_active: true },
      { id: "sp-hwg-3", label: "GSM", value: "260 GSM", display_order: 3, is_active: true },
      { id: "sp-hwg-4", label: "Neck", value: "1.25\" Chunky Ribbed Neck", display_order: 4, is_active: true },
      { id: "sp-hwg-5", label: "Sleeve", value: "Extended Drop Half Sleeve", display_order: 5, is_active: true },
      { id: "sp-hwg-6", label: "Pattern", value: "Heather Melange", display_order: 6, is_active: true },
      { id: "sp-hwg-7", label: "Country of Origin", value: "India", display_order: 7, is_active: true },
    ],
    offers: [
      {
        id: "off-hwg-b2g1",
        title: "BUY 2 GET 1 FREE",
        description: "Add any 3 heavyweight products to your bag and get 1 free automatically.",
        discount_type: "buy_x_get_y",
        discount_value: 1,
        minimum_quantity: 3,
        is_active: true,
        display_order: 1,
        terms_and_conditions: "Buy 2 items and get 1 free at checkout. Applicable on all heavyweight tees. Lowest value item is discounted.",
      },
      {
        id: "off-hwg-save200",
        title: "EXTRA ₹200 OFF ON ₹2,000+",
        description: "Save ₹200 instantly on high-value cart totals with code HEAVY200.",
        discount_type: "fixed_amount",
        discount_value: 200,
        promo_code: "HEAVY200",
        minimum_quantity: 2,
        is_active: true,
        display_order: 2,
        terms_and_conditions: "Applies to orders of ₹2,000 or more containing at least 2 items. Use code HEAVY200 at checkout.",
      },
    ],
    features: [
      "Dense 260 GSM french terry jersey knit",
      "Retains crisp boxy silhouette even after 50+ washes",
      "Signature wide chunky collar ribbing",
      "Double-needle stitching across shoulders and hem",
      "Silicon washed for smooth, non-scratchy skin feel",
    ],
    care_instructions: [
      "Cold gentle cycle inside out",
      "Do not wring or twist fabric",
      "Lay flat to dry to maintain structural drape",
      "Cool iron if needed, do not dry clean",
    ],
    manufacturing_info: {
      country_of_origin: "India",
      manufacturer: "RIOTOUS Heavywear Works, Ludhiana, Punjab - 141007",
      marketed_by: "RIOTOUS Brandworks LLP, Ahmedabad, Gujarat - 380015",
      customer_care: "care@riotous.in | 1800-123-RIOT",
    },
    size_measurements: [
      { size: "S", chest: 42, shoulder: 19, length: 28.5, sleeve: 9, toFitChest: 36 },
      { size: "M", chest: 44, shoulder: 20, length: 29.5, sleeve: 9.5, toFitChest: 38 },
      { size: "L", chest: 46, shoulder: 21, length: 30.5, sleeve: 10, toFitChest: 40 },
      { size: "XL", chest: 48, shoulder: 22, length: 31.5, sleeve: 10.5, toFitChest: 42 },
      { size: "XXL", chest: 50, shoulder: 23, length: 32.5, sleeve: 11, toFitChest: 44 },
    ],
    product_variants: [
      {
        id: "var-hwg-gry-s",
        size: "S",
        color: "Grey",
        sku: "HWG-GRY-S",
        stock_quantity: 50,
        reserved_stock: 5,
        low_stock_threshold: 15,
      },
      {
        id: "var-hwg-gry-m",
        size: "M",
        color: "Grey",
        sku: "HWG-GRY-M",
        stock_quantity: 40,
        reserved_stock: 2,
        low_stock_threshold: 15,
      },
      {
        id: "var-hwg-gry-l",
        size: "L",
        color: "Grey",
        sku: "HWG-GRY-L",
        stock_quantity: 25,
        reserved_stock: 3,
        low_stock_threshold: 12,
      },
      {
        id: "var-hwg-gry-xl",
        size: "XL",
        color: "Grey",
        sku: "HWG-GRY-XL",
        stock_quantity: 9,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-hwg-gry-xxl",
        size: "XXL",
        color: "Grey",
        sku: "HWG-GRY-XXL",
        stock_quantity: 0,
        reserved_stock: 0,
        low_stock_threshold: 6,
      },
    ],
  },
  {
    id: "prod-streetwear-blue-tee",
    name: "Streetwear Blue T-Shirt",
    slug: "streetwear-blue-t-shirt",
    description:
      "Cobalt blue pigment-dyed relaxed fit tee with vintage wash finish and ribbed neckband.",
    price: 999,
    mrp: 1899,
    is_tax_inclusive: true,
    currency: "INR",
    images: ["/products/zenitsu-maroon-2.jpg", "/products/zenitsu-maroon-1.jpg"],
    category: "Oversized Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue"],
    stock_quantity: 77,
    is_active: true,
    tags: ["Streetwear", "Blue", "Vintage"],
    highlights: [
      {
        id: "hl-stb-1",
        image_url: "/products/zenitsu-maroon-2.jpg",
        title: "Vintage Pigment Garment Wash",
        description: "Specialized enzyme fade gives every piece a unique high-street patina.",
        display_order: 1,
        is_active: true,
      },
      {
        id: "hl-stb-2",
        image_url: "/products/zenitsu-maroon-1.jpg",
        title: "Relaxed Streetwear Silhouette",
        description: "Drop shoulder with slightly lengthened body for that effortless oversized look.",
        display_order: 2,
        is_active: true,
      },
    ],
    specifications: [
      { id: "sp-stb-1", label: "Fit", value: "Relaxed Streetwear Fit", display_order: 1, is_active: true },
      { id: "sp-stb-2", label: "Fabric", value: "100% Combed Cotton", display_order: 2, is_active: true },
      { id: "sp-stb-3", label: "GSM", value: "220 GSM", display_order: 3, is_active: true },
      { id: "sp-stb-4", label: "Neck", value: "Ribbed Crew Neck", display_order: 4, is_active: true },
      { id: "sp-stb-5", label: "Sleeve", value: "Drop Shoulder Half Sleeve", display_order: 5, is_active: true },
      { id: "sp-stb-6", label: "Finish", value: "Vintage Acid Wash", display_order: 6, is_active: true },
      { id: "sp-stb-7", label: "Country of Origin", value: "India", display_order: 7, is_active: true },
    ],
    offers: [
      {
        id: "off-stb-b2g1",
        title: "BUY 2 GET 1 FREE",
        description: "Mix & match any 3 streetwear tees and get 1 free automatically.",
        discount_type: "buy_x_get_y",
        discount_value: 1,
        minimum_quantity: 3,
        is_active: true,
        display_order: 1,
        terms_and_conditions: "Buy 2 streetwear tees and get 1 free automatically at checkout. Lowest value tee is free.",
      },
      {
        id: "off-stb-street15",
        title: "15% OFF STREETWEAR",
        description: "Get 15% off with coupon code STREET15.",
        discount_type: "percentage",
        discount_value: 15,
        promo_code: "STREET15",
        minimum_quantity: 1,
        is_active: true,
        display_order: 2,
        terms_and_conditions: "Apply promo code STREET15 at checkout to receive 15% discount on this item.",
      },
    ],
    features: [
      "Garment dyed for unique lived-in color variation",
      "220 GSM medium-heavy cotton jersey",
      "Preshrunk vintage wash hand-feel",
      "Cover-stitched neckline and sleeves",
      "Relaxed chest with comfortable drop shoulders",
    ],
    care_instructions: [
      "Wash separately first few washes (pigment wash may bleed slightly)",
      "Cold gentle wash with mild detergent",
      "Do not bleach",
      "Hang dry in shade to prevent fading",
      "Do not dry clean",
    ],
    manufacturing_info: {
      country_of_origin: "India",
      manufacturer: "RIOTOUS Dyehouse & Apparel, Tirupur, Tamil Nadu - 641602",
      marketed_by: "RIOTOUS Brandworks LLP, Ahmedabad, Gujarat - 380015",
      customer_care: "support@riotous.in | +91 98765 43210",
    },
    size_measurements: [
      { size: "S", chest: 41, shoulder: 18.5, length: 28, sleeve: 8.5, toFitChest: 36 },
      { size: "M", chest: 43, shoulder: 19.5, length: 29, sleeve: 9, toFitChest: 38 },
      { size: "L", chest: 45, shoulder: 20.5, length: 30, sleeve: 9.5, toFitChest: 40 },
      { size: "XL", chest: 47, shoulder: 21.5, length: 31, sleeve: 10, toFitChest: 42 },
      { size: "XXL", chest: 49, shoulder: 22.5, length: 32, sleeve: 10.5, toFitChest: 44 },
    ],
    product_variants: [
      {
        id: "var-stb-blu-s",
        size: "S",
        color: "Blue",
        sku: "STB-BLU-S",
        stock_quantity: 30,
        reserved_stock: 1,
        low_stock_threshold: 10,
      },
      {
        id: "var-stb-blu-m",
        size: "M",
        color: "Blue",
        sku: "STB-BLU-M",
        stock_quantity: 22,
        reserved_stock: 0,
        low_stock_threshold: 10,
      },
      {
        id: "var-stb-blu-l",
        size: "L",
        color: "Blue",
        sku: "STB-BLU-L",
        stock_quantity: 5,
        reserved_stock: 2,
        low_stock_threshold: 10,
      },
      {
        id: "var-stb-blu-xl",
        size: "XL",
        color: "Blue",
        sku: "STB-BLU-XL",
        stock_quantity: 19,
        reserved_stock: 1,
        low_stock_threshold: 8,
      },
      {
        id: "var-stb-blu-xxl",
        size: "XXL",
        color: "Blue",
        sku: "STB-BLU-XXL",
        stock_quantity: 11,
        reserved_stock: 0,
        low_stock_threshold: 6,
      },
    ],
  },
];
