import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { ensureDbSchema, getSql } from "@/lib/db";

export type SavedDesign = {
  id: string;
  name: string;
  color_name: string;
  placement: string;
  canvases: Record<string, any> | null;
  preview_url: string | null;
  updated_at: string;
};

export const getMySavedDesigns = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<SavedDesign[]> => {
    try {
      await ensureDbSchema();
      const sql = getSql();
      const authCtx = context as any;
      const rows = await sql`
        SELECT id, name, color_name, placement, canvases, preview_url, updated_at
        FROM saved_designs
        WHERE user_id = ${authCtx.userId}
        ORDER BY updated_at DESC
      `;
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        color_name: r.color_name,
        placement: r.placement,
        canvases: typeof r.canvases === "string" ? JSON.parse(r.canvases) : r.canvases || null,
        preview_url: r.preview_url || null,
        updated_at: new Date(r.updated_at).toISOString(),
      }));
    } catch {
      return [];
    }
  });

export const saveDesign = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (d: {
      id?: string | null;
      name: string;
      color_name: string;
      placement: string;
      canvases: Record<string, any> | null;
      preview_url?: string | null;
    }) => {
      const name = String(d?.name || "My Design").trim().slice(0, 100);
      const color_name = String(d?.color_name || "Black").trim().slice(0, 50);
      const placement = String(d?.placement || "front").trim().slice(0, 50);
      let preview_url: string | null = null;
      if (typeof d?.preview_url === "string") {
        const p = d.preview_url.trim();
        if (
          p.startsWith("/") ||
          p.startsWith("https://") ||
          (p.startsWith("data:image/") && p.length <= 3_000_000)
        ) {
          preview_url = p;
        }
      }
      return {
        id: d?.id ? String(d.id).trim().slice(0, 100) : null,
        name,
        color_name,
        placement,
        canvases: d?.canvases && typeof d.canvases === "object" ? d.canvases : null,
        preview_url,
      };
    },
  )
  .handler(async ({ data, context }): Promise<SavedDesign> => {
    await ensureDbSchema();
    const sql = getSql();
    const authCtx = context as any;

    if (data.id) {
      await sql`
        UPDATE saved_designs SET
          color_name = ${data.color_name},
          placement = ${data.placement},
          canvases = ${JSON.stringify(data.canvases)}::jsonb,
          preview_url = ${data.preview_url || null},
          updated_at = NOW()
        WHERE id = ${data.id} AND user_id = ${authCtx.userId}
      `;
      return {
        id: data.id,
        name: data.name,
        color_name: data.color_name,
        placement: data.placement,
        canvases: data.canvases,
        preview_url: data.preview_url || null,
        updated_at: new Date().toISOString(),
      };
    }

    const id = `des_saved_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO saved_designs (
        id, user_id, name, color_name, placement, canvases, preview_url
      ) VALUES (
        ${id}, ${authCtx.userId}, ${data.name}, ${data.color_name}, ${data.placement}, ${JSON.stringify(data.canvases)}::jsonb, ${data.preview_url || null}
      );
    `;

    return {
      id,
      name: data.name,
      color_name: data.color_name,
      placement: data.placement,
      canvases: data.canvases,
      preview_url: data.preview_url || null,
      updated_at: new Date().toISOString(),
    };
  });

export const deleteSavedDesign = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureDbSchema();
    const sql = getSql();
    const authCtx = context as any;
    await sql`
      DELETE FROM saved_designs WHERE id = ${data.id} AND user_id = ${authCtx.userId}
    `;
    return { ok: true };
  });
