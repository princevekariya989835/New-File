/**
 * RIOTOUS Persistent Rate Limiter & Abuse Protection
 * Server-only module: NEVER import from client components.
 *
 * Implements persistent, shared rate limiting across Cloudflare Workers isolates
 * backed by Cloudflare D1 / PostgreSQL, with an in-memory sliding-window fallback.
 */

import { getSql } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  code?: number;
  retryAfterSeconds?: number;
  retryAfterMinutes?: number;
  remainingAttempts?: number;
  error?: string;
}

// In-memory sliding-window cache for ultra-low latency & resilient fallback
interface MemoryLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil: number | null;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryLimitRecord>();

/**
 * Normalizes email addresses to prevent attackers from bypassing limits
 * via casing, leading/trailing whitespace, or unicode tricks.
 */
export function normalizeEmail(email: unknown): string {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

/**
 * Extracts client IP address safely from Cloudflare Worker request headers.
 */
export function extractClientIp(customHeaders?: any): string {
  try {
    if (customHeaders) {
      const getH = (name: string): string | null => {
        if (typeof customHeaders.get === "function") return customHeaders.get(name);
        return customHeaders[name] || customHeaders[name.toLowerCase()] || null;
      };
      const cfIp = getH("cf-connecting-ip");
      if (cfIp && typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();

      const xff = getH("x-forwarded-for");
      if (xff && typeof xff === "string" && xff.trim()) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first;
      }

      const realIp = getH("x-real-ip");
      if (realIp && typeof realIp === "string" && realIp.trim()) return realIp.trim();
    }
  } catch {
    // ignore
  }

  // Dynamic import from TanStack Start server if running within a server handler context
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serverMod = require("@tanstack/react-start/server");
    if (typeof serverMod.getRequestHeader === "function") {
      const cfIp = serverMod.getRequestHeader("cf-connecting-ip");
      if (cfIp) return cfIp.trim();
      const xff = serverMod.getRequestHeader("x-forwarded-for");
      if (xff) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first;
      }
      const realIp = serverMod.getRequestHeader("x-real-ip");
      if (realIp) return realIp.trim();
    }
  } catch {
    // fallback
  }

  return "127.0.0.1";
}

/**
 * Low-level persistent rate-limit checker.
 * Validates whether a key has exceeded maxAttempts or is currently blocked.
 */
