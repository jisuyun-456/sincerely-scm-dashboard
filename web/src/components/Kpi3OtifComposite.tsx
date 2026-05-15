import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLOR_CRAIL = "hsl(11,60%,47%)";
const COLOR_BLUE = "hsl(200,70%,45%)";

type ProductivityRow = { week_id: string; count_per_fte: number | null };
type KpiRow = { snapshot_date: string; otif_pct: number | null };
type CompositeRow = { week: string; count_per_fte: number | null; otif_pct: number | null };

/** Aggregate daily tms_kpi rows into weekly OTIF averages. */
function buildComposite(
  prodRows: ProductivityRow[],
  kpiRows: KpiRow[],
): CompositeRow[] {
  // Map week_id → avg otif_pct from daily tms_kpi rows
  const weekOtif = new Map<string, number[]>();
  for (const r of kpiRows) {
    if (r.otif_pct == null) continue;
    try {
      const d = new Date(r.snapshot_date);
      // ISO week: JS getDay() is 0=Sun, need Mon-based week
      const day = d.getDay() === 0 ? 7 : d.getDay();
      const thursday = new Date(d);
      thursday.setDate(d.getDate() + 4 - day);
      const yearStart = new Date(thursday.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
      );
      const wid = `${thursday.getFullYear()}-W${String(week).padStart(2, "0")}`;
      if (!weekOtif.has(wid)) weekOtif.set(wid, []);
      weekOtif.get(wid)!.push(r.otif_pct);
    } catch {
      // skip malformed dates
    }
  }

  return prodRows
    .map((p) => {
      const vals = weekOtif.get(p.week_id);
      const otif =
        vals && vals.length > 0
          ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
          : null;
      return {
        week: p.week_id.replace(/(\d{4})-W(\d+)/, "$1-W$2"),
        count_per_fte: p.count_per_fte,
        otif_pct: otif,
      };
    })
    .reverse(); // ascending for chart
}

interface Props {
  prodRows: ProductivityRow[];
  kpiRows: KpiRow[];
  loading: boolean;
}

export function Kpi3OtifComposite({ prodRows, kpiRows, loading }: Props) {
  const chartData = loading ? [] : buildComposite(prodRows, kpiRows);

  return (
    <Card>
      <SectionHeader
        title="처리건수/FTE + OTIF 복합 추이"
        meta="주간 · 최근 26주"
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
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: 36, left: -20, bottom: 0 }}
            >
              <XAxis dataKey="week" tick={{ fontSize: 9 }} tickLine={false} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10 }}
                tickLine={false}
                label={{
                  value: "건/FTE",
                  angle: -90,
                  position: "insideLeft",
                  offset: 16,
                  style: { fontSize: 9 },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "OTIF(%)" ? `${value}%` : value
                }
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="left"
                dataKey="count_per_fte"
                name="처리건수/FTE"
                fill={COLOR_CRAIL}
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="otif_pct"
                name="OTIF(%)"
                stroke={COLOR_BLUE}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
