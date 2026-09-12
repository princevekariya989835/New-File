import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin, logAudit } from "@/lib/admin-utils";
import { getSql, ensureDbSchema } from "@/lib/db";

export type CampaignType =
  | "Product Promotion"
  | "Discount Campaign"
  | "Seasonal Campaign"
  | "New Product"
  | "Flash Sale"
  | "Social Media"
  | "Email Campaign";

export type CampaignStatus =
  "Draft" | "Scheduled" | "Active" | "Paused" | "Completed" | "Cancelled";

export type MarketingChannel = "Website" | "Email" | "Instagram" | "Facebook" | "Google" | "Other";

export type DiscountType = "Percentage" | "Fixed Amount" | "No Discount";

export type CampaignRecord = {
  id: string;
  name: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  channel: MarketingChannel;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  targetAudience: string;
  productIds: string[];
  discountCode: string | null;
  discountType: DiscountType;
  discountValue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

const INITIAL_CAMPAIGNS: CampaignRecord[] = [
  {
    id: "cmp_summer_sale",
    name: "Summer T-Shirt Sale",
    description: "Huge seasonal discount on all summer graphic tees and oversized fits.",
    type: "Seasonal Campaign",
    status: "Active",
    channel: "Website",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    budget: 50000,
    spent: 34200,
    targetAudience: "All Customers",
    productIds: [],
    discountCode: "SUMMER20",
    discountType: "Percentage",
    discountValue: 20,
    impressions: 120000,
    clicks: 4500,
    conversions: 320,
    revenue: 480000,
    createdAt: "2026-05-25T10:00:00Z",
    updatedAt: "2026-06-10T14:30:00Z",
    createdBy: "Admin",
  },
  {
    id: "cmp_oversized_launch",
    name: "New Oversized Collection",
    description: "Launch campaign for heavy cotton drop-shoulder streetwear tees.",
    type: "New Product",
    status: "Active",
    channel: "Instagram",
    startDate: "2026-06-10",
    endDate: "2026-07-10",
    budget: 75000,
    spent: 60000,
    targetAudience: "New Customers",
    productIds: [],
    discountCode: "OVERSIZE15",
    discountType: "Percentage",
    discountValue: 15,
    impressions: 250000,
    clicks: 8900,
    conversions: 540,
    revenue: 890000,
    createdAt: "2026-06-05T09:15:00Z",
    updatedAt: "2026-06-12T11:00:00Z",
    createdBy: "Admin",
  },
  {
    id: "cmp_streetwear_drop",
    name: "College Streetwear Drop",
    description: "Exclusive university and campus aesthetic t-shirts for students.",
    type: "Product Promotion",
    status: "Scheduled",
    channel: "Facebook",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    budget: 40000,
    spent: 0,
    targetAudience: "Custom Audience",
    productIds: [],
    discountCode: "CAMPUS10",
    discountType: "Percentage",
    discountValue: 10,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    createdAt: "2026-06-08T16:20:00Z",
    updatedAt: "2026-06-08T16:20:00Z",
    createdBy: "Admin",
  },
  {
    id: "cmp_weekend_flash",
    name: "Weekend Flash Sale",
    description: "48-hour lightning deals on selected solid color essentials.",
    type: "Flash Sale",
    status: "Paused",
    channel: "Email",
    startDate: "2026-06-05",
    endDate: "2026-06-07",
    budget: 20000,
    spent: 18500,
    targetAudience: "Returning Customers",
    productIds: [],
    discountCode: "FLASH500",
    discountType: "Fixed Amount",
    discountValue: 500,
    impressions: 45000,
    clicks: 2100,
    conversions: 180,
    revenue: 210000,
    createdAt: "2026-06-01T12:00:00Z",
    updatedAt: "2026-06-07T18:00:00Z",
    createdBy: "Admin",
  },
  {
    id: "cmp_cotton_launch",
    name: "Premium Cotton Launch",
    description: "Introducing 100% Supima organic cotton heavyweight tees.",
    type: "Product Promotion",
    status: "Completed",
    channel: "Website",
    startDate: "2026-05-01",
    endDate: "2026-05-31",
    budget: 60000,
    spent: 60000,
    targetAudience: "High-Spending Customers",
    productIds: [],
    discountCode: null,
    discountType: "No Discount",
    discountValue: 0,
    impressions: 180000,
    clicks: 6200,
    conversions: 410,
    revenue: 720000,
    createdAt: "2026-04-25T08:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    createdBy: "Admin",
  },
  {
    id: "cmp_festival_col",
    name: "Festival Collection",
    description: "Vibrant neon and tie-dye prints for music festival season.",
    type: "Seasonal Campaign",
    status: "Draft",
    channel: "Google",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    budget: 90000,
    spent: 0,
    targetAudience: "All Customers",
    productIds: [],
    discountCode: "FEST25",
    discountType: "Percentage",
    discountValue: 25,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    createdAt: "2026-06-09T14:10:00Z",
    updatedAt: "2026-06-09T14:10:00Z",
    createdBy: "Admin",
  },
  {
    id: "cmp_first_order",
    name: "First Order Discount",
    description: "Welcome voucher for newly registered store accounts.",
    type: "Discount Campaign",
    status: "Active",
    channel: "Website",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    budget: 30000,
    spent: 22100,
    targetAudience: "Customers With No Orders",
    productIds: [],
    discountCode: "WELCOME100",
    discountType: "Fixed Amount",
    discountValue: 100,
    impressions: 80000,
    clicks: 3800,
    conversions: 450,
    revenue: 360000,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-06-11T09:00:00Z",
    createdBy: "Admin",
  },
  {
    id: "cmp_returning_offer",
    name: "Returning Customer Offer",
    description: "Special appreciation discount for loyal buyers.",
    type: "Email Campaign",
    status: "Cancelled",
    channel: "Email",
    startDate: "2026-04-01",
    endDate: "2026-04-15",
    budget: 15000,
    spent: 4000,
    targetAudience: "Returning Customers",
    productIds: [],
    discountCode: "LOYALTY",
    discountType: "Percentage",
    discountValue: 15,
    impressions: 12000,
    clicks: 350,
    conversions: 25,
    revenue: 32000,
    createdAt: "2026-03-28T11:00:00Z",
    updatedAt: "2026-04-05T15:00:00Z",
    createdBy: "Admin",
  },
];

export const adminListCampaigns = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<CampaignRecord[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    try {
      const rows = await sql`
        SELECT id, name, description, type, status, channel, start_date, end_date,
               budget, spent, target_audience, product_ids, discount_code, discount_type,
               discount_value, impressions, clicks, conversions, revenue, created_at, updated_at, created_by
        FROM campaigns
        ORDER BY created_at DESC
      `;

      if (!rows || rows.length === 0) {
        // Seed initial campaigns if table is empty
        for (const c of INITIAL_CAMPAIGNS) {
          await sql`
            INSERT INTO campaigns (
              id, name, description, type, status, channel, start_date, end_date,
              budget, spent, target_audience, product_ids, discount_code, discount_type,
              discount_value, impressions, clicks, conversions, revenue, created_at, updated_at, created_by
            ) VALUES (
              ${c.id}, ${c.name}, ${c.description}, ${c.type}, ${c.status}, ${c.channel},
              ${c.startDate}, ${c.endDate}, ${c.budget}, ${c.spent}, ${c.targetAudience},
              ${JSON.stringify(c.productIds)}::jsonb, ${c.discountCode}, ${c.discountType},
              ${c.discountValue}, ${c.impressions}, ${c.clicks}, ${c.conversions}, ${c.revenue},
              ${c.createdAt}, ${c.updatedAt}, ${c.createdBy}
            ) ON CONFLICT (id) DO NOTHING
          `;
        }
        const seeded = await sql`
          SELECT id, name, description, type, status, channel, start_date, end_date,
                 budget, spent, target_audience, product_ids, discount_code, discount_type,
                 discount_value, impressions, clicks, conversions, revenue, created_at, updated_at, created_by
          FROM campaigns
          ORDER BY created_at DESC
        `;
        return seeded.map(mapDbCampaign);
      }

      return rows.map(mapDbCampaign);
    } catch (err) {
      console.warn(
        "[Admin Marketing] Failed to fetch campaigns from DB, returning initial mock data:",
        err,
      );
      return INITIAL_CAMPAIGNS;
    }
  });

