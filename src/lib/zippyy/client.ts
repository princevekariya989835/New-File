/**
 * Zippyy API Client with secure Token Lifecycle Management
 * 
 * Official Zippyy Documentation: https://apidocs.zippyy.ai/
 * Authentication: POST /v1/external/auth/login
 * Request Body: { "emailAddress": "...", "password": "..." }
 * Required Headers: "x-api-version: 1", "Content-Type: application/json"
 * Token Lifetime: 5 minutes (JWT)
 */
import { getCloudflareEnv } from "../db";
import type {
  ZippyyAuthConfig,
  ZippyyAuthResponse,
  ZippyyAuthTestResult,
} from "./types";

interface CachedTokenState {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
}

let cachedToken: CachedTokenState | null = null;
let inFlightAuthPromise: Promise<string> | null = null;

// Official Zippyy Token validity is 5 minutes (300 seconds)
const TOKEN_LIFETIME_MS = 5 * 60 * 1000;
// Safety window before token expiration to proactively refresh
const SAFETY_BUFFER_MS = 45 * 1000;

/**
 * Resolves environment variables and Cloudflare Worker secrets safely.
 * Checks Cloudflare Worker runtime env bindings, global scopes, and process.env.
 */
function getWorkerSecret(key: string): string {
  // 1. Check Cloudflare Worker env bound at request runtime
  const cfEnv = getCloudflareEnv();
  if (cfEnv && typeof cfEnv[key] === "string" && cfEnv[key].trim() !== "") {
    return cfEnv[key].trim();
  }

  // 2. Check global environment bindings populated by Cloudflare Worker module entry
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (g.__env__ && typeof g.__env__[key] === "string" && g.__env__[key].trim() !== "") {
      return g.__env__[key].trim();
    }
    if (g.__cf_env__ && typeof g.__cf_env__[key] === "string" && g.__cf_env__[key].trim() !== "") {
      return g.__cf_env__[key].trim();
    }
    if (g.env && typeof g.env[key] === "string" && g.env[key].trim() !== "") {
      return g.env[key].trim();
    }
    if (typeof g[key] === "string" && g[key].trim() !== "") {
      return g[key].trim();
    }
  }

  // 3. Fallback to process.env (Node.js runtime / local tooling)
  if (
    typeof process !== "undefined" &&
    process?.env &&
    typeof process.env[key] === "string" &&
    process.env[key]!.trim() !== ""
  ) {
    return process.env[key]!.trim();
  }

  return "";
}

/**
 * Helper to mask sensitive email for safe diagnostic display.
 */
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  const visible = local.length > 2 ? `${local.slice(0, 2)}***` : `${local.slice(0, 1)}***`;
  return `${visible}@${domain}`;
}

/**
 * Retrieves the current Zippyy configuration from Cloudflare Worker secrets.
 */
export function getZippyyConfig(): ZippyyAuthConfig {
  const isSandbox =
    getWorkerSecret("ZIPPYY_SANDBOX_MODE") === "true" ||
    getWorkerSecret("ZIPPYY_SANDBOX") === "true";

  const defaultBaseUrl = isSandbox
    ? "https://sandbox.sellingpartnerapi-in.zippyy.ai"
    : "https://sellingpartnerapi-in.zippyy.ai";

  const email =
    getWorkerSecret("ZIPPYY_EMAIL") ||
    getWorkerSecret("ZIPPYY_EMAIL_ADDRESS");

  const password = getWorkerSecret("ZIPPYY_PASSWORD");

  return {
    baseUrl: getWorkerSecret("ZIPPYY_BASE_URL") || defaultBaseUrl,
    emailAddress: email,
    email: email, // Backwards-compatible alias
    password: password,
    apiKey: getWorkerSecret("ZIPPYY_API_KEY") || undefined,
    warehouseId: getWorkerSecret("ZIPPYY_DEFAULT_WAREHOUSE_ID") || "wh_default_01",
    pickupPincode: getWorkerSecret("ZIPPYY_PICKUP_PINCODE") || "395006",
    webhookSecret: getWorkerSecret("ZIPPYY_WEBHOOK_SECRET") || undefined,
    isSandbox,
  };
}

/**
 * Checks whether the required Zippyy credentials are configured in Worker secrets.
 */
export function isZippyyConfigured(): boolean {
  const config = getZippyyConfig();
  return Boolean(config.emailAddress && config.password);
}

/**
 * Executes the login call against Zippyy's POST /v1/external/auth/login.
 * Strictly adheres to official Zippyy documentation.
 */
