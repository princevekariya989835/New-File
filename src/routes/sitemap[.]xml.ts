import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { FALLBACK_PRODUCTS } from "@/lib/catalog";

const BASE_URL = "https://riotous.store";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

async function fetchPublicPaths(): Promise<{ entries: SitemapEntry[]; latestModDate?: string }> {
  const entries: SitemapEntry[] = [];
  let latestModDate: string | undefined;

  const registerModDate = (dateStr?: string | null) => {
    if (!dateStr) return;
    try {
      const iso = new Date(dateStr).toISOString().split("T")[0];
      if (!latestModDate || iso > latestModDate) {
        latestModDate = iso;
      }
      return iso;
    } catch {
      return undefined;
    }
  };

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT slug, updated_at FROM products WHERE is_active = true AND status = 'published' OR (is_active = true AND status IS NULL) LIMIT 1000
    `;

    const productList =
      Array.isArray(rows) && rows.length > 0
        ? (rows as Array<{ slug: string; updated_at?: string | null }>)
        : FALLBACK_PRODUCTS.map((p) => ({ slug: p.slug, updated_at: (p as any).updated_at }));

    for (const row of productList) {
      if (row.slug && row.slug.trim()) {
        const cleanSlug = row.slug.trim();
        const lastmod = registerModDate(row.updated_at);
        entries.push({
          path: `/product/${encodeURIComponent(cleanSlug)}`,
          changefreq: "weekly",
          priority: "0.8",
          ...(lastmod ? { lastmod } : {}),
        });
      }
    }

    return { entries, latestModDate };
  } catch {
    // If database is offline, generate sitemap from fallback catalog
    for (const p of FALLBACK_PRODUCTS) {
      if (p.slug && p.slug.trim()) {
        const cleanSlug = p.slug.trim();
        const lastmod = registerModDate((p as any).updated_at);
        entries.push({
          path: `/product/${encodeURIComponent(cleanSlug)}`,
          changefreq: "weekly",
          priority: "0.8",
          ...(lastmod ? { lastmod } : {}),
        });
      }
    }

    return { entries, latestModDate };
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { entries: productEntries, latestModDate } = await fetchPublicPaths();

        const staticEntries: SitemapEntry[] = [
          {
            path: "/",
            changefreq: "daily",
            priority: "1.0",
            ...(latestModDate ? { lastmod: latestModDate } : {}),
          },
          {
            path: "/shop",
            changefreq: "daily",
            priority: "0.9",
            ...(latestModDate ? { lastmod: latestModDate } : {}),
          },
          { path: "/design", changefreq: "monthly", priority: "0.8" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/privacy", changefreq: "monthly", priority: "0.4" },
          { path: "/terms", changefreq: "monthly", priority: "0.4" },
          { path: "/shipping-policy", changefreq: "monthly", priority: "0.4" },
          { path: "/refund-policy", changefreq: "monthly", priority: "0.4" },
        ];

        const entries = [...staticEntries, ...productEntries];

        const seen = new Set<string>();
        const urls = entries
          .filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)))
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path.replace(/&/g, "&amp;")}</loc>`,
              e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
            "X-Robots-Tag": "noindex",
            "Last-Modified": new Date().toUTCString(),
          },
        });
      },
    },
  },
});
