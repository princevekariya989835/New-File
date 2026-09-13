import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const ROBOTS_TXT_CONTENT = `# ==============================================================================
# RIOTOUS — robots.txt
# Official Store: https://riotous.store
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. AI Search Crawlers (Real-time search indexation & answer citations)
# ------------------------------------------------------------------------------
User-agent: OAI-SearchBot
Allow: /
Allow: /api/media/
Allow: /api/public/
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /auth
Disallow: /reset-password
Disallow: /api/

User-agent: PerplexityBot
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
# 2. AI Assistant & User-Initiated Live Retrieval Crawlers
# ------------------------------------------------------------------------------
User-agent: ChatGPT-User
Allow: /
Allow: /api/media/
Allow: /api/public/
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /auth
Disallow: /reset-password
Disallow: /api/

User-agent: Claude-Web
Allow: /
Allow: /api/media/
Allow: /api/public/
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /auth
Disallow: /reset-password
Disallow: /api/

User-agent: anthropic-ai
Allow: /
Allow: /api/media/
Allow: /api/public/
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /auth
Disallow: /reset-password
Disallow: /api/

User-agent: Perplexity-User
Allow: /
Allow: /api/media/
Allow: /api/public/
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /auth
Disallow: /reset-password
Disallow: /api/

User-agent: Amazonbot
Allow: /
Allow: /api/media/
Allow: /api/public/
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /auth
Disallow: /reset-password
Disallow: /api/

User-agent: MistralAI-User
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
# 3. AI Model-Training Crawlers (Disallowed per content protection policy)
# ------------------------------------------------------------------------------
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

# ------------------------------------------------------------------------------
# 4. Standard Search Engines (Googlebot, Bingbot, etc.) & Default Fallback
# ------------------------------------------------------------------------------
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
# Sitemap & Documentation References
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
