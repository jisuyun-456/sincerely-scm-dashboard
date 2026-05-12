import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLOR_BAR = "hsl(11,60%,47%)";
const COLOR_LINE = "hsl(200,70%,45%)";

type AbcRow = {
  rank: number;
  product_name: string;
  total_cbm: number;
  cumulative_pct: number;
};

export function TmsCbmAbc() {
  const [rows, setRows] = useState<AbcRow[] | "loading" | null>("loading");
  const [weekStart, setWeekStart] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Get latest week_start
      const { data: latest, error: e1 } = await supabase
        .from("tms_cbm_abc_weekly")
        .select("week_start")
        .order("week_start", { ascending: false })
        .limit(1)
        .single();
      if (cancelled) return;
      if (e1 || !latest) { setRows(null); return; }
      const latestRow = latest as { week_start: string };
      setWeekStart(latestRow.week_start);

      const { data, error } = await supabase
        .from("tms_cbm_abc_weekly")
        .select("rank, product_name, total_cbm, cumulative_pct")
        .eq("week_start", latestRow.week_start)
        .order("rank", { ascending: true });
      if (cancelled) return;
      if (error) { setRows(null); return; }
      setRows((data as AbcRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const chartData = Array.isArray(rows)
    ? rows.map(r => ({
        name: r.product_name.length > 10 ? r.product_name.slice(0, 10) + "…" : r.product_name,
        full_name: r.product_name,
        cbm: r.total_cbm,
        cum_pct: r.cumulative_pct,
      }))
    : [];

  const meta = weekStart ? `기준 주: ${weekStart} / 최근 30일` : "최근 30일";

  return (
    <Card>
      <SectionHeader title="CBM ABC 파레토" meta={meta} />
      <div className="px-4 py-4">
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-smoke">데이터 없음 — sync 후 확인</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 32, left: -24, bottom: 36 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} angle={-35} textAnchor="end" />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false}
                     tickFormatter={(v: number) => `${v}㎥`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false}
                     domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                formatter={(value: number, name: string, props: { payload?: { full_name?: string } }) => {
                  if (name === "CBM(㎥)") return [`${value.toFixed(3)}㎥`, props.payload?.full_name ?? name];
                  return [`${value}%`, "누적 비율"];
                }}
              />
              <Bar yAxisId="left" dataKey="cbm" name="CBM(㎥)" fill={COLOR_BAR} radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cum_pct" name="누적%" stroke={COLOR_LINE}
                    strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
