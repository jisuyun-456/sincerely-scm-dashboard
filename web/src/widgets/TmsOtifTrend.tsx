import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// crail: hsl(11,60%,47%) — smoke: hsl(25,6%,39%)
const COLOR_CRAIL = "hsl(11,60%,47%)";

type CarrierRow = { snapshot_date: string; otif_pct: number | null };
type DailyAvg = { date: string; avg: number };

function aggregateByDate(rows: CarrierRow[]): DailyAvg[] {
  const byDate = new Map<string, number[]>();
  for (const r of rows) {
    if (r.otif_pct == null) continue;
    if (!byDate.has(r.snapshot_date)) byDate.set(r.snapshot_date, []);
    byDate.get(r.snapshot_date)!.push(r.otif_pct);
  }
  return [...byDate.entries()]
    .map(([d, vals]) => ({
      date: d.slice(5),
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

export function TmsOtifTrend() {
  const [rows, setRows] = useState<CarrierRow[] | "loading" | null>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const { data, error } = await supabase
        .from("tms_carrier_otif")
        .select("snapshot_date, otif_pct")
        .gte("snapshot_date", cutoff.toISOString().slice(0, 10))
        .order("snapshot_date", { ascending: true });
      if (cancelled) return;
      if (error) { setRows(null); return; }
      setRows((data as CarrierRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const chartData = Array.isArray(rows) ? aggregateByDate(rows) : [];

  return (
    <Card>
      <SectionHeader title="완료율 추이" meta="최근 14일 일별 평균" />
      <div className="px-4 py-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-smoke">데이터 없음 — sync 후 확인</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v}%`, "평균 완료율"]} />
              <ReferenceLine y={95} stroke="#9B9691" strokeDasharray="3 3" />
              <Bar dataKey="avg" fill={COLOR_CRAIL} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
