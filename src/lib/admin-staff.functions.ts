import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import {
  assertAdmin,
  assertPermission,
  assertSuperAdmin,
  logAudit,
  hasStaffPermission,
  STAFF_MODULES,
  STAFF_ACTIONS,
  type StaffModule,
  type StaffAction,
} from "@/lib/admin-utils";
import { ensureDbSchema, getSql } from "@/lib/db";
import { isAdminEmail } from "@/lib/auth";

export type StaffRole = "Super Admin" | "Admin" | "Manager" | "Staff";
export type StaffStatus = "Active" | "Inactive" | "Suspended";

export type StaffItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: StaffRole | string;
  status: StaffStatus;
  permissions: Record<string, string[]>;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export type StaffSummary = {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  administrators: number;
  managers: number;
  staffMembers: number;
};

// SHA-256 password hashing consistent with auth.ts
async function hashStaffPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_riotous_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeStaffRole(rawRole?: string | null): StaffRole {
  if (!rawRole) return "Staff";
  const r = rawRole.trim().toLowerCase();
  if (r === "super admin" || r === "super_admin") return "Super Admin";
  if (r === "admin" || r === "administrator") return "Admin";
  if (r === "manager") return "Manager";
  return "Staff";
}

export function normalizeStaffStatus(rawStatus?: string | null): StaffStatus {
  if (!rawStatus) return "Active";
  const s = rawStatus.trim().toLowerCase();
  if (s === "inactive") return "Inactive";
  if (s === "suspended") return "Suspended";
  return "Active";
}

export function getDefaultRolePermissions(role: StaffRole): Record<string, string[]> {
  const perms: Record<string, string[]> = {};
  if (role === "Super Admin") {
    for (const mod of STAFF_MODULES) {
      perms[mod] = ["view", "create", "edit", "delete", "publish", "manage"];
    }
  } else if (role === "Admin") {
    for (const mod of STAFF_MODULES) {
      if (mod === "staff") {
        perms[mod] = ["view", "create", "edit"];
      } else if (mod === "settings") {
        perms[mod] = ["view", "edit"];
      } else {
        perms[mod] = ["view", "create", "edit", "delete", "publish", "manage"];
      }
    }
  } else if (role === "Manager") {
    perms.dashboard = ["view"];
    perms.products = ["view", "create", "edit"];
    perms.orders = ["view", "create", "edit"];
    perms.inventory = ["view", "edit"];
    perms.customers = ["view", "edit"];
    perms.returns = ["view", "edit"];
    perms.reviews = ["view", "edit"];
    perms.designs = ["view", "edit"];
    perms.shipping = ["view", "edit"];
    perms.marketing = ["view"];
    perms.analytics = ["view"];
    perms.payments = ["view"];
    perms.website = ["view"];
    perms.staff = ["view"];
    perms.settings = ["view"];
  } else {
    // Staff role defaults
    perms.dashboard = ["view"];
    perms.orders = ["view", "edit"];
    perms.products = ["view"];
    perms.inventory = ["view", "edit"];
    perms.returns = ["view", "edit"];
    perms.reviews = ["view"];
    perms.designs = ["view"];
    perms.shipping = ["view"];
  }
  return perms;
}

/**
 * List staff members with search, filters, pagination and metrics summary
 */
