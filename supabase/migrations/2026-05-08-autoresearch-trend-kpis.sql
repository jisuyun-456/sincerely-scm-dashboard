-- 2026-05-08 — autoresearch_trend schema reshape
-- Original schema assumed fixed TMS-side KPI columns (otif, 약속납기, etc).
-- Real history/*_review.json from sincerely-scm-pipeline has different KPIs
-- (completion_rate, defect_rate, picking_total, issue_total) that vary by
-- domain. Switching to a flexible JSONB `kpis` column.
--
-- Apply via Supabase Dashboard → SQL Editor → paste → Run.
-- Safe to run when table is empty (which it currently is).

DROP TABLE IF EXISTS autoresearch_trend CASCADE;

CREATE TABLE autoresearch_trend (
  period_key TEXT NOT NULL,            -- e.g. "2026-W18_review"
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

ALTER TABLE autoresearch_trend ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_autoresearch_trend ON autoresearch_trend;
CREATE POLICY anon_select_autoresearch_trend
  ON autoresearch_trend
  FOR SELECT
  TO anon
  USING (true);
