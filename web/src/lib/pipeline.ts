const BASE = "https://jisuyun-456.github.io/sincerely-scm-pipeline";

export interface PipelineKpi {
  completion_rate: number;
  defect_rate: number;
  picking_total: number;
  issue_total: number;
}

export interface PipelineInboundSummary {
  total_cnt: number;
  total_in_qty: number;
  total_stock_qty: number;
  completed: number;
  unconfirmed: number;
  completion_rate: number;
}

export interface PipelineQcSummary {
  qc_cnt: number;
  total_qc_qty: number;
  sample_rate: number;
  actual_qc_cnt: number;
  total_defect: number;
  defect_rate: number;
  target_met: boolean;
}

export interface PipelineShipmentSummary {
  total_cbm: number;
  total_count: number;
  completed: number;
  pending: number;
  cost: number;
  revenue: number;
  profit: number;
  cbm_per_shipment: number;
  cbm_unit_cost: number;
}

export interface PipelineA1Utilization {
  total_cbm: number;
  capacity: number;
  pct: number;
}

export interface PipelineTrendPoint {
  week: string;
  cbm: number;
  cost: number;
  count: number;
}

export interface PipelineNextWeek {
  summary: { total_count: number; pending: number; total_cbm: number };
  by_date: Record<string, { cnt: number; pending: number }>;
}

export interface PipelineBoxType {
  counts: Record<string, number>;
  pct: Record<string, number>;
  total: number;
}

export interface PipelinePartner {
  name: string;
  cnt: number;
  cbm: number;
}

export interface PipelineTopItem {
  name: string;
  qty: number;
  cbm: number;
}

export interface PipelineQuality {
  total_records?: number;
  missing_box_qty: number;
  missing_rate: number;
  same_day_create: number;
  same_day_rate: number;
  avg_leadtime_days: number;
}

export interface PipelineCbmSources {
  manual: number;
  product_match: number;
  box_parse: number;
  unmatched: number;
}

export interface PipelineDriverWorkDays {
  count: number;
  dates: string[];
  labels: string[];
}

export interface PipelineByDateShipment {
  cnt: number;
  cbm: number;
  completed: number;
  pending: number;
  revenue: number;
  cost: number;
}

export interface PipelineData {
  generated_at: string;
  report_mode: string;
  period_key: string;
  period: { label: string; start: string; end: string; week_label?: string };
  kpi: PipelineKpi;
  inbound: {
    summary: PipelineInboundSummary;
    by_date: Record<string, { cnt: number; in_qty: number }>;
    by_purpose: Record<string, { cnt: number; qty: number }>;
    not_recv_by_partner: Record<string, number>;
  };
  qc: {
    summary: PipelineQcSummary;
    result_dist: Record<string, number>;
    defect_by_item: { name: string; qc_qty: number; defect: number; defect_rate: number }[];
    issue_summary: {
      total_cnt: number;
      issue_cnt: number;
      cat_counts: Record<string, number>;
    };
  };
  material: {
    picking: {
      project: { count: number; by_date: Record<string, number> };
      a1_to_partner: { count: number; by_date: Record<string, number> };
    };
    issues: { total: number; by_type: Record<string, number>; usage_total: number };
    usage: { cumulative_2026: number };
  };
  shipment: {
    summary: PipelineShipmentSummary;
    by_date: Record<string, PipelineByDateShipment>;
    box_type: PipelineBoxType;
    top_items: PipelineTopItem[];
    partners: PipelinePartner[];
    driver_daily: Record<string, Record<string, number>>;
    driver_weekly: Record<string, number>;
    driver_weekly_max: Record<string, number>;
    driver_pct: Record<string, number>;
    driver_work_days: Record<string, PipelineDriverWorkDays>;
    quality: PipelineQuality;
    confidence: number;
    cbm_sources: PipelineCbmSources;
    a1_utilization: PipelineA1Utilization;
  };
  weekly: {
    trend: PipelineTrendPoint[];
    next_week: PipelineNextWeek;
    prev_week: {
      a1_utilization: PipelineA1Utilization;
      driver_pct: Record<string, number>;
    };
  };
}

export interface PipelinePeriodMeta {
  key: string;
  label: string;
  mode: string;
  mode_label: string;
  generated_at: string;
  file: string;
}

export async function fetchLatestPipeline(): Promise<PipelineData> {
  const res = await fetch(`${BASE}/pages_data.json`);
  if (!res.ok) throw new Error(`Pipeline fetch failed: ${res.status}`);
  return res.json() as Promise<PipelineData>;
}

export async function fetchPipelineHistory(): Promise<PipelinePeriodMeta[]> {
  const res = await fetch(`${BASE}/history/index.json`);
  if (!res.ok) throw new Error(`History index fetch failed: ${res.status}`);
  const data = (await res.json()) as { periods: PipelinePeriodMeta[] };
  return data.periods;
}

export async function fetchPipelinePeriod(
  periodKey: string
): Promise<PipelineData> {
  const res = await fetch(`${BASE}/history/${periodKey}.json`);
  if (!res.ok) throw new Error(`Period fetch failed: ${res.status}`);
  return res.json() as Promise<PipelineData>;
}