export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d?: {
      search?: string;
      status?: string;
      role?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      page?: number;
      limit?: number;
    }) => ({
      search: (d?.search || "").trim(),
      status: (d?.status || "all").trim(),
      role: (d?.role || "all").trim(),
      sortBy: d?.sortBy || "created_at",
      sortOrder: d?.sortOrder || "desc",
      page: Math.max(1, Number(d?.page) || 1),
      limit: Math.max(1, Math.min(100, Number(d?.limit) || 10)),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "staff", "view");
    await ensureDbSchema();
    const sql = getSql();

    // Fetch all staff rows (role != 'customer' OR email in admin list)
    const allStaffRows = await sql`
      SELECT id, email, full_name, role, phone, avatar, status, permissions, last_login_at, created_at, updated_at, created_by
      FROM profiles
      WHERE role != 'customer' OR email = 'princevekariya9898@gmail.com'
      ORDER BY created_at DESC
    `;

    // Calculate metrics
    let totalStaff = 0;
    let activeStaff = 0;
    let inactiveStaff = 0;
    let administrators = 0;
    let managers = 0;
    let staffMembers = 0;

    const mappedItems: StaffItem[] = allStaffRows.map((r: any) => {
      const isSuper = isAdminEmail(r.email) || (r.role && r.role.toLowerCase().includes("super"));
      const assignedRole: StaffRole = isSuper ? "Super Admin" : normalizeStaffRole(r.role);
      const assignedStatus: StaffStatus = normalizeStaffStatus(r.status);

      totalStaff++;
      if (assignedStatus === "Active") activeStaff++;
      else inactiveStaff++;

      if (assignedRole === "Super Admin" || assignedRole === "Admin") administrators++;
      else if (assignedRole === "Manager") managers++;
      else staffMembers++;

      let perms = r.permissions;
      if (!perms || typeof perms !== "object" || Object.keys(perms).length === 0) {
        perms = getDefaultRolePermissions(assignedRole);
      }

      return {
        id: String(r.id),
        name: r.full_name || r.email.split("@")[0] || "Staff User",
        email: r.email,
        phone: r.phone || null,
        avatar: r.avatar || null,
        role: assignedRole,
        status: assignedStatus,
        permissions: perms,
        lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        createdBy: r.created_by || null,
      };
    });

    // Apply filters
    let filtered = mappedItems;
    if (data.search) {
      const q = data.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.phone && s.phone.toLowerCase().includes(q)),
      );
    }

    if (data.status && data.status !== "all") {
      filtered = filtered.filter((s) => s.status.toLowerCase() === data.status.toLowerCase());
    }

    if (data.role && data.role !== "all") {
      filtered = filtered.filter((s) => s.role.toLowerCase() === data.role.toLowerCase());
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valA: any = a.createdAt;
      let valB: any = b.createdAt;

      if (data.sortBy === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (data.sortBy === "email") {
        valA = a.email.toLowerCase();
        valB = b.email.toLowerCase();
      } else if (data.sortBy === "role") {
        valA = a.role.toLowerCase();
        valB = b.role.toLowerCase();
      } else if (data.sortBy === "status") {
        valA = a.status.toLowerCase();
        valB = b.status.toLowerCase();
      } else if (data.sortBy === "last_login") {
        valA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        valB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      }

      if (valA < valB) return data.sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return data.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const totalCount = filtered.length;
    const startIndex = (data.page - 1) * data.limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + data.limit);

    return {
      items: paginatedItems,
      total: totalCount,
      page: data.page,
      limit: data.limit,
      totalPages: Math.ceil(totalCount / data.limit) || 1,
      summary: {
        totalStaff,
        activeStaff,
        inactiveStaff,
        administrators,
        managers,
        staffMembers,
      } as StaffSummary,
    };
  });

/**
 * Get single staff member details with recent activity
 */
