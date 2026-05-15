-- Migration: WMS CBM tables
-- Apply via Supabase Dashboard → SQL Editor → Run

CREATE TABLE IF NOT EXISTS wms_cbm_daily (
  date           DATE         PRIMARY KEY,
  inbound_cbm    NUMERIC(8,4) NOT NULL DEFAULT 0,
  inbound_count  INT          NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wms_cbm_daily_date ON wms_cbm_daily (date DESC);
ALTER TABLE wms_cbm_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_wms_cbm_daily ON wms_cbm_daily;
CREATE POLICY anon_select_wms_cbm_daily ON wms_cbm_daily FOR SELECT TO anon USING (true);

CREATE TABLE IF NOT EXISTS wms_cbm_balance (
  snapshot_date      DATE         PRIMARY KEY,
  ytd_inbound_cbm    NUMERIC(8,4) NOT NULL DEFAULT 0,
  ytd_outbound_cbm   NUMERIC(8,4) NOT NULL DEFAULT 0,
  net_stock_cbm      NUMERIC(8,4) NOT NULL DEFAULT 0,
  utilization_pct    NUMERIC(5,1) NOT NULL DEFAULT 0,
  available_cbm      NUMERIC(8,4) NOT NULL DEFAULT 0,
  inbound_headroom   NUMERIC(8,4) NOT NULL DEFAULT 0,
  capacity_inbound   NUMERIC(6,1) NOT NULL DEFAULT 50.0,
  capacity_outbound  NUMERIC(6,1) NOT NULL DEFAULT 44.0,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE wms_cbm_balance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_wms_cbm_balance ON wms_cbm_balance;
CREATE POLICY anon_select_wms_cbm_balance ON wms_cbm_balance FOR SELECT TO anon USING (true);
