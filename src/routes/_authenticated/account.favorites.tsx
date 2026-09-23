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
});
