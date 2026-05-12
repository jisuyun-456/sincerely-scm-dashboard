-- WMS Box-Mix Forecast schema migration — 2026-05-12
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Idempotent: safe to re-run

CREATE TABLE IF NOT EXISTS wms_box_mix_forecast (
  forecast_date  DATE           NOT NULL,
  box_category   TEXT           NOT NULL,  -- 특대 | 중대 | 대 | 중 | 소
  predicted_qty  INT            NOT NULL DEFAULT 0,
  avg_qty_14d    NUMERIC(8,2)   NOT NULL DEFAULT 0,
  source_days    INT            NOT NULL DEFAULT 0,
  generated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (forecast_date, box_category)
);

CREATE INDEX IF NOT EXISTS idx_wms_box_mix_forecast_date
  ON wms_box_mix_forecast (forecast_date DESC);

ALTER TABLE wms_box_mix_forecast ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_wms_box_mix_forecast ON wms_box_mix_forecast;
CREATE POLICY anon_select_wms_box_mix_forecast
  ON wms_box_mix_forecast FOR SELECT TO anon USING (true);
