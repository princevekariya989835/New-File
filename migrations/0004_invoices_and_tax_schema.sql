-- Cloudflare D1 Migration for RIOTOUS Invoicing and Tax System
-- Database: riotous-db
-- Version: 0004_invoices_and_tax_schema.sql

-- 1. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  order_number TEXT NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date TEXT NOT NULL,
  invoice_title TEXT NOT NULL DEFAULT 'TAX INVOICE',
  seller_details TEXT NOT NULL DEFAULT '{}',
  customer_details TEXT NOT NULL DEFAULT '{}',
  items_snapshot TEXT NOT NULL DEFAULT '[]',
  totals_snapshot TEXT NOT NULL DEFAULT '{}',
  tax_breakup TEXT NOT NULL DEFAULT '{}',
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  place_of_supply TEXT,
  state_code TEXT,
  pdf_storage_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices (order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);

-- 2. Concurrency-Safe Invoice Sequences Table (Yearly Counter)
CREATE TABLE IF NOT EXISTS invoice_sequences (
  year INTEGER PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial year counter for 2026
INSERT INTO invoice_sequences (year, last_seq) VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;

-- 3. Ensure Columns on orders table (Safe SQLite / D1 compatibility)
-- In D1 / SQLite, ADD COLUMN is executed if column does not exist
-- (These will be dynamically checked or migrated in code as well)
