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

export function hasAdminPanelAccess(user?: { role?: string | null; status?: string | null } | null): boolean {
  if (!user) return false;
  const status = String(user.status || "Active").toLowerCase().trim();
  if (status === "inactive" || status === "suspended") return false;
  return isStaffRole(user.role);
}

/**
 * Client-safe helper to parse token payload claims for optimistic UI rendering only.
 * This does NOT grant privileges or verify signatures; all protected server functions
 * strictly verify cryptographic signatures and query the database.
 */
export function parseTokenPayload(
  token: string,
): { id: string; email: string; fullName: string | null; role: string } | null {
  if (!token || typeof token !== "string") return null;
  try {
    const trimmed = token.trim();
    if (!trimmed.includes(".")) return null;
    const [payloadB64] = trimmed.split(".");
    let json = "";
    if (typeof Buffer !== "undefined") {
      json = Buffer.from(payloadB64, "base64").toString("utf8");
    } else if (typeof atob !== "undefined") {
      json = decodeURIComponent(escape(atob(payloadB64)));
    } else {
      return null;
    }
    if (!json.startsWith("{") || !json.endsWith("}")) return null;
    const parsed = JSON.parse(json);
    if (!parsed?.id || !parsed?.email) return null;
    if (parsed.exp && Date.now() > Number(parsed.exp)) return null;
    return {
      id: String(parsed.id),
      email: String(parsed.email).toLowerCase().trim(),
      fullName: parsed.fullName ? String(parsed.fullName) : null,
      role: String(parsed.role || "customer"),
    };
  } catch {
    return null;
  }
}
