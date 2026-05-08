-- sincerely-scm-dashboard schema
-- Apply via: Supabase Dashboard → SQL Editor → paste this file → Run
-- Idempotent: safe to re-run

-- ============================================================
-- 1. tms_kpi — daily snapshot of TMS metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_kpi (
  snapshot_date DATE PRIMARY KEY,
  active_shipments INT NOT NULL DEFAULT 0,
  otif_pct NUMERIC(5,2),
  pending_pods INT NOT NULL DEFAULT 0,
  carrier_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. autoresearch_trend — weekly KPI history per domain
-- ============================================================
CREATE TABLE IF NOT EXISTS autoresearch_trend (
  period_key TEXT NOT NULL,            -- "2026-W18"
  domain TEXT NOT NULL,                -- "TMS" | "WMS"
  internal_fulfillment_pct NUMERIC(5,2),
  otif_on_time_pct NUMERIC(5,2),
  promised_date_conversion_pct NUMERIC(5,2),
  delivery_claims_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (period_key, domain)
);

-- ============================================================
-- 3. project_tasks — daily count snapshot per priority
-- ============================================================
CREATE TABLE IF NOT EXISTS project_tasks (
  snapshot_date DATE PRIMARY KEY,
  critical INT NOT NULL DEFAULT 0,
  high INT NOT NULL DEFAULT 0,
  medium INT NOT NULL DEFAULT 0,
  low INT NOT NULL DEFAULT 0,
  done INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. agent_events — live feed from Claude Code hooks
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_events (
  id BIGSERIAL PRIMARY KEY,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent_name TEXT,
  status TEXT NOT NULL,                -- "started" | "completed" | "failed"
  tool_name TEXT,
  duration_ms INT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_agent_events_event_at ON agent_events (event_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_session_id ON agent_events (session_id);

-- ============================================================
-- 5. autoresearch_log — parsed entries from Vault log.md
-- ============================================================
CREATE TABLE IF NOT EXISTS autoresearch_log (
  log_date DATE NOT NULL,
  entry_type TEXT NOT NULL,            -- "WEEKLY" | "DEV" | "INFRA" etc
  title TEXT NOT NULL,
  status TEXT,
  output_link TEXT,
  raw_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (log_date, title)
);
CREATE INDEX IF NOT EXISTS idx_autoresearch_log_date ON autoresearch_log (log_date DESC);

-- ============================================================
-- 6. sync_runs — heartbeat per sync job (widget J)
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,              -- "tms_kpi" | "autoresearch_trend" | etc
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,                -- "running" | "ok" | "failed"
  rows_written INT DEFAULT 0,
  error_message TEXT,
  github_run_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at ON sync_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_job_name ON sync_runs (job_name);

-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================
-- Strategy: anon role (browser) gets SELECT on read tables + INSERT on agent_events.
-- service_role (used by GH Actions) bypasses RLS automatically.

ALTER TABLE tms_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoresearch_trend ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoresearch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

-- anon: read-only on all snapshot tables
DROP POLICY IF EXISTS anon_select_tms_kpi ON tms_kpi;
CREATE POLICY anon_select_tms_kpi ON tms_kpi FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_autoresearch_trend ON autoresearch_trend;
CREATE POLICY anon_select_autoresearch_trend ON autoresearch_trend FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_project_tasks ON project_tasks;
CREATE POLICY anon_select_project_tasks ON project_tasks FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_autoresearch_log ON autoresearch_log;
CREATE POLICY anon_select_autoresearch_log ON autoresearch_log FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_sync_runs ON sync_runs;
CREATE POLICY anon_select_sync_runs ON sync_runs FOR SELECT TO anon USING (true);

-- agent_events: anon can read (dashboard) AND write (Claude Code hooks)
DROP POLICY IF EXISTS anon_select_agent_events ON agent_events;
CREATE POLICY anon_select_agent_events ON agent_events FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_insert_agent_events ON agent_events;
CREATE POLICY anon_insert_agent_events ON agent_events FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- Realtime publication (for widget E live updates)
-- ============================================================
-- Supabase Realtime publishes changes to the `supabase_realtime` publication.
-- Enable for agent_events so the React app can subscribe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_events;
  END IF;
END $$;
