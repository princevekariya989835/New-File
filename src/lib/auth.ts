import { createServerFn } from "@tanstack/react-start";
import type { AuthSession, AuthUser, StaffRole, StaffStatus } from "@/lib/auth.types";

export type { AuthUser, AuthSession, StaffRole, StaffStatus };
export { isStaffRole, hasAdminPanelAccess, parseTokenPayload } from "@/lib/auth.types";

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
      const { getSql } = await import("@/lib/db");
      const { hashPassword, signToken, checkRateLimit } = await import("@/lib/auth.server");

      const sql = getSql();
      if (!data.email || !data.password) {
        return { ok: false, error: "Email and password are required." };
      }
      if (data.password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
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
      // Public registrations are strictly created as regular customers
      const role = "customer";

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
      const { getSql } = await import("@/lib/db");
      const { hashPassword, signToken } = await import("@/lib/auth.server");

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

      // User role is strictly retrieved from the database record
      const role = userRow.role || "customer";

      // Query 2: Update last_login_at
      dbQueries++;
      try {
        await sql`UPDATE profiles SET last_login_at = NOW() WHERE LOWER(email) = LOWER(${userRow.email})`;
      } catch {
        /* non-fatal */
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
    const { getSql } = await import("@/lib/db");
    const { verifyAndDecodeToken } = await import("@/lib/auth.server");

    // Strict cryptographic signature verification using server AUTH_SECRET
    const decoded = verifyAndDecodeToken(data.token);
    if (!decoded) return null;

    const startTime = performance.now();
    let dbQueries = 0;
    try {
      const sql = getSql();
      // Verify user directly against profiles database record
      dbQueries++;
      const rows = await sql`
        SELECT id, email, full_name, role, phone, avatar, status, permissions, last_login_at
        FROM profiles
        WHERE id::text = ${decoded.id} AND LOWER(email) = LOWER(${decoded.email})
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
        return null;
      }

      const r = rows[0];
      const status = String(r.status || "Active");
      if (status === "Inactive" || status === "Suspended") {
        return null;
      }

      const role = r.role || "customer";

      return {
        id: String(r.id),
        email: String(r.email).toLowerCase().trim(),
        fullName: (r.full_name as string) || decoded.fullName || null,
        role,
        phone: (r.phone as string) || null,
        avatar: (r.avatar as string) || null,
        status,
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
      return null;
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
      const { getSql } = await import("@/lib/db");
      const { checkRateLimit } = await import("@/lib/auth.server");
      const { sendLoginOtp, sendForgotPasswordOtp } = await import("@/lib/email");

      const sql = getSql();
      if (!data.email) {
        return { ok: false, error: "Email address is required." };
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
      const { getSql } = await import("@/lib/db");
      const { hashPassword, signToken, checkRateLimit } = await import("@/lib/auth.server");
      const { sendWelcomeEmail } = await import("@/lib/email");

      const sql = getSql();
      if (!data.email || !data.password || !data.otp) {
        return { ok: false, error: "All fields including OTP are required." };
      }
      if (data.password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
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
      const role = "customer";

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
      const { getSql } = await import("@/lib/db");
      const { hashPassword, signToken, checkRateLimit } = await import("@/lib/auth.server");

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
      const role = (r.role as string) || "customer";
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
