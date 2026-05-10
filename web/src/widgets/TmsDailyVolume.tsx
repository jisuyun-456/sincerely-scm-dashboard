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
  Legend,
} from "recharts";

// crail: hsl(11,60%,47%) — smoke: hsl(25,6%,39%)
const COLOR_CRAIL = "hsl(11,60%,47%)";
const COLOR_SMOKE = "hsl(25,6%,39%)";

type VolumeRow = {
  date: string;
  sent_count: number;
  delivered_count: number;
  pending_count: number;
};

export function TmsDailyVolume() {
  const [rows, setRows] = useState<VolumeRow[] | "loading" | null>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const { data, error } = await supabase
        .from("tms_daily_volume")
        .select("date, sent_count, delivered_count, pending_count")
        .gte("date", cutoff.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      if (cancelled) return;
      if (error) { setRows(null); return; }
      setRows((data as VolumeRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const chartData = Array.isArray(rows)
    ? rows.map(r => ({ ...r, date: r.date.slice(5) }))
    : [];

  return (
    <Card>
      <SectionHeader title="일별 출하량" meta="최근 14일" />
      <div className="px-4 py-4">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-smoke">데이터 없음 — sync 후 확인</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="delivered_count" name="배송완료" fill={COLOR_CRAIL} stackId="a" />
              <Bar dataKey="pending_count" name="배송중/출하" fill={COLOR_SMOKE} radius={[2, 2, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
