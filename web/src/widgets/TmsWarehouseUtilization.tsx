import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { usePipelineData } from "@/hooks/usePipelineData";

function utilizationColor(pct: number): string {
  if (pct >= 80) return "text-green-700";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

function utilizationBarColor(pct: number): string {
  if (pct >= 80) return "#16a34a";
  if (pct >= 50) return "#d97706";
  return "#dc2626";
}

function utilizationLabel(pct: number): string {
  if (pct >= 80) return "정상";
  if (pct >= 50) return "주의";
  return "저조";
}

function utilizationBadgeClass(pct: number): string {
  if (pct >= 80) return "bg-green-100 text-green-800";
  if (pct >= 50) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

function deltaLabel(delta: number): string {
  if (Math.abs(delta) < 0.05) return "→ 전주 동일";
  const sign = delta > 0 ? "↑" : "↓";
  return `${sign}${Math.abs(delta).toFixed(1)}p 전주比`;
}

export function TmsWarehouseUtilization() {
  const { latest, loading, error } = usePipelineData(4);

  if (loading)
    return (
      <Card>
        <SectionHeader title="에이원 출고 창고 가동률" />
        <div className="px-4 py-8 text-center text-sm text-smoke">
          Pipeline 데이터 로드 중…
        </div>
      </Card>
    );
  if (error || !latest)
    return (
      <Card>
        <SectionHeader title="에이원 출고 창고 가동률" />
        <div className="px-4 py-6 text-center text-sm text-red-500">
          데이터 없음
        </div>
      </Card>
    );

  const { shipment, weekly, period, generated_at } = latest;
  const { a1_utilization } = shipment;
  const capacity = a1_utilization.capacity;

  const currentPct = a1_utilization.pct;
  const prevPct = weekly.prev_week?.a1_utilization?.pct ?? null;
  const delta = prevPct !== null ? currentPct - prevPct : null;

  const nextCbm = weekly.next_week?.summary?.total_cbm ?? 0;
  const forecastPct = capacity > 0 && nextCbm > 0
    ? parseFloat(((nextCbm / capacity) * 100).toFixed(1))
    : null;

  const trend = weekly.trend ?? [];
  const trendData = trend.map((w) => ({
    week: w.week,
    pct: capacity > 0 ? parseFloat(((w.cbm / capacity) * 100).toFixed(1)) : 0,
    type: "actual" as const,
  }));

  const chartData: { week: string; pct: number; type: "actual" | "forecast" }[] = [
    ...trendData,
    ...(forecastPct !== null
      ? [{ week: "다음주\n(예상)", pct: forecastPct, type: "forecast" as const }]
      : []),
  ];

  const metaLabel = `${period.label} · ${generated_at.slice(0, 10)} 생성`;

  return (
    <Card>
      <SectionHeader title="에이원 출고 창고 가동률" meta={metaLabel} />
      <div className="px-4 py-3 space-y-4">
        {/* KPI 듀얼 카드 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 이번주 현황 */}
          <div className="rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <p className="text-xs text-smoke mb-2">이번주 현황</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-semibold leading-none ${utilizationColor(currentPct)}`}>
                {currentPct.toFixed(1)}
              </span>
              <span className="text-sm text-smoke">%</span>
              <span className={`ml-auto inline-block rounded px-1.5 py-0.5 text-xs font-medium ${utilizationBadgeClass(currentPct)}`}>
                {utilizationLabel(currentPct)}
              </span>
            </div>
            {/* 프로그레스 바 */}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-divider/40">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(currentPct, 100)}%`,
                  backgroundColor: utilizationBarColor(currentPct),
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-smoke">
              <span>{a1_utilization.total_cbm.toFixed(1)} / {capacity}m³</span>
              {delta !== null && (
                <span className={delta >= 0 ? "text-green-700" : "text-red-500"}>
                  {deltaLabel(delta)}
                </span>
              )}
            </div>
          </div>

          {/* 다음주 예상 */}
          <div className="rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <p className="text-xs text-smoke mb-2">다음주 예상</p>
            {forecastPct !== null ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-semibold leading-none ${utilizationColor(forecastPct)}`}>
                    {forecastPct.toFixed(1)}
                  </span>
                  <span className="text-sm text-smoke">%</span>
                  <span className={`ml-auto inline-block rounded px-1.5 py-0.5 text-xs font-medium ${utilizationBadgeClass(forecastPct)}`}>
                    {utilizationLabel(forecastPct)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-divider/40">
                  <div
                    className="h-full rounded-full transition-all opacity-60"
                    style={{
                      width: `${Math.min(forecastPct, 100)}%`,
                      backgroundColor: utilizationBarColor(forecastPct),
                    }}
                  />
                </div>
                <div className="mt-1.5 text-xs text-smoke">
                  {nextCbm.toFixed(1)} / {capacity}m³ · 예정 기준
                </div>
              </>
            ) : (
              <div className="flex h-16 items-center justify-center text-sm text-smoke">
                예정 출하 없음
              </div>
            )}
          </div>
        </div>

        {/* 추이 바 차트 */}
        {chartData.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
              최근 {trendData.length}주 추이{forecastPct !== null ? " + 다음주 예상" : ""}
            </p>
            <div className="rounded-lg border border-divider/70 bg-surface p-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 120]}
                    tick={{ fontSize: 11 }}
                    unit="%"
                    width={40}
                  />
                  <Tooltip
                    formatter={(v: number, _name: string, props: { payload?: { type?: string } }) => [
                      `${v.toFixed(1)}%`,
                      props.payload?.type === "forecast" ? "예상 가동률" : "가동률",
                    ]}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#6b7280"
                    strokeDasharray="4 2"
                    label={{ value: "목표 80%", position: "right", fontSize: 10, fill: "#6b7280" }}
                  />
                  <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.type === "forecast" ? "#D4A091" : "#99462a"}
                        fillOpacity={entry.type === "forecast" ? 0.7 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-1 flex items-center gap-4 text-xs text-smoke">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#99462a" }} />
                  실적
                </span>
                {forecastPct !== null && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-3 rounded-sm opacity-70" style={{ backgroundColor: "#D4A091" }} />
                    예상
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
