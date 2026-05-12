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
-- 2. autoresearch_trend — weekly/monthly KPI history per domain
--    JSONB kpis to accommodate varying metrics across WMS / TMS.
-- ============================================================
CREATE TABLE IF NOT EXISTS autoresearch_trend (
  period_key TEXT NOT NULL,            -- "2026-W18_review", "2026-04_monthly"
  domain TEXT NOT NULL,                -- "WMS" | "TMS"
  report_mode TEXT,                    -- "weekly_review" | "monthly" | "weekly_forecast"
  period_start DATE,
  period_end DATE,
  period_label TEXT,
  kpis JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (period_key, domain)
);
CREATE INDEX IF NOT EXISTS idx_autoresearch_trend_period_start
  ON autoresearch_trend (period_start DESC);
CREATE INDEX IF NOT EXISTS idx_autoresearch_trend_domain
  ON autoresearch_trend (domain);

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
-- 7. tms_delivery_notes — 2-week rolling shipment special notes
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_delivery_notes (
  sc_id          TEXT PRIMARY KEY,
  pna_code       TEXT NOT NULL DEFAULT '',
  pna_name       TEXT,
  shipment_date  DATE,
  delivery_notes TEXT NOT NULL,
  status         TEXT,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tms_delivery_notes_date
  ON tms_delivery_notes (shipment_date DESC);
ALTER TABLE tms_delivery_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_delivery_notes ON tms_delivery_notes;
CREATE POLICY anon_select_tms_delivery_notes ON tms_delivery_notes FOR SELECT TO anon USING (true);

-- ============================================================
-- 8. tms_multi_to_weekly — weekly PNAs with 2+ Transport Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_multi_to_weekly (
  week_start  DATE    NOT NULL,
  pna_code    TEXT    NOT NULL,
  pna_name    TEXT,
  to_count    INT     NOT NULL,
  to_list     JSONB   NOT NULL DEFAULT '[]',
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start, pna_code)
);
ALTER TABLE tms_multi_to_weekly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_multi_to_weekly ON tms_multi_to_weekly;
CREATE POLICY anon_select_tms_multi_to_weekly ON tms_multi_to_weekly FOR SELECT TO anon USING (true);

-- ============================================================
-- 9. wms_dayoung_schedule — upcoming 다영기획 임가공 jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS wms_dayoung_schedule (
  pks_id          TEXT PRIMARY KEY,
  project         TEXT,
  scheduled_date  DATE,
  movement_date   DATE,
  material_status TEXT,
  progress_status TEXT[],
  items           TEXT,
  quantity        INT,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_dayoung_schedule_date
  ON wms_dayoung_schedule (scheduled_date ASC);
ALTER TABLE wms_dayoung_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_wms_dayoung_schedule ON wms_dayoung_schedule;
CREATE POLICY anon_select_wms_dayoung_schedule ON wms_dayoung_schedule FOR SELECT TO anon USING (true);

-- ============================================================
-- 10. tms_carrier_otif — daily per-carrier delivery rate snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_carrier_otif (
  snapshot_date   DATE    NOT NULL,
  partner_name    TEXT    NOT NULL,
  total_shipments INT     NOT NULL DEFAULT 0,
  delivered_count INT     NOT NULL DEFAULT 0,
  otif_pct        NUMERIC(5,2),
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, partner_name)
);
CREATE INDEX IF NOT EXISTS idx_tms_carrier_otif_date
  ON tms_carrier_otif (snapshot_date DESC);
ALTER TABLE tms_carrier_otif ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_carrier_otif ON tms_carrier_otif;
CREATE POLICY anon_select_tms_carrier_otif ON tms_carrier_otif FOR SELECT TO anon USING (true);

-- ============================================================
-- 11. tms_daily_volume — daily shipment volume snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_daily_volume (
  date            DATE PRIMARY KEY,
  sent_count      INT          NOT NULL DEFAULT 0,
  delivered_count INT          NOT NULL DEFAULT 0,
  pending_count   INT          NOT NULL DEFAULT 0,
  total_cbm       NUMERIC(8,3) NOT NULL DEFAULT 0,
  synced_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE tms_daily_volume ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_daily_volume ON tms_daily_volume;
CREATE POLICY anon_select_tms_daily_volume ON tms_daily_volume FOR SELECT TO anon USING (true);

-- ============================================================
-- 12. tms_pod_aging — in-transit shipments with aging days
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_pod_aging (
  snapshot_date  DATE    NOT NULL,
  shipment_id    TEXT    NOT NULL,
  sc_id          TEXT,
  shipment_date  DATE,
  aging_days     INT,
  status         TEXT,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, shipment_id)
);
CREATE INDEX IF NOT EXISTS idx_tms_pod_aging_snapshot
  ON tms_pod_aging (snapshot_date DESC);
