import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Row = {
  period_key: string;
  domain: string;
  report_mode: string | null;
  period_start: string | null;
  period_label: string | null;
  kpis: Record<string, number | null>;
};

type SeriesKey = "completion_rate" | "defect_rate" | "picking_total";

interface SeriesDef {
  key: SeriesKey;
  label: string;
  color: string;
  unit: string;
  yAxis: "left" | "right";
}

const SERIES: SeriesDef[] = [
  { key: "completion_rate", label: "COMPLETION", color: "#FF8C42", unit: "%", yAxis: "left" },
  { key: "defect_rate", label: "DEFECT", color: "#FBBF24", unit: "%", yAxis: "left" },
];

function shortLabel(row: Row): string {
  // "2026-W18_review" → "W18"
  const m = row.period_key.match(/W(\d{2})/);
  if (m) return `W${m[1]}`;
  if (row.period_start) {
    return row.period_start.slice(5);
  }
  return row.period_key.slice(0, 8);
}

export function AutoResearchTrend() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("autoresearch_trend")
        .select(
          "period_key, domain, report_mode, period_start, period_label, kpis",
        )
        .eq("report_mode", "weekly_review")
        .order("period_start", { ascending: true })
        .limit(12);
      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setRows((data ?? []) as Row[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(() => {
    if (!rows) return [];
    return rows.map((r) => ({
      label: shortLabel(r),
      completion_rate: r.kpis?.completion_rate ?? null,
      defect_rate: r.kpis?.defect_rate ?? null,
      picking_total: r.kpis?.picking_total ?? null,
    }));
  }, [rows]);

  const meta = rows ? `${rows.length}W · WMS` : "LOADING";

  return (
    <Card className="min-h-[260px]">
      <SectionHeader title="AUTORESEARCH · KPI TREND" meta={meta} />
      <div className="px-2 py-3">
        {rows === null ? (
          <div className="space-y-3 px-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-xs text-destructive">⚠ {error}</div>
        ) : chartData.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wide text-zinc-600">
            ○ NO TREND DATA YET — RUN sync.yml
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-4 px-3 text-[10px] uppercase tracking-wide text-zinc-500">
              {SERIES.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-[2px] w-3"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-zinc-400">{s.label}</span>
                  <span className="text-zinc-700">{s.unit}</span>
                </span>
              ))}
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 12, bottom: 5, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="#262626"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#52525b"
                    fontSize={10}
                    tick={{ fill: "#71717a" }}
                    tickLine={false}
                    axisLine={{ stroke: "#262626" }}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={10}
                    tick={{ fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0a",
                      border: "1px solid #262626",
                      borderRadius: 2,
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      color: "#e4e4e7",
                    }}
                    cursor={{ stroke: "#404040", strokeDasharray: "2 2" }}
                  />
                  {SERIES.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={s.color}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3, fill: s.color }}
                      isAnimationActive={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
