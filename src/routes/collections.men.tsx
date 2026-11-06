import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useRef } from "react";
import {
  fetchDepartmentProducts,
  fetchCategoriesByDepartment,
  type CatalogProduct,
} from "@/lib/catalog";
import { getPublicFeaturedCollection } from "@/lib/featured-collections.functions";
import { ProductCard } from "@/components/product-card";
import { ShopSkeleton } from "@/components/shop/shop-skeleton";
import {
  Search,
  X,
  ArrowRight,
  Sparkles,
  Flame,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MenSearch = {
  q?: string;
  category?: string;
  subcategory?: string;
  size?: string;
  sort?: string;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  availability?: string;
  discountOnly?: boolean;
};

export const Route = createFileRoute("/collections/men")({
  validateSearch: (search: Record<string, unknown>): MenSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    subcategory: typeof search.subcategory === "string" ? search.subcategory : undefined,
    size: typeof search.size === "string" ? search.size : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
    page: typeof search.page === "number" ? search.page : undefined,
    minPrice: typeof search.minPrice === "number" ? search.minPrice : undefined,
    maxPrice: typeof search.maxPrice === "number" ? search.maxPrice : undefined,
    availability: typeof search.availability === "string" ? search.availability : undefined,
    discountOnly: typeof search.discountOnly === "boolean" ? search.discountOnly : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Men's Oversized Streetwear & Graphic Tees | RIOTOUS" },
      {
        name: "description",
        content:
          "Unapologetic streetwear. Discover men's heavyweight 240+ GSM DTF graphic oversized t-shirts, drop-shoulder silhouettes and hoodies built to last.",
      },
      { property: "og:title", content: "RIOTOUS Men — Streetwear Collection" },
      {
        property: "og:description",
        content: "Discover heavyweight graphic tees and oversized cuts designed for the streets.",
      },
      { property: "og:url", content: "https://riotous.store/collections/men" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/collections/men" }],
  }),
  component: MenCollectionPage,
});

