import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { sendLoginOtp, sendForgotPasswordOtp, sendWelcomeEmail } from "@/lib/email";

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    "riotous_super_secure_auth_secret_2026_jwt"
  );
}

function computeHmac(data: string): string {
  try {
    if (typeof process !== "undefined" && process.versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require("node:crypto");
      return crypto.createHmac("sha256", getAuthSecret()).update(data).digest("hex");
    }
  } catch {
    // client or edge fallback
  }
  return "";
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// In-memory sliding-window rate limiter for sensitive authentication operations
type RateLimitRecord = { count: number; resetTime: number };
const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(
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

export type StaffRole = "Super Admin" | "Admin" | "Manager" | "Staff";
export type StaffStatus = "Active" | "Inactive" | "Suspended";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "customer" | StaffRole | string;
  phone?: string | null;
  avatar?: string | null;
  status?: StaffStatus | string;
  permissions?: Record<string, string[]>;
  lastLoginAt?: string | null;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

// Cross-runtime SHA-256 password hashing with consistent salt
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

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === "princevekariya9898@gmail.com";
}

export function isStaffRole(r?: string | null): boolean {
  if (!r) return false;
  const lower = r.toLowerCase().trim();
  return (
    lower === "admin" ||
    lower === "super admin" ||
    lower === "super_admin" ||
    lower === "manager" ||
    lower === "staff" ||
    lower === "administrator"
  );
}

export function isStaffMember(user?: AuthUser | null): boolean {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const status = String(user.status || "Active")
    .toLowerCase()
    .trim();
  if (status === "inactive" || status === "suspended") return false;
  return isStaffRole(user.role);
}

export function hasAdminPanelAccess(user?: AuthUser | null): boolean {
  return isStaffMember(user);
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

// Generate cryptographically signed token containing user identity and 30-day expiration
export function signToken(
  userId: string,
  email: string,
  role: string,
  fullName?: string | null,
): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const effectiveRole = isAdminEmail(email) ? "Super Admin" : role || "customer";
  const payload = JSON.stringify({
    id: userId,
    email: email.toLowerCase().trim(),
    role: effectiveRole,
    fullName: fullName || null,
    exp: expiresAt,
  });
  const b64 = toBase64(payload);
  const signature = computeHmac(b64);
  return `${b64}.${signature}`;
}

export function decodeToken(token: string): AuthUser | null {
  if (!token || typeof token !== "string") return null;
  try {
    const trimmed = token.trim();
    let b64 = trimmed;
    let isSigned = false;

    // Verify cryptographic signature if present
    if (trimmed.includes(".")) {
      const parts = trimmed.split(".");
      if (parts.length === 2) {
        const [payloadB64, sig] = parts;
        // On server side where secrets exist, strictly verify HMAC
        if (typeof window === "undefined") {
          const expectedSig = computeHmac(payloadB64);
          if (expectedSig && timingSafeEqualStr(sig, expectedSig)) {
            b64 = payloadB64;
            isSigned = true;
          } else {
            // Tampered or invalid signature - reject on server
            return null;
          }
        } else {
          // On client, extract payload for optimistic UI state
          b64 = payloadB64;
          isSigned = true;
        }
      }
    }

    const raw = fromBase64(b64);

    // JSON format
    if (raw.startsWith("{") && raw.endsWith("}")) {
      const parsed = JSON.parse(raw);
      if (!parsed.id || !parsed.email) return null;
      if (parsed.exp && Date.now() > Number(parsed.exp)) return null;

      // Unsigned tokens cannot claim elevated privileges
      let role = parsed.role;
      if (!isSigned) {
        role = "customer";
      } else if (isAdminEmail(parsed.email)) {
        role = "Super Admin";
      }

      return {
        id: String(parsed.id),
        email: String(parsed.email).toLowerCase().trim(),
        fullName: parsed.fullName ? String(parsed.fullName) : null,
        role: role || "customer",
        status: "Active",
      };
    }

    // Legacy colon-delimited format (id:email:role:expiresAt)
    const [id, email, , expiresAtStr] = raw.split(":");
    if (!id || !email || !expiresAtStr) return null;
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return null;

    // Legacy unsigned format is only ever granted customer role
    const role = "customer";

    return {
      id,
      email: email.toLowerCase().trim(),
      fullName: null,
      role,
      status: "Active",
    };
  } catch {
    return null;
  }
}

function logAuthDebug(data: {
  route: string;
  databaseQueries: number;
  externalFetches: number;
  sessionChecks: number;
  durationMs: number;
}) {
  const totalSubrequests = data.databaseQueries + data.externalFetches;
  console.log(
    `[AUTH DEBUG]\n` +
      `route: ${data.route}\n` +
      `database queries: ${data.databaseQueries}\n` +
      `external fetches: ${data.externalFetches}\n` +
      `session checks: ${data.sessionChecks}\n` +
      `total subrequests: ${totalSubrequests}\n` +
      `duration: ${Math.round(data.durationMs)}ms`,
  );
}

export const registerServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; fullName?: string }) => ({
    email: String(d.email ?? "")
      .trim()
      .toLowerCase(),
    password: String(d.password ?? ""),
    fullName: d.fullName ? String(d.fullName).trim() : null,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; session?: AuthSession; error?: string }> => {
    const startTime = performance.now();
    let dbQueries = 0;
    try {
      const sql = getSql();
      if (!data.email || !data.password) {
        return { ok: false, error: "Email and password are required." };
      }
      if (data.password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
      }

      // Prevent unauthorized public registration of administrative accounts
      if (isAdminEmail(data.email)) {
        return { ok: false, error: "Administrative accounts cannot be registered publicly." };
      }

      // Rate limit registration attempts: max 5 per 15 minutes per email
      const rate = checkRateLimit(`register:${data.email}`, 5, 15 * 60 * 1000);
      if (!rate.allowed) {
        return { ok: false, error: `Too many registration attempts. Please wait ${rate.retryAfterSeconds} seconds.` };
      }

      // Query 1: Check if user already exists
      dbQueries++;
      const existing = await sql`SELECT id FROM profiles WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1`;
      if (existing.length > 0) {
        logAuthDebug({
          route: "registerServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "An account with this email already exists." };
      }

      const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = await hashPassword(data.password);
      const role = isAdminEmail(data.email) ? "Super Admin" : "customer";

      // Query 2: Insert new user
      dbQueries++;
      await sql`
        INSERT INTO profiles (id, email, password_hash, full_name, role, status)
        VALUES (${userId}, ${data.email}, ${passwordHash}, ${data.fullName}, ${role}, 'Active')
      `;

      const user: AuthUser = {
        id: userId,
        email: data.email,
        fullName: data.fullName,
        role,
        status: "Active",
      };
      const token = signToken(user.id, user.email, user.role, user.fullName);

      logAuthDebug({
        route: "registerServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 0,
        durationMs: performance.now() - startTime,
      });

      return { ok: true, session: { token, user } };
    } catch (err: any) {
      console.error("[Auth] register error:", err);
      logAuthDebug({
        route: "registerServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 0,
        durationMs: performance.now() - startTime,
      });
      return { ok: false, error: err?.message || "Registration failed." };
    }
  });

export const loginServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => ({
    email: String(d.email ?? "")
      .trim()
      .toLowerCase(),
    password: String(d.password ?? ""),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; session?: AuthSession; error?: string }> => {
    const startTime = performance.now();
    let dbQueries = 0;
    try {
      const sql = getSql();

      if (!data.email || !data.password) {
        return { ok: false, error: "Email and password are required." };
      }

      // Query 1: Single query to retrieve full profile credentials and state
      dbQueries++;
      const rows = await sql`
        SELECT id, email, password_hash, full_name, role, phone, avatar, status, permissions, last_login_at
        FROM profiles
        WHERE LOWER(email) = LOWER(${data.email})
        LIMIT 1
      `;

      if (rows.length === 0) {
        // Auto-provision Super Admin on initial sign in if database is empty/new
        if (isAdminEmail(data.email)) {
          const userId = `usr_admin_${Date.now().toString(36)}`;
          const passwordHash = await hashPassword(data.password);
          dbQueries++;
          try {
            await sql`
              INSERT INTO profiles (id, email, password_hash, full_name, role, status)
              VALUES (${userId}, ${data.email}, ${passwordHash}, 'Super Admin', 'Super Admin', 'Active')
              ON CONFLICT (email) DO UPDATE SET password_hash = ${passwordHash}, role = 'Super Admin', status = 'Active', updated_at = NOW()
            `;
          } catch (insertErr) {
            console.warn("[Auth] Super admin auto-provisioning note:", insertErr);
          }

          const user: AuthUser = {
            id: userId,
            email: data.email,
            fullName: "Super Admin",
            role: "Super Admin",
            status: "Active",
            lastLoginAt: new Date().toISOString(),
          };
          const token = signToken(user.id, user.email, user.role, user.fullName);

          logAuthDebug({
            route: "loginServerFn",
            databaseQueries: dbQueries,
            externalFetches: 0,
            sessionChecks: 1,
            durationMs: performance.now() - startTime,
          });

          return { ok: true, session: { token, user } };
        }

        logAuthDebug({
          route: "loginServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "Invalid email or password." };
      }

      const userRow = rows[0];
      const passwordHash = await hashPassword(data.password);

      if (userRow.password_hash !== passwordHash) {
        logAuthDebug({
          route: "loginServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "Invalid email or password." };
      }

      if (userRow.status === "Inactive" || userRow.status === "Suspended") {
        logAuthDebug({
          route: "loginServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return {
          ok: false,
          error: `Your account is currently ${userRow.status.toLowerCase()}. Please contact support.`,
        };
      }

      let role = userRow.role || "customer";
      // Query 2: Single update for last_login_at (and role sync if super admin)
      dbQueries++;
      if (isAdminEmail(userRow.email)) {
        role = "Super Admin";
        try {
          await sql`UPDATE profiles SET role = 'Super Admin', status = 'Active', last_login_at = NOW() WHERE LOWER(email) = LOWER(${userRow.email})`;
        } catch {
          /* non-fatal */
        }
      } else {
        try {
          await sql`UPDATE profiles SET last_login_at = NOW() WHERE LOWER(email) = LOWER(${userRow.email})`;
        } catch {
          /* non-fatal */
        }
      }

      const user: AuthUser = {
        id: String(userRow.id),
        email: String(userRow.email).toLowerCase().trim(),
        fullName: (userRow.full_name as string) || null,
        role,
        phone: (userRow.phone as string) || null,
        avatar: (userRow.avatar as string) || null,
        status: (userRow.status as string) || "Active",
        permissions: (userRow.permissions as Record<string, string[]>) || {},
        lastLoginAt: userRow.last_login_at
          ? new Date(userRow.last_login_at).toISOString()
          : new Date().toISOString(),
      };

      const token = signToken(user.id, user.email, user.role, user.fullName);

      logAuthDebug({
        route: "loginServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 1,
        durationMs: performance.now() - startTime,
      });

      return { ok: true, session: { token, user } };
    } catch (err: any) {
      console.error("[Auth] login error:", err);
      logAuthDebug({
        route: "loginServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 0,
        durationMs: performance.now() - startTime,
      });
      return { ok: false, error: err?.message || "Login failed. Please try again." };
    }
  });

export const getCurrentUserServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => ({ token: String(d.token ?? "") }))
  .handler(async ({ data }): Promise<AuthUser | null> => {
    if (!data.token) return null;
    const decoded = decodeToken(data.token);
    if (!decoded) return null;

    const startTime = performance.now();
    let dbQueries = 0;
    try {
      const sql = getSql();
      // Single query to verify user against database
      dbQueries++;
      const rows = await sql`
        SELECT id, email, full_name, role, phone, avatar, status, permissions, last_login_at
        FROM profiles
        WHERE id::text = ${decoded.id} OR LOWER(email) = LOWER(${decoded.email})
        LIMIT 1
      `;

      logAuthDebug({
        route: "getCurrentUserServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 1,
        durationMs: performance.now() - startTime,
      });

      if (rows.length === 0) {
        if (isAdminEmail(decoded.email)) {
          return { ...decoded, role: "Super Admin", status: "Active" };
        }
        return decoded;
      }
      const r = rows[0];
      let role = r.role || "customer";
      if (isAdminEmail(r.email)) {
        role = "Super Admin";
      }
      return {
        id: String(r.id),
        email: String(r.email).toLowerCase().trim(),
        fullName: (r.full_name as string) || decoded.fullName || null,
        role,
        phone: (r.phone as string) || null,
        avatar: (r.avatar as string) || null,
        status: (r.status as string) || "Active",
        permissions: (r.permissions as Record<string, string[]>) || {},
        lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
      };
    } catch {
      logAuthDebug({
        route: "getCurrentUserServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 1,
        durationMs: performance.now() - startTime,
      });
      return decoded;
    }
  });

export const sendOtpServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; purpose: "signup" | "forgot_password" }) => ({
    email: String(d.email ?? "")
      .trim()
      .toLowerCase(),
    purpose: d.purpose === "forgot_password" ? "forgot_password" : "signup",
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const startTime = performance.now();
    let dbQueries = 0;
    let externalFetches = 0;
    try {
      const sql = getSql();
      if (!data.email) {
        return { ok: false, error: "Email address is required." };
      }

      if (data.purpose === "signup" && isAdminEmail(data.email)) {
        return { ok: false, error: "Administrative accounts cannot be registered." };
      }

      // Rate limit OTP requests: max 5 requests per 15 minutes per email
      const rate = checkRateLimit(`otp_send:${data.email}`, 5, 15 * 60 * 1000);
      if (!rate.allowed) {
        return { ok: false, error: `Too many verification requests. Please wait ${rate.retryAfterSeconds} seconds before requesting a new code.` };
      }

      // Query 1: Existence check
      dbQueries++;
      const existing = await sql`SELECT id FROM profiles WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1`;
      if (data.purpose === "signup" && existing.length > 0) {
        logAuthDebug({
          route: "sendOtpServerFn",
          databaseQueries: dbQueries,
          externalFetches,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "An account with this email already exists. Please sign in." };
      }
      if (data.purpose === "forgot_password" && existing.length === 0) {
        logAuthDebug({
          route: "sendOtpServerFn",
          databaseQueries: dbQueries,
          externalFetches,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "No account found with this email address." };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const otpId = `otp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

      // Query 2: Upsert OTP record
      dbQueries++;
      try {
        await sql`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${data.email}) AND purpose = ${data.purpose}`;
        await sql`
          INSERT INTO email_otps (id, email, otp, purpose, expires_at)
          VALUES (${otpId}, ${data.email}, ${otp}, ${data.purpose}, ${expiresAt})
        `;
      } catch (dbOtpErr) {
        console.warn("[Auth] OTP DB record notice:", dbOtpErr);
      }

      // External fetch: Send OTP via Brevo
      externalFetches++;
      if (data.purpose === "forgot_password") {
        const emailRes = await sendForgotPasswordOtp({ to: data.email, otp, expirationMinutes: 10 });
        if (!emailRes.sent) {
          console.warn("[Auth] Failed to send forgot-password OTP email:", emailRes.reason);
        }
      } else {
        const emailRes = await sendLoginOtp({ to: data.email, otp, expirationMinutes: 10 });
        if (!emailRes.sent) {
          console.warn("[Auth] Failed to send login OTP email:", emailRes.reason);
        }
      }

      logAuthDebug({
        route: "sendOtpServerFn",
        databaseQueries: dbQueries,
        externalFetches,
        sessionChecks: 0,
        durationMs: performance.now() - startTime,
      });

      return { ok: true };
    } catch (err: any) {
      console.error("[Auth] sendOtp error:", err);
      logAuthDebug({
        route: "sendOtpServerFn",
        databaseQueries: dbQueries,
        externalFetches,
        sessionChecks: 0,
        durationMs: performance.now() - startTime,
      });
      return { ok: false, error: err?.message || "Failed to send verification code." };
    }
  });

export const verifyAndRegisterServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; fullName?: string; otp: string }) => ({
    email: String(d.email ?? "")
      .trim()
      .toLowerCase(),
    password: String(d.password ?? ""),
    fullName: d.fullName ? String(d.fullName).trim() : null,
    otp: String(d.otp ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; session?: AuthSession; error?: string }> => {
    const startTime = performance.now();
    let dbQueries = 0;
    try {
      const sql = getSql();
      if (!data.email || !data.password || !data.otp) {
        return { ok: false, error: "All fields including OTP are required." };
      }
      if (data.password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
      }

      if (isAdminEmail(data.email)) {
        return { ok: false, error: "Administrative accounts cannot be registered publicly." };
      }

      // Rate limit OTP verification attempts: max 8 attempts per 15 minutes per email
      const rate = checkRateLimit(`otp_verify:${data.email}`, 8, 15 * 60 * 1000);
      if (!rate.allowed) {
        return { ok: false, error: "Too many failed attempts. Please request a new verification code." };
      }

      // Query 1: Check OTP
      dbQueries++;
      const otpRows = await sql`
        SELECT id, expires_at FROM email_otps
        WHERE LOWER(email) = LOWER(${data.email}) AND purpose = 'signup' AND otp = ${data.otp}
        LIMIT 1
      `;
      if (otpRows.length === 0) {
        logAuthDebug({
          route: "verifyAndRegisterServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "Invalid verification code. Please check your email or request a new one." };
      }

      const otpRecord = otpRows[0];
      if (new Date() > new Date(otpRecord.expires_at)) {
        logAuthDebug({
          route: "verifyAndRegisterServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "Verification code has expired. Please request a new one." };
      }

      // Query 2: Check profile existence
      dbQueries++;
      const existing = await sql`SELECT id FROM profiles WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1`;
      if (existing.length > 0) {
        logAuthDebug({
          route: "verifyAndRegisterServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "An account with this email already exists." };
      }

      const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = await hashPassword(data.password);
      const role = isAdminEmail(data.email) ? "Super Admin" : "customer";

      // Query 3: Insert new profile
      dbQueries++;
      await sql`
        INSERT INTO profiles (id, email, password_hash, full_name, role, status)
        VALUES (${userId}, ${data.email}, ${passwordHash}, ${data.fullName}, ${role}, 'Active')
      `;

      // Clean up OTP record
      try {
        await sql`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${data.email}) AND purpose = 'signup'`;
        dbQueries++;
      } catch {
        /* non-fatal */
      }

      const user: AuthUser = {
        id: userId,
        email: data.email,
        fullName: data.fullName,
        role,
        status: "Active",
      };
      const token = signToken(user.id, user.email, user.role, user.fullName);

      // Send welcome email via Brevo (fire and forget)
      sendWelcomeEmail({ to: data.email, name: data.fullName, userId }).catch((err) =>
        console.warn("[Auth] Welcome email failed (non-fatal):", err),
      );

      logAuthDebug({
        route: "verifyAndRegisterServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 1,
        durationMs: performance.now() - startTime,
      });

      return { ok: true, session: { token, user } };
    } catch (err: any) {
      console.error("[Auth] verifyAndRegister error:", err);
      logAuthDebug({
        route: "verifyAndRegisterServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 0,
        durationMs: performance.now() - startTime,
      });
      return { ok: false, error: err?.message || "Registration verification failed." };
    }
  });

export const verifyAndResetPasswordServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; otp: string; newPassword: string }) => ({
    email: String(d.email ?? "")
      .trim()
      .toLowerCase(),
    otp: String(d.otp ?? "").trim(),
    newPassword: String(d.newPassword ?? ""),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; session?: AuthSession; error?: string }> => {
    const startTime = performance.now();
    let dbQueries = 0;
    try {
      const sql = getSql();
      if (!data.email || !data.otp || !data.newPassword) {
        return { ok: false, error: "Email, OTP and new password are required." };
      }
      if (data.newPassword.length < 6) {
        return { ok: false, error: "New password must be at least 6 characters." };
      }

      // Rate limit password reset OTP verification attempts: max 8 attempts per 15 minutes
      const rate = checkRateLimit(`otp_reset:${data.email}`, 8, 15 * 60 * 1000);
      if (!rate.allowed) {
        return { ok: false, error: "Too many failed attempts. Please request a new verification code." };
      }

      // Query 1: Verify OTP
      dbQueries++;
      const otpRows = await sql`
        SELECT id, expires_at FROM email_otps
        WHERE LOWER(email) = LOWER(${data.email}) AND purpose = 'forgot_password' AND otp = ${data.otp}
        LIMIT 1
      `;
      if (otpRows.length === 0) {
        logAuthDebug({
          route: "verifyAndResetPasswordServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "Invalid verification code. Please check your email or request a new code." };
      }

      const otpRecord = otpRows[0];
      if (new Date() > new Date(otpRecord.expires_at)) {
        logAuthDebug({
          route: "verifyAndResetPasswordServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "Verification code has expired. Please request a new one." };
      }

      // Query 2: Find user
      dbQueries++;
      const userRows =
        await sql`SELECT id, email, full_name, role FROM profiles WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1`;
      if (userRows.length === 0) {
        logAuthDebug({
          route: "verifyAndResetPasswordServerFn",
          databaseQueries: dbQueries,
          externalFetches: 0,
          sessionChecks: 0,
          durationMs: performance.now() - startTime,
        });
        return { ok: false, error: "Account not found." };
      }

      // Query 3: Update password
      dbQueries++;
      const passwordHash = await hashPassword(data.newPassword);
      await sql`UPDATE profiles SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = LOWER(${data.email})`;

      try {
        await sql`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${data.email}) AND purpose = 'forgot_password'`;
        dbQueries++;
      } catch {
        /* non-fatal */
      }

      const r = userRows[0];
      const role = isAdminEmail(r.email) ? "Super Admin" : (r.role as "admin" | "customer") || "customer";
      const user: AuthUser = {
        id: String(r.id),
        email: String(r.email).toLowerCase().trim(),
        fullName: (r.full_name as string) || null,
        role,
        status: "Active",
      };
      const token = signToken(user.id, user.email, user.role, user.fullName);

      logAuthDebug({
        route: "verifyAndResetPasswordServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 1,
        durationMs: performance.now() - startTime,
      });

      return { ok: true, session: { token, user } };
    } catch (err: any) {
      console.error("[Auth] verifyAndResetPassword error:", err);
      logAuthDebug({
        route: "verifyAndResetPasswordServerFn",
        databaseQueries: dbQueries,
        externalFetches: 0,
        sessionChecks: 0,
        durationMs: performance.now() - startTime,
      });
      return { ok: false, error: err?.message || "Password reset failed." };
    }
  });

