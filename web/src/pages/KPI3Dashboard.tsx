import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { Kpi3OtifComposite } from "@/components/Kpi3OtifComposite";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

const COLOR_CRAIL = "hsl(11,60%,47%)";
const COLOR_TARGET = "hsl(25,6%,39%)";

type ProductivityRow = {
  week_id: string;
  shipment_count: number;
  fte: number;
  count_per_fte: number | null;
};

type KpiRow = { snapshot_date: string; otif_pct: number | null };

/** Compute baseline as avg of first 4 weeks (ascending), then target = baseline * 1.5. */
function computeTarget(rows: ProductivityRow[]): number | null {
  const ascending = [...rows].sort((a, b) => a.week_id.localeCompare(b.week_id));
  const first4 = ascending.slice(0, 4).filter((r) => r.count_per_fte != null);
  if (first4.length === 0) return null;
  const avg =
    first4.reduce((s, r) => s + (r.count_per_fte ?? 0), 0) / first4.length;
  return Math.round(avg * 1.5 * 10) / 10;
}

/** Chart renders rows descending from API → flip to ascending for x-axis. */
function toChartData(rows: ProductivityRow[]) {
  return [...rows]
    .sort((a, b) => a.week_id.localeCompare(b.week_id))
    .map((r) => ({
      week: r.week_id.replace(/(\d{4})-W(\d+)/, "W$2"),
      count_per_fte: r.count_per_fte,
      week_id: r.week_id,
    }));
}

export function KPI3Dashboard() {
  const [prodRows, setProdRows] = useState<ProductivityRow[] | "loading" | null>(
    "loading",
  );
  const [kpiRows, setKpiRows] = useState<KpiRow[]>([]);
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("kpi3_productivity")
        .select("week_id, shipment_count, fte, count_per_fte")
        .order("week_id", { ascending: false })
        .limit(26);
      if (cancelled) return;
      if (error) { setProdRows(null); return; }
      setProdRows((data as ProductivityRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tms_kpi")
        .select("snapshot_date, otif_pct")
        .order("snapshot_date", { ascending: false })
        .limit(200);
      if (cancelled) return;
      setKpiRows((data as KpiRow[]) ?? []);
      setKpiLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = prodRows === "loading";
  const rows = Array.isArray(prodRows) ? prodRows : [];
  const chartData = loading ? [] : toChartData(rows);
  const target = loading ? null : computeTarget(rows);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-medium text-ink">
          KPI-3 처리건수/FTE
        </h1>
        <span className="text-xs text-smoke">TMS Ops 7 FTE · 주간 · 최근 26주</span>
      </div>

      {/* Monthly trend chart */}
      <Card>
        <SectionHeader
          title="주간 처리건수/FTE 추이"
          meta={target != null ? `목표 ${target} 건/FTE` : "최근 26주"}
        />
        <div className="px-4 py-4">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-smoke">
              데이터 없음 — sync 후 확인
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="week" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [`${v}`, "건/FTE"]}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {target != null && (
                  <ReferenceLine
                    y={target}
                    stroke={COLOR_TARGET}
                    strokeDasharray="4 3"
                    label={{
                      value: `목표 ${target}`,
                      position: "insideTopRight",
                      style: { fontSize: 9, fill: COLOR_TARGET },
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="count_per_fte"
                  name="처리건수/FTE"
                  stroke={COLOR_CRAIL}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* FTE table */}
      <Kpi3FteTable rows={rows} loading={loading} />

      {/* OTIF composite */}
      <Kpi3OtifComposite
        prodRows={rows}
        kpiRows={kpiRows}
        loading={loading || kpiLoading}
      />
    </div>
  );
}

function Kpi3FteTable({
  rows,
  loading,
}: {
  rows: ProductivityRow[];
  loading: boolean;
}) {
  const sorted = [...rows].sort((a, b) => b.week_id.localeCompare(a.week_id));
  return (
    <Card>
      <SectionHeader title="주간 처리건수 상세" meta="최근 26주" />
      <div className="overflow-x-auto px-0 py-0">
        {loading ? (
          <Skeleton className="m-4 h-32 w-[calc(100%-2rem)]" />
        ) : sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-smoke">데이터 없음</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider/70 text-xs text-smoke">
                <th className="px-6 py-2 text-left font-medium">주차</th>
                <th className="px-6 py-2 text-right font-medium">처리건수</th>
                <th className="px-6 py-2 text-right font-medium">FTE</th>
                <th className="px-6 py-2 text-right font-medium">건/FTE</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={r.week_id}
                  className="border-b border-divider/40 last:border-0 hover:bg-divider/20"
                >
                  <td className="px-6 py-2 font-mono text-xs text-ink">
                    {r.week_id}
                  </td>
                  <td className="px-6 py-2 text-right tnum">{r.shipment_count}</td>
                  <td className="px-6 py-2 text-right tnum text-smoke">{r.fte}</td>
                  <td className="px-6 py-2 text-right font-medium tnum">
                    {r.count_per_fte != null ? r.count_per_fte.toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
