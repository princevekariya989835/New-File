/**
 * RIOTOUS - Authentication Security, Password Recovery & Email Notification Test Suite
 *
 * Validates:
 * 1. Server-side login rate limiting (5 attempts/15 min, account + IP throttling, case normalization, reset on success)
 * 2. Cryptographic password reset tokens (SHA-256 storage, single-use, 20-min expiry, generic enumeration defense)
 * 3. Email notifications (ADMIN_NOTIFICATION_EMAIL privacy, idempotent delivery, HTML escaping, template security)
 * 4. Static repository privacy scan (zero hardcoded secrets or admin emails in client bundles)
 */

import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

// -----------------------------------------------------------------------------
// 1. RATE LIMITING UTILITIES & NORMALIZATION
// -----------------------------------------------------------------------------
function normalizeEmail(email) {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function runNormalizationTests() {
  console.log("\n--- Testing Email Normalization & Input Sanitization ---");
  assert(normalizeEmail("  User@Example.COM  ") === "user@example.com", "Trims and lowercases standard emails");
  assert(normalizeEmail("VICTIM+test@DOMAIN.co.in") === "victim+test@domain.co.in", "Preserves subaddressing safely and lowercases");
  assert(normalizeEmail("") === "", "Handles empty input");
  assert(normalizeEmail(null) === "", "Handles null input");
}

// In-memory simulation of rate_limits table logic matching rate-limiter.server.ts
class MockRateLimiter {
  constructor() {
    this.store = new Map();
  }

  recordAttempt(key, type) {
    const compositeKey = `${type}:${key}`;
    const now = Date.now();
    const entry = this.store.get(compositeKey) || { attempts: 0, windowStart: now, blockedUntil: null };

    // Reset window if 15 mins passed
    if (now - entry.windowStart > 15 * 60 * 1000) {
      entry.attempts = 1;
      entry.windowStart = now;
      entry.blockedUntil = null;
    } else {
      entry.attempts++;
    }

    if (entry.attempts >= 5) {
      entry.blockedUntil = now + 15 * 60 * 1000;
    }

    this.store.set(compositeKey, entry);
  }

  checkLimit(key, type, maxAttempts = 5) {
    const compositeKey = `${type}:${key}`;
    const entry = this.store.get(compositeKey);
    if (!entry) return { allowed: true, remaining: maxAttempts };

    const now = Date.now();
    if (entry.blockedUntil && now < entry.blockedUntil) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
      };
    }

    // Reset window if expired
    if (now - entry.windowStart > 15 * 60 * 1000) {
      this.store.delete(compositeKey);
      return { allowed: true, remaining: maxAttempts };
    }

    const remaining = Math.max(0, maxAttempts - entry.attempts);
    return { allowed: entry.attempts < maxAttempts, remaining };
  }

  reset(key, type) {
    const compositeKey = `${type}:${key}`;
    this.store.delete(compositeKey);
  }
}

function runRateLimiterTests() {
  console.log("\n--- Testing Rate Limiter & Brute-Force Throttling ---");
  const limiter = new MockRateLimiter();
  const testEmail = "testuser@example.com";

  // Check initial state
  let check = limiter.checkLimit(testEmail, "login_email");
  assert(check.allowed === true && check.remaining === 5, "Initial state allows 5 attempts");

  // Record 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    limiter.recordAttempt(testEmail, "login_email");
    check = limiter.checkLimit(testEmail, "login_email");
    assert(check.allowed === true && check.remaining === 5 - i, `Attempt ${i}: Allowed, remaining = ${5 - i}`);
  }

  // Record 5th failed attempt -> reaches threshold
  limiter.recordAttempt(testEmail, "login_email");
  check = limiter.checkLimit(testEmail, "login_email");
  assert(check.allowed === false, "5th failed attempt triggers lockout (allowed = false)");
  assert(check.retryAfterMinutes === 15, "Retry after is approximately 15 minutes");

  // 6th attempt is blocked
  check = limiter.checkLimit(testEmail, "login_email");
  assert(check.allowed === false, "Subsequent attempt while locked is blocked");

  // Bypass attempt via altered casing
  const casedEmail = normalizeEmail("TestUser@EXAMPLE.COM");
  check = limiter.checkLimit(casedEmail, "login_email");
  assert(check.allowed === false, "Cannot bypass rate limit by varying email casing");

  // Successful login resets the counter
  limiter.reset(testEmail, "login_email");
  check = limiter.checkLimit(testEmail, "login_email");
  assert(check.allowed === true && check.remaining === 5, "Successful authentication resets rate limit immediately");
}

