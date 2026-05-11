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
  completed: number;
  unconfirmed: number;
  completion_rate: number;
}

export interface PipelineQcSummary {
  qc_cnt: number;
  total_defect: number;
  defect_rate: number;
  target_met: boolean;
}

export interface PipelineQcIssue {
  total_cnt: number;
  issue_cnt: number;
  cat_counts: Record<string, number>;
}

export interface PipelineShipmentSummary {
  total_cbm: number;
  total_count: number;
  completed: number;
  pending: number;
  cost: number;
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

export interface PipelineData {
  generated_at: string;
  report_mode: string;
  period_key: string;
  period: { label: string; start: string; end: string; week_label?: string };
  kpi: PipelineKpi;
  inbound: { summary: PipelineInboundSummary };
  qc: { summary: PipelineQcSummary; issue_summary: PipelineQcIssue };
  material: {
    picking: {
      project: { count: number };
      a1_to_partner: { count: number };
    };
    issues: { total: number };
  };
  shipment: {
    summary: PipelineShipmentSummary;
    confidence: number;
    a1_utilization: PipelineA1Utilization;
    driver_pct: Record<string, number>;
    quality: { missing_rate: number; avg_leadtime_days: number };
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
