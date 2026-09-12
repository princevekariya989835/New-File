import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { getSql, ensureDbSchema } from "@/lib/db";
import { DEFAULT_WEBSITE_CONFIG } from "@/lib/website-config.default";
import type {
  WebsiteConfig,
  WebsitePublishedState,
  WebsiteDraftState,
  WebsiteVersionRecord,
  WebsiteManagementState,
} from "@/lib/website-config.types";

/**
 * Deep merge helper to ensure all nested properties from default exist
 */
function mergeWithDefaults(saved: any): WebsiteConfig {
  if (!saved || typeof saved !== "object") return DEFAULT_WEBSITE_CONFIG;
  return {
    settings: { ...DEFAULT_WEBSITE_CONFIG.settings, ...(saved.settings || {}) },
    seo: { ...DEFAULT_WEBSITE_CONFIG.seo, ...(saved.seo || {}) },
    announcementBar: {
      ...DEFAULT_WEBSITE_CONFIG.announcementBar,
      ...(saved.announcementBar || {}),
    },
    navigation: {
      items:
        Array.isArray(saved.navigation?.items) && saved.navigation.items.length > 0
          ? saved.navigation.items
          : DEFAULT_WEBSITE_CONFIG.navigation.items,
    },
    hero: { ...DEFAULT_WEBSITE_CONFIG.hero, ...(saved.hero || {}) },
    collections: {
      ...DEFAULT_WEBSITE_CONFIG.collections,
      ...(saved.collections || {}),
      items:
        Array.isArray(saved.collections?.items) && saved.collections.items.length > 0
          ? saved.collections.items
          : DEFAULT_WEBSITE_CONFIG.collections.items,
    },
    featuredProducts: {
      ...DEFAULT_WEBSITE_CONFIG.featuredProducts,
      ...(saved.featuredProducts || {}),
    },
    banners: Array.isArray(saved.banners) ? saved.banners : DEFAULT_WEBSITE_CONFIG.banners,
    features: {
      ...DEFAULT_WEBSITE_CONFIG.features,
      ...(saved.features || {}),
      items:
        Array.isArray(saved.features?.items) && saved.features.items.length > 0
          ? saved.features.items
          : DEFAULT_WEBSITE_CONFIG.features.items,
    },
    designCta: { ...DEFAULT_WEBSITE_CONFIG.designCta, ...(saved.designCta || {}) },
    reviewsSection: {
      ...DEFAULT_WEBSITE_CONFIG.reviewsSection,
      ...(saved.reviewsSection || {}),
    },
    footer: {
      ...DEFAULT_WEBSITE_CONFIG.footer,
      ...(saved.footer || {}),
      socialLinks:
        Array.isArray(saved.footer?.socialLinks) && saved.footer.socialLinks.length > 0
          ? saved.footer.socialLinks
          : DEFAULT_WEBSITE_CONFIG.footer.socialLinks,
      sections:
        Array.isArray(saved.footer?.sections) && saved.footer.sections.length > 0
          ? saved.footer.sections
          : DEFAULT_WEBSITE_CONFIG.footer.sections,
    },
    sectionOrder:
      Array.isArray(saved.sectionOrder) && saved.sectionOrder.length > 0
        ? saved.sectionOrder
        : DEFAULT_WEBSITE_CONFIG.sectionOrder,
  };
}

/**
 * 1. PUBLIC: Fetch the currently LIVE / PUBLISHED website configuration.
 * Strictly reads from `website_published` table (NEVER reads draft).
 */
