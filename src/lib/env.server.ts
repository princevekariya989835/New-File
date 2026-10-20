/**
 * RIOTOUS Server Environment & Secrets Resolver
 * Server-only module: NEVER import in client components or browser code.
 *
 * Safe multi-runtime resolver across:
 * 1. Cloudflare Workers edge environment bindings (env.DB, env.ADMIN_NOTIFICATION_EMAIL, etc.)
 * 2. globalThis runtime environment injected by Nitro / Cloudflare entry
 * 3. process.env (Node.js runtime / local dev server)
 */

import { getCloudflareEnv } from "@/lib/db";

/**
 * Resolves a server-only environment variable or secret.
 * Returns undefined if not set. Never leaks secrets to client bundles.
 */
export function getServerEnv(key: string): string | undefined {
  if (!key || typeof key !== "string") return undefined;

  // 1. Cloudflare request runtime env
  const cfEnv = getCloudflareEnv();
  if (cfEnv && typeof cfEnv[key] === "string" && cfEnv[key].trim() !== "") {
    return cfEnv[key].trim();
  }

  // 2. Global environment bindings (Nitro / Cloudflare worker module)
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (typeof g.__env__?.[key] === "string" && g.__env__[key].trim() !== "") {
      return g.__env__[key].trim();
    }
    if (typeof g.__cf_env__?.[key] === "string" && g.__cf_env__[key].trim() !== "") {
      return g.__cf_env__[key].trim();
    }
    if (typeof g.env?.[key] === "string" && g.env[key].trim() !== "") {
      return g.env[key].trim();
    }
  }

  // 3. process.env (Node.js / dev server)
  if (typeof process !== "undefined" && process.env?.[key] && process.env[key]!.trim() !== "") {
    return process.env[key]!.trim();
  }

  return undefined;
}

/**
 * Returns the trusted canonical site URL configured for the application.
 * NEVER trust incoming Host or Origin headers for security-critical URLs (like password reset links).
 * Defaults to "https://riotous.store" in production.
 */
export function getSiteUrl(): string {
  const configured = getServerEnv("SITE_URL") || getServerEnv("VITE_SITE_URL");
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  return "https://riotous.store";
}

/**
 * Returns the private administrator recipient email address configured in secrets.
 * Must be configured as ADMIN_NOTIFICATION_EMAIL in Cloudflare Worker secrets or .env.
 * Returns null if not configured (callers should log safely without crashing).
 */
export function getAdminNotificationEmail(): string | null {
  const email = getServerEnv("ADMIN_NOTIFICATION_EMAIL");
  if (email && email.includes("@")) {
    return email.trim();
  }
  return null;
}

/**
 * Returns Brevo API key for transactional emails.
 */
export function getBrevoApiKey(): string | undefined {
  return getServerEnv("BREVO_API_KEY");
}

/**
 * Returns verified sender address for transactional emails.
 */
export function getEmailFrom(): string {
  return getServerEnv("EMAIL_FROM") || "RIOTOUS <order@riotous.store>";
}

/**
 * Returns the execution mode for email service ('production' or 'development').
 */
export function getEmailMode(): string {
  return getServerEnv("EMAIL_MODE") || "development";
}
