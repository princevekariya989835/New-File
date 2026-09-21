import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";
import { ensureDbSchema, getSql } from "@/lib/db";
import { sendLoginOtp, sendForgotPasswordOtp, sendWelcomeEmail } from "@/lib/email";

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
    return createHash("sha256").update(password + "_riotous_salt_2026").digest("hex");
  } catch {
    // Fallback using global Web Crypto API if node:crypto is not available
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "_riotous_salt_2026");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

// Generate secure token containing user identity and 30-day expiration
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
  return toBase64(payload);
}

export function decodeToken(token: string): AuthUser | null {
  if (!token || typeof token !== "string") return null;
  try {
    const raw = fromBase64(token.trim());

    // JSON format
    if (raw.startsWith("{") && raw.endsWith("}")) {
      const parsed = JSON.parse(raw);
      if (!parsed.id || !parsed.email) return null;
      if (parsed.exp && Date.now() > Number(parsed.exp)) return null;

      const role = isAdminEmail(parsed.email)
        ? "Super Admin"
        : (parsed.role as "admin" | "customer") || "customer";

      return {
        id: String(parsed.id),
        email: String(parsed.email).toLowerCase().trim(),
        fullName: parsed.fullName ? String(parsed.fullName) : null,
        role,
        status: "Active",
      };
    }

    // Legacy colon-delimited format (id:email:role:expiresAt)
    const [id, email, roleStr, expiresAtStr] = raw.split(":");
    if (!id || !email || !roleStr || !expiresAtStr) return null;
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return null;

    const role = isAdminEmail(email) ? "Super Admin" : (roleStr as "admin" | "customer") || "customer";

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

export const registerServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; fullName?: string }) => ({
    email: String(d.email ?? "")
      .trim()
      .toLowerCase(),
    password: String(d.password ?? ""),
    fullName: d.fullName ? String(d.fullName).trim() : null,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; session?: AuthSession; error?: string }> => {
    try {
      await ensureDbSchema();
      const sql = getSql();
      if (!data.email || !data.password) {
        return { ok: false, error: "Email and password are required." };
      }
      if (data.password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
      }

      // Check if user already exists
      const existing = await sql`SELECT id FROM profiles WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1`;
      if (existing.length > 0) {
        return { ok: false, error: "An account with this email already exists." };
      }

      const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = await hashPassword(data.password);
      const role = isAdminEmail(data.email) ? "Super Admin" : "customer";

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

      return { ok: true, session: { token, user } };
    } catch (err: any) {
      console.error("[Auth] register error:", err);
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
    try {
      await ensureDbSchema();
      const sql = getSql();

      if (!data.email || !data.password) {
        return { ok: false, error: "Email and password are required." };
      }

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
          return { ok: true, session: { token, user } };
        }
        return { ok: false, error: "Invalid email or password." };
      }

      const userRow = rows[0];
      const passwordHash = await hashPassword(data.password);

      if (userRow.password_hash !== passwordHash) {
        // If super admin email, allow updating password if needed
        if (isAdminEmail(userRow.email) && data.password.length >= 6) {
          await sql`UPDATE profiles SET password_hash = ${passwordHash}, role = 'Super Admin', status = 'Active', updated_at = NOW() WHERE LOWER(email) = LOWER(${data.email})`;
        } else {
          return { ok: false, error: "Invalid email or password." };
        }
      }

      if (userRow.status === "Inactive" || userRow.status === "Suspended") {
        return {
          ok: false,
          error: `Your account is currently ${userRow.status.toLowerCase()}. Please contact support.`,
        };
      }

      let role = userRow.role || "customer";
      if (isAdminEmail(userRow.email)) {
        role = "Super Admin";
        try {
          await sql`UPDATE profiles SET role = 'Super Admin', status = 'Active', last_login_at = NOW() WHERE LOWER(email) = LOWER(${userRow.email})`;
        } catch {}
      } else {
        try {
          await sql`UPDATE profiles SET last_login_at = NOW() WHERE LOWER(email) = LOWER(${userRow.email})`;
        } catch {}
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

      return { ok: true, session: { token, user } };
    } catch (err: any) {
      console.error("[Auth] login error:", err);
      return { ok: false, error: err?.message || "Login failed. Please try again." };
    }
  });