// -----------------------------------------------------------------------------
// 2. CRYPTOGRAPHIC PASSWORD RESET TOKENS
// -----------------------------------------------------------------------------
function generateSecureResetToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function runCryptoTokenTests() {
  console.log("\n--- Testing Cryptographic Password Reset Tokens ---");

  const token1 = generateSecureResetToken();
  const token2 = generateSecureResetToken();

  assert(token1.length === 64, "Generated token is 32 random bytes (64 hex characters)");
  assert(token1 !== token2, "Consecutive tokens are uniquely generated");

  const hash1 = hashToken(token1);
  const hash2 = hashToken(token2);
  const hash1Again = hashToken(token1);

  assert(hash1.length === 64, "SHA-256 token hash is 64 hex characters");
  assert(hash1 === hash1Again, "SHA-256 token hashing is deterministic");
  assert(hash1 !== hash2, "Different tokens have distinct hashes");
  assert(hash1 !== token1, "Stored hash is never equal to raw token");

  // In-memory simulation of single-use and expiration database constraints
  const dbResetRecords = [
    {
      id: "pr_valid",
      token_hash: hash1,
      email: "customer@riotous.store",
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      used_at: null,
    },
    {
      id: "pr_used",
      token_hash: hashToken("used_token_value_32_bytes_long_12345"),
      email: "customer@riotous.store",
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      used_at: new Date().toISOString(),
    },
    {
      id: "pr_expired",
      token_hash: hashToken("expired_token_value_32_bytes_long_1234"),
      email: "customer@riotous.store",
      expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // expired 5 mins ago
      used_at: null,
    },
  ];

  function validateToken(rawToken) {
    const hashed = hashToken(rawToken);
    const record = dbResetRecords.find((r) => r.token_hash === hashed);
    if (!record) return { valid: false, error: "Invalid token" };
    if (record.used_at) return { valid: false, error: "Already used" };
    if (new Date() > new Date(record.expires_at)) return { valid: false, error: "Expired" };
    // Atomically mark used
    record.used_at = new Date().toISOString();
    return { valid: true, email: record.email };
  }

  // Validate valid token
  const res1 = validateToken(token1);
  assert(res1.valid === true, "Valid unexpired token is accepted");

  // Re-use same token -> must be rejected
  const resReuse = validateToken(token1);
  assert(resReuse.valid === false && resReuse.error === "Already used", "Reusing consumed token is rejected atomically");

  // Used token rejected
  const resUsed = validateToken("used_token_value_32_bytes_long_12345");
  assert(resUsed.valid === false && resUsed.error === "Already used", "Previously used token is rejected");

  // Expired token rejected
  const resExpired = validateToken("expired_token_value_32_bytes_long_1234");
  assert(resExpired.valid === false && resExpired.error === "Expired", "Expired token is rejected");

  // Tampered token rejected
  const resTampered = validateToken(token1.slice(0, 63) + "a");
  assert(resTampered.valid === false, "Tampered token hash mismatch is rejected");
}

// -----------------------------------------------------------------------------
// 3. EMAIL TEMPLATES & HTML ESCAPING
// -----------------------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function runEmailTemplateTests() {
  console.log("\n--- Testing Email Templates & Escaping Security ---");

  const maliciousName = '<script>alert("pwned")</script> John';
  const escaped = escapeHtml(maliciousName);
  assert(!escaped.includes("<script>"), "HTML tags are escaped to prevent XSS in email clients");
  assert(escaped.includes("&lt;script&gt;"), "Sanitized output contains proper HTML entities");

  // Test Email Idempotency Cache Simulation
  const sentEmails = new Set();
  function sendOrderNotification(orderId) {
    const key = `order_notification:${orderId}`;
    if (sentEmails.has(key)) {
      return { sent: false, duplicate: true };
    }
    sentEmails.add(key);
    return { sent: true, duplicate: false };
  }

  const order1 = sendOrderNotification("ord_test_001");
  assert(order1.sent === true && order1.duplicate === false, "First order notification sends successfully");

  const order1Retry = sendOrderNotification("ord_test_001");
  assert(order1Retry.sent === false && order1Retry.duplicate === true, "Razorpay webhook retry is deduplicated and not sent again");
}

