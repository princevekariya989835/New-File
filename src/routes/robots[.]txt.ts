import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const ROBOTS_TXT_CONTENT = `# ==============================================================================
# RIOTOUS Official robots.txt
# Website: https://riotous.store
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. AI Search Crawlers (Allow real-time search indexing & citation)
# ------------------------------------------------------------------------------
User-agent: OAI-SearchBot
User-agent: PerplexityBot
Allow: /
Allow: /shop
Allow: /product/
Allow: /about
Allow: /contact
Allow: /shipping-policy
Allow: /refund-policy
Allow: /terms
Allow: /privacy
Allow: /design
Allow: /api/media/
Allow: /api/public/
Allow: /llms.txt
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /checkout/
Disallow: /auth
Disallow: /auth/
Disallow: /reset-password
Disallow: /api/

# ------------------------------------------------------------------------------
# 2. AI Assistants & User-Driven Live Retrieval (Allow live browsing actions)
# ------------------------------------------------------------------------------
User-agent: ChatGPT-User
User-agent: Claude-Web
User-agent: anthropic-ai
User-agent: Perplexity-User
User-agent: Amazonbot
User-agent: MistralAI-User
Allow: /
Allow: /shop
Allow: /product/
Allow: /about
Allow: /contact
Allow: /shipping-policy
Allow: /refund-policy
Allow: /terms
Allow: /privacy
Allow: /design
Allow: /api/media/
Allow: /api/public/
Allow: /llms.txt
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /checkout/
Disallow: /auth
Disallow: /auth/
Disallow: /reset-password
Disallow: /api/

# ------------------------------------------------------------------------------
# 3. AI Model Training Crawlers (Blocked per content IP protection policy)
# ------------------------------------------------------------------------------
User-agent: GPTBot
User-agent: Google-Extended
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Applebot-Extended
User-agent: Bytespider
User-agent: Meta-ExternalAgent
Disallow: /

# ------------------------------------------------------------------------------
# 4. General Search Engine Crawlers (Google, Bing, DuckDuckGo, Yahoo, etc.)
# ------------------------------------------------------------------------------
User-agent: *
Allow: /
Allow: /shop
Allow: /product/
Allow: /about
Allow: /contact
Allow: /shipping-policy
Allow: /refund-policy
Allow: /terms
Allow: /privacy
Allow: /design
Allow: /api/media/
Allow: /api/public/
Allow: /llms.txt
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /checkout/
Disallow: /auth
Disallow: /auth/
Disallow: /reset-password
Disallow: /api/

# ------------------------------------------------------------------------------
# Sitemaps
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
