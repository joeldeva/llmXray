CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  device_id TEXT,
  site TEXT NOT NULL,
  user_id TEXT NOT NULL,
  department TEXT NOT NULL,
  event_type TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  decision TEXT NOT NULL,
  policy_hits JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence TEXT,
  url TEXT,
  status TEXT NOT NULL,
  file_meta JSONB,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_stored BOOLEAN NOT NULL DEFAULT FALSE,
  prev_hash TEXT,
  entry_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_decision ON audit_logs (decision);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  policy JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_queue (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  event JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue (status);
CREATE INDEX IF NOT EXISTS idx_review_queue_timestamp ON review_queue (timestamp DESC);

CREATE TABLE IF NOT EXISTS devices (
  tenant_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  client_version TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  PRIMARY KEY (tenant_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_tenant_status ON devices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);

ALTER TABLE devices ADD COLUMN IF NOT EXISTS client_version TEXT;

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  masked_key TEXT NOT NULL,
  email TEXT NOT NULL,
  org TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys (org);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys (status);

CREATE TABLE IF NOT EXISTS usage_events (
  id SERIAL PRIMARY KEY,
  key_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_key_ts ON usage_events (key_id, ts);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_ts ON rate_limit_buckets (bucket_key, ts);