export const getPublishedWebsiteConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<WebsitePublishedState> => {
    await ensureDbSchema();
    const sql = getSql();

    try {
      const rows = await sql`
        SELECT id, version_id, version_number, config, published_at, published_by, change_summary
        FROM website_published
        WHERE id = 'live'
        LIMIT 1
      `;

      if (rows.length > 0) {
        const row = rows[0];
        const config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
        return {
          version_id: row.version_id,
          version_number: Number(row.version_number) || 1,
          config: mergeWithDefaults(config),
          published_at: row.published_at
            ? new Date(row.published_at).toISOString()
            : new Date().toISOString(),
          published_by: row.published_by || "Admin",
          change_summary: row.change_summary || null,
        };
      }

      // If not yet initialized in database, seed initial published version
      const initialVersionId = "ver_init_1";
      const configJson = JSON.stringify(DEFAULT_WEBSITE_CONFIG);
      const now = new Date().toISOString();

      await sql`
        INSERT INTO website_published (id, version_id, version_number, config, published_at, published_by, change_summary)
        VALUES ('live', ${initialVersionId}, 1, ${configJson}::jsonb, ${now}, 'System Initializer', 'Initial Live Version')
        ON CONFLICT (id) DO NOTHING
      `;

      await sql`
        INSERT INTO website_draft (id, config, updated_at, updated_by)
        VALUES ('current', ${configJson}::jsonb, ${now}, 'System Initializer')
        ON CONFLICT (id) DO NOTHING
      `;

      await sql`
        INSERT INTO website_versions (id, version_number, config, published_at, published_by, change_summary, status)
        VALUES (${initialVersionId}, 1, ${configJson}::jsonb, ${now}, 'System Initializer', 'Initial Live Version', 'published')
        ON CONFLICT (id) DO NOTHING
      `;

      return {
        version_id: initialVersionId,
        version_number: 1,
        config: DEFAULT_WEBSITE_CONFIG,
        published_at: now,
        published_by: "System Initializer",
        change_summary: "Initial Live Version",
      };
    } catch (err) {
      console.error("[Website Config] getPublishedWebsiteConfig fallback error:", err);
      return {
        version_id: "ver_default",
        version_number: 1,
        config: DEFAULT_WEBSITE_CONFIG,
        published_at: new Date().toISOString(),
        published_by: "Default System",
        change_summary: "Default Baseline Configuration",
      };
    }
  },
);

/**
 * 2. ADMIN: Get Website Management Workspace Data
 * Retrieves Live configuration, Current Draft, and Versioning stats.
 */
export const getWebsiteManagementData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(
    async ({ context }): Promise<WebsiteManagementState & { hasUnpublishedChanges: boolean }> => {
      await assertAdmin(context);
      await ensureDbSchema();
      const sql = getSql();

      // 1. Get Live Published
      const pubRows = await sql`
      SELECT id, version_id, version_number, config, published_at, published_by, change_summary
      FROM website_published
      WHERE id = 'live'
      LIMIT 1
    `;

      let publishedState: WebsitePublishedState;
      if (pubRows.length > 0) {
        const row = pubRows[0];
        const config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
        publishedState = {
          version_id: row.version_id,
          version_number: Number(row.version_number) || 1,
          config: mergeWithDefaults(config),
          published_at: row.published_at
            ? new Date(row.published_at).toISOString()
            : new Date().toISOString(),
          published_by: row.published_by || "Admin",
          change_summary: row.change_summary || null,
        };
      } else {
        publishedState = {
          version_id: "ver_1",
          version_number: 1,
          config: DEFAULT_WEBSITE_CONFIG,
          published_at: new Date().toISOString(),
          published_by: "Admin",
          change_summary: "Initial Published",
        };
      }

      // 2. Get Draft
      const draftRows = await sql`
      SELECT id, config, updated_at, updated_by
      FROM website_draft
      WHERE id = 'current'
      LIMIT 1
    `;

      let draftState: WebsiteDraftState;
      if (draftRows.length > 0) {
        const row = draftRows[0];
        const config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
        draftState = {
          config: mergeWithDefaults(config),
          updated_at: row.updated_at
            ? new Date(row.updated_at).toISOString()
            : new Date().toISOString(),
          updated_by: row.updated_by || "Admin",
        };
      } else {
        // Seed draft with published
        const now = new Date().toISOString();
        const configJson = JSON.stringify(publishedState.config);
        await sql`
        INSERT INTO website_draft (id, config, updated_at, updated_by)
        VALUES ('current', ${configJson}::jsonb, ${now}, ${context.user?.email || "Admin"})
        ON CONFLICT (id) DO NOTHING
      `;
        draftState = {
          config: publishedState.config,
          updated_at: now,
          updated_by: context.user?.email || "Admin",
        };
      }

      // 3. Get Previous Version info & total versions
      const versionRows = await sql`
      SELECT id, version_number, config, published_at, published_by, change_summary, status
      FROM website_versions
      ORDER BY version_number DESC
      LIMIT 10
    `;

      const totalVersionsCount = await sql`
      SELECT count(*) as count FROM website_versions
    `;
      const totalVersions = Number(totalVersionsCount[0]?.count) || versionRows.length;

      // Find the previous version (the version right before the current live version number)
      const previousRow = versionRows.find(
        (v: any) => Number(v.version_number) < publishedState.version_number,
      );

      let previousVersion: WebsiteVersionRecord | null = null;
      if (previousRow) {
        const pConfig =
          typeof previousRow.config === "string"
            ? JSON.parse(previousRow.config)
            : previousRow.config;
        previousVersion = {
          id: previousRow.id,
          version_number: Number(previousRow.version_number),
          config: mergeWithDefaults(pConfig),
          published_at: previousRow.published_at
            ? new Date(previousRow.published_at).toISOString()
            : "",
          published_by: previousRow.published_by,
          change_summary: previousRow.change_summary,
          status: previousRow.status || "published",
        };
      }

      // Determine if there are unpublished changes
      const hasUnpublishedChanges =
        JSON.stringify(draftState.config) !== JSON.stringify(publishedState.config);

      return {
        published: publishedState,
        draft: draftState,
        previousVersion,
        totalVersions,
        hasUnpublishedChanges,
      };
    },
  );

