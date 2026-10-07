/**
 * High-security Cookie Management Utility
 * 
 * Enforces best-practice cookie security flags:
 * - SameSite=Lax (Prevents Cross-Site Request Forgery / CSRF)
 * - Secure (Ensures cookies are only transmitted over HTTPS in production)
 * - Path=/ (Ensures consistent domain-wide scope)
 * - Strict URL encoding & boundary parsing
 */

export interface CookieOptions {
  maxAge?: number; // In seconds (default: 30 days = 2592000s)
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  secure?: boolean;
}

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/**
 * Sets a secure cookie in document.cookie with all recommended security flags.
 */
export function setSecureCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  if (typeof document === "undefined") return;

  const maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
  const path = options.path || "/";
  const sameSite = options.sameSite || "Lax";
  const isHttps =
    typeof location !== "undefined" && location.protocol === "https:";
  const secure = options.secure ?? isHttps;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; SameSite=${sameSite}`;

  if (secure) {
    cookieString += "; Secure";
  }

  document.cookie = cookieString;
}

/**
 * Retrieves the value of a cookie by name with strict decoding.
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const encodedName = encodeURIComponent(name);
  const cookies = document.cookie.split(";");

  for (const c of cookies) {
    const trimmed = c.trim();
    if (trimmed.startsWith(`${encodedName}=`)) {
      const rawVal = trimmed.slice(encodedName.length + 1);
      try {
        return decodeURIComponent(rawVal);
      } catch {
        return rawVal;
      }
    }
  }

  return null;
}

/**
 * Safely removes a cookie by expiring it immediately with matching path and security flags.
 */
export function removeSecureCookie(name: string, path = "/"): void {
  setSecureCookie(name, "", { maxAge: 0, path });
}
