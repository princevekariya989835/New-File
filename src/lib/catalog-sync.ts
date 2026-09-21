import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

export type CatalogSyncEvent =
  | { type: "PRODUCT_CREATED"; productId: string; timestamp: number }
  | { type: "PRODUCT_UPDATED"; productId: string; timestamp: number }
  | { type: "PRODUCT_DELETED"; productId: string; timestamp: number }
  | { type: "PRODUCT_STATUS_CHANGED"; productId: string; status: "ACTIVE" | "DRAFT"; timestamp: number }
  | { type: "INVENTORY_CHANGED"; productId?: string; variantId?: string; timestamp: number }
  | { type: "WEBSITE_CONFIG_UPDATED"; timestamp: number };

const CHANNEL_NAME = "riotous_catalog_sync";

/**
 * Broadcasts an admin mutation event to all open storefront tabs and windows.
 */
export function broadcastCatalogUpdate(event: CatalogSyncEvent) {
  if (typeof window === "undefined") return;
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
    }
    // Also dispatch on window for local tab listeners
    window.dispatchEvent(new CustomEvent("riotous_catalog_event", { detail: event }));
  } catch (err) {
    console.warn("[broadcastCatalogUpdate] Failed to broadcast event:", err);
  }
}

/**
 * Hook for storefront components to listen for instant admin catalog mutations
 * and immediately invalidate active queries.
 */
export function useCatalogSync(queryClient: QueryClient) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSync = (event: CatalogSyncEvent) => {
      console.log("[useCatalogSync] Received sync event:", event.type);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
      if (event.type === "INVENTORY_CHANGED" || event.type === "PRODUCT_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
    };

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (msg: MessageEvent<CatalogSyncEvent>) => {
          if (msg.data && msg.data.type) {
            handleSync(msg.data);
          }
        };
      } catch (e) {
        console.warn("[useCatalogSync] BroadcastChannel not available:", e);
      }
    }

    const localListener = (e: Event) => {
      const customEvt = e as CustomEvent<CatalogSyncEvent>;
      if (customEvt.detail) {
        handleSync(customEvt.detail);
      }
    };
    window.addEventListener("riotous_catalog_event", localListener);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener("riotous_catalog_event", localListener);
    };
  }, [queryClient]);
}
