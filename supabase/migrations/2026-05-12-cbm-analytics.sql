-- CBM Analytics schema migration — 2026-05-12
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Idempotent: safe to re-run

-- ============================================================
-- 1. Extend tms_daily_volume with total_cbm
-- ============================================================
ALTER TABLE tms_daily_volume ADD COLUMN IF NOT EXISTS total_cbm NUMERIC(8,3) NOT NULL DEFAULT 0;

-- ============================================================
-- 2. tms_carrier_capacity — 기사별 차량 적재 용량 마스터
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

-- Seed: confirmed capacity values (2026-05-12, user confirmed)
INSERT INTO tms_carrier_capacity (partner_name, vehicle_type, capacity_m3)
VALUES
  ('박종성', '2.5t', 9.5),
  ('이장훈', '1t',   7.6),
  ('조희선', '1t',   7.6)
ON CONFLICT (partner_name) DO UPDATE SET
  capacity_m3  = EXCLUDED.capacity_m3,
  vehicle_type = EXCLUDED.vehicle_type;

-- ============================================================
-- 3. tms_truck_load_today — hourly carrier load snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_truck_load_today (
  snapshot_at      TIMESTAMPTZ NOT NULL,
  partner_name     TEXT        NOT NULL,
  loaded_m3        NUMERIC(8,3) NOT NULL DEFAULT 0,
  capacity_m3      NUMERIC(6,2) NOT NULL,
  utilization_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'green', -- green | yellow | red
  shipment_count   INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (snapshot_at, partner_name)
);
CREATE INDEX IF NOT EXISTS idx_tms_truck_load_snap
  ON tms_truck_load_today (snapshot_at DESC);
ALTER TABLE tms_truck_load_today ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_truck_load_today ON tms_truck_load_today;
CREATE POLICY anon_select_tms_truck_load_today
  ON tms_truck_load_today FOR SELECT TO anon USING (true);

-- ============================================================
-- 4. tms_cbm_abc_weekly — weekly CBM ABC pareto
-- ============================================================
CREATE TABLE IF NOT EXISTS tms_cbm_abc_weekly (
  week_start      DATE NOT NULL,
  rank            INT  NOT NULL,
  product_code    TEXT NOT NULL,
  product_name    TEXT,
  total_cbm       NUMERIC(8,3),
  cumulative_pct  NUMERIC(5,2),
  PRIMARY KEY (week_start, rank)
);
CREATE INDEX IF NOT EXISTS idx_tms_cbm_abc_week
  ON tms_cbm_abc_weekly (week_start DESC);
ALTER TABLE tms_cbm_abc_weekly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tms_cbm_abc_weekly ON tms_cbm_abc_weekly;
CREATE POLICY anon_select_tms_cbm_abc_weekly
  ON tms_cbm_abc_weekly FOR SELECT TO anon USING (true);
