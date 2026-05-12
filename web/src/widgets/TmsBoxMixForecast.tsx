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
  Cell,
} from "recharts";

type ForecastRow = {
  forecast_date: string;
  box_category: string;
  predicted_qty: number;
  avg_qty_14d: number;
  source_days: number;
  generated_at: string;
};

const CATEGORY_ORDER = ["특대", "중대", "대", "중", "소"];

const CATEGORY_COLORS: Record<string, string> = {
  특대: "hsl(11,65%,40%)",
  중대: "hsl(11,60%,52%)",
  대:   "hsl(25,55%,55%)",
  중:   "hsl(40,45%,55%)",
  소:   "hsl(25,15%,55%)",
};

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} (${weekday})`;
}

export function TmsBoxMixForecast() {
  const [rows, setRows] = useState<ForecastRow[] | "loading" | null>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: latest, error: e1 } = await supabase
        .from("tms_box_mix_forecast")
        .select("forecast_date")
        .order("forecast_date", { ascending: false })
        .limit(1)
        .single();
      if (cancelled) return;
      if (e1 || !latest) { setRows(null); return; }
      const latestRow = latest as { forecast_date: string };

      const { data, error } = await supabase
        .from("tms_box_mix_forecast")
        .select("forecast_date, box_category, predicted_qty, avg_qty_14d, source_days, generated_at")
        .eq("forecast_date", latestRow.forecast_date);
      if (cancelled) return;
      if (error) { setRows(null); return; }
      setRows((data as ForecastRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";

  if (loading) {
    return (
      <Card>
        <SectionHeader title="내일 박스 수요 예측" meta="TMS 출하 14일 기반" />
        <div className="px-4 py-4">
          <Skeleton className="h-48 w-full" />
        </div>
      </Card>
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <Card>
        <SectionHeader title="내일 박스 수요 예측" meta="TMS 출하 14일 기반" />
        <div className="px-4 py-10 text-center text-sm text-smoke">
          데이터 없음 — sync 후 확인
        </div>
      </Card>
    );
  }

  const forecastDate = rows[0].forecast_date;
  const sourceDays = rows[0].source_days;
  const totalPredicted = rows.reduce((acc, r) => acc + r.predicted_qty, 0);
  const meta = `${formatDateLabel(forecastDate)} 예상 · ${sourceDays}일 기반`;

  // Sort by canonical category order, drop zero rows
  const chartData = CATEGORY_ORDER
    .map((cat) => rows.find((r) => r.box_category === cat))
    .filter((r): r is ForecastRow => !!r)
    .map((r) => ({
      category: r.box_category,
      predicted_qty: r.predicted_qty,
      avg_qty_14d: r.avg_qty_14d,
    }));

  return (
    <Card>
      <SectionHeader title="내일 박스 수요 예측" meta={meta} />
      <div className="px-4 py-3">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-3xl font-semibold leading-none text-crail">
            {totalPredicted}
          </span>
          <span className="text-sm text-smoke">박스 예상</span>
        </div>

        {totalPredicted === 0 ? (
          <p className="py-6 text-center text-sm text-smoke">
            과거 14일 박스 데이터 부족 — sync 후 다시 확인
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 4 }}>
                <XAxis dataKey="category" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false}
                       tickFormatter={(v: number) => `${v}`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "예상 수량"
                      ? [`${value}박스`, name]
                      : [`${value.toFixed(1)}박스/일`, name]
                  }
                />
                <Bar dataKey="predicted_qty" name="예상 수량" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={CATEGORY_COLORS[entry.category] ?? "hsl(25,6%,39%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-2 grid grid-cols-5 gap-1 text-center text-xs">
              {chartData.map((r) => (
                <div key={r.category} className="rounded border border-divider/60 bg-sand px-1 py-1.5">
                  <div className="text-[10px] text-smoke">{r.category}</div>
                  <div className="font-semibold tabular-nums">{r.predicted_qty}</div>
                  <div className="text-[9px] text-smoke tabular-nums">
                    avg {r.avg_qty_14d.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
