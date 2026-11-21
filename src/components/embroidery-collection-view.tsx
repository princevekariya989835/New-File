import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { fetchEmbroideryProductsServerFn } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Search,
  X,
  ShoppingBag,
} from "lucide-react";

export function EmbroideryCollectionView() {
  const getEmbroideryFn = useServerFn(fetchEmbroideryProductsServerFn);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "newest">("featured");

  const query = useQuery({
    queryKey: ["public", "embroidery-products"],
    queryFn: () => getEmbroideryFn({ data: {} }),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const products = query.data || [];

  const title = "EMBROIDERY COLLECTION";
  const subtitle = "Premium embroidery. Made to stand out. Handcrafted high-density thread work on heavyweight streetwear cotton.";

  // Derive categories present in embroidery products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      const type = p.node.productType?.trim();
      if (type) cats.add(type);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Client-side filtering & sorting
  const displayedProducts = useMemo(() => {
    let result = [...products];

    // Filter by category
    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter(
        (p) => (p.node.productType || "").toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.node.title.toLowerCase().includes(q) ||
          p.node.tags.some((t) => t.toLowerCase().includes(q)) ||
          (p.node.productType || "").toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortBy === "price-asc") {
      result.sort(
        (a, b) =>
          parseFloat(a.node.priceRange.minVariantPrice.amount) -
          parseFloat(b.node.priceRange.minVariantPrice.amount),
      );
    } else if (sortBy === "price-desc") {
      result.sort(
        (a, b) =>
          parseFloat(b.node.priceRange.minVariantPrice.amount) -
          parseFloat(a.node.priceRange.minVariantPrice.amount),
      );
    } else if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.node.updatedAt || b.node.createdAt || 0).getTime() -
          new Date(a.node.updatedAt || a.node.createdAt || 0).getTime(),
      );
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== "" || selectedCategory !== "all";

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      {/* Breadcrumb & Navigation Bar */}
      <div className="border-b border-[#F3F3F3] bg-white pt-24 md:pt-28">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12 py-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Link to="/" className="hover:text-black transition">
              Home
            </Link>
            <ChevronRight className="h-3 w-3 text-zinc-400" />
            <Link to="/shop" className="hover:text-black transition">
              Shop
            </Link>
            <ChevronRight className="h-3 w-3 text-zinc-400" />
            <span className="text-[#ED171F] font-bold">Embroidery</span>
          </nav>
        </div>
      </div>

      {/* Page Header */}
      <section className="border-b border-[#F3F3F3] bg-[#FAFAFA] py-12 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#111111]/10 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#ED171F] shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#ED171F]" />
              HAND-CRAFTED EMBROIDERY
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#111111] leading-[0.95]">
              {title}
              <span className="text-[#ED171F]">.</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-600 font-normal leading-relaxed">
              {subtitle}
            </p>

            <div className="flex items-center gap-4 pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-black transition"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Full Shop
              </Link>
              {products.length > 0 && (
                <>
                  <span className="h-4 w-px bg-zinc-300" />
                  <span className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">
                    {products.length} {products.length === 1 ? "Product" : "Products"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Sorting Controls */}
      {products.length > 0 && (
        <section className="border-b border-[#F3F3F3] bg-white sticky top-[68px] z-20 backdrop-blur-md bg-white/95">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12 py-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search within embroidery */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in Embroidery…"
                  className="pl-8.5 pr-8 h-9 text-xs bg-zinc-50 border-zinc-200 focus:bg-white rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category & Sort controls */}
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
                {categories.length > 0 && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700 cursor-pointer focus:bg-white"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700 cursor-pointer focus:bg-white"
                >
                  <option value="featured">Featured Order</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest Drops</option>
                </select>

                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setSortBy("featured");
                    }}
                    className="h-9 text-xs font-bold text-[#ED171F] hover:bg-red-50 hover:text-red-700"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Active search results counter */}
            {hasActiveFilters && (
              <div className="pt-2 text-[11px] text-zinc-500 font-medium">
                Showing {displayedProducts.length} of {products.length} products
              </div>
            )}
          </div>
        </section>
      )}

      {/* Products Grid / Empty State */}
      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12">
          {query.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/5] w-full rounded-xl bg-zinc-100" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-100" />
                  <Skeleton className="h-4 w-1/2 bg-zinc-100" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            /* Proper Empty State: No Embroidery items yet */
            <div className="mx-auto max-w-lg text-center py-16 px-6 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-[#ED171F] mb-4 shadow-xs">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-900">
                Embroidery Drops Coming Soon
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                Our bespoke embroidered pieces are in production. Check back soon for hand-crafted high-density thread drops or explore our full streetwear catalog.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="h-12 bg-[#111111] px-8 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ED171F]">
                  <Link to="/shop">
                    <ShoppingBag className="mr-2 h-4 w-4" /> Browse All Products
                  </Link>
                </Button>
              </div>
            </div>
          ) : displayedProducts.length === 0 ? (
            /* Filter produced 0 results */
            <div className="mx-auto max-w-md text-center py-16 px-6 border border-zinc-200 rounded-2xl bg-zinc-50">
              <p className="text-sm font-semibold text-zinc-900">No matching embroidery products found</p>
              <p className="mt-1 text-xs text-zinc-500">Try adjusting your search query or category filter.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-4 text-xs font-bold"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            /* Responsive Product Grid */
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4">
              {displayedProducts.map((p) => (
                <ProductCard key={p.node.id} product={p} priority={false} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

