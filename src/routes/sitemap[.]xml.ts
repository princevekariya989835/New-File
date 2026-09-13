import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { FALLBACK_PRODUCTS } from "@/lib/catalog";

const BASE_URL = "https://riotous.store";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

async function fetchPublicPaths(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  const categories = new Set<string>();

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT slug, category FROM products WHERE is_active = true LIMIT 1000
    `;

    const productList =
      Array.isArray(rows) && rows.length > 0
        ? (rows as Array<{ slug: string; category: string | null }>)
        : FALLBACK_PRODUCTS.map((p) => ({ slug: p.slug, category: p.category }));

    for (const row of productList) {
      if (row.slug) {
        entries.push({
          path: `/product/${encodeURIComponent(row.slug)}`,
          changefreq: "weekly",
          priority: "0.8",
        });
      }
      if (row.category) categories.add(row.category);
    }

    for (const category of categories) {
      entries.push({
        path: `/shop?category=${encodeURIComponent(category)}`,
        changefreq: "weekly",
        priority: "0.7",
      });
    }

    return entries;
  } catch {
    // If database is offline, generate sitemap from fallback catalog
    for (const p of FALLBACK_PRODUCTS) {
      if (p.slug) {
        entries.push({
          path: `/product/${encodeURIComponent(p.slug)}`,
          changefreq: "weekly",
          priority: "0.8",
        });
      }
      if (p.category) categories.add(p.category);
    }

    for (const category of categories) {
      entries.push({
        path: `/shop?category=${encodeURIComponent(category)}`,
        changefreq: "weekly",
        priority: "0.7",
      });
    }

    return entries;
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/shop", changefreq: "daily", priority: "0.9" },
          { path: "/design", changefreq: "monthly", priority: "0.8" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/privacy", changefreq: "monthly", priority: "0.4" },
          { path: "/terms", changefreq: "monthly", priority: "0.4" },
          { path: "/shipping-policy", changefreq: "monthly", priority: "0.4" },
          { path: "/refund-policy", changefreq: "monthly", priority: "0.4" },
        ];

        const entries = [...staticEntries, ...(await fetchPublicPaths())];

        const seen = new Set<string>();
        const urls = entries
          .filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)))
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path.replace(/&/g, "&amp;")}</loc>`,
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
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