export const getStaffDetails = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { staffId: string }) => ({ staffId: String(d.staffId || "").trim() }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "staff", "view");
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT id, email, full_name, role, phone, avatar, status, permissions, last_login_at, created_at, updated_at, created_by
      FROM profiles
      WHERE id = ${data.staffId} OR email = ${data.staffId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new Error("Staff member not found.");
    }

    const r = rows[0];
    const isSuper = isAdminEmail(r.email) || (r.role && r.role.toLowerCase().includes("super"));
    const assignedRole: StaffRole = isSuper ? "Super Admin" : normalizeStaffRole(r.role);
    const assignedStatus: StaffStatus = normalizeStaffStatus(r.status);

    let perms = r.permissions;
    if (!perms || typeof perms !== "object" || Object.keys(perms).length === 0) {
      perms = getDefaultRolePermissions(assignedRole);
    }

    // Fetch recent audit logs for this user
    const auditRows = await sql`
      SELECT id, action, entity_type, entity_id, module, target_name, details, ip_address, user_agent, created_at
      FROM admin_audit_log
      WHERE actor_id = ${r.id} OR actor_email = ${r.email}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const recentActivity = auditRows.map((a: any) => ({
      id: String(a.id),
      action: a.action,
      entityType: a.entity_type || a.module || "General",
      module: a.module || a.entity_type || "General",
      targetName: a.target_name || (a.details?.name as string) || null,
      details: a.details || {},
      ipAddress: a.ip_address || null,
      createdAt: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
    }));

    return {
      staff: {
        id: String(r.id),
        name: r.full_name || r.email.split("@")[0] || "Staff Member",
        email: r.email,
        phone: r.phone || null,
        avatar: r.avatar || null,
        role: assignedRole,
        status: assignedStatus,
        permissions: perms,
        lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        createdBy: r.created_by || null,
      },
      recentActivity,
    };
  });

export const searchUsersForStaff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { query: string }) => ({
    query: String(d.query || "")
      .trim()
      .toLowerCase(),
  }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "staff", "view");
    await ensureDbSchema();
    const sql = getSql();
    const q = `%${data.query}%`;
    const rows = await sql`
      SELECT id, email, full_name, phone, role, status, last_login_at, created_at
      FROM profiles
      WHERE lower(email) LIKE ${q} OR lower(full_name) LIKE ${q} OR lower(id) LIKE ${q}
      LIMIT 15
    `;
    return rows.map((r: any) => ({
      id: String(r.id),
      email: r.email,
      name: r.full_name || r.email.split("@")[0] || "User",
      phone: r.phone || null,
      role: r.role || "customer",
      status: r.status || "Active",
      lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  });

/**
 * Create a new staff account or convert an existing registered user account into staff
 */
export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      name: string;
      email: string;
      phone?: string;
      role: StaffRole;
      status?: StaffStatus;
      initialPassword?: string;
      permissions?: Record<string, string[]>;
    }) => ({
      name: String(d.name || "").trim(),
      email: String(d.email || "")
        .trim()
        .toLowerCase(),
      phone: d.phone ? String(d.phone).trim() : null,
      role: d.role,
      status: (d.status || "Active") as StaffStatus,
      initialPassword: d.initialPassword ? String(d.initialPassword).trim() : "RiotousAdmin2026!",
      permissions: d.permissions,
    }),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "staff", "create");
    await ensureDbSchema();
    const sql = getSql();

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error("A valid email address is required.");
    }

    // If assigning Super Admin, require Super Admin caller
    if (data.role === "Super Admin") {
      await assertSuperAdmin(context);
    }

    const finalPermissions =
      data.permissions && Object.keys(data.permissions).length > 0
        ? data.permissions
        : getDefaultRolePermissions(data.role);

    const ctx = context as any;
    const creatorName = ctx.user?.fullName || ctx.user?.email || "Administrator";

    // Check if user account already exists in profiles
    const existing =
      await sql`SELECT id, email, role, status FROM profiles WHERE email = ${data.email} LIMIT 1`;
    if (existing.length > 0) {
      const exUser = existing[0];
      if (isAdminEmail(exUser.email) && data.role !== "Super Admin") {
        throw new Error("Primary Super Administrator role cannot be changed.");
      }

      await sql`
        UPDATE profiles
        SET role = ${data.role},
            status = ${data.status},
            permissions = ${JSON.stringify(finalPermissions)}::jsonb,
            full_name = COALESCE(NULLIF(${data.name}, ''), full_name),
            phone = COALESCE(NULLIF(${data.phone}, ''), phone),
            updated_at = NOW()
        WHERE id = ${exUser.id}
      `;

      await logAudit(
        context,
        `Existing user converted to staff (${data.role})`,
        "Staff",
        exUser.id,
        {
          name: data.name || exUser.email,
          email: data.email,
          role: data.role,
          status: data.status,
        },
        {
          module: "staff",
          targetName: data.name || exUser.email,
        },
      );

      return {
        ok: true,
        staffId: exUser.id,
        message: "Existing user account successfully converted to staff!",
      };
    }

    if (!data.name) throw new Error("Staff name is required.");
    if (data.initialPassword.length < 6) {
      throw new Error("Initial password must be at least 6 characters.");
    }

    const staffId = `usr_staff_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const passwordHash = await hashStaffPassword(data.initialPassword);

    await sql`
      INSERT INTO profiles (id, email, password_hash, full_name, role, phone, status, permissions, created_by, created_at, updated_at)
      VALUES (
        ${staffId},
        ${data.email},
        ${passwordHash},
        ${data.name},
        ${data.role},
        ${data.phone},
        ${data.status},
        ${JSON.stringify(finalPermissions)}::jsonb,
        ${creatorName},
        NOW(),
        NOW()
      )
    `;

    await logAudit(
      context,
      "Staff account created",
      "Staff",
      staffId,
      {
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
      },
      {
        module: "staff",
        targetName: data.name,
      },
    );

    return { ok: true, staffId, message: "Staff account created successfully." };
  });

