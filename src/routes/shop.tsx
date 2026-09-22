import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { fetchProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { EmptyProducts } from "@/components/empty-products";
import { ShopSkeleton } from "@/components/shop/shop-skeleton";
import { Search, X, AlertCircle, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";

const productsQuery = {
  queryKey: ["products", "catalog", 50],
  queryFn: () => fetchProducts(50),
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
};

type ShopSearch = {
  q?: string;
  size?: string;
  sort?: string;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    size: typeof search.size === "string" ? search.size : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop Oversized Streetwear & Graphic Tees | RIOTOUS" },
      {
        name: "description",
        content:
          "Browse the full RIOTOUS collection. DTF printed tees, oversized fits, and limited drops.",
      },
      { property: "og:title", content: "Shop Oversized Streetwear & Graphic Tees | RIOTOUS" },
      {
        property: "og:description",
        content: "Browse the full RIOTOUS collection.",
      },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
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
    ],
  }),
  loader: async ({ context }) => {
    // Fast non-blocking prefetch capped at 1500ms so SSR HTML contains products without freezing
    await Promise.race([
      context.queryClient.ensureQueryData(productsQuery),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).catch(() => {});
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

  const handleQueryChange = (val: string) => {
    setQ(val);
    navigate({
      search: (prev) => ({
        ...prev,
        q: val.trim() ? val : undefined,
      }),
      replace: true,
    });
  };

  const filtered = useMemo(() => {
    let list = products;
    if (q.trim()) {
      const term = q.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.node.title.toLowerCase().includes(term) ||
          p.node.description?.toLowerCase().includes(term) ||
          p.node.productType?.toLowerCase().includes(term) ||
          p.node.tags?.some((t) => t.toLowerCase().includes(term)),
      );
    }

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
  }, [products, sort, size, q]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
      <div className="mb-12 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          {filterLbl}
        </p>
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
              className="text-brand-red underline hover:opacity-80"
            >
              Clear filter
            </button>
          </p>
        )}
      </div>

      {products.length > 0 && (
        <div className="-mx-6 mb-8 border-b border-border bg-background/95 px-6 py-4 backdrop-blur-xl md:-mx-10 md:px-10 shadow-sm">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search products by keyword…"
                  className="h-10 w-full rounded-full border border-border bg-card/60 pl-9 pr-8 text-sm outline-none transition-colors focus:border-brand-red focus:bg-background"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                {filtered.length} item{filtered.length !== 1 && "s"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {sizes.length > 0 && (
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="h-10 w-[130px] rounded-full border-border">
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
                <SelectTrigger className="h-10 w-[160px] rounded-full border-border">
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
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        q.trim() ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">No matching products found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't find any products matching "{q}". Try searching for something else or
              clearing the search filter.
            </p>
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="mt-6 inline-flex items-center rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Clear Search & View All
            </button>
          </div>
        ) : (
          <EmptyProducts />
        )
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {filtered.map((p, idx) => (
            <ProductCard key={p.node.id} product={p} priority={idx < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
