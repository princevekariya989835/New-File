import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import {
  DEFAULT_WEBSITE_CONFIG,
  type WebsiteConfig,
  type WebsiteStateResponse,
  type WebsiteVersion,
} from "@/lib/website-config.types";

/**
 * Deep merge helper to ensure older or partial configs retain default fields.
 */
function mergeWithDefaults(savedConfig: any): WebsiteConfig {
  if (!savedConfig || typeof savedConfig !== "object") {
    return JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG));
  }

  const def = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG)) as WebsiteConfig;

  return {
    general: {
      ...def.general,
      ...(savedConfig.general || {}),
    },
    seo: {
      ...def.seo,
      ...(savedConfig.seo || {}),
    },
    announcement: {
      ...def.announcement,
      ...(savedConfig.announcement || {}),
    },
    hero: {
      ...def.hero,
      ...(savedConfig.hero || {}),
      animationSettings: {
        ...def.hero.animationSettings!,
        ...(savedConfig.hero?.animationSettings || {}),
      },
    },
    navigation:
      Array.isArray(savedConfig.navigation) && savedConfig.navigation.length > 0
        ? savedConfig.navigation
        : def.navigation,
    collections:
      Array.isArray(savedConfig.collections) && savedConfig.collections.length > 0
        ? savedConfig.collections.map((c: any, i: number) => ({
            ...(def.collections[i] || {}),
            ...c,
            imageUrl: c.imageUrl || def.collections[i]?.imageUrl || "/products/zoro-black-1.jpg",
          }))
        : def.collections,
    featuredProducts: {
      ...def.featuredProducts,
      ...(savedConfig.featuredProducts || {}),
      productIds: Array.isArray(savedConfig.featuredProducts?.productIds)
        ? savedConfig.featuredProducts.productIds
        : def.featuredProducts.productIds,
    },
    whyUs: {
      badge: savedConfig.whyUs?.badge ?? def.whyUs.badge,
      title: savedConfig.whyUs?.title ?? def.whyUs.title,
      items:
        Array.isArray(savedConfig.whyUs?.items) && savedConfig.whyUs.items.length > 0
          ? savedConfig.whyUs.items
          : def.whyUs.items,
    },
    promoBanner: {
      ...def.promoBanner,
      ...(savedConfig.promoBanner || {}),
    },
    reviewsSection: {
      ...def.reviewsSection,
      ...(savedConfig.reviewsSection || {}),
    },
    footer: {
      ...def.footer,
      ...(savedConfig.footer || {}),
      columns:
        Array.isArray(savedConfig.footer?.columns) && savedConfig.footer.columns.length > 0
          ? savedConfig.footer.columns
          : def.footer.columns,
      socialLinks: {
        ...def.footer.socialLinks,
        ...(savedConfig.footer?.socialLinks || {}),
      },
    },
    sectionOrder: {
      sections:
        Array.isArray(savedConfig.sectionOrder?.sections) &&
        savedConfig.sectionOrder.sections.length > 0
          ? savedConfig.sectionOrder.sections
          : def.sectionOrder.sections,
    },
    cartContent: {
      ...def.cartContent!,
      ...(savedConfig.cartContent || {}),
    },
    shopContent: {
      ...def.shopContent!,
      ...(savedConfig.shopContent || {}),
    },
    productContent: {
      ...def.productContent!,
      ...(savedConfig.productContent || {}),
    },
    contactContent: {
      ...def.contactContent!,
      ...(savedConfig.contactContent || {}),
    },
  };
}

let _publicWebsiteConfigCache: {
  data: {
    config: WebsiteConfig;
    versionNumber: number;
    publishedAt: string | null;
  };
  timestamp: number;
} | null = null;
const WEBSITE_CONFIG_CACHE_TTL = 60_000;

export function invalidatePublicWebsiteConfigCache() {
  _publicWebsiteConfigCache = null;
}

/**
 * Public customer-facing function.
 * MUST ONLY READ FROM `website_published`.
 * NEVER reads from `website_draft` or temporary editor state.
 */