/**
 * 3. ADMIN: Save Draft Website Configuration.
 * Saves ONLY to `website_draft`. Does NOT change live published website.
 */
export const saveDraftWebsiteConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { config: WebsiteConfig }) => ({
    config: d.config,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    const config = mergeWithDefaults(data.config);
    const configJson = JSON.stringify(config);
    const now = new Date().toISOString();
    const userEmail = context.user?.email || "Admin";

    await sql`
      INSERT INTO website_draft (id, config, updated_at, updated_by)
      VALUES ('current', ${configJson}::jsonb, ${now}, ${userEmail})
      ON CONFLICT (id) DO UPDATE
      SET config = ${configJson}::jsonb,
          updated_at = ${now},
          updated_by = ${userEmail}
    `;

    return {
      ok: true,
      updated_at: now,
      updated_by: userEmail,
      message: "Draft saved successfully. Live website remains unchanged until published.",
    };
  });

/**
 * 4. ADMIN: Discard Draft
 * Resets `website_draft` to match the current live `website_published`.
 */
export const discardDraftWebsiteConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    const pubRows = await sql`
      SELECT config FROM website_published WHERE id = 'live' LIMIT 1
    `;

    const liveConfig = pubRows.length > 0 ? pubRows[0].config : DEFAULT_WEBSITE_CONFIG;
    const configJson = typeof liveConfig === "string" ? liveConfig : JSON.stringify(liveConfig);
    const now = new Date().toISOString();
    const userEmail = context.user?.email || "Admin";

    await sql`
      INSERT INTO website_draft (id, config, updated_at, updated_by)
      VALUES ('current', ${configJson}::jsonb, ${now}, ${userEmail})
      ON CONFLICT (id) DO UPDATE
      SET config = ${configJson}::jsonb,
          updated_at = ${now},
          updated_by = ${userEmail}
    `;

    return {
      ok: true,
      message: "Unsaved draft changes discarded. Draft restored to live configuration.",
    };
  });

/**
 * 5. ADMIN: Publish Website Configuration
 * Promotes `website_draft` to `website_published` and creates a permanent entry in `website_versions`.
 */