ALTER TABLE tms_pod_aging ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_pod_aging ON tms_pod_aging;
CREATE POLICY anon_select_tms_pod_aging ON tms_pod_aging FOR SELECT TO anon USING (true);

-- ============================================================
-- 13. tms_carrier_capacity — 기사별 차량 적재 용량 마스터
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_carrier_capacity (
  partner_name TEXT PRIMARY KEY,
  vehicle_type TEXT NOT NULL,
  capacity_m3  NUMERIC(6,2) NOT NULL
);
ALTER TABLE tms_carrier_capacity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_carrier_capacity ON tms_carrier_capacity;
CREATE POLICY anon_select_tms_carrier_capacity
  ON tms_carrier_capacity FOR SELECT TO anon USING (true);

INSERT INTO tms_carrier_capacity (partner_name, vehicle_type, capacity_m3)
VALUES ('박종성', '2.5t', 9.5), ('이장훈', '1t', 7.6), ('조희선', '1t', 7.6)
ON CONFLICT (partner_name) DO UPDATE SET
  capacity_m3 = EXCLUDED.capacity_m3, vehicle_type = EXCLUDED.vehicle_type;

-- ============================================================
-- 14. tms_truck_load_today — hourly carrier load snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_truck_load_today (
  snapshot_at     TIMESTAMPTZ  NOT NULL,
  partner_name    TEXT         NOT NULL,
  loaded_m3       NUMERIC(8,3) NOT NULL DEFAULT 0,
  capacity_m3     NUMERIC(6,2) NOT NULL,
  utilization_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  status          TEXT         NOT NULL DEFAULT 'green',
  shipment_count  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (snapshot_at, partner_name)
);
CREATE INDEX IF NOT EXISTS idx_tms_truck_load_snap ON tms_truck_load_today (snapshot_at DESC);
ALTER TABLE tms_truck_load_today ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_truck_load_today ON tms_truck_load_today;
CREATE POLICY anon_select_tms_truck_load_today
  ON tms_truck_load_today FOR SELECT TO anon USING (true);

-- ============================================================
-- 15. tms_cbm_abc_weekly — weekly CBM ABC pareto (top-30)
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_cbm_abc_weekly (
  week_start     DATE         NOT NULL,
  rank           INT          NOT NULL,
  product_code   TEXT         NOT NULL,
  product_name   TEXT,
  total_cbm      NUMERIC(8,3),
  cumulative_pct NUMERIC(5,2),
  PRIMARY KEY (week_start, rank)
);
CREATE INDEX IF NOT EXISTS idx_tms_cbm_abc_week ON tms_cbm_abc_weekly (week_start DESC);
ALTER TABLE tms_cbm_abc_weekly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_cbm_abc_weekly ON tms_cbm_abc_weekly;
CREATE POLICY anon_select_tms_cbm_abc_weekly
  ON tms_cbm_abc_weekly FOR SELECT TO anon USING (true);

-- ============================================================
-- 16. wms_box_mix_forecast — 내일 필요 박스명칭별 예상 수량 (W3)
-- ============================================================
CREATE TABLE IF NOT EXISTS wms_box_mix_forecast (
  forecast_date  DATE         NOT NULL,
  box_category   TEXT         NOT NULL,  -- '특대' | '중대' | '대' | '중' | '소'
  predicted_qty  INT          NOT NULL DEFAULT 0,
  avg_qty_14d    NUMERIC(6,2) NOT NULL DEFAULT 0,
  source_days    INT          NOT NULL DEFAULT 14,
  generated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (forecast_date, box_category)
);
CREATE INDEX IF NOT EXISTS idx_wms_box_mix_date
  ON wms_box_mix_forecast (forecast_date DESC);
ALTER TABLE wms_box_mix_forecast ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_wms_box_mix_forecast ON wms_box_mix_forecast;
CREATE POLICY anon_select_wms_box_mix_forecast
  ON wms_box_mix_forecast FOR SELECT TO anon USING (true);

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
