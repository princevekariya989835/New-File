import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { fetchProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { EmptyProducts } from "@/components/empty-products";
import { ShopSkeleton } from "@/components/shop/shop-skeleton";
import { Search, X, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";

const productsQuery = {
  queryKey: ["products", "catalog", 200],
  queryFn: () => fetchProducts(200),
  staleTime: 1000 * 60,
  gcTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
};

type ShopSearch = {
  q?: string;
  size?: string;
  sort?: string;
  category?: string;
  department?: string;
  page?: number;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    size: typeof search.size === "string" ? search.size : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    department: typeof search.department === "string" ? search.department : undefined,
    page: typeof search.page === "number" ? Math.max(1, search.page) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop Oversized Streetwear & Graphic Tees | RIOTOUS" },
      {
        name: "description",
        content:
          "Browse the full RIOTOUS collection. Premium DTF printed oversized t-shirts, heavyweight combed cotton, and limited street drops made in India.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Shop Oversized Streetwear & Graphic Tees | RIOTOUS" },
      {
        property: "og:description",
        content:
          "Browse the full RIOTOUS collection. Premium DTF printed oversized t-shirts, heavyweight combed cotton, and limited street drops made in India.",
      },
      { property: "og:url", content: "https://riotous.store/shop" },
      { property: "og:image", content: "https://riotous.store/assets/hero-model.jpg" },
      { name: "twitter:image", content: "https://riotous.store/assets/hero-model.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/shop" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "RIOTOUS Streetwear Collection",
          url: "https://riotous.store/shop",
          description:
            "Browse the full RIOTOUS collection of premium DTF printed heavyweight oversized t-shirts made in India.",
          isPartOf: {
            "@type": "WebSite",
            name: "RIOTOUS",
            url: "https://riotous.store",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://riotous.store/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Shop",
              item: "https://riotous.store/shop",
            },
          ],
        }),
      },
    ],
  }),
  loader: async ({ context }) => {
    // Fast non-blocking prefetch capped at 2500ms so SSR HTML contains products without freezing
    await Promise.race([
      context.queryClient.ensureQueryData(productsQuery),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]).catch(() => { });
  },
  pendingComponent: () => (
    <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
      <div className="mb-12 max-w-3xl animate-pulse space-y-3">
        <div className="h-4 w-20 bg-muted/60 rounded" />
        <div className="h-12 w-3/4 bg-muted/60 rounded" />
      </div>
      <ShopSkeleton count={8} />
    </div>
  ),
  component: ShopPage,
});