function mapDbCampaign(r: any): CampaignRecord {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    status: r.status,
    channel: r.channel,
    startDate: r.start_date,
    endDate: r.end_date,
    budget: Number(r.budget || 0),
    spent: Number(r.spent || 0),
    targetAudience: r.target_audience || "All Customers",
    productIds: Array.isArray(r.product_ids) ? r.product_ids : [],
    discountCode: r.discount_code,
    discountType: r.discount_type || "No Discount",
    discountValue: Number(r.discount_value || 0),
    impressions: Number(r.impressions || 0),
    clicks: Number(r.clicks || 0),
    conversions: Number(r.conversions || 0),
    revenue: Number(r.revenue || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
  };
}

export type SaveCampaignInput = {
  id?: string | null;
  name: string;
  description?: string;
  type: CampaignType;
  channel: MarketingChannel;
  startDate: string;
  endDate: string;
  budget: number;
  targetAudience: string;
  productIds: string[];
  discountCode?: string;
  discountType: DiscountType;
  discountValue: number;
  status?: CampaignStatus;
};

export const adminSaveCampaign = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: SaveCampaignInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const id =
      data.id || `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const isEdit = Boolean(data.id);
    const now = new Date().toISOString();
    const status = data.status || "Draft";

    if (data.budget < 0) throw new Error("Budget cannot be negative");
    if (data.discountValue < 0) throw new Error("Discount value cannot be negative");
    if (data.discountType === "Percentage" && data.discountValue > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }
    if (new Date(data.endDate) < new Date(data.startDate)) {
      throw new Error("End date must not be before start date");
    }

    try {
      if (isEdit) {
        await sql`
          UPDATE campaigns SET
            name = ${data.name},
            description = ${data.description || null},
            type = ${data.type},
            channel = ${data.channel},
            start_date = ${data.startDate},
            end_date = ${data.endDate},
            budget = ${data.budget},
            target_audience = ${data.targetAudience},
            product_ids = ${JSON.stringify(data.productIds || [])}::jsonb,
            discount_code = ${data.discountCode || null},
            discount_type = ${data.discountType},
            discount_value = ${data.discountValue},
            updated_at = ${now}
          WHERE id = ${data.id}
        `;
        await logAudit(context as any, "campaign.update", "campaign", data.id || id, {
          name: data.name,
        });
      } else {
        await sql`
          INSERT INTO campaigns (
            id, name, description, type, status, channel, start_date, end_date,
            budget, spent, target_audience, product_ids, discount_code, discount_type,
            discount_value, impressions, clicks, conversions, revenue, created_at, updated_at, created_by
          ) VALUES (
            ${id}, ${data.name}, ${data.description || null}, ${data.type}, ${status}, ${data.channel},
            ${data.startDate}, ${data.endDate}, ${data.budget}, 0, ${data.targetAudience},
            ${JSON.stringify(data.productIds || [])}::jsonb, ${data.discountCode || null}, ${data.discountType},
            ${data.discountValue}, 0, 0, 0, 0, ${now}, ${now}, ${(context as any).user?.email || (context as any).email || "Admin"}
          )
        `;
        await logAudit(context as any, "campaign.create", "campaign", id, { name: data.name });
      }

      return { ok: true as const, id };
    } catch (err: any) {
      console.error("[Admin Marketing] Save campaign error:", err);
      throw new Error(err.message || "Failed to save campaign");
    }
  });

export const adminUpdateCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string; status: CampaignStatus }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    const now = new Date().toISOString();

    await sql`
      UPDATE campaigns SET status = ${data.status}, updated_at = ${now} WHERE id = ${data.id}
    `;
    await logAudit(context as any, "campaign.status", "campaign", data.id, { status: data.status });
    return { ok: true as const };
  });

export const adminDuplicateCampaign = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();

    const rows = await sql`SELECT * FROM campaigns WHERE id = ${data.id} LIMIT 1`;
    if (rows.length === 0) throw new Error("Campaign not found");
    const orig = rows.map(mapDbCampaign)[0];

    const newId = `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const newName = `Copy of ${orig.name}`;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO campaigns (
        id, name, description, type, status, channel, start_date, end_date,
        budget, spent, target_audience, product_ids, discount_code, discount_type,
        discount_value, impressions, clicks, conversions, revenue, created_at, updated_at, created_by
      ) VALUES (
        ${newId}, ${newName}, ${orig.description}, ${orig.type}, 'Draft', ${orig.channel},
        ${orig.startDate}, ${orig.endDate}, ${orig.budget}, 0, ${orig.targetAudience},
        ${JSON.stringify(orig.productIds)}::jsonb, ${orig.discountCode}, ${orig.discountType},
        ${orig.discountValue}, 0, 0, 0, 0, ${now}, ${now}, ${(context as any).user?.email || (context as any).email || "Admin"}
      )
    `;
    await logAudit(context as any, "campaign.duplicate", "campaign", newId, {
      originalId: data.id,
    });
    return { ok: true as const, id: newId };
  });

export const adminArchiveCampaign = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    const now = new Date().toISOString();

    await sql`
      UPDATE campaigns SET status = 'Cancelled', updated_at = ${now} WHERE id = ${data.id}
    `;
    await logAudit(context as any, "campaign.archive", "campaign", data.id);
    return { ok: true as const };
  });

export type ProductSimple = {
  id: string;
  name: string;
  price: number;
  images: string[];
  stock_quantity: number;
};

export const adminListProductsForMarketing = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<ProductSimple[]> => {
    await assertAdmin(context as any);
    await ensureDbSchema();
    const sql = getSql();
    try {
      const rows = await sql`
        SELECT id, name, price, images, stock_quantity
        FROM products
        WHERE is_active = true
        ORDER BY name ASC
        LIMIT 200
      `;
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price || 0),
        images: Array.isArray(r.images) ? r.images : [],
        stock_quantity: Number(r.stock_quantity || 0),
      }));
    } catch {
      return [];
    }
  });
