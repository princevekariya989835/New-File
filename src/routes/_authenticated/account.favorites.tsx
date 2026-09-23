import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Loader2, ArrowRight } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { formatPrice } from "@/lib/catalog";
import { SiteLoader } from "@/components/site-loader";

export const Route = createFileRoute("/_authenticated/account/favorites")({
  head: () => ({
    meta: [
      { title: "My Saved Wishlist & Favorites | RIOTOUS Streetwear" },
      { name: "description", content: "Products you've saved on RIOTOUS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites, loading, toggle } = useFavorites();
  const list = Array.isArray(favorites) ? favorites : [];

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Account
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Favorites</h1>
        </div>
        <Link
          to="/account/orders"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Orders →
        </Link>
      </div>

      {loading && (
        <SiteLoader size="md" text="LOADING FAVORITES..." />
      )}

      {!loading && list.length === 0 && (
        <div className="rounded-2xl border border-border bg-secondary/40 py-20 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">No favorites yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any product to save it here.
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90"
          >
            Browse shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {list.map((f) => (
            <div key={f.id} className="group relative">
              <Link to="/product/$handle" params={{ handle: f.product_handle }} className="block">
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-secondary/60 flex items-center justify-center p-4">
                  {f.product_image && (
                    <img
                      src={f.product_image}
                      alt={f.product_title}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                <div className="mt-4 flex items-start justify-between gap-4 px-1">
                  <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug flex-1 text-foreground" title={f.product_title}>
                    {f.product_title}
                  </h3>
                  {f.product_price != null && (
                    <p className="whitespace-nowrap text-sm font-semibold">
                      {formatPrice(String(f.product_price), f.product_currency ?? "INR")}
                    </p>
                  )}
                </div>
              </Link>
              <button
                onClick={() =>
                  toggle({
                    handle: f.product_handle,
                    title: f.product_title,
                    image: f.product_image,
                    price: f.product_price,
                    currency: f.product_currency,
                  })
                }
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/95 text-foreground shadow-sm backdrop-blur-md transition-all hover:bg-background hover:border-foreground/40 hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Remove from favorites"
              >
                <Heart className="h-4 w-4 fill-brand-red text-brand-red" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