/**
 * Update staff profile, role, status and custom permissions
 */
export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      staffId: string;
      name: string;
      phone?: string | null;
      avatar?: string | null;
      role: StaffRole;
      status: StaffStatus;
      permissions?: Record<string, string[]>;
    }) => ({
      staffId: String(d.staffId || "").trim(),
      name: String(d.name || "").trim(),
      phone: d.phone ? String(d.phone).trim() : null,
      avatar: d.avatar ? String(d.avatar).trim() : null,
      role: d.role,
      status: d.status,
      permissions: d.permissions,
    }),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "staff", "edit");
    await ensureDbSchema();
    const sql = getSql();

    const existingRows = await sql`
      SELECT id, email, role, status, full_name FROM profiles WHERE id = ${data.staffId} LIMIT 1
    `;
    if (existingRows.length === 0) {
      throw new Error("Staff member not found.");
    }
    const targetStaff = existingRows[0];

    // Protect primary admin from role/status modification
    if (isAdminEmail(targetStaff.email)) {
      if (data.status !== "Active") {
        throw new Error("Primary Super Administrator account cannot be deactivated or suspended.");
      }
      if (data.role !== "Super Admin") {
        throw new Error("Primary Super Administrator role cannot be changed.");
      }
    }

    // Only Super Admin can change to/from Super Admin role
    if (data.role === "Super Admin" || targetStaff.role === "Super Admin") {
      await assertSuperAdmin(context);
    }

    const finalPermissions =
      data.permissions && Object.keys(data.permissions).length > 0
        ? data.permissions
        : getDefaultRolePermissions(data.role);

    await sql`
      UPDATE profiles
      SET full_name = ${data.name},
          phone = ${data.phone},
          avatar = ${data.avatar},
          role = ${data.role},
          status = ${data.status},
          permissions = ${JSON.stringify(finalPermissions)}::jsonb,
          updated_at = NOW()
      WHERE id = ${data.staffId}
    `;

    await logAudit(
      context,
      "Staff account updated",
      "Staff",
      data.staffId,
      {
        name: data.name,
        role: data.role,
        status: data.status,
        previousRole: targetStaff.role,
        previousStatus: targetStaff.status,
      },
      {
        module: "staff",
        targetName: data.name,
      },
    );

    return { ok: true, message: "Staff account updated successfully." };
  });

/**
 * Change staff role with authorization safeguard
 */
export const changeStaffRole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { staffId: string; newRole: StaffRole }) => ({
    staffId: String(d.staffId || "").trim(),
    newRole: d.newRole,
  }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "staff", "manage");
    await ensureDbSchema();
    const sql = getSql();

    const targetRows =
      await sql`SELECT id, email, full_name, role FROM profiles WHERE id = ${data.staffId} LIMIT 1`;
    if (targetRows.length === 0) throw new Error("Staff member not found.");

    const target = targetRows[0];
    if (isAdminEmail(target.email) && data.newRole !== "Super Admin") {
      throw new Error("Primary Super Administrator role cannot be demoted.");
    }

    if (data.newRole === "Super Admin" || target.role === "Super Admin") {
      await assertSuperAdmin(context);
    }

    const perms = getDefaultRolePermissions(data.newRole);

    await sql`
      UPDATE profiles
      SET role = ${data.newRole},
          permissions = ${JSON.stringify(perms)}::jsonb,
          updated_at = NOW()
      WHERE id = ${data.staffId}
    `;

    await logAudit(
      context,
      `Staff role changed to ${data.newRole}`,
      "Staff",
      data.staffId,
      {
        staffEmail: target.email,
        oldRole: target.role,
        newRole: data.newRole,
      },
      {
        module: "staff",
        targetName: target.full_name || target.email,
      },
    );

    return { ok: true, message: `Staff role changed to ${data.newRole}.` };
  });

/**
 * Toggle staff active/inactive/suspended status
 */
