-- Cloudflare D1 Migration for RIOTOUS Store
-- Version: 0006_auth_security_and_password_recovery.sql
-- Database: riotous-db (7487ac0f-706e-4560-baf8-e79031b2dd5e)

-- 1. Shared Persistent Rate Limiting Table (for Cloudflare Workers & PostgreSQL)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  first_attempt_at INTEGER NOT NULL,
  last_attempt_at INTEGER NOT NULL,
  blocked_until INTEGER DEFAULT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits (expires_at);

-- 2. Password Reset Tokens Table (stores only SHA-256 hashes of single-use tokens)
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT DEFAULT NULL,
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets (email, expires_at);
