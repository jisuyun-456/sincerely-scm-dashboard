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

const COLOR_WMS  = "hsl(160,50%,45%)";
const CAPA_LIMIT = 50; // WAREHOUSE_INBOUND_CBM

type DailyRow = {
  date: string;
  inbound_cbm: number;
  inbound_count: number;
};

type ChartRow = DailyRow & { date: string };

export function WmsCbmDailyTrend() {
  const [rows, setRows] = useState<DailyRow[] | "loading" | null>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const { data, error } = await supabase
        .from("wms_cbm_daily")
        .select("date, inbound_cbm, inbound_count")
        .gte("date", cutoff.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      if (cancelled) return;
      if (error) { setRows(null); return; }
      setRows((data as DailyRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const chartData: ChartRow[] = Array.isArray(rows)
    ? rows.map(r => ({ ...r, date: r.date.slice(5) }))
    : [];

  return (
    <Card>
      <SectionHeader title="일별 입하 CBM" meta="최근 14일" />
      <div className="px-4 py-4">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-smoke">데이터 없음 — sync 후 확인</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}㎥`}
              />
              <Tooltip
                formatter={(value: number, _name: string, props: { payload?: ChartRow }) => [
                  `${value.toFixed(3)}㎥ · ${props.payload?.inbound_count ?? 0}건`,
                  "입하 CBM",
                ]}
              />
              <ReferenceLine
                y={CAPA_LIMIT}
                stroke="hsl(11,60%,47%)"
                strokeDasharray="4 3"
                label={{ value: `${CAPA_LIMIT}㎥ 기준`, fontSize: 9, fill: "hsl(11,60%,47%)" }}
              />
              <Bar dataKey="inbound_cbm" name="입하 CBM" fill={COLOR_WMS} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
