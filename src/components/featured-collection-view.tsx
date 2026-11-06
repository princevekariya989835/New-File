import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  getPublicFeaturedCollection,
  type FeaturedCollectionId,
} from "@/lib/featured-collections.functions";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Clock,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export function FeaturedCollectionView({
  collectionId,
  fallbackTitle,
  fallbackSubtitle,
  department,
  collectionType,
  backToDepartmentPath,
}: {
  collectionId: FeaturedCollectionId;
  fallbackTitle: string;
  fallbackSubtitle: string;
  department: "men" | "women";
  collectionType: "best_sellers" | "latest_edition";
  backToDepartmentPath: string;
}) {
  const getColFn = useServerFn(getPublicFeaturedCollection);

  const query = useQuery({
    queryKey: ["public", "featured-collection", collectionId],
    queryFn: () => getColFn({ data: { id: collectionId } }),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const collection = query.data?.collection;
  const products = query.data?.products || [];
  const isEnabled = query.data?.isEnabled ?? true;

  const title = collection?.title || fallbackTitle;
  const subtitle = collection?.description || fallbackSubtitle;

  const isBestSeller = collectionType === "best_sellers";
  const departmentLabel = department === "men" ? "Men" : "Women";

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
            <Link to={backToDepartmentPath} className="hover:text-black transition">
              {departmentLabel}
            </Link>
            <ChevronRight className="h-3 w-3 text-zinc-400" />
            <span className="text-[#ED171F] font-bold">{title}</span>
          </nav>
        </div>
      </div>

      {/* Page Header */}
      <section className="border-b border-[#F3F3F3] bg-[#FAFAFA] py-12 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-12">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#111111]/10 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#ED171F] shadow-2xs">
              {isBestSeller ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 fill-[#ED171F]" />
                  RIOTOUS {department.toUpperCase()} · BEST SELLERS
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 text-[#ED171F]" />
                  RIOTOUS {department.toUpperCase()} · LATEST EDITION
                </>
              )}
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
                to={backToDepartmentPath}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-black transition"
              >
                <ArrowLeft className="h-4 w-4" /> Back to {departmentLabel}'s Collection
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
          ) : !isEnabled || products.length === 0 ? (
            /* Proper Empty State */
            <div className="mx-auto max-w-lg text-center py-16 px-6 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-[#ED171F] mb-4 shadow-xs">
                {isBestSeller ? (
                  <Flame className="h-7 w-7" />
                ) : (
                  <Sparkles className="h-7 w-7" />
                )}
              </div>
              <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-900">
                {!isEnabled ? "Collection Currently Inactive" : "New Drops Coming Soon"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                {!isEnabled
                  ? "This featured collection is currently paused while we rotate seasonal drops."
                  : "We are currently curating and handpicking the next batch of street essentials for this lineup."}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="h-12 bg-[#111111] px-8 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ED171F]">
                  <Link to={backToDepartmentPath}>
                    Explore {departmentLabel}'s Store
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 border-zinc-300 text-xs font-bold uppercase tracking-wider">
                  <Link to="/shop">View Full Catalog</Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Product Card Grid */
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {products.map((product, idx) => (
                <ProductCard
                  key={product.node.id}
                  product={product}
                  priority={idx < 4}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

