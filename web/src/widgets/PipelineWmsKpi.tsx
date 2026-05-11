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

const PURPOSE_LABELS: Record<string, string> = {
  생산산출: "생산산출",
  재고이동: "재고이동",
  조립투입: "조립투입",
  재고생산: "재고생산",
};

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

  const { kpi, inbound, qc, material } = latest;

  const trendData = [...history]
    .sort((a, b) => a.period_key.localeCompare(b.period_key))
    .map((d) => ({
      week: d.period.week_label ?? d.period_key.slice(-3),
      completion: d.kpi.completion_rate,
      defect: d.qc.summary.defect_rate,
    }));

  const inboundByDate = Object.entries(inbound.by_date ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const inboundByPurpose = Object.entries(inbound.by_purpose ?? {}).sort(
    ([, a], [, b]) => b.cnt - a.cnt
  );
  const maxPurposeCnt = Math.max(...inboundByPurpose.map(([, v]) => v.cnt), 1);

  const notRecv = Object.entries(inbound.not_recv_by_partner ?? {});

  const resultDist = Object.entries(qc.result_dist ?? {});
  const totalResultDist = resultDist.reduce((s, [, v]) => s + v, 0);

  const catCounts = Object.entries(qc.issue_summary?.cat_counts ?? {});

  const projectByDate = Object.entries(material.picking.project.by_date ?? {}).sort(
    ([a], [b]) => a.localeCompare(b)
  );
  const a1ByDate = Object.entries(material.picking.a1_to_partner.by_date ?? {}).sort(
    ([a], [b]) => a.localeCompare(b)
  );
  const pickingDates = [
    ...new Set([
      ...projectByDate.map(([d]) => d),
      ...a1ByDate.map(([d]) => d),
    ]),
  ].sort();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-ink">WMS Pipeline KPI</h2>
        <span className="text-xs text-smoke">
          기준: {latest.period.label} · {latest.generated_at.slice(0, 10)} 생성
        </span>
      </div>

      {/* 트렌드 (최상단 유지) */}
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
                  formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine
                  yAxisId="left"
                  y={95}
                  stroke="#4A6741"
                  strokeDasharray="3 3"
                  label={{ value: "목표 95%", fontSize: 10, fill: "#4A6741" }}
                />
                <ReferenceLine yAxisId="right" y={1} stroke="#963E3E" strokeDasharray="3 3" />
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

      {/* ─── 섹션 A: 입고 ─── */}
      <section className="space-y-4">
        <h3 className="border-b border-divider/50 pb-1 text-sm font-semibold text-ink">
          입고 (Inbound)
        </h3>

        {/* 요약 타일 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiTile
            label="입하완료율"
            value={kpi.completion_rate}
            unit="%"
            target={95}
            higherIsBetter
          />
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">총 입하 건수</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {inbound.summary.total_cnt}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">총 입고 수량</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {inbound.summary.total_in_qty.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-smoke">EA</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">완료</span>
            <span className="text-2xl font-semibold leading-none text-green-700">
              {inbound.summary.completed}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">미확인</span>
            <span className={`text-2xl font-semibold leading-none ${inbound.summary.unconfirmed > 0 ? "text-amber-600" : "text-ink"}`}>
              {inbound.summary.unconfirmed}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </span>
          </div>
        </div>

        {/* 일별 현황 */}
        {inboundByDate.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-smoke">일별 현황</p>
            <div className="overflow-x-auto rounded-lg border border-divider/70 bg-surface">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-divider/50 text-smoke">
                    <th className="px-4 py-2 text-left font-medium">날짜</th>
                    <th className="px-4 py-2 text-right font-medium">건수</th>
                    <th className="px-4 py-2 text-right font-medium">수량</th>
                  </tr>
                </thead>
                <tbody>
                  {inboundByDate.map(([date, d]) => (
                    <tr key={date} className="border-b border-divider/30 last:border-0">
                      <td className="px-4 py-2 text-smoke">{date.slice(5)}</td>
                      <td className="px-4 py-2 text-right text-ink">{d.cnt}</td>
                      <td className="px-4 py-2 text-right text-smoke">{d.in_qty.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 목적별 */}
        {inboundByPurpose.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-smoke">목적별 입고</p>
            <div className="space-y-2 rounded-lg border border-divider/70 bg-surface px-4 py-3">
              {inboundByPurpose.map(([purpose, v]) => (
                <div key={purpose} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-smoke">{PURPOSE_LABELS[purpose] ?? purpose}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-divider/40">
                    <div
                      className="h-full rounded-full bg-[#4A6741]"
                      style={{ width: `${(v.cnt / maxPurposeCnt) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs text-smoke">
                    {v.cnt}건 / {v.qty.toLocaleString()}EA
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 미입고 협력사 */}
        {notRecv.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-amber-700">미입고 협력사</p>
            <div className="flex flex-wrap gap-2">
              {notRecv.map(([partner, cnt]) => (
                <span
                  key={partner}
                  className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                >
                  {partner} ({cnt}건)
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── 섹션 B: 검수 ─── */}
      <section className="space-y-4">
        <h3 className="border-b border-divider/50 pb-1 text-sm font-semibold text-ink">
          검수 (QC)
        </h3>

        {/* 요약 타일 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">검수 건수</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {qc.summary.qc_cnt}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </span>
            <span className="text-xs text-smoke">QC 수량 {qc.summary.total_qc_qty.toLocaleString()}EA</span>
          </div>
          <KpiTile
            label="불량률"
            value={qc.summary.defect_rate}
            unit="%"
            target={1.0}
            higherIsBetter={false}
          />
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">총 불량</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {qc.summary.total_defect}
              <span className="ml-1 text-sm font-normal text-smoke">EA</span>
            </span>
          </div>
          <div className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
            qc.summary.target_met
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}>
            <span className="text-xs text-smoke">목표 달성</span>
            <span className={`text-2xl font-semibold leading-none ${qc.summary.target_met ? "text-green-700" : "text-red-600"}`}>
              {qc.summary.target_met ? "달성" : "미달"}
            </span>
          </div>
        </div>

        {/* 결과 분포 */}
        {resultDist.length > 0 && totalResultDist > 0 && (
          <div>
            <p className="mb-1 text-xs text-smoke">검수 결과 분포</p>
            <div className="space-y-2 rounded-lg border border-divider/70 bg-surface px-4 py-3">
              {resultDist.map(([label, cnt]) => {
                const pct = (cnt / totalResultDist) * 100;
                const color =
                  label === "수량 정상"
                    ? "bg-green-500"
                    : label === "이슈 발생 후 해결"
                    ? "bg-amber-400"
                    : "bg-red-500";
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-smoke">{label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-divider/40">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-20 text-right text-xs text-smoke">
                      {cnt}건 ({pct.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 불량 아이템 */}
        {qc.defect_by_item.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-smoke">불량 발생 품목</p>
            <div className="overflow-x-auto rounded-lg border border-divider/70 bg-surface">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-divider/50 text-smoke">
                    <th className="px-4 py-2 text-left font-medium">품목명</th>
                    <th className="px-4 py-2 text-right font-medium">QC 수량</th>
                    <th className="px-4 py-2 text-right font-medium">불량</th>
                    <th className="px-4 py-2 text-right font-medium">불량률</th>
                  </tr>
                </thead>
                <tbody>
                  {qc.defect_by_item.map((item) => (
                    <tr key={item.name} className="border-b border-divider/30 last:border-0">
                      <td className="px-4 py-2 text-ink">{item.name}</td>
                      <td className="px-4 py-2 text-right text-smoke">{item.qc_qty}</td>
                      <td className="px-4 py-2 text-right text-red-600">{item.defect}</td>
                      <td className="px-4 py-2 text-right text-red-600">{item.defect_rate.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 이슈 분류 */}
        {catCounts.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-smoke">
              이슈 분류 (전체 {qc.issue_summary.total_cnt}건 중 {qc.issue_summary.issue_cnt}건 이슈)
            </p>
            <div className="flex flex-wrap gap-3">
              {catCounts.map(([cat, cnt]) => (
                <div
                  key={cat}
                  className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3"
                >
                  <span className="text-xs text-smoke">{cat}</span>
                  <span className="text-xl font-semibold text-ink">
                    {cnt}
                    <span className="ml-1 text-xs font-normal text-smoke">건</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── 섹션 C: 자재 ─── */}
      <section className="space-y-4">
        <h3 className="border-b border-divider/50 pb-1 text-sm font-semibold text-ink">
          자재 (Material)
        </h3>

        {/* 피킹 요약 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">프로젝트 피킹</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {material.picking.project.count}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">에이원→협력사</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {material.picking.a1_to_partner.count}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </span>
          </div>
          <div className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
            material.issues.total > 0 ? "border-amber-200 bg-amber-50" : "border-divider/70 bg-sand"
          }`}>
            <span className="text-xs text-smoke">이슈 건수</span>
            <span className={`text-2xl font-semibold leading-none ${material.issues.total > 0 ? "text-amber-600" : "text-ink"}`}>
              {material.issues.total}
              <span className="ml-1 text-sm font-normal text-smoke">건</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">2026 누적 사용</span>
            <span className="text-2xl font-semibold leading-none text-ink">
              {(material.usage.cumulative_2026 / 10000).toFixed(0)}
              <span className="ml-1 text-sm font-normal text-smoke">만</span>
            </span>
          </div>
        </div>

        {/* 일별 피킹 */}
        {pickingDates.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-smoke">일별 피킹 현황</p>
            <div className="overflow-x-auto rounded-lg border border-divider/70 bg-surface">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-divider/50 text-smoke">
                    <th className="px-4 py-2 text-left font-medium">날짜</th>
                    <th className="px-4 py-2 text-right font-medium">프로젝트</th>
                    <th className="px-4 py-2 text-right font-medium">에이원→협력사</th>
                  </tr>
                </thead>
                <tbody>
                  {pickingDates.map((date) => (
                    <tr key={date} className="border-b border-divider/30 last:border-0">
                      <td className="px-4 py-2 text-smoke">{date.slice(5)}</td>
                      <td className="px-4 py-2 text-right text-ink">
                        {material.picking.project.by_date[date] ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-ink">
                        {material.picking.a1_to_partner.by_date[date] ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
