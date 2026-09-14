export interface VariantRow {
  id: string;
  size: string;
  color: string;
  sku?: string;
  stock_quantity: number;
  reserved_stock: number;
  low_stock_threshold: number;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  images: string[];
  category: string | null;
  sizes: string[];
  colors: string[];
  stock_quantity: number;
  is_active: boolean;
  tags: string[];
  product_variants?: VariantRow[];
}

export const FALLBACK_PRODUCTS: ProductRow[] = [
  {
    id: "prod-oversized-black-tee",
    name: "Oversized Black T-Shirt",
    slug: "oversized-black-t-shirt",
    description:
      "Heavyweight 240 GSM combed cotton oversized streetwear tee in solid black. Drop-shoulder relaxed boxy fit.",
    price: 999,
    currency: "INR",
    images: ["/products/zoro-black-1.jpg", "/products/zoro-black-2.jpg"],
    category: "Oversized Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    stock_quantity: 91,
    is_active: true,
    tags: ["Oversized", "Bestseller", "Essentials"],
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
    currency: "INR",
    images: ["/products/zoro-olive-1.jpg", "/products/zoro-olive-2.jpg"],
    category: "Essential Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    stock_quantity: 75,
    is_active: true,
    tags: ["Essential", "White", "Featured"],
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
    currency: "INR",
    images: ["/products/zenitsu-maroon-1.jpg", "/products/zenitsu-maroon-2.jpg"],
    category: "Classic Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Red"],
    stock_quantity: 67,
    is_active: true,
    tags: ["Classic", "Red", "Casual"],
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
    currency: "INR",
    images: ["/products/zoro-black-2.jpg", "/products/zoro-black-1.jpg"],
    category: "Heavyweight Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Grey"],
    stock_quantity: 124,
    is_active: true,
    tags: ["Heavyweight", "Grey", "Streetwear"],
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
    currency: "INR",
    images: ["/products/zenitsu-maroon-2.jpg", "/products/zenitsu-maroon-1.jpg"],
    category: "Oversized Tees",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue"],
    stock_quantity: 77,
    is_active: true,
    tags: ["Streetwear", "Blue", "Vintage"],
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