export const getPublicWebsiteConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    config: WebsiteConfig;
    versionNumber: number;
    publishedAt: string | null;
  }> => {
    // Return cached config immediately (<0.1ms)
    if (
      _publicWebsiteConfigCache &&
      Date.now() - _publicWebsiteConfigCache.timestamp < WEBSITE_CONFIG_CACHE_TTL
    ) {
      return _publicWebsiteConfigCache.data;
    }

    try {
      const sql = getSql();
      const rows = await sql`
        SELECT version_id, version_number, config, published_at, published_by
        FROM website_published
        WHERE id = 'live'
        LIMIT 1
      `;

      if (rows && rows.length > 0 && rows[0].config) {
        const raw =
          typeof rows[0].config === "string" ? JSON.parse(rows[0].config) : rows[0].config;
        const result = {
          config: mergeWithDefaults(raw),
          versionNumber: Number(rows[0].version_number ?? 1),
          publishedAt: rows[0].published_at ? new Date(rows[0].published_at).toISOString() : null,
        };
        _publicWebsiteConfigCache = { data: result, timestamp: Date.now() };
        return result;
      }

      const defaultResult = {
        config: DEFAULT_WEBSITE_CONFIG,
        versionNumber: 1,
        publishedAt: null,
      };
      _publicWebsiteConfigCache = { data: defaultResult, timestamp: Date.now() };
      return defaultResult;
    } catch (err) {
      console.error("[WebsiteConfig] getPublicWebsiteConfig error:", err);
      return (
        _publicWebsiteConfigCache?.data || {
          config: DEFAULT_WEBSITE_CONFIG,
          versionNumber: 1,
          publishedAt: null,
        }
      );
    }
  },
);

/**
 * Admin function to fetch complete state:
 * - Live published version
 * - Working draft version
 * - Version history
 */
export const getAdminWebsiteState = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<WebsiteStateResponse> => {
    await assertAdmin(context as any);
    const sql = getSql();

    // Concurrently fetch Published, Draft, and Version History
    const [publishedRes, draftRes, versionRows] = await Promise.all([
      sql`
        SELECT version_id, version_number, config, published_at, published_by
        FROM website_published
        WHERE id = 'live'
        LIMIT 1
      `,
      sql`
        SELECT config, updated_at, updated_by
        FROM website_draft
        WHERE id = 'current'
        LIMIT 1
      `,
      sql`
        SELECT id, version_number, config, published_at, published_by, change_summary, status
        FROM website_versions
        ORDER BY version_number DESC, published_at DESC
        LIMIT 30
      `,
    ]);

    let publishedRow = publishedRes?.[0];

    // If published is missing, initialize
    if (!publishedRow) {
      const initialVerId = `ver_init_${Date.now()}`;
      const defConfig = DEFAULT_WEBSITE_CONFIG;
      await sql`
        INSERT INTO website_published (id, version_id, version_number, config, published_at, published_by, change_summary)
        VALUES ('live', ${initialVerId}, 1, ${JSON.stringify(defConfig)}::jsonb, CURRENT_TIMESTAMP, 'Admin', 'Initial Website Launch')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO website_draft (id, config, updated_at, updated_by)
        VALUES ('current', ${JSON.stringify(defConfig)}::jsonb, CURRENT_TIMESTAMP, 'Admin')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO website_versions (id, version_number, config, published_at, published_by, change_summary, status)
        VALUES (${initialVerId}, 1, ${JSON.stringify(defConfig)}::jsonb, CURRENT_TIMESTAMP, 'Admin', 'Initial Website Launch', 'published')
        ON CONFLICT (id) DO NOTHING
      `;

      publishedRow = {
        version_id: initialVerId,
        version_number: 1,
        config: defConfig,
        published_at: new Date().toISOString(),
        published_by: "Admin",
      };
    }

    const pubConfigRaw =
      typeof publishedRow.config === "string"
        ? JSON.parse(publishedRow.config)
        : publishedRow.config;
    const pubConfig = mergeWithDefaults(pubConfigRaw);

    // Draft handling
    let draftRow = draftRes?.[0];

    if (!draftRow) {
      await sql`
        INSERT INTO website_draft (id, config, updated_at, updated_by)
        VALUES ('current', ${JSON.stringify(pubConfig)}::jsonb, CURRENT_TIMESTAMP, 'Admin')
        ON CONFLICT (id) DO NOTHING
      `;
      draftRow = {
        config: pubConfig,
        updated_at: new Date().toISOString(),
        updated_by: "Admin",
      };
    }

    const draftConfigRaw =
      typeof draftRow.config === "string" ? JSON.parse(draftRow.config) : draftRow.config;
    const draftConfig = mergeWithDefaults(draftConfigRaw);

    const latestVersions: WebsiteVersion[] = (versionRows || []).map((row: any) => {
      const cfg = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
      return {
        id: String(row.id),
        versionNumber: Number(row.version_number),
        config: mergeWithDefaults(cfg),
        publishedBy: String(row.published_by ?? "Admin"),
        publishedAt: row.published_at
          ? new Date(row.published_at).toISOString()
          : new Date().toISOString(),
        changeSummary: row.change_summary ?? undefined,
        status: (row.status as any) || "published",
      };
    });

    const isDifferent = JSON.stringify(draftConfig) !== JSON.stringify(pubConfig);

    return {
      published: {
        config: pubConfig,
        versionNumber: Number(publishedRow.version_number ?? 1),
        publishedAt: publishedRow.published_at
          ? new Date(publishedRow.published_at).toISOString()
          : null,
        publishedBy: publishedRow.published_by ?? "Admin",
      },
      draft: {
        config: draftConfig,
        versionNumber: Number(publishedRow.version_number ?? 1),
        updatedAt: draftRow.updated_at ? new Date(draftRow.updated_at).toISOString() : null,
        updatedBy: draftRow.updated_by ?? "Admin",
        hasUnsavedAgainstPublished: isDifferent,
      },
      latestVersions,
    };
  });

