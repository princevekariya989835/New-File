import { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";

export function useCartSync() {
  const syncCart = useCartStore((s) => s.syncCart);
  useEffect(() => {
    // Only synchronize local cart to remote persistence on initial load
    // Never listen to visibilitychange or window events that trigger unexpected mutations
    syncCart();
  }, [syncCart]);
}