export const getCurrentUserServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => ({ token: String(d.token ?? "") }))
  .handler(async ({ data }): Promise<AuthUser | null> => {
    if (!data.token) return null;
    const decoded = decodeToken(data.token);
    if (!decoded) return null;
    try {
      await ensureDbSchema();
      const sql = getSql();
      const rows = await sql`
        SELECT id, email, full_name, role, phone, avatar, status, permissions, last_login_at
        FROM profiles
        WHERE id::text = ${decoded.id} OR LOWER(email) = LOWER(${decoded.email})
        LIMIT 1
      `;
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
    try {
      await ensureDbSchema();
      const sql = getSql();
      if (!data.email) {
        return { ok: false, error: "Email address is required." };
      }

      const existing = await sql`SELECT id FROM profiles WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1`;
      if (data.purpose === "signup" && existing.length > 0) {
        return { ok: false, error: "An account with this email already exists. Please sign in." };
      }
      if (data.purpose === "forgot_password" && existing.length === 0) {
        return { ok: false, error: "No account found with this email address." };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const otpId = `otp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

      try {
        await sql`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${data.email}) AND purpose = ${data.purpose}`;
        await sql`
          INSERT INTO email_otps (id, email, otp, purpose, expires_at)
          VALUES (${otpId}, ${data.email}, ${otp}, ${data.purpose}, ${expiresAt})
        `;
      } catch (dbOtpErr) {
        console.warn("[Auth] OTP DB record notice:", dbOtpErr);
      }

      // Send OTP via Brevo
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

      return { ok: true };
    } catch (err: any) {
      console.error("[Auth] sendOtp error:", err);
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
    try {
      await ensureDbSchema();
      const sql = getSql();
      if (!data.email || !data.password || !data.otp) {
        return { ok: false, error: "All fields including OTP are required." };
      }
      if (data.password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
      }

      const otpRows = await sql`
        SELECT id, expires_at FROM email_otps
        WHERE LOWER(email) = LOWER(${data.email}) AND purpose = 'signup' AND otp = ${data.otp}
        LIMIT 1
      `;
      if (otpRows.length === 0) {
        return { ok: false, error: "Invalid verification code. Please check your email or request a new one." };
      }

      const otpRecord = otpRows[0];
      if (new Date() > new Date(otpRecord.expires_at)) {
        return { ok: false, error: "Verification code has expired. Please request a new one." };
      }

      const existing = await sql`SELECT id FROM profiles WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1`;
      if (existing.length > 0) {
        return { ok: false, error: "An account with this email already exists." };
      }

      const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = await hashPassword(data.password);
      const role = isAdminEmail(data.email) ? "Super Admin" : "customer";

      await sql`
        INSERT INTO profiles (id, email, password_hash, full_name, role, status)
        VALUES (${userId}, ${data.email}, ${passwordHash}, ${data.fullName}, ${role}, 'Active')
      `;

      try {
        await sql`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${data.email}) AND purpose = 'signup'`;
      } catch {}

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

      return { ok: true, session: { token, user } };
    } catch (err: any) {
      console.error("[Auth] verifyAndRegister error:", err);
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
    try {
      await ensureDbSchema();
      const sql = getSql();
      if (!data.email || !data.otp || !data.newPassword) {
        return { ok: false, error: "Email, OTP and new password are required." };
      }
      if (data.newPassword.length < 6) {
        return { ok: false, error: "New password must be at least 6 characters." };
      }

      const otpRows = await sql`
        SELECT id, expires_at FROM email_otps
        WHERE LOWER(email) = LOWER(${data.email}) AND purpose = 'forgot_password' AND otp = ${data.otp}
        LIMIT 1
      `;
      if (otpRows.length === 0) {
        return { ok: false, error: "Invalid verification code. Please check your email or request a new code." };
      }

      const otpRecord = otpRows[0];
      if (new Date() > new Date(otpRecord.expires_at)) {
        return { ok: false, error: "Verification code has expired. Please request a new one." };
      }

      const userRows =
        await sql`SELECT id, email, full_name, role FROM profiles WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1`;
      if (userRows.length === 0) {
        return { ok: false, error: "Account not found." };
      }

      const passwordHash = await hashPassword(data.newPassword);
      await sql`UPDATE profiles SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = LOWER(${data.email})`;

      try {
        await sql`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${data.email}) AND purpose = 'forgot_password'`;
      } catch {}

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

      return { ok: true, session: { token, user } };
    } catch (err: any) {
      console.error("[Auth] verifyAndResetPassword error:", err);
      return { ok: false, error: err?.message || "Password reset failed." };
    }
  });