/**
 * Save draft configuration ONLY.
 * MUST NEVER TOUCH `website_published`.
 */
export const adminSaveWebsiteDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { config: WebsiteConfig }) => ({
    config: d.config,
  }))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as any);
    const sql = getSql();

    if (!data.config || typeof data.config !== "object") {
      throw new Error("Invalid configuration object provided for draft.");
    }

    const cleanedConfig = mergeWithDefaults(data.config);
    const userIdentifier = (admin as any)?.email ?? (context as any)?.user?.email ?? "Admin";

    await sql`
      INSERT INTO website_draft (id, config, updated_at, updated_by)
      VALUES ('current', ${JSON.stringify(cleanedConfig)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier})
      ON CONFLICT (id) DO UPDATE SET
        config = EXCLUDED.config,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
    `;

    try {
      await logAudit(context as any, "website.save_draft", "website_draft", "current", {
        updatedBy: userIdentifier,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore non-blocking audit error
    }

    return {
      ok: true,
      updatedAt: new Date().toISOString(),
      message: "Draft saved successfully.",
    };
  });

/**
 * Publish the current draft to LIVE website.
 * 1. Takes current draft config
 * 2. Saves current live as version snapshot
 * 3. Promotes draft to `website_published` with incremented version number
 * 4. Records new version in `website_versions`
 */
