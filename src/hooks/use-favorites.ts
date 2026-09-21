import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import {
  addFavorite,
  getMyFavorites,
  removeFavorite,
  type Favorite,
} from "@/lib/favorites.functions";

// Module-level singleton state to prevent duplicate parallel requests across multiple ProductCards
let _cachedFavorites: Favorite[] | null = null;
let _cachedFavoritesUserId: string | null = null;
let _inFlightFavPromise: Promise<Favorite[]> | null = null;
const _favListeners = new Set<(favs: Favorite[]) => void>();

function notifyFavListeners(favs: Favorite[]) {
  _favListeners.forEach((fn) => {
    try {
      fn(favs);
    } catch {
      // ignore
    }
  });
}

async function fetchSharedFavorites(userId?: string | null): Promise<Favorite[]> {
  if (!userId) {
    _cachedFavorites = [];
    _cachedFavoritesUserId = null;
    notifyFavListeners([]);
    return [];
  }

  if (_cachedFavorites !== null && _cachedFavoritesUserId === userId) {
    return _cachedFavorites;
  }

  if (_inFlightFavPromise) {
    return _inFlightFavPromise;
  }

  _inFlightFavPromise = (async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("riotous_session") || "" : "";
      if (!token) {
        _cachedFavorites = [];
        _cachedFavoritesUserId = null;
        notifyFavListeners([]);
        return [];
      }
      const data = await getMyFavorites({ headers: { Authorization: `Bearer ${token}` } });
      const favList = Array.isArray(data) ? data : [];
      _cachedFavorites = favList;
      _cachedFavoritesUserId = userId;
      notifyFavListeners(favList);
      return favList;
    } catch {
      _cachedFavorites = [];
      _cachedFavoritesUserId = userId;
      return [];
    } finally {
      _inFlightFavPromise = null;
    }
  })();

  return _inFlightFavPromise;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>(() => _cachedFavorites || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const listener = (newFavs: Favorite[]) => {
      setFavorites(newFavs);
    };
    _favListeners.add(listener);

    if (user?.id) {
      if (_cachedFavorites === null || _cachedFavoritesUserId !== user.id) {
        setLoading(true);
        fetchSharedFavorites(user.id).finally(() => setLoading(false));
      } else {
        setFavorites(_cachedFavorites);
      }
    } else {
      _cachedFavorites = [];
      _cachedFavoritesUserId = null;
      setFavorites([]);
    }

    return () => {
      _favListeners.delete(listener);
    };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      _cachedFavorites = [];
      _cachedFavoritesUserId = null;
      setFavorites([]);
      return;
    }
    setLoading(true);
    _cachedFavorites = null; // force fresh fetch
    await fetchSharedFavorites(user.id);
    setLoading(false);
  }, [user?.id]);

  const isFavorite = useCallback(
    (handle: string) =>
      Array.isArray(favorites) && favorites.some((f) => f?.product_handle === handle),
    [favorites],
  );

  const toggle = useCallback(
    async (product: {
      handle: string;
      title: string;
      image: string | null;
      price?: number | null;
      currency?: string | null;
    }) => {
      if (!user) {
        toast.error("Please sign in to save favorites");
        return;
      }
      const token = localStorage.getItem("riotous_session") || "";
      const currentList = Array.isArray(favorites) ? favorites : [];
      const existing = currentList.find((f) => f?.product_handle === product.handle);

      if (existing) {
        const nextList = currentList.filter((f) => f?.product_handle !== product.handle);
        _cachedFavorites = nextList;
        notifyFavListeners(nextList);
        try {
          await removeFavorite({
            data: { id: existing.id },
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          toast.error("Could not remove favorite");
          refresh();
        }
      } else {
        try {
          const newFav = await addFavorite({
            data: {
              handle: product.handle,
              title: product.title,
              image: product.image,
              price: product.price,
              currency: product.currency,
            },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (newFav && newFav.id) {
            const nextList = [newFav, ...currentList];
            _cachedFavorites = nextList;
            notifyFavListeners(nextList);
          }
          toast.success("Added to favorites");
        } catch {
          toast.error("Could not save favorite");
        }
      }
    },
    [user, favorites, refresh],
  );

  return { favorites, loading, isFavorite, toggle, refresh };
}