export const publishWebsiteConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { changeSummary?: string }) => ({
    changeSummary: d.changeSummary
      ? String(d.changeSummary).trim()
      : "Updated website content and settings",
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    // 1. Fetch current draft
    const draftRows = await sql`
      SELECT config FROM website_draft WHERE id = 'current' LIMIT 1
    `;

    let draftConfig: WebsiteConfig;
    if (draftRows.length > 0) {
      const raw = draftRows[0].config;
      draftConfig = mergeWithDefaults(typeof raw === "string" ? JSON.parse(raw) : raw);
    } else {
      draftConfig = DEFAULT_WEBSITE_CONFIG;
    }

    // 2. Fetch current published version number
    const pubRows = await sql`
      SELECT version_number FROM website_published WHERE id = 'live' LIMIT 1
    `;
    const currentPubVersion = pubRows.length > 0 ? Number(pubRows[0].version_number) || 0 : 0;

    // 3. Find max version number in version history
    const maxRows = await sql`
      SELECT COALESCE(MAX(version_number), 0) as max_v FROM website_versions
    `;
    const maxVersion = Number(maxRows[0]?.max_v) || 0;
    const newVersionNumber = Math.max(currentPubVersion, maxVersion) + 1;
    const newVersionId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const userEmail = context.user?.email || "Admin";
    const configJson = JSON.stringify(draftConfig);

    // 4. Record new version in website_versions
    await sql`
      INSERT INTO website_versions (id, version_number, config, published_at, published_by, change_summary, status)
      VALUES (${newVersionId}, ${newVersionNumber}, ${configJson}::jsonb, ${now}, ${userEmail}, ${data.changeSummary}, 'published')
    `;

    // 5. Update website_published
    await sql`
      INSERT INTO website_published (id, version_id, version_number, config, published_at, published_by, change_summary)
      VALUES ('live', ${newVersionId}, ${newVersionNumber}, ${configJson}::jsonb, ${now}, ${userEmail}, ${data.changeSummary})
      ON CONFLICT (id) DO UPDATE
      SET version_id = ${newVersionId},
          version_number = ${newVersionNumber},
          config = ${configJson}::jsonb,
          published_at = ${now},
          published_by = ${userEmail},
          change_summary = ${data.changeSummary}
    `;

    // 6. Audit Log
    try {
      await logAudit(context, "website.publish", newVersionId, "website", {
        version_number: newVersionNumber,
        change_summary: data.changeSummary,
        published_by: userEmail,
      });
    } catch {
      // ignore audit failure
    }

    return {
      ok: true,
      version_number: newVersionNumber,
      version_id: newVersionId,
      published_at: now,
      message: `Website published successfully as Version ${newVersionNumber}!`,
    };
  });

/**
 * 6. ADMIN: Undo Last Publish
 * Reverts `website_published` and `website_draft` to the previous version,
 * creating a new audit version record so history is never erased.
 */
export const undoLastPublishWebsiteConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    // 1. Get current live version number
    const liveRows = await sql`
      SELECT version_number FROM website_published WHERE id = 'live' LIMIT 1
    `;
    if (liveRows.length === 0) {
      throw new Error("No live website version found.");
    }
    const currentVersion = Number(liveRows[0].version_number);

    // 2. Find previous version before current
    const prevRows = await sql`
      SELECT id, version_number, config
      FROM website_versions
      WHERE version_number < ${currentVersion}
      ORDER BY version_number DESC
      LIMIT 1
    `;

    if (prevRows.length === 0) {
      throw new Error(
        `Cannot undo publish: Version ${currentVersion} is the first recorded version. No prior version exists to restore.`,
      );
    }

    const previous = prevRows[0];
    const prevConfig =
      typeof previous.config === "string" ? JSON.parse(previous.config) : previous.config;
    const mergedConfig = mergeWithDefaults(prevConfig);

    // 3. Find max version number to assign new sequential version
    const maxRows = await sql`
      SELECT COALESCE(MAX(version_number), 0) as max_v FROM website_versions
    `;
    const maxVersion = Number(maxRows[0]?.max_v) || currentVersion;
    const newVersionNumber = maxVersion + 1;
    const newVersionId = `ver_${Date.now()}_undo_v${previous.version_number}`;
    const now = new Date().toISOString();
    const userEmail = context.user?.email || "Admin";
    const changeSummary = `Undo to Version ${previous.version_number}`;
    const configJson = JSON.stringify(mergedConfig);

    // 4. Insert new version record indicating restore
    await sql`
      INSERT INTO website_versions (id, version_number, config, published_at, published_by, change_summary, status)
      VALUES (${newVersionId}, ${newVersionNumber}, ${configJson}::jsonb, ${now}, ${userEmail}, ${changeSummary}, 'restored')
    `;

    // 5. Update live published
    await sql`
      UPDATE website_published
      SET version_id = ${newVersionId},
          version_number = ${newVersionNumber},
          config = ${configJson}::jsonb,
          published_at = ${now},
          published_by = ${userEmail},
          change_summary = ${changeSummary}
      WHERE id = 'live'
    `;

    // 6. Update draft as well to match restored state
    await sql`
      UPDATE website_draft
      SET config = ${configJson}::jsonb,
          updated_at = ${now},
          updated_by = ${userEmail}
      WHERE id = 'current'
    `;

    // 7. Audit log
    try {
      await logAudit(context, "website.undo_publish", newVersionId, "website", {
        restored_from_version: previous.version_number,
        new_version_number: newVersionNumber,
        operator: userEmail,
      });
    } catch {
      // ignore
    }

    return {
      ok: true,
      restored_from_version: previous.version_number,
      new_version_number: newVersionNumber,
      message: `Successfully rolled back live website to configuration of Version ${previous.version_number}. (Logged as Version ${newVersionNumber})`,
    };
  });