export function MenCollectionPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: "/collections/men" });
  const catalogRef = useRef<HTMLDivElement>(null);

  const [localSearch, setLocalSearch] = useState(searchParams.q || "");

  // 1. Fetch categories for Men dynamically
  const categoriesQ = useQuery({
    queryKey: ["categories", "men"],
    queryFn: () => fetchCategoriesByDepartment("men"),
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch main paginated catalog for Men
  const productsQ = useQuery({
    queryKey: [
      "department-products",
      "men",
      searchParams.category,
      searchParams.subcategory,
      searchParams.size,
      searchParams.sort,
      searchParams.page,
      searchParams.q,
      searchParams.minPrice,
      searchParams.maxPrice,
      searchParams.availability,
      searchParams.discountOnly,
    ],
    queryFn: () =>
      fetchDepartmentProducts({
        department: "men",
        category: searchParams.category,
        subcategory: searchParams.subcategory,
        size: searchParams.size,
        sort: (searchParams.sort as any) || "featured",
        page: searchParams.page || 1,
        q: searchParams.q,
        minPrice: searchParams.minPrice,
        maxPrice: searchParams.maxPrice,
        availability: (searchParams.availability as any) || "all",
        discountOnly: searchParams.discountOnly,
        limit: 24,
        includeUnisex: true,
      }),
    staleTime: 1000 * 60,
  });

  const categories = categoriesQ.data || productsQ.data?.categories || [];
  const catalogData = productsQ.data;
  const products = catalogData?.products || [];
  const trendingProducts = useMemo(
    () => productsQ.data?.trending || [],
    [productsQ.data?.trending]
  );
  const newArrivals = useMemo(
    () => productsQ.data?.newArrivals || [],
    [productsQ.data?.newArrivals]
  );
  const bestSellers = useMemo(
    () => productsQ.data?.bestSellers || [],
    [productsQ.data?.bestSellers]
  );

  const getColFn = useServerFn(getPublicFeaturedCollection);
  const menBsQ = useQuery({
    queryKey: ["public", "featured-collection", "men_best_sellers"],
    queryFn: () => getColFn({ data: { id: "men_best_sellers" } }),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
  const menLeQ = useQuery({
    queryKey: ["public", "featured-collection", "men_latest_edition"],
    queryFn: () => getColFn({ data: { id: "men_latest_edition" } }),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const displayBestSellers = useMemo(() => {
    if (menBsQ.data?.isEnabled && menBsQ.data?.products && menBsQ.data.products.length > 0) {
      return menBsQ.data.products.slice(0, 4);
    }
    return bestSellers.slice(0, 4);
  }, [menBsQ.data, bestSellers]);

  const displayLatestEdition = useMemo(() => {
    if (menLeQ.data?.isEnabled && menLeQ.data?.products && menLeQ.data.products.length > 0) {
      return menLeQ.data.products.slice(0, 4);
    }
    return newArrivals.slice(0, 4);
  }, [menLeQ.data, newArrivals]);

  const updateSearch = (newParams: Partial<MenSearch>) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        ...newParams,
        page: newParams.page !== undefined ? newParams.page : 1,
      }),
    });
  };

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
  };



  return (
    <div className="min-h-screen bg-white text-[#111111]">
      {/* ======================================================== */}
      {/* SECTION 1: HERO (Men's Streetwear Header)                 */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden border-b border-[#F3F3F3] bg-white pt-24 md:pt-28">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12">
          <div className="grid min-h-[580px] items-center gap-10 py-12 lg:grid-cols-12 lg:gap-16">
            {/* Left Content Column */}
            <div className="space-y-6 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#111111]/10 bg-[#F3F3F3] px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#ED171F]">
                <Sparkles className="h-3.5 w-3.5 fill-[#ED171F]" />
                RIOTOUS MEN
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tight text-[#111111] sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95]">
                UNAPOLOGETIC STREETWEAR<span className="text-[#ED171F]">.</span>
              </h1>

              <p className="max-w-xl text-base text-[#111111]/70 sm:text-lg md:text-xl font-normal leading-relaxed">
                Heavyweight 240+ GSM graphic oversized tees, drop-shoulder silhouettes and raw street
                aesthetics engineered for longevity.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button
                  size="lg"
                  onClick={scrollToCatalog}
                  className="h-13 bg-[#111111] px-8 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-[#ED171F] cursor-pointer"
                >
                  SHOP MEN
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToCatalog}
                  className="h-13 border-2 border-[#111111] bg-transparent px-8 text-sm font-bold uppercase tracking-wider text-[#111111] hover:bg-[#111111] hover:text-white transition-all cursor-pointer"
                >
                  EXPLORE COLLECTION
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4 text-xs font-semibold uppercase tracking-wider text-[#111111]/60">
                <div>
                  <span className="block text-xl font-black text-[#111111]">100% COTTON</span>
                  Combed Super-Dense Knit
                </div>
                <div className="h-8 w-px bg-[#111111]/10" />
                <div>
                  <span className="block text-xl font-black text-[#111111]">BOX FIT</span>
                  Drop Shoulder Tailoring
                </div>
              </div>
            </div>

            {/* Right Model Imagery */}
            <div className="relative lg:col-span-6">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[540px] overflow-hidden rounded-2xl bg-[#F3F3F3] shadow-2xl">
                <img
                  src="/assets/hero-model.jpg"
                  alt="RIOTOUS Men Streetwear Collection"
                  className="h-full w-full object-cover object-top transition duration-700 hover:scale-105"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/80">
                      Core Heavyweight Drops
                    </span>
                    <h3 className="text-xl font-bold uppercase tracking-tight">Oversized DTF Street Tees</h3>
                  </div>
                  <div className="rounded-full bg-white/20 p-2.5 backdrop-blur-md">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 3: TRENDING PRODUCTS                             */}
      {/* ======================================================== */}
      {trendingProducts.length > 0 && (
        <section className="border-b border-[#F3F3F3] bg-[#F3F3F3]/50 py-16 md:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#ED171F]">
                  <Flame className="h-3.5 w-3.5 fill-[#ED171F]" /> Street Favorites
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] md:text-5xl">
                  TRENDING NOW
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={scrollToCatalog}
                className="border-[#111111] text-xs font-bold uppercase tracking-wider hover:bg-[#111111] hover:text-white"
              >
                VIEW ALL
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {trendingProducts.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* SECTION 4: LATEST EDITION                                */}
      {/* ======================================================== */}
      {displayLatestEdition.length > 0 && (
        <section className="border-b border-[#F3F3F3] bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#ED171F]">
                  <Clock className="h-3.5 w-3.5" /> Latest Season Drops
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] md:text-5xl">
                  LATEST EDITION
                </h2>
              </div>
              <Link
                to="/collections/men/latest-edition"
                className="text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#ED171F] flex items-center gap-1.5 transition"
              >
                View Latest Edition <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {displayLatestEdition.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* SECTION 5: BEST SELLERS                                  */}
      {/* ======================================================== */}
      {displayBestSellers.length > 0 && (
        <section className="border-b border-[#F3F3F3] bg-[#F3F3F3]/50 py-16 md:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#ED171F]">
                  <TrendingUp className="h-3.5 w-3.5" /> Verified Customer Favorites
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] md:text-5xl">
                  BEST SELLERS
                </h2>
              </div>
              <Link
                to="/collections/men/best-sellers"
                className="text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#ED171F] flex items-center gap-1.5 transition"
              >
                Shop Best Sellers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {displayBestSellers.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* SECTION 6: BRAND STATEMENT                               */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden bg-[#111111] py-20 md:py-28 text-white">
        <div className="mx-auto max-w-[1200px] px-6 text-center">
          <span className="inline-block rounded-full bg-[#ED171F]/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#ED171F] mb-6">
            The RIOTOUS Standard
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[1.05]">
            ENGINEERED FOR THE STREETS<span className="text-[#ED171F]">.</span>
            <br />
            BUILT TO LAST<span className="text-[#ED171F]">.</span>
          </h2>
          <p className="mt-6 max-w-xl mx-auto text-base text-white/70 leading-relaxed font-normal">
            Every garment begins with our custom heavyweight French terry and premium DTF print
            process for colors that never fade and zero cracking after wash.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              onClick={scrollToCatalog}
              className="h-14 bg-[#ED171F] px-10 text-sm font-bold uppercase tracking-widest text-white hover:bg-white hover:text-[#111111] transition-all cursor-pointer"
            >
              EXPLORE RIOTOUS MEN
            </Button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 7: FULL CATALOG GRID                             */}
      {/* ======================================================== */}
      <section ref={catalogRef} className="py-16 md:py-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12">
          {/* Section Header */}
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ED171F]">
              All Products
            </span>
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] md:text-4xl">
              MEN'S COLLECTION CATALOG
            </h2>
            <p className="text-xs text-[#111111]/60 mt-1">
              Showing {products.length} of {catalogData?.total || products.length} piece(s)
            </p>
          </div>

          {/* Filter Bar Controls */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F3F3F3] bg-[#F3F3F3]/60 p-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111111]/40" />
              <Input
                placeholder="Search men's tees…"
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  updateSearch({ q: e.target.value || undefined });
                }}
                className="h-10 pl-9 bg-white text-xs border-transparent focus:border-[#111111]"
              />
              {localSearch && (
                <button
                  onClick={() => {
                    setLocalSearch("");
                    updateSearch({ q: undefined });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#111111]/40 hover:text-[#111111]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Select */}
              <select
                value={searchParams.category || ""}
                onChange={(e) => updateSearch({ category: e.target.value || undefined })}
                className="h-10 rounded-lg border border-transparent bg-white px-3 text-xs font-medium text-[#111111] shadow-xs cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Size Filter */}
              <select
                value={searchParams.size || ""}
                onChange={(e) => updateSearch({ size: e.target.value || undefined })}
                className="h-10 rounded-lg border border-transparent bg-white px-3 text-xs font-medium text-[#111111] shadow-xs cursor-pointer"
              >
                <option value="">All Sizes</option>
                {["S", "M", "L", "XL", "XXL"].map((s) => (
                  <option key={s} value={s}>
                    Size: {s}
                  </option>
                ))}
              </select>

              {/* Sorting Filter */}
              <select
                value={searchParams.sort || "featured"}
                onChange={(e) => updateSearch({ sort: e.target.value })}
                className="h-10 rounded-lg border border-transparent bg-white px-3 text-xs font-medium text-[#111111] shadow-xs cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest Drops</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="best-selling">Best Selling</option>
              </select>

              {/* Availability Filter */}
              <button
                type="button"
                onClick={() =>
                  updateSearch({
                    availability: searchParams.availability === "in_stock" ? undefined : "in_stock",
                  })
                }
                className={`h-10 rounded-lg px-3 text-xs font-medium transition cursor-pointer ${
                  searchParams.availability === "in_stock"
                    ? "bg-[#111111] text-white"
                    : "bg-white text-[#111111] hover:bg-[#111111]/5"
                }`}
              >
                In Stock Only
              </button>

              {/* Discount Only */}
              <button
                type="button"
                onClick={() => updateSearch({ discountOnly: !searchParams.discountOnly || undefined })}
                className={`h-10 rounded-lg px-3 text-xs font-medium transition cursor-pointer ${
                  searchParams.discountOnly
                    ? "bg-[#ED171F] text-white"
                    : "bg-white text-[#111111] hover:bg-[#111111]/5"
                }`}
              >
                Offers &amp; Sales
              </button>

              {(searchParams.category ||
                searchParams.size ||
                searchParams.sort ||
                searchParams.q ||
                searchParams.availability ||
                searchParams.discountOnly) && (
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      search: {},
                    })
                  }
                  className="h-10 px-3 text-xs font-semibold text-[#ED171F] hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Active Category Pills */}
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <button
              onClick={() => updateSearch({ category: undefined })}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                !searchParams.category
                  ? "bg-[#111111] text-white"
                  : "bg-[#F3F3F3] text-[#111111] hover:bg-[#111111]/10"
              }`}
            >
              All Men
            </button>
            {categories.map((c: any) => {
              const active = searchParams.category?.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.id}
                  onClick={() => updateSearch({ category: active ? undefined : c.name })}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-[#111111] text-white"
                      : "bg-[#F3F3F3] text-[#111111] hover:bg-[#111111]/10"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          {productsQ.isLoading ? (
            <ShopSkeleton count={8} />
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#111111]/20 p-16 text-center">
              <h3 className="text-xl font-bold uppercase tracking-tight text-[#111111]">
                No Men's Products Found
              </h3>
              <p className="mt-2 text-sm text-[#111111]/60">
                No items match your active filters. Try clearing your search or category selection.
              </p>
              <Button
                variant="outline"
                className="mt-6 border-[#111111] text-xs font-bold uppercase"
                onClick={() => navigate({ search: {} })}
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                {products.map((p, idx) => (
                  <ProductCard key={p.node.id} product={p} priority={idx < 4} />
                ))}
              </div>

              {/* Pagination Controls */}
              {catalogData && catalogData.totalPages > 1 && (
                <div className="mt-14 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={catalogData.page <= 1}
                    onClick={() => updateSearch({ page: catalogData.page - 1 })}
                    className="border-[#111111] text-xs font-bold uppercase"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: catalogData.totalPages }, (_, i) => i + 1).map((pg) => (
                    <Button
                      key={pg}
                      size="sm"
                      variant={pg === catalogData.page ? "default" : "outline"}
                      onClick={() => updateSearch({ page: pg })}
                      className={`h-9 w-9 text-xs font-bold ${
                        pg === catalogData.page
                          ? "bg-[#111111] text-white"
                          : "border-[#111111] text-[#111111]"
                      }`}
                    >
                      {pg}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!catalogData.hasMore}
                    onClick={() => updateSearch({ page: catalogData.page + 1 })}
                    className="border-[#111111] text-xs font-bold uppercase"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

