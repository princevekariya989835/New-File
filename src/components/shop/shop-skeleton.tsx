import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="group flex flex-col space-y-3 animate-pulse">
      {/* Product Image Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted/40 border border-border/40">
        <Skeleton className="h-full w-full bg-muted/60" />
        <div className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/60 backdrop-blur-md" />
      </div>

      {/* Product Metadata */}
      <div className="space-y-2 px-1">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-3/5 rounded bg-muted/60" />
          <Skeleton className="h-4 w-1/4 rounded bg-muted/70" />
        </div>
        <Skeleton className="h-3 w-2/5 rounded bg-muted/40" />
        <div className="flex items-center gap-1.5 pt-1">
          <div className="h-3.5 w-3.5 rounded-full bg-muted/60" />
          <div className="h-3.5 w-3.5 rounded-full bg-muted/60" />
          <div className="h-3.5 w-3.5 rounded-full bg-muted/60" />
        </div>
      </div>
    </div>
  );
}

export function ShopSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      data-testid="shop-skeleton-grid"
      className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={`skeleton-card-${i}`} />
      ))}
    </div>
  );
}
