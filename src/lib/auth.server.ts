import { getCloudflareEnv } from "@/lib/db";
import type { AuthUser } from "@/lib/auth.types";

/**
 * Resolves the server-only AUTH_SECRET environment variable.
 * Must exist only in the server / Cloudflare Worker runtime.
 * Fails safely if missing — NEVER falls back to default secrets or payment keys.
 */
export function getAuthSecret(): string {
  // 1. Cloudflare request runtime env
  const cfEnv = getCloudflareEnv();
  if (cfEnv && typeof cfEnv.AUTH_SECRET === "string" && cfEnv.AUTH_SECRET.trim() !== "") {
    return cfEnv.AUTH_SECRET.trim();
  }

  // 2. Global environment bindings (Nitro / Cloudflare module)
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (typeof g.__env__?.AUTH_SECRET === "string" && g.__env__.AUTH_SECRET.trim() !== "") {
      return g.__env__.AUTH_SECRET.trim();
    }
    if (typeof g.__cf_env__?.AUTH_SECRET === "string" && g.__cf_env__.AUTH_SECRET.trim() !== "") {
      return g.__cf_env__.AUTH_SECRET.trim();
    }
    if (typeof g.env?.AUTH_SECRET === "string" && g.env.AUTH_SECRET.trim() !== "") {
      return g.env.AUTH_SECRET.trim();
    }
  }

  // 3. process.env (Node.js / dev server)
  if (typeof process !== "undefined" && process.env?.AUTH_SECRET && process.env.AUTH_SECRET.trim() !== "") {
    return process.env.AUTH_SECRET.trim();
  }

  throw new Error("AUTH_SECRET is not configured on the server. Please set AUTH_SECRET in your environment variables.");
}

// Pure JS SHA-256 implementation for synchronous HMAC across all server runtimes
function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = bytes.length;
  const bitLen = len * 8;
  const padLen = (len + 9 + 63) & ~63;
  const padded = new Uint8Array(padLen);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 4, bitLen, false);

  const W = new Int32Array(64);
  for (let i = 0; i < padLen; i += 64) {
    for (let j = 0; j < 16; j++) {
      W[j] = view.getInt32(i + j * 4, false);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = ((W[j - 15] >>> 7) | (W[j - 15] << 25)) ^ ((W[j - 15] >>> 18) | (W[j - 15] << 14)) ^ (W[j - 15] >>> 3);
      const s1 = ((W[j - 2] >>> 17) | (W[j - 2] << 15)) ^ ((W[j - 2] >>> 19) | (W[j - 2] << 13)) ^ (W[j - 2] >>> 10);
      W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + W[j]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setInt32(0, h0, false);
  outView.setInt32(4, h1, false);
  outView.setInt32(8, h2, false);
  outView.setInt32(12, h3, false);
  outView.setInt32(16, h4, false);
  outView.setInt32(20, h5, false);
  outView.setInt32(24, h6, false);
  outView.setInt32(28, h7, false);
  return out;
}

function pureJsHmacSha256(keyStr: string, dataStr: string): string {
  const enc = new TextEncoder();
  let keyBytes = enc.encode(keyStr);
  const dataBytes = enc.encode(dataStr);
  if (keyBytes.length > 64) {
    keyBytes = new Uint8Array(sha256Bytes(keyBytes));
  }
  const keyPad = new Uint8Array(64);
  keyPad.set(keyBytes);

  const ipad = new Uint8Array(64 + dataBytes.length);
  const opad = new Uint8Array(64 + 32);

  for (let i = 0; i < 64; i++) {
    ipad[i] = keyPad[i] ^ 0x36;
    opad[i] = keyPad[i] ^ 0x5c;
  }
  ipad.set(dataBytes, 64);
  const innerHash = sha256Bytes(ipad);
  opad.set(innerHash, 64);
  const outerHash = sha256Bytes(opad);

  return Array.from(outerHash).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function computeHmac(data: string): string {
  const secret = getAuthSecret();
  try {
    if (typeof process !== "undefined" && process.versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require("node:crypto");
      if (crypto && typeof crypto.createHmac === "function") {
        return crypto.createHmac("sha256", secret).update(data).digest("hex");
      }
    }
  } catch {
    // Edge / worker fallback
  }
  return pureJsHmacSha256(secret, data);
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function toBase64(str: string): string {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(str, "utf8").toString("base64");
    }
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
}

function fromBase64(str: string): string {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(str, "base64").toString("utf8");
    }
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return atob(str);
  }
}

/**
 * Server-only cryptographic token signing.
 * Generates an HMAC-SHA256 signed token containing user identity and expiration.
 */
export function signToken(
  userId: string,
  email: string,
  role: string,
  fullName?: string | null,
): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = JSON.stringify({
    id: userId,
    email: email.toLowerCase().trim(),
    role: role || "customer",
    fullName: fullName || null,
    exp: expiresAt,
  });
  const b64 = toBase64(payload);
  const signature = computeHmac(b64);
  return `${b64}.${signature}`;
}

/**
 * Server-only cryptographic token verification.
 * Strictly checks HMAC-SHA256 signature using AUTH_SECRET and validates expiration.
 * Returns null if token is forged, tampered with, unsigned, or expired.
 */
export function verifyAndDecodeToken(token: string): AuthUser | null {
  if (!token || typeof token !== "string") return null;
  try {
    const trimmed = token.trim();
    if (!trimmed.includes(".")) {
      // Unsigned tokens are rejected
      return null;
    }

    const parts = trimmed.split(".");
    if (parts.length !== 2) {
      return null;
    }

    const [payloadB64, sig] = parts;
    const expectedSig = computeHmac(payloadB64);
    if (!expectedSig || !timingSafeEqualStr(sig, expectedSig)) {
      // Forged or tampered signature
      return null;
    }

    const raw = fromBase64(payloadB64);
    if (!raw.startsWith("{") || !raw.endsWith("}")) return null;

    const parsed = JSON.parse(raw);
    if (!parsed.id || !parsed.email) return null;
    if (parsed.exp && Date.now() > Number(parsed.exp)) return null;

    return {
      id: String(parsed.id),
      email: String(parsed.email).toLowerCase().trim(),
      fullName: parsed.fullName ? String(parsed.fullName) : null,
      role: parsed.role || "customer",
      status: "Active",
    };
  } catch {
    return null;
  }
}

/**
 * Cross-runtime SHA-256 password hashing with consistent salt.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof process !== "undefined" && process.versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require("node:crypto");
      return crypto.createHash("sha256").update(password + "_riotous_salt_2026").digest("hex");
    }
  } catch {
    // Fallback using global Web Crypto API
  }
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "_riotous_salt_2026");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return password;
  }
}

// In-memory sliding-window rate limiter for sensitive authentication operations
type RateLimitRecord = { count: number; resetTime: number };
const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  record.count++;
  return { allowed: true };
}
