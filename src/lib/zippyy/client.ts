/**
 * Zippyy API Client with secure Token Lifecycle Management
 */
import type { ZippyyAuthConfig, ZippyyAuthResponse } from "./types";

let cachedToken: {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
} | null = null;

export function getZippyyConfig(): ZippyyAuthConfig {
  return {
    baseUrl: process.env.ZIPPYY_BASE_URL || "https://sellingpartnerapi-in.zippyy.ai",
    email: process.env.ZIPPYY_EMAIL || "",
    password: process.env.ZIPPYY_PASSWORD || "",
    apiKey: process.env.ZIPPYY_API_KEY || "",
    warehouseId: process.env.ZIPPYY_DEFAULT_WAREHOUSE_ID || "wh_default_01",
    pickupPincode: process.env.ZIPPYY_PICKUP_PINCODE || "395006",
    webhookSecret: process.env.ZIPPYY_WEBHOOK_SECRET || "",
    isSandbox: process.env.ZIPPYY_SANDBOX_MODE === "true" || (!process.env.ZIPPYY_EMAIL && !process.env.ZIPPYY_API_KEY),
  };
}

export function isZippyyConfigured(): boolean {
  const config = getZippyyConfig();
  return Boolean((config.email && config.password) || config.apiKey);
}

/**
 * Retrieves a valid Zippyy Access Token or API Key.
 */
export async function getZippyyAccessToken(forceRefresh = false): Promise<string> {
  const config = getZippyyConfig();

  if (config.apiKey) {
    return config.apiKey;
  }

  // If credentials are not configured, return a mock token for development
  if (!config.email || !config.password) {
    return "mock_zippyy_jwt_token_development";
  }

  const now = Date.now();
  // 5-minute safety buffer before expiration
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.accessToken;
  }

  try {
    const loginUrl = `${config.baseUrl.replace(/\/$/, "")}/v1/external/auth/login`;
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: config.email,
        password: config.password,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Zippyy Client] Auth failed: HTTP ${response.status} - ${errorText}`);
      throw new Error(`Zippyy authentication failed with HTTP ${response.status}`);
    }

    const data: ZippyyAuthResponse = await response.json();
    const expiresInSeconds = data.expiresIn || 24 * 60 * 60; // Default 24h if unspecified

    cachedToken = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: now + expiresInSeconds * 1000,
    };

    return cachedToken.accessToken;
  } catch (error: any) {
    console.error("[Zippyy Client] Error fetching access token:", error);
    if (cachedToken) {
      return cachedToken.accessToken;
    }
    throw error;
  }
}

/**
 * Generic authenticated request wrapper for Zippyy API endpoints.
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
    Authorization: `Bearer ${token}`,
    ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 && !retried && !config.apiKey) {
    console.warn("[Zippyy Client] Token expired (401). Retrying with fresh login...");
    return zippyyRequest<T>(endpoint, options, true);
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || `Zippyy API request failed: ${res.status}`);
  }

  return res.json();
}