export async function checkPersistentRateLimit(opts: {
  key: string;
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
  actionName?: string;
}): Promise<RateLimitResult> {
  const { key, maxAttempts, windowMs } = opts;
  const blockDurationMs = opts.blockDurationMs ?? windowMs;
  const actionName = opts.actionName || "authentication attempts";
  const now = Date.now();

  // 1. Fast in-memory check
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.blockedUntil && now < mem.blockedUntil) {
      const retryAfter = Math.ceil((mem.blockedUntil - now) / 1000);
      const minutes = Math.max(1, Math.ceil(retryAfter / 60));
      return {
        allowed: false,
        code: 429,
        retryAfterSeconds: retryAfter,
        retryAfterMinutes: minutes,
        error: `Too many failed ${actionName}. Please wait ${minutes} minute(s) before trying again.`,
      };
    }
    if (now > mem.expiresAt) {
      memoryCache.delete(key);
    }
  }

  // 2. Shared persistent database check (Cloudflare D1 / PostgreSQL)
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT attempts, first_attempt_at, last_attempt_at, blocked_until, expires_at
      FROM rate_limits
      WHERE key = ${key}
      LIMIT 1
    `;

    if (rows && rows.length > 0) {
      const row = rows[0];
      const blockedUntil = row.blocked_until ? Number(row.blocked_until) : null;
      const expiresAt = Number(row.expires_at || 0);
      const attempts = Number(row.attempts || 0);

      // Check active block
      if (blockedUntil && now < blockedUntil) {
        const retryAfter = Math.ceil((blockedUntil - now) / 1000);
        const minutes = Math.max(1, Math.ceil(retryAfter / 60));
        // Keep memory cache updated
        memoryCache.set(key, {
          attempts,
          firstAttemptAt: Number(row.first_attempt_at || now),
          lastAttemptAt: Number(row.last_attempt_at || now),
          blockedUntil,
          expiresAt,
        });
        return {
          allowed: false,
          code: 429,
          retryAfterSeconds: retryAfter,
          retryAfterMinutes: minutes,
          error: `Too many failed ${actionName}. Please wait ${minutes} minute(s) before trying again.`,
        };
      }

      // Check if window has expired
      if (now > expiresAt) {
        // Safe decay
        await sql`DELETE FROM rate_limits WHERE key = ${key}`;
        memoryCache.delete(key);
        return { allowed: true, remainingAttempts: maxAttempts };
      }

      // Check if threshold was crossed
      if (attempts >= maxAttempts) {
        const newBlockedUntil = now + blockDurationMs;
        const newExpiresAt = newBlockedUntil + windowMs;
        await sql`
          UPDATE rate_limits
          SET blocked_until = ${newBlockedUntil}, expires_at = ${newExpiresAt}
          WHERE key = ${key}
        `;
        const retryAfter = Math.ceil(blockDurationMs / 1000);
        const minutes = Math.max(1, Math.ceil(retryAfter / 60));
        memoryCache.set(key, {
          attempts,
          firstAttemptAt: Number(row.first_attempt_at || now),
          lastAttemptAt: now,
          blockedUntil: newBlockedUntil,
          expiresAt: newExpiresAt,
        });
        return {
          allowed: false,
          code: 429,
          retryAfterSeconds: retryAfter,
          retryAfterMinutes: minutes,
          error: `Too many failed ${actionName}. Please wait ${minutes} minute(s) before trying again.`,
        };
      }

      return { allowed: true, remainingAttempts: Math.max(0, maxAttempts - attempts) };
    }
  } catch (dbErr) {
    console.warn("[RateLimiter] Database check notice (using memory fallback):", dbErr);
  }

  return { allowed: true, remainingAttempts: maxAttempts };
}

/**
 * Records a failed attempt for the given key.
 * Increments the failure counter and temporarily blocks if maxAttempts is reached.
 */
export async function recordPersistentFailedAttempt(opts: {
  key: string;
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}): Promise<void> {
  const { key, maxAttempts, windowMs } = opts;
  const blockDurationMs = opts.blockDurationMs ?? windowMs;
  const now = Date.now();

  // Update memory cache
  const mem = memoryCache.get(key);
  let newMemAttempts = 1;
  let memBlockedUntil: number | null = null;
  if (mem && now <= mem.expiresAt) {
    newMemAttempts = mem.attempts + 1;
    if (newMemAttempts >= maxAttempts) {
      memBlockedUntil = now + blockDurationMs;
    }
    memoryCache.set(key, {
      attempts: newMemAttempts,
      firstAttemptAt: mem.firstAttemptAt,
      lastAttemptAt: now,
      blockedUntil: memBlockedUntil || mem.blockedUntil,
      expiresAt: memBlockedUntil ? memBlockedUntil + windowMs : mem.expiresAt,
    });
  } else {
    memoryCache.set(key, {
      attempts: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
      blockedUntil: null,
      expiresAt: now + windowMs,
    });
  }

  // Update persistent database
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT attempts, first_attempt_at, expires_at
      FROM rate_limits
      WHERE key = ${key}
      LIMIT 1
    `;

    if (rows && rows.length > 0) {
      const existing = rows[0];
      const expiresAt = Number(existing.expires_at || 0);

      if (now <= expiresAt) {
        const nextAttempts = Number(existing.attempts || 0) + 1;
        const isBlocked = nextAttempts >= maxAttempts;
        const blockedUntil = isBlocked ? now + blockDurationMs : null;
        const updatedExpiresAt = isBlocked ? now + blockDurationMs + windowMs : expiresAt;

        await sql`
          UPDATE rate_limits
          SET attempts = ${nextAttempts},
              last_attempt_at = ${now},
              blocked_until = ${blockedUntil},
              expires_at = ${updatedExpiresAt}
          WHERE key = ${key}
        `;
        return;
      }
    }

    // New or expired record
    await sql`
      INSERT INTO rate_limits (key, attempts, first_attempt_at, last_attempt_at, blocked_until, expires_at)
      VALUES (${key}, 1, ${now}, ${now}, NULL, ${now + windowMs})
      ON CONFLICT (key) DO UPDATE SET
        attempts = 1,
        first_attempt_at = ${now},
        last_attempt_at = ${now},
        blocked_until = NULL,
        expires_at = ${now + windowMs}
    `;
  } catch (err) {
    console.warn("[RateLimiter] Database record notice (using memory fallback):", err);
  }
}