/**
 * 7. ADMIN: Restore a Specific Historical Version
 */
export const restoreSpecificWebsiteVersion = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { versionId: string }) => ({
    versionId: String(d.versionId).trim(),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT id, version_number, config
      FROM website_versions
      WHERE id = ${data.versionId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new Error(`Version '${data.versionId}' was not found in history.`);
    }

    const target = rows[0];
    const targetConfig =
      typeof target.config === "string" ? JSON.parse(target.config) : target.config;
    const mergedConfig = mergeWithDefaults(targetConfig);

    const maxRows = await sql`
      SELECT COALESCE(MAX(version_number), 0) as max_v FROM website_versions
    `;
    const maxVersion = Number(maxRows[0]?.max_v) || 0;
    const newVersionNumber = maxVersion + 1;
    const newVersionId = `ver_${Date.now()}_restore_v${target.version_number}`;
    const now = new Date().toISOString();
    const userEmail = context.user?.email || "Admin";
    const changeSummary = `Restored from Version ${target.version_number}`;
    const configJson = JSON.stringify(mergedConfig);

    // 1. Record in version history
    await sql`
      INSERT INTO website_versions (id, version_number, config, published_at, published_by, change_summary, status)
      VALUES (${newVersionId}, ${newVersionNumber}, ${configJson}::jsonb, ${now}, ${userEmail}, ${changeSummary}, 'restored')
    `;

    // 2. Update Live
    await sql`
      UPDATE website_published
      SET version_id = ${newVersionId},
          version_number = ${newVersionNumber},
          config = ${configJson}::jsonb,
          published_at = ${now},
          published_by = ${userEmail},
          change_summary = ${changeSummary}
      WHERE id = 'live'
    `;

    // 3. Update Draft
    await sql`
      UPDATE website_draft
      SET config = ${configJson}::jsonb,
          updated_at = ${now},
          updated_by = ${userEmail}
      WHERE id = 'current'
    `;

    try {
      await logAudit(context, "website.restore_version", newVersionId, "website", {
        restored_from_version: target.version_number,
        new_version_number: newVersionNumber,
        operator: userEmail,
      });
    } catch {
      // ignore
    }

    return {
      ok: true,
      restored_from_version: target.version_number,
      new_version_number: newVersionNumber,
      message: `Version ${target.version_number} successfully restored and published as Version ${newVersionNumber}!`,
    };
  });

/**
 * 8. ADMIN: List Version History
 */
export const listWebsiteVersions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<WebsiteVersionRecord[]> => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`
      SELECT id, version_number, config, published_at, published_by, change_summary, status
      FROM website_versions
      ORDER BY version_number DESC
      LIMIT 100
    `;

    return rows.map((r: any) => ({
      id: r.id,
      version_number: Number(r.version_number),
      config: mergeWithDefaults(typeof r.config === "string" ? JSON.parse(r.config) : r.config),
      published_at: r.published_at ? new Date(r.published_at).toISOString() : "",
      published_by: r.published_by || "Admin",
      change_summary: r.change_summary || null,
      status: r.status || "published",
    }));
  });
