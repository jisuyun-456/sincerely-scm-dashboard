-- ops_event — harness telemetry feed for /ops Agent Activity Console
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Idempotent: safe to re-run

CREATE TABLE IF NOT EXISTS ops_event (
  id           BIGSERIAL     PRIMARY KEY,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  source       TEXT          NOT NULL,   -- "harness" | "hook"
  agent_id     TEXT          NOT NULL,
  domain       TEXT,
  session_id   TEXT,
  week         TEXT,                     -- ISO date of settlement week, if applicable
  status       TEXT          NOT NULL,   -- "started" | "completed" | "failed"
  duration_ms  INT,
  summary      TEXT,
  meta         JSONB
);

CREATE INDEX IF NOT EXISTS idx_ops_event_created_at
  ON ops_event (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_event_agent_id
  ON ops_event (agent_id);

ALTER TABLE ops_event ENABLE ROW LEVEL SECURITY;

-- anon (browser) can read the feed
DROP POLICY IF EXISTS anon_select_ops_event ON ops_event;
CREATE POLICY anon_select_ops_event
  ON ops_event FOR SELECT TO anon USING (true);

-- service_role (harness) can insert — bypasses RLS automatically,
-- but an explicit policy helps if anon INSERT is ever needed from hooks.
DROP POLICY IF EXISTS service_insert_ops_event ON ops_event;
CREATE POLICY service_insert_ops_event
  ON ops_event FOR INSERT TO service_role WITH CHECK (true);
