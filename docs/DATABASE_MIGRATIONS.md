# RIOTOUS Database Migrations Guide

> **Migrations Directory**: `migrations/`  
> **Target Database**: Cloudflare D1 (`riotous-db`, Database ID: `7487ac0f-706e-4560-baf8-e79031b2dd5e`)

This guide outlines the SQL migration history, execution ordering, Wrangler deployment commands, and runtime schema initialization rules in the RIOTOUS codebase.

---

## 1. Migration File History & Ordering

Migrations MUST always be executed in strict numerical sequence:

| Migration File | Primary Responsibility | Tables Affected / Created |
| :--- | :--- | :--- |
| **`0001_initial_d1_schema.sql`** | Baseline database schema definition | Creates 34 core tables (`profiles`, `products`, `product_variants`, `orders`, `order_items`, `shipments`, `coupons`, `returns`, etc.) and all primary foreign keys and indices. |
| **`0002_seed_initial_data.sql`** | Core product and administrative seed data | Seeds default administrative accounts (`princevekariya9898@gmail.com`), initial streetwear catalog items, and baseline store settings. |
| **`0003_populate_full_relational_data.sql`** | Relational catalog enhancements | Populates `product_highlights`, `product_specifications`, `product_offers`, and size/color variant relationships. |
| **`0004_invoices_and_tax_schema.sql`** | Tax invoice and GST data model | Creates `invoices` and `invoice_sequences` tables for GST-compliant invoicing. |
| **`0005_add_invoice_fields_to_orders.sql`** | Order invoice reference extension | Adds `invoice_number` and `invoice_date` columns to the `orders` table. |

---

## 2. Applying Migrations via Wrangler

### 2.1 Remote Production D1 Database
To apply pending migrations to the live Cloudflare D1 database:
```bash
# Preview pending migrations
npx wrangler d1 migrations list riotous-db --remote

# Apply migrations to production
npx wrangler d1 migrations apply riotous-db --remote
```

### 2.2 Local Development D1 Database
To apply migrations to the local SQLite database used during `wrangler dev`:
```bash
npx wrangler d1 migrations apply riotous-db --local
```

---

## 3. Runtime Schema Initialization & Seeding (`src/lib/db.ts`)

In addition to Wrangler migrations, `src/lib/db.ts` includes intelligent runtime schema validation and catalog seeding:
1. **Catalog Seeding Check**:
   On cold starts, `seedInitialProductsIfNeeded()` queries the `products` and `store_settings` tables:
   ```typescript
   SELECT initial_catalog_seeded, deleted_product_ids FROM store_settings WHERE id = 'default' LIMIT 1;
   ```
2. **Preventing Re-Seeding of Deleted Items**:
   Any product ID present in `store_settings.deleted_product_ids` or returned by `getDeletedProductIds()` in `src/lib/fallback-products-manager.server.ts` is permanently excluded from being re-seeded.
3. **Idempotent Inserts**:
   Seed queries use `ON CONFLICT (id) DO NOTHING` to prevent primary key collision errors.

---

## 4. Cross-Engine Compatibility Rules

When writing new SQL migrations:
1. **Never use engine-specific types**:
   - Use `TEXT` for strings, UUIDs, and JSON blobs.
   - Use `NUMERIC` for monetary amounts and prices.
   - Use `INTEGER` for counters, quantities, and booleans (`0` or `1`).
2. **Avoid Postgres-Only Constructs in D1 Migrations**:
   - D1 does not support `CREATE EXTENSION`, `SERIAL`, or `UUID_GENERATE_V4()`.
   - Primary keys must be generated application-side (`usr_...`, `prod_...`, `ord_...`, or `crypto.randomUUID()`).
3. **Indices**: Always qualify index creation with `CREATE INDEX IF NOT EXISTS`.
