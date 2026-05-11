import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type WeeklyKpiRow = {
  period_key: string;
  domain: string;
  period_label: string | null;
  period_start: string | null;
  period_end: string | null;
  kpis: Record<string, number | null>;
  generated_at: string | null;
};

const KPI_LABELS: Record<string, string> = {
  completion_rate: "완료율",
  defect_rate: "불량률",
  picking_total: "피킹 총건",
  issue_total: "이슈 건수",
  otif: "OTIF",
  on_time_rate: "정시율",
  in_full_rate: "완불율",
  active_shipments: "활성 운송",
  pending_pods: "POD 대기",
  otif_pct: "OTIF",
};

function formatKpiValue(key: string, val: number | null): string {
  if (val == null) return "—";
  const pctKeys = ["completion_rate", "defect_rate", "otif", "on_time_rate", "in_full_rate", "otif_pct"];
  if (pctKeys.includes(key)) {
    return val <= 1 ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
  }
  return val.toLocaleString();
}

export function WeeklyKpiSummary({ domain }: { domain: "TMS" | "WMS" }) {
  const [row, setRow] = useState<WeeklyKpiRow | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("autoresearch_trend")
        .select("period_key, domain, period_label, period_start, period_end, kpis, generated_at")
        .eq("domain", domain)
        .order("period_start", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) {
        console.error("WeeklyKpiSummary fetch error:", error);
        setRow(null);
        return;
      }
      setRow((data?.[0] as WeeklyKpiRow | undefined) ?? null);
    })();
    return () => { cancelled = true; };
  }, [domain]);

  const loading = row === "loading";
  const data = row === "loading" ? null : row;
  const kpiEntries = data ? Object.entries(data.kpis) : [];

  return (
    <Card>
      <SectionHeader
        title={`${domain} 주간 KPI`}
        meta={loading ? "Loading" : (data?.period_label ?? "데이터 없음")}
      />
      {loading ? (
        <div className="px-6 pb-6 space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : !data || kpiEntries.length === 0 ? (
        <p className="px-6 py-8 text-sm text-smoke text-center">주간 KPI 없음</p>
      ) : (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {kpiEntries.map(([key, val]) => (
              <div key={key} className="rounded-lg bg-smoke/5 px-3 py-2.5">
                <p className="text-[11px] text-smoke uppercase tracking-wide truncate">
                  {KPI_LABELS[key] ?? key}
                </p>
                <p className="mt-0.5 text-xl font-medium text-ink tnum">
                  {formatKpiValue(key, val)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