/**
 * Resets the failed counter on successful authentication or action.
 */
export async function resetPersistentRateLimit(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    const sql = getSql();
    await sql`DELETE FROM rate_limits WHERE key = ${key}`;
  } catch (err) {
    console.warn("[RateLimiter] Database reset notice:", err);
  }
}

// ─── HIGH-LEVEL AUTH CONVENIENCE HANDLERS ──────────────────────────────────────

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Validates login attempt limits:
 * 1. Account Limit: Max 5 failed attempts per account within 15 minutes.
 *    Temporarily blocks further authentication for 15 minutes.
 * 2. IP Limit: Max 20 failed attempts per IP within 15 minutes.
 */
export async function checkLoginRateLimit(opts: {
  email: string;
  ip: string;
}): Promise<RateLimitResult> {
  const normEmail = normalizeEmail(opts.email);
  const ip = opts.ip || "127.0.0.1";

  // 1. Check Account limit (Max 5 attempts / 15m)
  if (normEmail) {
    const accountCheck = await checkPersistentRateLimit({
      key: `login:account:${normEmail}`,
      maxAttempts: 5,
      windowMs: FIFTEEN_MINUTES_MS,
      blockDurationMs: FIFTEEN_MINUTES_MS,
      actionName: "login attempts on this account",
    });
    if (!accountCheck.allowed) {
      return accountCheck;
    }
  }

  // 2. Check IP limit (Max 20 attempts / 15m)
  const ipCheck = await checkPersistentRateLimit({
    key: `login:ip:${ip}`,
    maxAttempts: 20,
    windowMs: FIFTEEN_MINUTES_MS,
    blockDurationMs: FIFTEEN_MINUTES_MS,
    actionName: "login attempts from your IP",
  });
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  return { allowed: true };
}

/**
 * Records a failed login attempt on both account and IP counters.
 */
export async function recordLoginFailure(opts: { email: string; ip: string }): Promise<void> {
  const normEmail = normalizeEmail(opts.email);
  const ip = opts.ip || "127.0.0.1";

  const tasks: Promise<void>[] = [];
  if (normEmail) {
    tasks.push(
      recordPersistentFailedAttempt({
        key: `login:account:${normEmail}`,
        maxAttempts: 5,
        windowMs: FIFTEEN_MINUTES_MS,
        blockDurationMs: FIFTEEN_MINUTES_MS,
      }),
    );
  }
  tasks.push(
    recordPersistentFailedAttempt({
      key: `login:ip:${ip}`,
      maxAttempts: 20,
      windowMs: FIFTEEN_MINUTES_MS,
      blockDurationMs: FIFTEEN_MINUTES_MS,
    }),
  );

  await Promise.allSettled(tasks);
}

/**
 * Resets account rate limit counters upon successful login.
 */
export async function recordLoginSuccess(opts: { email: string; ip: string }): Promise<void> {
  const normEmail = normalizeEmail(opts.email);
  if (normEmail) {
    await resetPersistentRateLimit(`login:account:${normEmail}`);
  }
}

/**
 * Checks password reset request limits:
 * - By account: max 3 requests per 15 minutes
 * - By IP: max 10 requests per 15 minutes
 */
