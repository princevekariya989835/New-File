-- Cloudflare D1 Migration for RIOTOUS Invoicing Fields on Orders
-- Database: riotous-db
-- Version: 0005_add_invoice_fields_to_orders.sql

-- Add invoice_number and invoice_date columns to orders table
ALTER TABLE orders ADD COLUMN invoice_number TEXT;
ALTER TABLE orders ADD COLUMN invoice_date TEXT;

-- Create index for fast invoice lookup
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders (invoice_number);
