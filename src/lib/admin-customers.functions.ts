import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { assertAdmin } from "@/lib/admin-utils";
import { ensureDbSchema, getSql } from "@/lib/db";

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  status: "Active" | "Inactive" | "Blocked";
  joinedDate: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  orders: Array<{
    id: string;
    order_number: string;
    created_at: string;
    total_amount: number;
    status: string;
    payment_status: string;
    itemsCount: number;
  }>;
};

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminCustomer[]> => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    // Ensure profile columns exist
    try {
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active'`;
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT`;
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar TEXT`;
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT`;
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT`;
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT`;
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code TEXT`;
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT`;
    } catch {
      // ignore if already present or mocked
    }

    const profiles = await sql`
      SELECT id, email, full_name, role, status, phone, avatar, address, city, state, postal_code, country, created_at
      FROM profiles
      ORDER BY created_at DESC
    `;

    const orders = await sql`
      SELECT id, user_id, order_number, total_amount, currency, status, payment_status, shipping_email, shipping_name, shipping_phone, shipping_address, created_at
      FROM orders
      ORDER BY created_at DESC
    `;

    const orderItems = await sql`
      SELECT order_id, quantity FROM order_items
    `;

    const itemsCountMap = new Map<string, number>();
    for (const item of orderItems as any[]) {
      const oId = String(item.order_id);
      itemsCountMap.set(oId, (itemsCountMap.get(oId) || 0) + Number(item.quantity || 1));
    }

    const customerMap = new Map<string, AdminCustomer>();

    // Seed from profiles
    for (const p of profiles as any[]) {
      const id = String(p.id);
      const email = String(p.email || "").toLowerCase();
      customerMap.set(email, {
        id,
        name: p.full_name || email.split("@")[0] || "Customer",
        email: p.email,
        phone: p.phone || null,
        avatar: p.avatar || null,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        status: (p.status as any) || "Active",
        joinedDate: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
        address: p.address || null,
        city: p.city || null,
        state: p.state || null,
        postalCode: p.postal_code || null,
        country: p.country || "India",
        orders: [],
      });
    }

    // Associate orders
    for (const o of orders as any[]) {
      const email = String(o.shipping_email || "").toLowerCase();
      if (!email) continue;

      let cust = customerMap.get(email);
      if (!cust) {
        // Create virtual customer from order if profile doesn't exist
        cust = {
          id: String(o.user_id || `CUST-ORD-${o.id}`),
          name: o.shipping_name || email.split("@")[0] || "Customer",
          email: o.shipping_email,
          phone: o.shipping_phone || null,
          avatar: null,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          status: "Active",
          joinedDate: o.created_at
            ? new Date(o.created_at).toISOString()
            : new Date().toISOString(),
          address: o.shipping_address || null,
          city: null,
          state: null,
          postalCode: null,
          country: "India",
          orders: [],
        };
        customerMap.set(email, cust);
      }

      const amt = Number(o.total_amount || 0);
      const isPaidOrValid = o.payment_status === "Paid" || o.status !== "Cancelled";
      if (isPaidOrValid) {
        cust.totalSpent += amt;
      }
      cust.totalOrders += 1;

      const orderDateIso = o.created_at
        ? new Date(o.created_at).toISOString()
        : new Date().toISOString();
      if (!cust.lastOrderDate || new Date(orderDateIso) > new Date(cust.lastOrderDate)) {
        cust.lastOrderDate = orderDateIso;
      }

      cust.orders.push({
        id: String(o.id),
        order_number: o.order_number,
        created_at: orderDateIso,
        total_amount: amt,
        status: o.status,
        payment_status: o.payment_status,
        itemsCount: itemsCountMap.get(String(o.id)) || 1,
      });
    }

    return Array.from(customerMap.values());
  });

export const adminUpdateCustomer = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    }) => data,
  )
  .middleware([requireAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    await sql`
      UPDATE profiles
      SET full_name = ${data.name},
          email = ${data.email},
          phone = ${data.phone || null},
          address = ${data.address || null},
          city = ${data.city || null},
          state = ${data.state || null},
          postal_code = ${data.postalCode || null},
          country = ${data.country || null},
          updated_at = CURRENT_TIMESTAMP
      WHERE id::text = ${data.id} OR email::text = ${data.email}
    `;

    return { success: true };
  });

export const adminUpdateCustomerStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string; status: "Active" | "Inactive" | "Blocked"; email?: string }) => data,
  )
  .middleware([requireAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    await ensureDbSchema();
    const sql = getSql();

    await sql`
      UPDATE profiles
      SET status = ${data.status},
          updated_at = CURRENT_TIMESTAMP
      WHERE id::text = ${data.id} OR email::text = ${data.email || ""}
    `;

    return { success: true };
  });