function ShopPage() {
  const { data: rawProducts, isLoading, isError, refetch } = useQuery(productsQuery);
  const products = useMemo(() => (Array.isArray(rawProducts) ? rawProducts : []), [rawProducts]);
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { config } = usePublishedWebsiteConfig();
  const shopTxt = config?.shopContent;

  const pageTitle = shopTxt?.pageTitle || "The full collection.";
  const pageDesc = shopTxt?.pageDescription;
  const sortLbl = shopTxt?.sortLabel || "Sort";
  const filterLbl = shopTxt?.filterLabel || "Filter";
  const noProductsFound = shopTxt?.noProductsFoundText || "No matching products found";

  const [sort, setSort] = useState(searchParams.sort || "featured");
  const [size, setSize] = useState<string>(searchParams.size || "all");
  const [q, setQ] = useState(searchParams.q || "");

  useEffect(() => {
    setQ(searchParams.q || "");
  }, [searchParams.q]);

  const sizes = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => {
      p.node.options.forEach((o) => {
        if (o.name.toLowerCase() === "size") o.values.forEach((v) => s.add(v));
      });
    });
    return Array.from(s);
  }, [products]);

  const categories = useMemo(() => {
    const c = new Set<string>();
    products.forEach((p) => {
      if (p.node.productType && p.node.productType.trim()) {
        c.add(p.node.productType.trim());
      }
    });
    return Array.from(c).sort();
  }, [products]);

  const handleQueryChange = (val: string) => {
    setQ(val);
    navigate({
      search: (prev: any) => ({
        ...prev,
        q: val.trim() ? val : undefined,
      }),
      replace: true,
    });
  };

  const clearAllFilters = () => {
    setQ("");
    setSize("all");
    setSort("featured");
    navigate({
      search: {},
      replace: true,
    });
  };

  const filtered = useMemo(() => {
    let list = products;

    // Department filter (?department=men / ?department=women)
    if (searchParams.department?.trim() && searchParams.department.toLowerCase().trim() !== "all") {
      const dept = searchParams.department.toLowerCase().trim();
      list = list.filter((p) => {
        const pDept = (p.node.department || "men").toLowerCase().trim();
        return pDept === dept || pDept === "unisex";
      });
    }

    // Category filter (?category=oversized-tees / ?category=men / etc.)
    if (searchParams.category?.trim() && searchParams.category.toLowerCase().trim() !== "all") {
      const rawCat = searchParams.category.toLowerCase().trim();
      const normCat = rawCat.replace(/[-_\s]+/g, " ");
      list = list.filter((p) => {
        const pType = (p.node.productType || "").toLowerCase().trim();
        const normPType = pType.replace(/[-_\s]+/g, " ");
        const pDept = (p.node.department || "").toLowerCase().trim();

        // Support department passed as category parameter
        if (pDept === rawCat) return true;

        // Exact or normalized match against productType
        if (pType === rawCat || normPType === normCat) return true;

        // Tag match
        return (p.node.tags || []).some((t) => {
          const lt = t.toLowerCase().trim();
          return lt === rawCat || lt.replace(/[-_\s]+/g, " ") === normCat;
        });
      });
    }

    // Search query
    if (q.trim()) {
      const term = q.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.node.title.toLowerCase().includes(term) ||
          p.node.description?.toLowerCase().includes(term) ||
          p.node.productType?.toLowerCase().includes(term) ||
          (p.node.department && p.node.department.toLowerCase().includes(term)) ||
          p.node.tags?.some((t) => t.toLowerCase().includes(term)),
      );
    }

    // Size filter
    if (size !== "all") {
      list = list.filter((p) =>
        p.node.options.some(
          (o) =>
            o.name.toLowerCase() === "size" &&
            o.values.map((v) => v.toLowerCase()).includes(size.toLowerCase()),
        ),
      );
    }

    const arr = [...list];
    if (sort === "price-asc") {
      arr.sort(
        (a, b) =>
          parseFloat(a.node.priceRange.minVariantPrice.amount) -
          parseFloat(b.node.priceRange.minVariantPrice.amount),
      );
    } else if (sort === "price-desc") {
      arr.sort(
        (a, b) =>
          parseFloat(b.node.priceRange.minVariantPrice.amount) -
          parseFloat(a.node.priceRange.minVariantPrice.amount),
      );
    } else if (sort === "title") {
      arr.sort((a, b) => a.node.title.localeCompare(b.node.title));
    }
    return arr;
  }, [products, sort, size, q, searchParams.category, searchParams.department]);

  const PAGE_SIZE = 24;
  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
      replace: true,
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 350, behavior: "smooth" });
    }
  };

  const hasActiveFilters = Boolean(
    q.trim() ||
    (searchParams.category && searchParams.category !== "all") ||
    (searchParams.department && searchParams.department !== "all") ||
    size !== "all"
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
      <div className="mb-10 max-w-3xl">
        <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">
          {q.trim() ? `Search: "${q.trim()}"` : pageTitle}
        </h1>
        {pageDesc && !q.trim() && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {pageDesc}
          </p>
        )}
        {q.trim() && (
          <p className="mt-2 text-sm text-muted-foreground">
            Showing results for "{q.trim()}".{" "}
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="font-semibold text-brand-red underline-offset-4 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-red rounded-xs"
            >
              Clear filter
            </button>
          </p>
        )}
      </div>

      {products.length > 0 && (
        <div className="mb-8 border-b border-border py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {filterLbl}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs md:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/65 transition-colors" />
              <input
                type="text"
                value={q}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search products by keyword…"
                aria-label="Search products by keyword"
                className="h-10 w-full rounded-full border border-border bg-card/60 pl-10 pr-8 text-sm outline-none transition-colors focus:border-brand-red focus:bg-background placeholder:text-muted-foreground"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Controls & Item Count Group */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                {filtered.length} {filtered.length === 1 ? "item" : "items"}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {categories.length > 0 && (
                  <Select
                    value={searchParams.category || "all"}
                    onValueChange={(val) => {
                      navigate({
                        search: (prev: any) => ({
                          ...prev,
                          category: val === "all" ? undefined : val,
                        }),
                        replace: true,
                      });
                    }}
                  >
                    <SelectTrigger className="h-10 w-[140px] sm:w-[155px] rounded-full border-border bg-card/60">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {sizes.length > 0 && (
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="h-10 w-[125px] sm:w-[130px] rounded-full border-border bg-card/60">
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sizes</SelectItem>
                      {sizes.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-10 w-[150px] sm:w-[160px] rounded-full border-border bg-card/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="title">A → Z</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Active filters:</span>
          {q.trim() && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              Search: "{q.trim()}"
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 cursor-pointer"
                aria-label="Remove search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {searchParams.department && searchParams.department !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
              Department: {searchParams.department}
              <button
                type="button"
                onClick={() =>
                  navigate({
                    search: (prev: any) => ({ ...prev, department: undefined }),
                    replace: true,
                  })
                }
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 cursor-pointer"
                aria-label="Remove department filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {searchParams.category && searchParams.category !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
              Category: {searchParams.category}
              <button
                type="button"
                onClick={() =>
                  navigate({
                    search: (prev: any) => ({ ...prev, category: undefined }),
                    replace: true,
                  })
                }
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 cursor-pointer"
                aria-label="Remove category filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {size !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              Size: {size}
              <button
                type="button"
                onClick={() => setSize("all")}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 cursor-pointer"
                aria-label="Remove size filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-brand-red underline-offset-4 hover:underline cursor-pointer ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Content Rendering: Loading, Error, Empty, and Success */}
      {isLoading && products.length === 0 ? (
        <ShopSkeleton count={8} />
      ) : isError && products.length === 0 ? (
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">Unable to load products</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            We encountered an issue connecting to the catalog. Please try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-6 btn-primary bg-brand-red text-white hover:bg-brand-red/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        products.length > 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">{noProductsFound}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {q.trim()
                ? `We couldn't find any products matching "${q}". Try adjusting your filters or search keywords.`
                : "No products match the selected filters. Try clearing your filters to view all products."}
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-6 btn-primary bg-brand-red text-white hover:bg-brand-red/90"
            >
              Clear Filters & View All ({products.length})
            </button>
          </div>
        ) : (
          <EmptyProducts />
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {paginatedProducts.map((p, idx) => (
              <ProductCard key={p.node.id} product={p} priority={idx < 4} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-14 flex flex-col sm:flex-row items-center justify-between border-t border-border pt-6 gap-4">
              <span className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} products
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="h-9 px-3.5 rounded-full text-xs font-medium cursor-pointer"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pNum = i + 1;
                    const isCur = pNum === currentPage;
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => handlePageChange(pNum)}
                        className={`h-8 w-8 rounded-full text-xs font-semibold transition cursor-pointer ${
                          isCur
                            ? "bg-brand-red text-white"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="h-9 px-3.5 rounded-full text-xs font-medium cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