async function executeZippyyLogin(config: ZippyyAuthConfig): Promise<string> {
  const emailAddress = config.emailAddress?.trim();
  const password = config.password?.trim();

  if (!emailAddress || !password) {
    throw new Error(
      "Zippyy authentication failed: Cloudflare Worker secrets ZIPPYY_EMAIL and/or ZIPPYY_PASSWORD are missing or empty.",
    );
  }

  const cleanBaseUrl = config.baseUrl.replace(/\/$/, "");
  const loginUrl = `${cleanBaseUrl}/v1/external/auth/login`;

  console.info(
    `[Zippyy Auth] Initiating authentication request for ${maskEmail(emailAddress)} at ${cleanBaseUrl}...`,
  );

  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-version": "1",
      },
      body: JSON.stringify({
        emailAddress: emailAddress,
        email: emailAddress,
        password: password,
      }),
    });
  } catch (netErr: any) {
    console.error("[Zippyy Auth] Network fetch error:", netErr);
    throw new Error(
      `Zippyy authentication network error: ${netErr?.message || "Failed to reach Zippyy API endpoint"}`,
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorDetail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      errorDetail = parsed.message || parsed.error || parsed.details || errorText;
    } catch {
      // Raw text is preserved
    }

    console.error(
      `[Zippyy Auth] Authentication failed: HTTP ${response.status} - ${errorDetail || response.statusText}`,
    );

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Zippyy authentication rejected (HTTP ${response.status}): Invalid email address or password. Please verify the ZIPPYY_EMAIL and ZIPPYY_PASSWORD Cloudflare secrets.`,
      );
    }

    if (response.status === 500) {
      throw new Error(
        `Zippyy server returned HTTP 500: ${errorDetail || "Authentication failed. Check your Zippyy partner portal credentials or service status."}`,
      );
    }

    throw new Error(
      `Zippyy authentication failed with HTTP ${response.status}: ${errorDetail || response.statusText}`,
    );
  }

  let data: ZippyyAuthResponse;
  try {
    data = await response.json();
  } catch (jsonErr: any) {
    throw new Error(`Zippyy authentication returned non-JSON response: ${jsonErr?.message}`);
  }

  if (!data || !data.accessToken) {
    throw new Error(
      "Zippyy authentication succeeded HTTP 200, but no 'accessToken' was present in the response payload.",
    );
  }

  // Token lifetime is 5 minutes as specified by official documentation
  const now = Date.now();
  const validitySeconds = data.expiresIn || 300;
  const expiresAt = now + validitySeconds * 1000;

  cachedToken = {
    accessToken: data.accessToken,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt,
  };

  console.info(
    `[Zippyy Auth] Authentication successful. Token cached (valid until ${new Date(expiresAt).toISOString()}).`,
  );

  return cachedToken.accessToken;
}

/**
 * Retrieves a valid Zippyy Access Token.
 * Handles in-memory caching, 5-minute lifecycle, and concurrent request deduplication.
 */
export async function getZippyyAccessToken(forceRefresh = false): Promise<string> {
  const config = getZippyyConfig();

  // If using direct API key override
  if (config.apiKey) {
    return config.apiKey;
  }

  // Check if existing token is valid with safety margin
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedToken &&
    cachedToken.accessToken &&
    cachedToken.expiresAt - now > SAFETY_BUFFER_MS
  ) {
    return cachedToken.accessToken;
  }

  // If a login request is already in-flight, await the same promise
  if (inFlightAuthPromise) {
    return inFlightAuthPromise;
  }

  inFlightAuthPromise = (async () => {
    try {
      return await executeZippyyLogin(config);
    } finally {
      inFlightAuthPromise = null;
    }
  })();

  return inFlightAuthPromise;
}

/**
 * Generic authenticated request wrapper for Zippyy API endpoints.
 * Automatically injects "Authorization: Bearer <token>" and "x-api-version: 1".
 * Automatically retries with fresh authentication on HTTP 401 token expiry.
 */
export async function zippyyRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const config = getZippyyConfig();
  const token = await getZippyyAccessToken(retried);
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${config.baseUrl.replace(/\/$/, "")}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": "1",
    Authorization: `Bearer ${token}`,
    ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired (401), invalidate cache and retry once
  if (res.status === 401 && !retried && !config.apiKey) {
    console.warn("[Zippyy Client] Received HTTP 401. Invalidating cached token and retrying...");
    cachedToken = null;
    return zippyyRequest<T>(endpoint, options, true);
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || `Zippyy API request failed with HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Safe test function to verify Zippyy authentication without exposing secrets or tokens.
 * Can be called by backend admin functions or test endpoints.
 */
export async function testZippyyAuthentication(): Promise<ZippyyAuthTestResult> {
  const config = getZippyyConfig();

  if (!config.emailAddress || !config.password) {
    const missing: string[] = [];
    if (!config.emailAddress) missing.push("ZIPPYY_EMAIL");
    if (!config.password) missing.push("ZIPPYY_PASSWORD");

    return {
      success: false,
      message: `Zippyy authentication cannot proceed: missing Cloudflare secret(s) [${missing.join(", ")}].`,
      environment: config.isSandbox ? "Sandbox" : "Production",
      baseUrl: config.baseUrl,
      error: `Missing required environment variables: ${missing.join(", ")}`,
    };
  }

  try {
    // Force a fresh login to test live credentials against Zippyy API
    await getZippyyAccessToken(true);

    const expiresAt = cachedToken?.expiresAt
      ? new Date(cachedToken.expiresAt).toISOString()
      : undefined;

    return {
      success: true,
      message: "Zippyy authentication successful. Access token received and verified.",
      statusCode: 200,
      environment: config.isSandbox ? "Sandbox" : "Production",
      baseUrl: config.baseUrl,
      configuredEmail: maskEmail(config.emailAddress),
      tokenExpiresAt: expiresAt,
      tokenType: "Bearer",
      hasIdToken: Boolean(cachedToken?.idToken),
      hasRefreshToken: Boolean(cachedToken?.refreshToken),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Zippyy authentication failed with unexpected error.",
      environment: config.isSandbox ? "Sandbox" : "Production",
      baseUrl: config.baseUrl,
      configuredEmail: maskEmail(config.emailAddress),
      error: err?.message || String(err),
    };
  }
}
