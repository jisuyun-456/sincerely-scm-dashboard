import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { usePipelineData } from "@/hooks/usePipelineData";

function KpiTile({
  label,
  value,
  unit,
  target,
  higherIsBetter,
}: {
  label: string;
  value: number | null;
  unit: string;
  target?: number;
  higherIsBetter: boolean;
}) {
  const status =
    value === null || target === undefined
      ? "neutral"
      : higherIsBetter
      ? value >= target
        ? "ok"
        : value >= target * 0.9
        ? "warn"
        : "ng"
      : value <= target
      ? "ok"
      : value <= target * 1.1
      ? "warn"
      : "ng";

  const colorClass =
    status === "ok"
      ? "text-green-700"
      : status === "warn"
      ? "text-amber-600"
      : status === "ng"
      ? "text-red-600"
      : "text-ink";

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
      <span className="text-xs text-smoke">{label}</span>
      <span className={`text-2xl font-semibold leading-none ${colorClass}`}>
        {value !== null ? value.toFixed(1) : "—"}
        <span className="ml-1 text-sm font-normal text-smoke">{unit}</span>
      </span>
      {target !== undefined && (
        <span className="text-xs text-smoke">
          목표 {higherIsBetter ? "≥" : "≤"}
          {target}
          {unit}
        </span>
      )}
    </div>
  );
}

export function PipelineWmsKpi() {
  const { latest, history, loading, error } = usePipelineData(6);

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

  const { kpi } = latest;

  const trendData = [...history]
    .sort((a, b) => a.period_key.localeCompare(b.period_key))
    .map((d) => ({
      week: d.period.week_label ?? d.period_key.slice(-3),
      completion: d.kpi.completion_rate,
      defect: d.qc.summary.defect_rate,
    }));

  const recentCounts = history
    .slice(0, 4)
    .map((d) => d.inbound.summary.total_cnt);
  const avgInboundCnt =
    recentCounts.length > 0
      ? Math.round(
          recentCounts.reduce((s, v) => s + v, 0) / recentCounts.length
        )
      : null;

  const defectRisk = kpi.defect_rate > 1.0;
  const completionRisk = kpi.completion_rate < 95;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-ink">
          WMS Pipeline KPI
        </h2>
        <span className="text-xs text-smoke">
          기준: {latest.period.label} · {latest.generated_at.slice(0, 10)} 생성
        </span>
      </div>

      {/* 현재 */}
      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
          현재
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile
            label="입하완료율"
            value={kpi.completion_rate}
            unit="%"
            target={95}
            higherIsBetter
          />
          <KpiTile
            label="불량률"
            value={kpi.defect_rate}
            unit="%"
            target={1.0}
            higherIsBetter={false}
          />
          <KpiTile
            label="자재 피킹"
            value={kpi.picking_total}
            unit="건"
            higherIsBetter
          />
          <KpiTile
            label="이슈 건수"
            value={kpi.issue_total}
            unit="건"
            target={0}
            higherIsBetter={false}
          />
        </div>
      </section>

      {/* 트렌드 */}
      {trendData.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
            트렌드 (최근 {trendData.length}주)
          </p>
          <div className="rounded-lg border border-divider/70 bg-surface p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={trendData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  domain={[80, 100]}
                  tick={{ fontSize: 11 }}
                  unit="%"
                  width={40}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 3]}
                  tick={{ fontSize: 11 }}
                  unit="%"
                  width={36}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${v.toFixed(1)}%`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine
                  yAxisId="left"
                  y={95}
                  stroke="#4A6741"
                  strokeDasharray="3 3"
                  label={{ value: "목표 95%", fontSize: 10, fill: "#4A6741" }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={1}
                  stroke="#963E3E"
                  strokeDasharray="3 3"
                />
                <Bar
                  yAxisId="left"
                  dataKey="completion"
                  name="입하완료율 %"
                  fill="#4A6741"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="defect"
                  name="불량률 %"
                  fill="#963E3E"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 전망 */}
      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
          다음주 전망 (4주 평균 기반)
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <div className="rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <p className="text-xs text-smoke">예상 입하 건수</p>
            <p className="text-2xl font-semibold text-ink">
              {avgInboundCnt !== null ? avgInboundCnt : "—"}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </p>
            <p className="text-xs text-smoke">
              최근 {recentCounts.length}주 평균
            </p>
          </div>
          {defectRisk && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-lg">⚠</span>
              <div>
                <p className="text-xs font-medium text-amber-700">
                  불량률 주의
                </p>
                <p className="text-xs text-amber-600">
                  현재 {kpi.defect_rate.toFixed(1)}% — 목표 1.0% 초과
                </p>
              </div>
            </div>
          )}
          {completionRisk && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-lg">🔴</span>
              <div>
                <p className="text-xs font-medium text-red-700">
                  입하완료율 미달
                </p>
                <p className="text-xs text-red-600">
                  현재 {kpi.completion_rate.toFixed(1)}% — 목표 95% 미달
                </p>
              </div>
            </div>
          )}
          {!defectRisk && !completionRisk && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <span className="text-lg">✓</span>
              <p className="text-xs font-medium text-green-700">
                주요 KPI 목표 달성 중
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
