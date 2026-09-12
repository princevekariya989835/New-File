import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import {
  assertAdmin,
  assertPermission,
  assertSuperAdmin,
  logAudit,
} from "@/lib/admin-utils";
import { ensureDbSchema, getSql } from "@/lib/db";
import { isAdminEmail } from "@/lib/auth";

export type StoreSettings = {
  id: string;
  storeName: string;
  storeLogo: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  businessGstin: string;
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  country: string;
  language: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  orderNotifications: boolean;
  lowStockNotifications: boolean;
  returnNotifications: boolean;
  reviewNotifications: boolean;
  paymentNotifications: boolean;
  shippingNotifications: boolean;
  notificationEmail: string;
  appearanceTheme: "dark" | "light" | "system";
  freeShippingThreshold: number;
  standardShippingCharge: number;
  expressShippingCharge: number;
  codEnabled: boolean;
  codExtraCharge: number;
  upiEnabled: boolean;
  cardEnabled: boolean;
  netbankingEnabled: boolean;
  walletEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
};

// SHA-256 password hashing
async function hashSettingsPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_riotous_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const getStoreSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<StoreSettings> => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT * FROM store_settings WHERE id = 'default' LIMIT 1
    `;

    if (rows.length === 0) {
      // Insert default if not present
      await sql`
        INSERT INTO store_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING
      `;
      const inserted = await sql`SELECT * FROM store_settings WHERE id = 'default' LIMIT 1`;
      if (inserted.length > 0) {
        return mapRowToSettings(inserted[0]);
      }
    }

    return mapRowToSettings(rows[0]);
  });

function mapRowToSettings(r: any): StoreSettings {
  return {
    id: r.id || "default",
    storeName: r.store_name || "RIOTOUS",
    storeLogo: r.store_logo || "",
    storeEmail: r.store_email || "support@riotous.store",
    storePhone: r.store_phone || "+91 98765 43210",
    storeAddress: r.store_address || "Plot 42, Streetwear District, Surat, Gujarat 395006, India",
    businessGstin: r.business_gstin || "24AAAAA0000A1Z5",
    currencySymbol: r.currency_symbol || "₹",
    currencyCode: r.currency_code || "INR",
    timezone: r.timezone || "Asia/Kolkata",
    dateFormat: r.date_format || "DD/MM/YYYY",
    timeFormat: r.time_format || "12h",
    country: r.country || "India",
    language: r.language || "en",
    maintenanceMode: Boolean(r.maintenance_mode),
    maintenanceMessage: r.maintenance_message || "We are currently updating the store. Please check back shortly.",
    orderNotifications: r.order_notifications !== false,
    lowStockNotifications: r.low_stock_notifications !== false,
    returnNotifications: r.return_notifications !== false,
    reviewNotifications: r.review_notifications !== false,
    paymentNotifications: r.payment_notifications !== false,
    shippingNotifications: r.shipping_notifications !== false,
    notificationEmail: r.notification_email || r.store_email || "support@riotous.store",
    appearanceTheme: (r.appearance_theme as any) || "dark",
    freeShippingThreshold: Number(r.free_shipping_threshold ?? 1499),
    standardShippingCharge: Number(r.standard_shipping_charge ?? 99),
    expressShippingCharge: Number(r.express_shipping_charge ?? 199),
    codEnabled: r.cod_enabled !== false,
    codExtraCharge: Number(r.cod_extra_charge ?? 0),
    upiEnabled: r.upi_enabled !== false,
    cardEnabled: r.card_enabled !== false,
    netbankingEnabled: r.netbanking_enabled !== false,
    walletEnabled: r.wallet_enabled !== false,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    updatedBy: r.updated_by || "Admin",
  };
}

/**
 * Update general store settings
 */
export const updateStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: Partial<StoreSettings>) => d)
  .handler(async ({ data, context }) => {
    await assertPermission(context, "settings", "edit");
    await ensureDbSchema();
    const sql = getSql();

    const actorName = context.user.fullName || context.user.email || "Admin";

    // Validate email
    if (data.storeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.storeEmail)) {
      throw new Error("Please enter a valid store email address.");
    }
    if (data.notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.notificationEmail)) {
      throw new Error("Please enter a valid notification email address.");
    }

    await sql`
      INSERT INTO store_settings (
        id,
        store_name,
        store_logo,
        store_email,
        store_phone,
        store_address,
        business_gstin,
        currency_symbol,
        currency_code,
        timezone,
        date_format,
        time_format,
        country,
        language,
        maintenance_mode,
        maintenance_message,
        order_notifications,
        low_stock_notifications,
        return_notifications,
        review_notifications,
        payment_notifications,
        shipping_notifications,
        notification_email,
        appearance_theme,
        free_shipping_threshold,
        standard_shipping_charge,
        express_shipping_charge,
        cod_enabled,
        cod_extra_charge,
        upi_enabled,
        card_enabled,
        netbanking_enabled,
        wallet_enabled,
        updated_at,
        updated_by
      ) VALUES (
        'default',
        ${data.storeName ?? "RIOTOUS"},
        ${data.storeLogo ?? ""},
        ${data.storeEmail ?? "support@riotous.store"},
        ${data.storePhone ?? "+91 98765 43210"},
        ${data.storeAddress ?? "Plot 42, Streetwear District, Surat, Gujarat 395006, India"},
        ${data.businessGstin ?? "24AAAAA0000A1Z5"},
        ${data.currencySymbol ?? "₹"},
        ${data.currencyCode ?? "INR"},
        ${data.timezone ?? "Asia/Kolkata"},
        ${data.dateFormat ?? "DD/MM/YYYY"},
        ${data.timeFormat ?? "12h"},
        ${data.country ?? "India"},
        ${data.language ?? "en"},
        ${Boolean(data.maintenanceMode)},
        ${data.maintenanceMessage ?? "We are currently updating the store. Please check back shortly."},
        ${data.orderNotifications !== false},
        ${data.lowStockNotifications !== false},
        ${data.returnNotifications !== false},
        ${data.reviewNotifications !== false},
        ${data.paymentNotifications !== false},
        ${data.shippingNotifications !== false},
        ${data.notificationEmail ?? "support@riotous.store"},
        ${data.appearanceTheme ?? "dark"},
        ${Number(data.freeShippingThreshold ?? 1499)},
        ${Number(data.standardShippingCharge ?? 99)},
        ${Number(data.expressShippingCharge ?? 199)},
        ${data.codEnabled !== false},
        ${Number(data.codExtraCharge ?? 0)},
        ${data.upiEnabled !== false},
        ${data.cardEnabled !== false},
        ${data.netbankingEnabled !== false},
        ${data.walletEnabled !== false},
        NOW(),
        ${actorName}
      )
      ON CONFLICT (id) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        store_logo = EXCLUDED.store_logo,
        store_email = EXCLUDED.store_email,
        store_phone = EXCLUDED.store_phone,
        store_address = EXCLUDED.store_address,
        business_gstin = EXCLUDED.business_gstin,
        currency_symbol = EXCLUDED.currency_symbol,
        currency_code = EXCLUDED.currency_code,
        timezone = EXCLUDED.timezone,
        date_format = EXCLUDED.date_format,
        time_format = EXCLUDED.time_format,
        country = EXCLUDED.country,
        language = EXCLUDED.language,
        maintenance_mode = EXCLUDED.maintenance_mode,
        maintenance_message = EXCLUDED.maintenance_message,
        order_notifications = EXCLUDED.order_notifications,
        low_stock_notifications = EXCLUDED.low_stock_notifications,
        return_notifications = EXCLUDED.return_notifications,
        review_notifications = EXCLUDED.review_notifications,
        payment_notifications = EXCLUDED.payment_notifications,
        shipping_notifications = EXCLUDED.shipping_notifications,
        notification_email = EXCLUDED.notification_email,
        appearance_theme = EXCLUDED.appearance_theme,
        free_shipping_threshold = EXCLUDED.free_shipping_threshold,
        standard_shipping_charge = EXCLUDED.standard_shipping_charge,
        express_shipping_charge = EXCLUDED.express_shipping_charge,
        cod_enabled = EXCLUDED.cod_enabled,
        cod_extra_charge = EXCLUDED.cod_extra_charge,
        upi_enabled = EXCLUDED.upi_enabled,
        card_enabled = EXCLUDED.card_enabled,
        netbanking_enabled = EXCLUDED.netbanking_enabled,
        wallet_enabled = EXCLUDED.wallet_enabled,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
    `;

    await logAudit(
      context,
      "Store settings updated",
      "Settings",
      "default",
      {
        storeName: data.storeName,
        currencyCode: data.currencyCode,
        maintenanceMode: data.maintenanceMode,
      },
      {
        module: "settings",
        targetName: data.storeName || "Store Settings",
      },
    );

    return { ok: true, message: "Settings saved successfully." };
  });

/**
 * Update personal staff account profile
 */
export const updateAccountProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      fullName: string;
      phone?: string | null;
      avatar?: string | null;
    }) => ({
      fullName: String(d.fullName || "").trim(),
      phone: d.phone ? String(d.phone).trim() : null,
      avatar: d.avatar ? String(d.avatar).trim() : null,
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureDbSchema();
    const sql = getSql();

    if (!data.fullName) throw new Error("Full name is required.");

    await sql`
      UPDATE profiles
      SET full_name = ${data.fullName},
          phone = ${data.phone},
          avatar = ${data.avatar},
          updated_at = NOW()
      WHERE id = ${context.userId}
    `;

    await logAudit(
      context,
      "Account profile updated",
      "Staff",
      context.userId,
      { fullName: data.fullName },
      { module: "staff", targetName: data.fullName },
    );

    return { ok: true, message: "Profile updated successfully." };
  });

/**
 * Change current staff user's password with current password verification
 */
export const changeAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => ({
      currentPassword: String(d.currentPassword || ""),
      newPassword: String(d.newPassword || ""),
      confirmPassword: String(d.confirmPassword || ""),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureDbSchema();
    const sql = getSql();

    if (!data.currentPassword) throw new Error("Current password is required.");
    if (!data.newPassword || data.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters.");
    }
    if (data.newPassword !== data.confirmPassword) {
      throw new Error("New password and confirm password do not match.");
    }

    const rows = await sql`
      SELECT id, password_hash, email FROM profiles WHERE id = ${context.userId} LIMIT 1
    `;
    if (rows.length === 0) throw new Error("Account not found.");

    const currentHash = await hashSettingsPassword(data.currentPassword);
    if (rows[0].password_hash !== currentHash) {
      throw new Error("Current password is incorrect.");
    }

    const newHash = await hashSettingsPassword(data.newPassword);
    await sql`
      UPDATE profiles
      SET password_hash = ${newHash}, updated_at = NOW()
      WHERE id = ${context.userId}
    `;

    await logAudit(
      context,
      "Password changed by user",
      "Staff",
      context.userId,
      { email: rows[0].email },
      { module: "staff", targetName: "Account Password" },
    );

    return { ok: true, message: "Password changed successfully." };
  });

/**
 * Export store data (Products, Orders, Customers, Inventory, Audit Log)
 */
export const exportStoreData = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      dataType: "products" | "orders" | "customers" | "inventory" | "audit";
      format: "json" | "csv";
    }) => ({
      dataType: d.dataType,
      format: d.format || "json",
    }),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "settings", "view");
    await ensureDbSchema();
    const sql = getSql();

    let rawData: any[] = [];
    let filename = `riotous_${data.dataType}_${new Date().toISOString().slice(0, 10)}`;

    if (data.dataType === "products") {
      rawData = await sql`
        SELECT id, name, slug, price, currency, category, stock_quantity, is_active, tags, created_at
        FROM products
        ORDER BY created_at DESC
      `;
    } else if (data.dataType === "orders") {
      rawData = await sql`
        SELECT id, order_number, shipping_name, shipping_email, shipping_phone, total_amount, currency, status, payment_status, payment_method, created_at
        FROM orders
        ORDER BY created_at DESC
      `;
    } else if (data.dataType === "customers") {
      rawData = await sql`
        SELECT id, email, full_name, role, phone, status, last_login_at, created_at
        FROM profiles
        ORDER BY created_at DESC
      `;
    } else if (data.dataType === "inventory") {
      rawData = await sql`
        SELECT pv.id, pv.product_id, p.name as product_name, pv.size, pv.color, pv.sku, pv.stock_quantity, pv.reserved_stock
        FROM product_variants pv
        LEFT JOIN products p ON pv.product_id = p.id
        ORDER BY pv.created_at DESC
      `;
    } else if (data.dataType === "audit") {
      rawData = await sql`
        SELECT id, actor_email, action, entity_type, entity_id, module, target_name, details, created_at
        FROM admin_audit_log
        ORDER BY created_at DESC
        LIMIT 1000
      `;
    }

    await logAudit(
      context,
      `Exported ${data.dataType} data (${data.format.toUpperCase()})`,
      "Settings",
      data.dataType,
      { count: rawData.length, format: data.format },
      { module: "settings", targetName: `Export: ${data.dataType}` },
    );

    if (data.format === "csv") {
      if (rawData.length === 0) {
        return { data: "", filename: `${filename}.csv`, count: 0 };
      }
      const headers = Object.keys(rawData[0]);
      const csvRows = [
        headers.join(","),
        ...rawData.map((row) =>
          headers
            .map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return '""';
              const str = typeof val === "object" ? JSON.stringify(val) : String(val);
              return `"${str.replace(/"/g, '""')}"`;
            })
            .join(","),
        ),
      ];
      return {
        data: csvRows.join("\n"),
        filename: `${filename}.csv`,
        count: rawData.length,
      };
    }

    return {
      data: JSON.stringify(rawData, null, 2),
      filename: `${filename}.json`,
      count: rawData.length,
    };
  });

/**
 * Danger zone: Toggle Store Maintenance Mode
 */
export const toggleMaintenanceMode = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: { enabled: boolean; message?: string }) => ({
      enabled: Boolean(d.enabled),
      message: d.message ? String(d.message).trim() : undefined,
    }),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    await sql`
      UPDATE store_settings
      SET maintenance_mode = ${data.enabled},
          maintenance_message = COALESCE(${data.message || null}, maintenance_message),
          updated_at = NOW(),
          updated_by = ${context.user.fullName || context.user.email || "Super Admin"}
      WHERE id = 'default'
    `;

    await logAudit(
      context,
      data.enabled ? "Enabled store maintenance mode" : "Disabled store maintenance mode",
      "Settings",
      "default",
      { maintenanceMode: data.enabled, message: data.message },
      { module: "settings", targetName: "Maintenance Mode" },
    );

    return {
      ok: true,
      message: data.enabled
        ? "Store is now in Maintenance Mode."
        : "Store is now LIVE and accessible to customers.",
    };
  });
