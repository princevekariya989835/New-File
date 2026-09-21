/**
 * Structured server-side logger for catalog, admin mutations, and database sync.
 * Section 16 requirement: Log operation, product ID, timestamp, success/failure, database status.
 * Never logs sensitive credentials, passwords, or payment info.
 */

export type ServerLogCategory =
  | "ADMIN_MUTATION"
  | "PRODUCT_UPDATE"
  | "PRODUCT_CREATE"
  | "PRODUCT_DELETE"
  | "PRODUCT_PUBLISH"
  | "INVENTORY_UPDATE"
  | "DATABASE_ERROR"
  | "CACHE_INVALIDATION";

export function logServerSyncEvent(
  category: ServerLogCategory,
  payload: {
    operation: string;
    productId?: string | null;
    variantId?: string | null;
    status: "SUCCESS" | "FAILED";
    details?: Record<string, unknown>;
    error?: string;
  },
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    category,
    timestamp,
    operation: payload.operation,
    productId: payload.productId ?? undefined,
    variantId: payload.variantId ?? undefined,
    status: payload.status,
    details: payload.details,
    error: payload.error,
  };

  if (payload.status === "FAILED") {
    console.error(`[SYNC_LOG][${category}]`, JSON.stringify(logEntry));
  } else {
    console.log(`[SYNC_LOG][${category}]`, JSON.stringify(logEntry));
  }
}
