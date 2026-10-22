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
 * Supports ADMIN_NOTIFICATION_EMAIL, ADMIN_EMAIL, STORE_OWNER_EMAIL, OWNER_EMAIL.
 * Returns null if not configured (callers should log safely without crashing).
 */
export function getAdminNotificationEmail(): string | null {
  const email =
    getServerEnv("ADMIN_NOTIFICATION_EMAIL") ||
    getServerEnv("ADMIN_EMAIL") ||
    getServerEnv("STORE_OWNER_EMAIL") ||
    getServerEnv("OWNER_EMAIL");
  if (email && email.includes("@")) {
    return email.trim();
  }
  return null;
}

/**
 * Returns Brevo API key for transactional emails.
 * Supports BREVO_API_KEY, BREVO_KEY, BREVO_APIKEY, BREVO_TOKEN.
 */
export function getBrevoApiKey(): string | undefined {
  return (
    getServerEnv("BREVO_API_KEY") ||
    getServerEnv("BREVO_KEY") ||
    getServerEnv("BREVO_APIKEY") ||
    getServerEnv("BREVO_TOKEN")
  );
}

/**
 * Returns verified sender address for transactional emails.
 * Supports BREVO_SENDER_EMAIL, EMAIL_FROM, BREVO_FROM_EMAIL.
 * Defaults to "RIOTOUS <order@riotous.store>".
 */
export function getEmailFrom(): string {
  const configured =
    getServerEnv("EMAIL_FROM") ||
    getServerEnv("BREVO_SENDER_EMAIL") ||
    getServerEnv("BREVO_FROM_EMAIL");
  return configured || "RIOTOUS <order@riotous.store>";
}

/**
 * Returns verified sender display name for transactional emails.
 * Defaults to "RIOTOUS".
 */
export function getBrevoSenderName(): string {
  return getServerEnv("BREVO_SENDER_NAME") || "RIOTOUS";
}

/**
 * Returns the execution mode for email service ('production' or 'development').
 * If BREVO_API_KEY is configured and EMAIL_MODE is not explicitly set,
 * defaults to 'production' so real emails are transmitted via Brevo.
 */
export function getEmailMode(): string {
  const mode = getServerEnv("EMAIL_MODE");
  if (mode) return mode.toLowerCase();
  if (getBrevoApiKey()) return "production";
  return "development";
}
