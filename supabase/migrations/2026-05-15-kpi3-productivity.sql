-- KPI-3 처리건수/FTE productivity schema — 2026-05-15
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Idempotent: safe to re-run

CREATE TABLE IF NOT EXISTS kpi3_productivity (
  week_id         TEXT        PRIMARY KEY,                  -- e.g. "2026-W20"
  shipment_count  INT         NOT NULL DEFAULT 0,
  fte             INT         NOT NULL DEFAULT 7,
  count_per_fte   FLOAT       GENERATED ALWAYS AS (
                    shipment_count::float / NULLIF(fte, 0)
                  ) STORED,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi3_productivity_week
  ON kpi3_productivity (week_id DESC);

ALTER TABLE kpi3_productivity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_kpi3_productivity ON kpi3_productivity;
CREATE POLICY anon_select_kpi3_productivity
  ON kpi3_productivity FOR SELECT TO anon USING (true);