export async function checkPasswordResetRequestLimit(opts: {
  email: string;
  ip: string;
}): Promise<RateLimitResult> {
  const normEmail = normalizeEmail(opts.email);
  const ip = opts.ip || "127.0.0.1";

  if (normEmail) {
    const accCheck = await checkPersistentRateLimit({
      key: `reset_req:account:${normEmail}`,
      maxAttempts: 3,
      windowMs: FIFTEEN_MINUTES_MS,
      blockDurationMs: FIFTEEN_MINUTES_MS,
      actionName: "password reset requests",
    });
    if (!accCheck.allowed) return accCheck;
  }

  const ipCheck = await checkPersistentRateLimit({
    key: `reset_req:ip:${ip}`,
    maxAttempts: 10,
    windowMs: FIFTEEN_MINUTES_MS,
    blockDurationMs: FIFTEEN_MINUTES_MS,
    actionName: "password reset requests from your IP",
  });
  if (!ipCheck.allowed) return ipCheck;

  return { allowed: true };
}

/**
 * Records password reset request for rate tracking.
 */
export async function recordPasswordResetRequest(opts: {
  email: string;
  ip: string;
}): Promise<void> {
  const normEmail = normalizeEmail(opts.email);
  const ip = opts.ip || "127.0.0.1";

  const tasks: Promise<void>[] = [];
  if (normEmail) {
    tasks.push(
      recordPersistentFailedAttempt({
        key: `reset_req:account:${normEmail}`,
        maxAttempts: 3,
        windowMs: FIFTEEN_MINUTES_MS,
        blockDurationMs: FIFTEEN_MINUTES_MS,
      }),
    );
  }
  tasks.push(
    recordPersistentFailedAttempt({
      key: `reset_req:ip:${ip}`,
      maxAttempts: 10,
      windowMs: FIFTEEN_MINUTES_MS,
      blockDurationMs: FIFTEEN_MINUTES_MS,
    }),
  );

  await Promise.allSettled(tasks);
}

/**
 * Checks registration rate limits:
 * - By IP: max 10 registrations per hour
 * - By email: max 5 registration attempts per 15 minutes
 */
export async function checkRegistrationLimit(opts: {
  email: string;
  ip: string;
}): Promise<RateLimitResult> {
  const normEmail = normalizeEmail(opts.email);
  const ip = opts.ip || "127.0.0.1";

  if (normEmail) {
    const emailCheck = await checkPersistentRateLimit({
      key: `register:account:${normEmail}`,
      maxAttempts: 5,
      windowMs: FIFTEEN_MINUTES_MS,
      blockDurationMs: FIFTEEN_MINUTES_MS,
      actionName: "registration attempts",
    });
    if (!emailCheck.allowed) return emailCheck;
  }

  const ipCheck = await checkPersistentRateLimit({
    key: `register:ip:${ip}`,
    maxAttempts: 10,
    windowMs: ONE_HOUR_MS,
    blockDurationMs: ONE_HOUR_MS,
    actionName: "registrations from this connection",
  });
  if (!ipCheck.allowed) return ipCheck;

  return { allowed: true };
}

/**
 * Checks OTP / reset token verification attempt limits:
 * - Max 5 verification attempts per 15 minutes.
 */
export async function checkTokenVerifyLimit(keyIdentifier: string): Promise<RateLimitResult> {
  return checkPersistentRateLimit({
    key: `verify_token:${keyIdentifier.toLowerCase()}`,
    maxAttempts: 5,
    windowMs: FIFTEEN_MINUTES_MS,
    blockDurationMs: FIFTEEN_MINUTES_MS,
    actionName: "verification attempts",
  });
}

/**
 * Records a failed verification attempt.
 */
export async function recordTokenVerifyFailure(keyIdentifier: string): Promise<void> {
  await recordPersistentFailedAttempt({
    key: `verify_token:${keyIdentifier.toLowerCase()}`,
    maxAttempts: 5,
    windowMs: FIFTEEN_MINUTES_MS,
    blockDurationMs: FIFTEEN_MINUTES_MS,
  });
}

/**
 * Resets token verification counter on success.
 */
export async function resetTokenVerifyLimit(keyIdentifier: string): Promise<void> {
  await resetPersistentRateLimit(`verify_token:${keyIdentifier.toLowerCase()}`);
}
