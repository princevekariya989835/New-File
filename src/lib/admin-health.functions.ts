import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin } from "@/lib/admin-utils";
import { getSql, ensureDbSchema, getDatabaseUrl } from "@/lib/db";

export type ComponentHealth = {
  name: string;
  key: string;
  status: "healthy" | "warning" | "error";
  latencyMs: number;
  message: string;
  details?: Record<string, any>;
};

export type SystemHealthReport = {
  timestamp: string;
  overallStatus: "healthy" | "warning" | "error";
  databaseEngine: string;
  isProductionDb: boolean;
  components: ComponentHealth[];
};

export const adminGetSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<SystemHealthReport> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    const dbUrl = getDatabaseUrl();
    const isProductionDb = Boolean(dbUrl && (dbUrl.includes("neon") || dbUrl.includes("postgres")));

    const components: ComponentHealth[] = [];

    // 1. Database Ping & Engine
    const dbStart = Date.now();
    try {
      const res = await sql`SELECT 1 as ok, NOW() as server_time`;
      const dbLatency = Date.now() - dbStart;
      components.push({
        name: "Database (Neon PostgreSQL)",
        key: "database",
        status: "healthy",
        latencyMs: dbLatency,
        message: isProductionDb
          ? `Connected to Neon PostgreSQL (${dbLatency}ms)`
          : "Active (Local mock engine)",
        details: {
          serverTime: res[0]?.server_time || new Date().toISOString(),
          isProduction: isProductionDb,
        },
      });
    } catch (err: any) {
      components.push({
        name: "Database (Neon PostgreSQL)",
        key: "database",
        status: "error",
        latencyMs: Date.now() - dbStart,
        message: `Database connection error: ${err?.message || String(err)}`,
      });
    }

    // 2. Admin Authorization API
    const authStart = Date.now();
    try {
      const authCtx = context as any;
      components.push({
        name: "Admin Authorization",
        key: "auth",
        status: "healthy",
        latencyMs: Date.now() - authStart,
        message: `Authorized as ${authCtx?.user?.email || "Admin"} (Role: ${authCtx?.user?.role || "admin"})`,
      });
    } catch (err: any) {
      components.push({
        name: "Admin Authorization",
        key: "auth",
        status: "error",
        latencyMs: Date.now() - authStart,
        message: `Auth verification failed: ${err?.message || String(err)}`,
      });
    }

    // 3. Products API
    const prodStart = Date.now();
    try {
      const rows = await sql`SELECT COUNT(*)::int as count FROM products WHERE is_active = true`;
      const count = Number(rows[0]?.count ?? 0);
      components.push({
        name: "Products API",
        key: "products",
        status: "healthy",
        latencyMs: Date.now() - prodStart,
        message: `${count} live product(s) accessible in catalog`,
        details: { count },
      });
    } catch (err: any) {
      components.push({
        name: "Products API",
        key: "products",
        status: "error",
        latencyMs: Date.now() - prodStart,
        message: `Failed to query products: ${err?.message || String(err)}`,
      });
    }

    // 4. Orders API
    const ordStart = Date.now();
    try {
      const rows = await sql`SELECT COUNT(*)::int as count FROM orders`;
      const count = Number(rows[0]?.count ?? 0);
      components.push({
        name: "Orders API",
        key: "orders",
        status: "healthy",
        latencyMs: Date.now() - ordStart,
        message: `${count} order(s) stored and queryable`,
        details: { count },
      });
    } catch (err: any) {
      components.push({
        name: "Orders API",
        key: "orders",
        status: "error",
        latencyMs: Date.now() - ordStart,
        message: `Failed to query orders: ${err?.message || String(err)}`,
      });
    }

    // 5. Inventory API
    const invStart = Date.now();
    try {
      const [vRows, txRows] = await Promise.all([
        sql`SELECT COUNT(*)::int as count FROM product_variants`,
        sql`SELECT COUNT(*)::int as count FROM inventory_transactions`,
      ]);
      const variantCount = Number(vRows[0]?.count ?? 0);
      const txCount = Number(txRows[0]?.count ?? 0);
      components.push({
        name: "Inventory API",
        key: "inventory",
        status: "healthy",
        latencyMs: Date.now() - invStart,
        message: `${variantCount} variant(s) tracked with ${txCount} transaction record(s)`,
        details: { variants: variantCount, transactions: txCount },
      });
    } catch (err: any) {
      components.push({
        name: "Inventory API",
        key: "inventory",
        status: "error",
        latencyMs: Date.now() - invStart,
        message: `Failed to query inventory: ${err?.message || String(err)}`,
      });
    }

    // 6. Returns API
    const retStart = Date.now();
    try {
      const rows = await sql`SELECT COUNT(*)::int as count FROM returns`;
      const count = Number(rows[0]?.count ?? 0);
      components.push({
        name: "Returns API",
        key: "returns",
        status: "healthy",
        latencyMs: Date.now() - retStart,
        message: `${count} return request(s) recorded`,
        details: { count },
      });
    } catch (err: any) {
      components.push({
        name: "Returns API",
        key: "returns",
        status: "error",
        latencyMs: Date.now() - retStart,
        message: `Failed to query returns: ${err?.message || String(err)}`,
      });
    }

    // 7. Reviews API
    const revStart = Date.now();
    try {
      const rows = await sql`SELECT COUNT(*)::int as count FROM reviews`;
      const count = Number(rows[0]?.count ?? 0);
      components.push({
        name: "Reviews API",
        key: "reviews",
        status: "healthy",
        latencyMs: Date.now() - revStart,
        message: `${count} customer review(s) stored`,
        details: { count },
      });
    } catch (err: any) {
      components.push({
        name: "Reviews API",
        key: "reviews",
        status: "error",
        latencyMs: Date.now() - revStart,
        message: `Failed to query reviews: ${err?.message || String(err)}`,
      });
    }

    // 8. Storefront CMS API
    const cmsStart = Date.now();
    try {
      const rows = await sql`SELECT version_number, published_at FROM website_published WHERE id = 'live' LIMIT 1`;
      const ver = rows[0]?.version_number || 1;
      components.push({
        name: "Storefront CMS API",
        key: "cms",
        status: "healthy",
        latencyMs: Date.now() - cmsStart,
        message: `Live config active (Version ${ver})`,
        details: { version: ver, publishedAt: rows[0]?.published_at },
      });
    } catch (err: any) {
      components.push({
        name: "Storefront CMS API",
        key: "cms",
        status: "error",
        latencyMs: Date.now() - cmsStart,
        message: `Failed to query CMS config: ${err?.message || String(err)}`,
      });
    }

    // 9. Customer Accounts
    const custStart = Date.now();
    try {
      const rows = await sql`SELECT COUNT(*)::int as count FROM profiles`;
      const count = Number(rows[0]?.count ?? 0);
      components.push({
        name: "Customer Accounts & Profiles",
        key: "customers",
        status: "healthy",
        latencyMs: Date.now() - custStart,
        message: `${count} registered profile(s)`,
        details: { count },
      });
    } catch (err: any) {
      components.push({
        name: "Customer Accounts & Profiles",
        key: "customers",
        status: "error",
        latencyMs: Date.now() - custStart,
        message: `Failed to query profiles: ${err?.message || String(err)}`,
      });
    }

    const hasError = components.some((c) => c.status === "error");
    const hasWarning = components.some((c) => c.status === "warning");
    const overallStatus = hasError ? "error" : hasWarning ? "warning" : "healthy";

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      databaseEngine: isProductionDb ? "Neon PostgreSQL (Production)" : "Neon SQL Fallback / Dev",
      isProductionDb,
      components,
    };
  });