export const adminPublishWebsite = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { changeSummary?: string; directConfig?: WebsiteConfig }) => ({
    changeSummary: d.changeSummary ? String(d.changeSummary).trim() : undefined,
    directConfig: d.directConfig,
  }))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as any);
    const sql = getSql();
    const userIdentifier = (admin as any)?.email ?? (context as any)?.user?.email ?? "Admin";

    // 1. Get current draft (or directConfig if passed from editor submit)
    let configToPublish: WebsiteConfig;
    if (data.directConfig) {
      configToPublish = mergeWithDefaults(data.directConfig);
      // Also update draft to keep synced
      await sql`
        INSERT INTO website_draft (id, config, updated_at, updated_by)
        VALUES ('current', ${JSON.stringify(configToPublish)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier})
        ON CONFLICT (id) DO UPDATE SET
          config = EXCLUDED.config,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = EXCLUDED.updated_by
      `;
    } else {
      const draftRow = (
        await sql`
          SELECT config FROM website_draft WHERE id = 'current' LIMIT 1
        `
      )[0];
      if (!draftRow) {
        throw new Error("No draft configuration found to publish.");
      }
      const raw =
        typeof draftRow.config === "string" ? JSON.parse(draftRow.config) : draftRow.config;
      configToPublish = mergeWithDefaults(raw);
    }

    // 2. Determine next version number
    const maxVerRow = (
      await sql`
        SELECT COALESCE(MAX(version_number), 0) AS max_ver FROM website_versions
      `
    )[0];
    const nextVersionNumber = Number(maxVerRow?.max_ver ?? 0) + 1;
    const versionId = `ver_${nextVersionNumber}_${Date.now()}`;
    const summary = data.changeSummary || `Version ${nextVersionNumber} published`;

    // 3. Create version record in history
    await sql`
      INSERT INTO website_versions (id, version_number, config, published_at, published_by, change_summary, status)
      VALUES (${versionId}, ${nextVersionNumber}, ${JSON.stringify(configToPublish)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier}, ${summary}, 'published')
    `;

    // 4. Update website_published
    await sql`
      INSERT INTO website_published (id, version_id, version_number, config, published_at, published_by, change_summary)
      VALUES ('live', ${versionId}, ${nextVersionNumber}, ${JSON.stringify(configToPublish)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier}, ${summary})
      ON CONFLICT (id) DO UPDATE SET
        version_id = EXCLUDED.version_id,
        version_number = EXCLUDED.version_number,
        config = EXCLUDED.config,
        published_at = CURRENT_TIMESTAMP,
        published_by = EXCLUDED.published_by,
        change_summary = EXCLUDED.change_summary
    `;

    try {
      await logAudit(context as any, "website.publish", "website_published", versionId, {
        versionNumber: nextVersionNumber,
        publishedBy: userIdentifier,
        changeSummary: summary,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    invalidatePublicWebsiteConfigCache();

    return {
      ok: true,
      versionNumber: nextVersionNumber,
      versionId,
      publishedAt: new Date().toISOString(),
      message: "Website published successfully.",
    };
  });

/**
 * Undo Last Publish.
 * Restores the previous published configuration:
 * 1. Finds the previous version in `website_versions`
 * 2. Creates a NEW restored version (preserves full audit history)
 * 3. Updates `website_published` to the restored config
 * 4. Synchronizes `website_draft` with the restored config
 */
export const adminUndoLastPublish = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context as any);
    const sql = getSql();
    const userIdentifier = (admin as any)?.email ?? (context as any)?.user?.email ?? "Admin";

    // 1. Fetch current live version
    const liveRow = (
      await sql`
        SELECT version_number, version_id FROM website_published WHERE id = 'live' LIMIT 1
      `
    )[0];

    const currentVerNum = Number(liveRow?.version_number ?? 1);

    // 2. Find previous version in history that is not the current version number
    const prevVersionRows = await sql`
      SELECT id, version_number, config, published_at, published_by, change_summary
      FROM website_versions
      WHERE version_number < ${currentVerNum}
      ORDER BY version_number DESC
      LIMIT 1
    `;

    if (!prevVersionRows || prevVersionRows.length === 0) {
      throw new Error(
        `Cannot undo publish: No previous published version exists before Version ${currentVerNum}.`,
      );
    }

    const prevVersion = prevVersionRows[0];
    const prevConfigRaw =
      typeof prevVersion.config === "string" ? JSON.parse(prevVersion.config) : prevVersion.config;
    const restoredConfig = mergeWithDefaults(prevConfigRaw);

    // 3. Determine next version number for the restoration record
    const maxVerRow = (
      await sql`
        SELECT COALESCE(MAX(version_number), 0) AS max_ver FROM website_versions
      `
    )[0];
    const newVersionNumber = Number(maxVerRow?.max_ver ?? 0) + 1;
    const newVersionId = `ver_${newVersionNumber}_restored_from_${prevVersion.version_number}_${Date.now()}`;
    const summary = `Restored from Version ${prevVersion.version_number}`;

    // 4. Insert new version record with status 'restored' (DO NOT DESTROY HISTORY)
    await sql`
      INSERT INTO website_versions (id, version_number, config, published_at, published_by, change_summary, status)
      VALUES (${newVersionId}, ${newVersionNumber}, ${JSON.stringify(restoredConfig)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier}, ${summary}, 'restored')
    `;

    // 5. Update website_published
    await sql`
      INSERT INTO website_published (id, version_id, version_number, config, published_at, published_by, change_summary)
      VALUES ('live', ${newVersionId}, ${newVersionNumber}, ${JSON.stringify(restoredConfig)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier}, ${summary})
      ON CONFLICT (id) DO UPDATE SET
        version_id = EXCLUDED.version_id,
        version_number = EXCLUDED.version_number,
        config = EXCLUDED.config,
        published_at = CURRENT_TIMESTAMP,
        published_by = EXCLUDED.published_by,
        change_summary = EXCLUDED.change_summary
    `;

    // 6. Synchronize draft with restored version
    await sql`
      INSERT INTO website_draft (id, config, updated_at, updated_by)
      VALUES ('current', ${JSON.stringify(restoredConfig)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier})
      ON CONFLICT (id) DO UPDATE SET
        config = EXCLUDED.config,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
    `;

    try {
      await logAudit(context as any, "website.undo_publish", "website_published", newVersionId, {
        restoredFromVersion: Number(prevVersion.version_number),
        newVersionNumber,
        performedBy: userIdentifier,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    invalidatePublicWebsiteConfigCache();

    return {
      ok: true,
      restoredFromVersion: Number(prevVersion.version_number),
      newVersionNumber,
      message: `Previous website version (Version ${prevVersion.version_number}) restored successfully as Version ${newVersionNumber}.`,
    };
  });

/**
 * Discard working draft.
 * Resets `website_draft` back to the currently active `website_published` configuration.
 * Does NOT alter live website.
 */
export const adminDiscardDraft = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context as any);
    const sql = getSql();
    const userIdentifier = (admin as any)?.email ?? (context as any)?.user?.email ?? "Admin";

    // 1. Fetch live published
    const pubRow = (
      await sql`
        SELECT config FROM website_published WHERE id = 'live' LIMIT 1
      `
    )[0];

    const targetConfig = pubRow?.config
      ? mergeWithDefaults(
          typeof pubRow.config === "string" ? JSON.parse(pubRow.config) : pubRow.config,
        )
      : DEFAULT_WEBSITE_CONFIG;

    // 2. Overwrite draft with published
    await sql`
      INSERT INTO website_draft (id, config, updated_at, updated_by)
      VALUES ('current', ${JSON.stringify(targetConfig)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier})
      ON CONFLICT (id) DO UPDATE SET
        config = EXCLUDED.config,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
    `;

    try {
      await logAudit(context as any, "website.discard_draft", "website_draft", "current", {
        performedBy: userIdentifier,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    return {
      ok: true,
      config: targetConfig,
      message: "Unpublished draft changes discarded. Reset to live published version.",
    };
  });

/**
 * Restore a specific version from history.
 */
export const adminRestoreSpecificVersion = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { versionId: string }) => ({
    versionId: String(d.versionId).trim(),
  }))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context as any);
    const sql = getSql();
    const userIdentifier = (admin as any)?.email ?? (context as any)?.user?.email ?? "Admin";

    const targetVerRow = (
      await sql`
        SELECT id, version_number, config FROM website_versions WHERE id = ${data.versionId} LIMIT 1
      `
    )[0];

    if (!targetVerRow) {
      throw new Error(`Version '${data.versionId}' not found.`);
    }

    const targetConfigRaw =
      typeof targetVerRow.config === "string"
        ? JSON.parse(targetVerRow.config)
        : targetVerRow.config;
    const restoredConfig = mergeWithDefaults(targetConfigRaw);

    const maxVerRow = (
      await sql`
        SELECT COALESCE(MAX(version_number), 0) AS max_ver FROM website_versions
      `
    )[0];
    const newVersionNumber = Number(maxVerRow?.max_ver ?? 0) + 1;
    const newVersionId = `ver_${newVersionNumber}_restored_from_${targetVerRow.version_number}_${Date.now()}`;
    const summary = `Restored from Version ${targetVerRow.version_number}`;

    // 1. Insert new version record
    await sql`
      INSERT INTO website_versions (id, version_number, config, published_at, published_by, change_summary, status)
      VALUES (${newVersionId}, ${newVersionNumber}, ${JSON.stringify(restoredConfig)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier}, ${summary}, 'restored')
    `;

    // 2. Update website_published
    await sql`
      INSERT INTO website_published (id, version_id, version_number, config, published_at, published_by, change_summary)
      VALUES ('live', ${newVersionId}, ${newVersionNumber}, ${JSON.stringify(restoredConfig)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier}, ${summary})
      ON CONFLICT (id) DO UPDATE SET
        version_id = EXCLUDED.version_id,
        version_number = EXCLUDED.version_number,
        config = EXCLUDED.config,
        published_at = CURRENT_TIMESTAMP,
        published_by = EXCLUDED.published_by,
        change_summary = EXCLUDED.change_summary
    `;

    // 3. Synchronize draft
    await sql`
      INSERT INTO website_draft (id, config, updated_at, updated_by)
      VALUES ('current', ${JSON.stringify(restoredConfig)}::jsonb, CURRENT_TIMESTAMP, ${userIdentifier})
      ON CONFLICT (id) DO UPDATE SET
        config = EXCLUDED.config,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = EXCLUDED.updated_by
    `;

    try {
      await logAudit(context as any, "website.restore_version", "website_published", newVersionId, {
        sourceVersionNumber: Number(targetVerRow.version_number),
        newVersionNumber,
        performedBy: userIdentifier,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    invalidatePublicWebsiteConfigCache();

    return {
      ok: true,
      restoredVersionNumber: Number(targetVerRow.version_number),
      newVersionNumber,
      message: `Restored Version ${targetVerRow.version_number} as new live Version ${newVersionNumber}.`,
    };
  });

/**
 * Upload Website Hero Media
 * Persistently stores hero image/video in database and returns permanent media URL
 */
export const uploadHeroMediaServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      fileName: string;
      mimeType: string;
      mediaType: "image" | "video";
      dataBase64: string;
      sizeBytes?: number;
    }) => ({
      fileName: String(d.fileName || "hero-media"),
      mimeType: String(d.mimeType || "image/jpeg"),
      mediaType: d.mediaType === "video" ? ("video" as const) : ("image" as const),
      dataBase64: String(d.dataBase64 || ""),
      sizeBytes: Number(d.sizeBytes) || 0,
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const sql = getSql();

    if (!data.dataBase64) {
      throw new Error("Empty media content received.");
    }

    const cleanBase64 = data.dataBase64.replace(/^data:[^;]+;base64,/, "");
    const binaryBuffer = Buffer.from(cleanBase64, "base64");
    const actualSize = data.sizeBytes || binaryBuffer.length;

    // Validate allowed MIME types
    const allowedImageMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
      "image/svg+xml",
    ];
    const allowedVideoMimes = ["video/mp4", "video/webm", "video/ogg"];

    if (data.mediaType === "image" && !allowedImageMimes.includes(data.mimeType)) {
      throw new Error("Unsupported image format. Allowed: JPG, PNG, WebP, AVIF, GIF, SVG");
    }
    if (data.mediaType === "video" && !allowedVideoMimes.includes(data.mimeType)) {
      throw new Error("Unsupported video format. Allowed: MP4, WebM, OGG");
    }

    if (data.mimeType === "image/svg+xml") {
      const rawSvg = binaryBuffer.toString("utf-8");
      if (/<script/i.test(rawSvg) || /on\w+\s*=/i.test(rawSvg) || /javascript:/i.test(rawSvg)) {
        throw new Error("Unsafe SVG content rejected: script or event handlers detected.");
      }
    }

    // Validate size (Images: 25MB, Videos: 100MB)
    const maxImageSize = 25 * 1024 * 1024;
    const maxVideoSize = 100 * 1024 * 1024;

    if (data.mediaType === "image" && actualSize > maxImageSize) {
      throw new Error("Image is too large. Maximum allowed size is 25MB.");
    }
    if (data.mediaType === "video" && actualSize > maxVideoSize) {
      throw new Error("Video is too large. Maximum allowed size is 100MB.");
    }

    const mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const userEmail = (context as any).user?.email || "Admin";

    await sql`
      INSERT INTO website_media (id, file_name, mime_type, media_type, size_bytes, data_base64, created_at, created_by)
      VALUES (${mediaId}, ${data.fileName}, ${data.mimeType}, ${data.mediaType}, ${actualSize}, ${cleanBase64}, ${now}, ${userEmail})
    `;

    const mediaUrl = `/api/media/${mediaId}`;

    return {
      success: true,
      mediaId,
      mediaUrl,
      mediaType: data.mediaType,
      fileName: data.fileName,
      sizeBytes: actualSize,
    };
  });
