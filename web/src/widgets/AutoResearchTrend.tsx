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

interface SeriesDef {
  key: "completion_rate" | "defect_rate";
  label: string;
  color: string;
  unit: string;
}

const SERIES: SeriesDef[] = [
  { key: "completion_rate", label: "Completion", color: "#CC4125", unit: "%" },
  { key: "defect_rate", label: "Defect", color: "#A85928", unit: "%" },
];

function shortLabel(row: Row): string {
  const m = row.period_key.match(/W(\d{2})/);
  if (m) return `W${m[1]}`;
  if (row.period_start) return row.period_start.slice(5);
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
      if (error) setError(error.message);
      else setRows((data ?? []) as Row[]);
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
    }));
  }, [rows]);

  const meta = rows ? `${rows.length} weeks · WMS` : "Loading";

  return (
    <Card>
      <SectionHeader title="AutoResearch · KPI Trend" meta={meta} />
      <div className="px-4 pt-4 pb-2">
        {rows === null ? (
          <div className="space-y-3 px-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-destructive">⚠ {error}</div>
        ) : chartData.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-smoke">
            No trend data yet — run sync.yml.
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-5 px-3 text-xs text-smoke">
              {SERIES.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-[2px] w-4"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-ink">{s.label}</span>
                  <span className="text-smoke/70">{s.unit}</span>
                </span>
              ))}
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 5"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                    cursor={{
                      stroke: "hsl(var(--border))",
                      strokeDasharray: "2 2",
                    }}
                  />
                  {SERIES.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={s.color}
                      strokeWidth={1.75}
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
