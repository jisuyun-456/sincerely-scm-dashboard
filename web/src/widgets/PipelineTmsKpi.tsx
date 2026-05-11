import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { usePipelineData } from "@/hooks/usePipelineData";

export function PipelineTmsKpi() {
  const { latest, loading, error } = usePipelineData(4);

  if (loading)
    return (
      <div className="py-8 text-center text-sm text-smoke">
        Pipeline 데이터 로드 중…
      </div>
    );
  if (error)
    return (
      <div className="py-8 text-center text-sm text-red-500">
        Pipeline 오류: {error}
      </div>
    );
  if (!latest) return null;

  const { shipment, weekly, period } = latest;

  const driverPct =
    weekly.prev_week?.driver_pct ?? shipment.driver_pct ?? {};
  const driverEntries = Object.entries(driverPct).sort(
    ([, a], [, b]) => b - a
  );

  const trend = weekly.trend ?? [];

  const nextByDate = Object.entries(weekly.next_week?.by_date ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date: date.slice(5),
      pending: val.pending,
    }));

  const utilizationPct =
    weekly.prev_week?.a1_utilization?.pct ??
    shipment.a1_utilization?.pct ??
    0;
  const utilizationColor =
    utilizationPct >= 80
      ? "text-green-700"
      : utilizationPct >= 50
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-ink">
          TMS Pipeline KPI
        </h2>
        <span className="text-xs text-smoke">
          기준: {period.label} · {latest.generated_at.slice(0, 10)} 생성
        </span>
      </div>

      {/* 현재 */}
      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
          현재
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">총 출하 CBM</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {shipment.summary.total_cbm.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-smoke">m³</span>
            </span>
            <span className="text-xs text-smoke">
              {shipment.summary.total_count}건
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">에이원 창고 가동율</span>
            <span
              className={`text-2xl font-semibold leading-none ${utilizationColor}`}
            >
              {utilizationPct.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-smoke">%</span>
            </span>
            <span className="text-xs text-smoke">capacity 44.4m³</span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">CBM 신뢰도</span>
            <span
              className={`text-2xl font-semibold leading-none ${
                shipment.confidence >= 70
                  ? "text-green-700"
                  : "text-amber-600"
              }`}
            >
              {shipment.confidence.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-smoke">%</span>
            </span>
            <span className="text-xs text-smoke">목표 ≥70%</span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">평균 리드타임</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {shipment.quality.avg_leadtime_days.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-smoke">일</span>
            </span>
            <span className="text-xs text-smoke">등록→출하</span>
          </div>
        </div>
      </section>

      {/* 기사님 달성율 */}
      {driverEntries.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
            기사님 CBM 달성율 (전주 기준)
          </p>
          <div className="space-y-2 rounded-lg border border-divider/70 bg-surface px-4 py-3">
            {driverEntries.map(([name, pct]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-36 truncate text-xs text-smoke">{name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-divider/40">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 80
                        ? "bg-green-600"
                        : pct >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-medium text-ink">
                  {pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 트렌드 */}
      {trend.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
            트렌드 (최근 4주)
          </p>
          <div className="rounded-lg border border-divider/70 bg-surface p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={trend}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  unit="m³"
                  width={44}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                  width={44}
                />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "CBM (m³)"
                      ? [`${v.toFixed(1)} m³`, name]
                      : [`₩${v.toLocaleString()}`, name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="cbm"
                  name="CBM (m³)"
                  fill="#99462a"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="cost"
                  name="물류비 (₩)"
                  fill="#B08934"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 다음주 예정 */}
      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
          다음주 예정 (Airtable 확정 기준)
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <div className="rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <p className="text-xs text-smoke">예정 출하 건수</p>
            <p className="text-2xl font-semibold text-ink">
              {weekly.next_week?.summary.total_count ?? "—"}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </p>
            <p className="text-xs text-smoke">확정 건 기준</p>
          </div>
          {nextByDate.length > 0 && (
            <div className="flex-1 rounded-lg border border-divider/70 bg-surface px-4 py-3">
              <div className="flex flex-wrap gap-4">
                {nextByDate.map(({ date, pending }) => (
                  <div key={date} className="text-center">
                    <p className="text-xs text-smoke">{date}</p>
                    <p className="text-sm font-semibold text-ink">{pending}</p>
                    <p className="text-xs text-smoke">건</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