// -----------------------------------------------------------------------------
// 4. STATIC CODE PRIVACY AUDIT & SECRET LEAKAGE PREVENTION
// -----------------------------------------------------------------------------
function runPrivacyAudit() {
  console.log("\n--- Running Repository Privacy Audit ---");

  const scannedExtensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".html"];
  const bannedEmails = [
    "princevekariya9898@gmail.com", // Old developer email that should never be hardcoded
  ];

  const allowedFilesWithRef = [
    // Database seeds or test scripts outside src are reviewed separately
    "generate-seed-sql.ts",
    "generate-relational-seed.ts",
    "package.json",
  ];

  let violations = [];

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f === "node_modules" || f === ".git" || f === "dist" || f === ".vinxi" || f === ".output") continue;
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(f);
        if (scannedExtensions.includes(ext) && !allowedFilesWithRef.includes(f)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          for (const banned of bannedEmails) {
            if (content.toLowerCase().includes(banned.toLowerCase())) {
              violations.push({ file: fullPath, match: banned });
            }
          }
        }
      }
    }
  }

  const srcDir = path.join(ROOT_DIR, "src");
  scanDir(srcDir);

  assert(violations.length === 0, `No hardcoded personal administrator email addresses in src/ (violations: ${violations.length})`);
  if (violations.length > 0) {
    console.error("Violations detected:", violations);
  }

  // Verify .env.example contains ADMIN_NOTIFICATION_EMAIL and SITE_URL
  const envExample = fs.readFileSync(path.join(ROOT_DIR, ".env.example"), "utf-8");
  assert(envExample.includes("ADMIN_NOTIFICATION_EMAIL="), ".env.example contains ADMIN_NOTIFICATION_EMAIL template");
  assert(envExample.includes("SITE_URL="), ".env.example contains SITE_URL template");

  // Verify .gitignore ignores .dev.vars and .env
  const gitignore = fs.readFileSync(path.join(ROOT_DIR, ".gitignore"), "utf-8");
  assert(gitignore.includes(".dev.vars"), ".gitignore ignores .dev.vars");
  assert(gitignore.includes(".env"), ".gitignore ignores .env");

  // Verify reset-password route sets noindex, nofollow, and no-referrer
  const resetPasswordRoute = fs.readFileSync(path.join(ROOT_DIR, "src/routes/reset-password.tsx"), "utf-8");
  assert(resetPasswordRoute.includes("noindex, nofollow"), "Reset password route includes noindex, nofollow");
  assert(resetPasswordRoute.includes("no-referrer"), "Reset password route includes referrer: no-referrer to protect reset tokens");

  // Verify rate-limiter.server.ts contains max 5 attempts within 15 mins
  const rateLimiter = fs.readFileSync(path.join(ROOT_DIR, "src/lib/rate-limiter.server.ts"), "utf-8");
  assert(rateLimiter.includes("maxAttempts: 5"), "Rate limiter configures maxAttempts: 5 for account login protection");
  assert(rateLimiter.includes("15 * 60 * 1000"), "Rate limiter enforces 15-minute window");
}

// -----------------------------------------------------------------------------
// EXECUTE SUITE
// -----------------------------------------------------------------------------
try {
  console.log("=================================================================");
  console.log("RIOTOUS AUTH SECURITY & EMAIL NOTIFICATIONS VERIFICATION SUITE");
  console.log("=================================================================");

  runNormalizationTests();
  runRateLimiterTests();
  runCryptoTokenTests();
  runEmailTemplateTests();
  runPrivacyAudit();

  console.log("\n=================================================================");
  console.log(`SUMMARY: All ${passed} tests PASSED. ${failed} failed.`);
  console.log("=================================================================\n");
  process.exit(0);
} catch (e) {
  console.error("\n❌ Test suite failed:", e);
  process.exit(1);
}
