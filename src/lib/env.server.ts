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

  const extract = (dict: any): string | undefined => {
    if (!dict || typeof dict !== "object") return undefined;
    // 1. Exact match
    if (typeof dict[key] === "string" && dict[key].trim() !== "") {
      return dict[key].trim();
    }
    // 2. Case variations (upper & lower)
    const upper = key.toUpperCase();
    if (typeof dict[upper] === "string" && dict[upper].trim() !== "") {
      return dict[upper].trim();
    }
    const lower = key.toLowerCase();
    if (typeof dict[lower] === "string" && dict[lower].trim() !== "") {
      return dict[lower].trim();
    }
    return undefined;
  };

  // 1. Cloudflare request runtime env
  const valCf = extract(getCloudflareEnv());
  if (valCf) return valCf;

  // 2. Global environment bindings (Nitro / Cloudflare worker module)
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    const valGlobalEnv = extract(g.__env__);
    if (valGlobalEnv) return valGlobalEnv;

    const valGlobalCfEnv = extract(g.__cf_env__);
    if (valGlobalCfEnv) return valGlobalCfEnv;

    const valGEnv = extract(g.env);
    if (valGEnv) return valGEnv;

    const valDirect = extract(g);
    if (valDirect) return valDirect;
  }

  // 3. process.env (Node.js / dev server)
  if (typeof process !== "undefined" && process.env) {
    const valProc = extract(process.env);
    if (valProc) return valProc;
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
 * Supports all common aliases across Brevo and legacy Sendinblue.
 */
export function getBrevoApiKey(): string | undefined {
  return (
    getServerEnv("BREVO_API_KEY") ||
    getServerEnv("BREVO_KEY") ||
    getServerEnv("BREVO_APIKEY") ||
    getServerEnv("BREVO_TOKEN") ||
    getServerEnv("BREVO_SECRET") ||
    getServerEnv("SENDINBLUE_API_KEY") ||
    getServerEnv("SIB_API_KEY") ||
    getServerEnv("BREVO_TRANSACTIONAL_KEY") ||
    getServerEnv("VITE_BREVO_API_KEY")
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
