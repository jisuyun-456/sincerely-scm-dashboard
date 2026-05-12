-- TMS Box-Mix Forecast schema migration — 2026-05-13
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Idempotent: safe to re-run
--
-- 내일 필요 박스명칭별(특대/중대/대/중/소) 예상 수량.
-- 소스: TMS Shipment 최종 외박스 수량 값 (PNA 고객납품건).
-- 작성: 매일 sync_tms_box_mix.py 가 upsert.
--
-- 이전 명 wms_box_mix_forecast 가 이미 적용돼 있으면 그대로 rename.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wms_box_mix_forecast'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tms_box_mix_forecast'
  ) THEN
    ALTER TABLE wms_box_mix_forecast RENAME TO tms_box_mix_forecast;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tms_box_mix_forecast (
  forecast_date  DATE           NOT NULL,
  box_category   TEXT           NOT NULL,  -- 특대 | 중대 | 대 | 중 | 소
  predicted_qty  INT            NOT NULL DEFAULT 0,
  avg_qty_14d    NUMERIC(8,2)   NOT NULL DEFAULT 0,
  source_days    INT            NOT NULL DEFAULT 0,
  generated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (forecast_date, box_category)
);

-- 옛 인덱스가 있으면 정리
DROP INDEX IF EXISTS idx_wms_box_mix_forecast_date;
DROP INDEX IF EXISTS idx_wms_box_mix_date;

CREATE INDEX IF NOT EXISTS idx_tms_box_mix_date
  ON tms_box_mix_forecast (forecast_date DESC);

ALTER TABLE tms_box_mix_forecast ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_wms_box_mix_forecast ON tms_box_mix_forecast;
DROP POLICY IF EXISTS anon_select_tms_box_mix_forecast ON tms_box_mix_forecast;
CREATE POLICY anon_select_tms_box_mix_forecast
  ON tms_box_mix_forecast FOR SELECT TO anon USING (true);