export const toggleStaffStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { staffId: string; status: StaffStatus }) => ({
    staffId: String(d.staffId || "").trim(),
    status: d.status,
  }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "staff", "manage");
    await ensureDbSchema();
    const sql = getSql();

    const targetRows =
      await sql`SELECT id, email, full_name, role, status FROM profiles WHERE id = ${data.staffId} LIMIT 1`;
    if (targetRows.length === 0) throw new Error("Staff member not found.");

    const target = targetRows[0];
    if (isAdminEmail(target.email) && data.status !== "Active") {
      throw new Error("Primary Super Administrator account cannot be disabled.");
    }

    if (target.role === "Super Admin") {
      await assertSuperAdmin(context);
    }

    await sql`
      UPDATE profiles
      SET status = ${data.status}, updated_at = NOW()
      WHERE id = ${data.staffId}
    `;

    await logAudit(
      context,
      `Staff status changed to ${data.status}`,
      "Staff",
      data.staffId,
      {
        staffEmail: target.email,
        oldStatus: target.status,
        newStatus: data.status,
      },
      {
        module: "staff",
        targetName: target.full_name || target.email,
      },
    );

    return { ok: true, message: `Staff account status changed to ${data.status}.` };
  });

/**
 * Reset staff password securely
 */
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { staffId: string; newPassword: string }) => ({
    staffId: String(d.staffId || "").trim(),
    newPassword: String(d.newPassword || "").trim(),
  }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "staff", "manage");
    await ensureDbSchema();
    const sql = getSql();

    if (data.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters.");
    }

    const targetRows =
      await sql`SELECT id, email, full_name, role FROM profiles WHERE id = ${data.staffId} LIMIT 1`;
    if (targetRows.length === 0) throw new Error("Staff member not found.");

    const target = targetRows[0];
    if (target.role === "Super Admin" && !isAdminEmail((context as any).user?.email)) {
      await assertSuperAdmin(context);
    }

    const passwordHash = await hashStaffPassword(data.newPassword);

    await sql`
      UPDATE profiles
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${data.staffId}
    `;

    await logAudit(
      context,
      "Staff password reset by admin",
      "Staff",
      data.staffId,
      {
        staffEmail: target.email,
      },
      {
        module: "staff",
        targetName: target.full_name || target.email,
      },
    );

    return { ok: true, message: "Staff password reset successfully." };
  });

/**
 * List audit activity records with filtering & search
 */
export const listAuditActivity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d?: {
      staffId?: string;
      module?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => ({
      staffId: d?.staffId ? String(d.staffId).trim() : undefined,
      module: d?.module ? String(d.module).trim() : undefined,
      search: d?.search ? String(d.search).trim() : undefined,
      page: Math.max(1, Number(d?.page) || 1),
      limit: Math.max(1, Math.min(100, Number(d?.limit) || 20)),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    const allRows = await sql`
      SELECT id, actor_id, actor_email, action, entity_type, entity_id, details, module, target_name, ip_address, user_agent, created_at
      FROM admin_audit_log
      ORDER BY created_at DESC
      LIMIT 500
    `;

    let filtered = allRows.map((r: any) => ({
      id: String(r.id),
      actorId: r.actor_id || null,
      actorEmail: r.actor_email || "System",
      action: r.action,
      entityType: r.entity_type || r.module || "General",
      module: r.module || r.entity_type || "General",
      targetId: r.entity_id || null,
      targetName:
        r.target_name || (r.details?.name as string) || (r.details?.title as string) || null,
      details: r.details || {},
      ipAddress: r.ip_address || null,
      userAgent: r.user_agent || null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));

    if (data.staffId) {
      filtered = filtered.filter(
        (f: any) =>
          f.actorId === data.staffId || f.actorEmail.toLowerCase() === data.staffId?.toLowerCase(),
      );
    }

    if (data.module && data.module !== "all") {
      filtered = filtered.filter(
        (f: any) =>
          f.module.toLowerCase() === data.module?.toLowerCase() ||
          f.entityType.toLowerCase() === data.module?.toLowerCase(),
      );
    }

    if (data.search) {
      const q = data.search.toLowerCase();
      filtered = filtered.filter(
        (f: any) =>
          f.action.toLowerCase().includes(q) ||
          f.actorEmail.toLowerCase().includes(q) ||
          (f.targetName && f.targetName.toLowerCase().includes(q)) ||
          f.module.toLowerCase().includes(q),
      );
    }

    const total = filtered.length;
    const startIndex = (data.page - 1) * data.limit;
    const paginated = filtered.slice(startIndex, startIndex + data.limit);

    return {
      items: paginated,
      total,
      page: data.page,
      limit: data.limit,
      totalPages: Math.ceil(total / data.limit) || 1,
    };
  });
