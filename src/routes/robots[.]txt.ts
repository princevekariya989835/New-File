import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const ROBOTS_TXT_CONTENT = `# ==============================================================================
# RIOTOUS — robots.txt
# Official Store: https://riotous.store
# Optimized for Search Engines & AI Crawlers (Search, Assistant, Training)
# ==============================================================================

# Default policy for all crawlers (including Googlebot, Bingbot, and all AI crawlers:
# OAI-SearchBot, PerplexityBot, ChatGPT-User, Claude-Web, anthropic-ai,
# Perplexity-User, Amazonbot, MistralAI-User, GPTBot, Google-Extended,
# ClaudeBot, CCBot, Applebot-Extended, Bytespider, Meta-ExternalAgent)

User-agent: *
Allow: /
Allow: /api/media/
Allow: /api/public/
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /auth
Disallow: /reset-password
Disallow: /api/

# ------------------------------------------------------------------------------
# Sitemap & AI Context Discovery
# ------------------------------------------------------------------------------
Sitemap: https://riotous.store/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(ROBOTS_TXT_CONTENT, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
