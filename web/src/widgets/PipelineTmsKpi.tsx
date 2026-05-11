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

const BOX_ORDER = ["극소", "중", "중대", "대", "특대"];

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
  const { summary, by_date, box_type, partners, driver_weekly, driver_weekly_max,
    driver_pct, driver_daily, quality, confidence, cbm_sources, a1_utilization } = shipment;

  const byDateEntries = Object.entries(by_date).sort(([a], [b]) => a.localeCompare(b));

  const driverNames = Object.keys(driver_weekly).sort();

  const allDates = [...new Set(
    driverNames.flatMap((n) => Object.keys(driver_daily[n] ?? {}))
  )].sort();

  const trend = weekly.trend ?? [];
  const nextByDate = Object.entries(weekly.next_week?.by_date ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({ date: date.slice(5), pending: val.pending }));

  const utilizationPct = a1_utilization.pct;
  const utilizationColor =
    utilizationPct >= 80 ? "text-green-700" : utilizationPct >= 50 ? "text-amber-600" : "text-red-600";

  const totalSources = Object.values(cbm_sources).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-ink">TMS Pipeline — 출하</h2>
        <span className="text-xs text-smoke">
          기준: {period.label} · {latest.generated_at.slice(0, 10)} 생성
        </span>
      </div>

      {/* 1. 출하 요약 */}
      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">출하 요약</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">총 CBM</span>
            <span className="text-xl font-semibold leading-none text-ink">
              {summary.total_cbm.toFixed(1)}<span className="ml-1 text-xs font-normal text-smoke">m³</span>
            </span>
            <span className="text-xs text-smoke">{summary.total_count}건</span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">완료 / 미완</span>
            <span className="text-xl font-semibold leading-none text-green-700">
              {summary.completed}<span className="ml-1 text-xs font-normal text-smoke">건</span>
            </span>
            <span className="text-xs text-red-500">미완 {summary.pending}건</span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">물류비</span>
            <span className="text-xl font-semibold leading-none text-ink">
              {(summary.cost / 10000).toFixed(0)}<span className="ml-1 text-xs font-normal text-smoke">만원</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">CBM 단가</span>
            <span className="text-xl font-semibold leading-none text-ink">
              {(summary.cbm_unit_cost / 1000).toFixed(0)}<span className="ml-1 text-xs font-normal text-smoke">천원/m³</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">평균 리드타임</span>
            <span className="text-xl font-semibold leading-none text-ink">
              {quality.avg_leadtime_days.toFixed(1)}<span className="ml-1 text-xs font-normal text-smoke">일</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-divider/70 bg-sand px-4 py-3">
            <span className="text-xs text-smoke">에이원 가동율</span>
            <span className={`text-xl font-semibold leading-none ${utilizationColor}`}>
              {utilizationPct.toFixed(1)}<span className="ml-1 text-xs font-normal text-smoke">%</span>
            </span>
            <span className="text-xs text-smoke">{a1_utilization.total_cbm.toFixed(1)} / {a1_utilization.capacity}m³</span>
          </div>
        </div>
      </section>

      {/* 2. 일별 출하 현황 */}
      {byDateEntries.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">일별 출하 현황</p>
          <div className="overflow-x-auto rounded-lg border border-divider/70 bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-divider/50 text-smoke">
                  <th className="px-4 py-2 text-left font-medium">날짜</th>
                  <th className="px-4 py-2 text-right font-medium">건수</th>
                  <th className="px-4 py-2 text-right font-medium">완료</th>
                  <th className="px-4 py-2 text-right font-medium">미완</th>
                  <th className="px-4 py-2 text-right font-medium">CBM</th>
                  <th className="px-4 py-2 text-right font-medium">비용</th>
                </tr>
              </thead>
              <tbody>
                {byDateEntries.map(([date, d]) => (
                  <tr key={date} className="border-b border-divider/30 last:border-0">
                    <td className="px-4 py-2 text-smoke">{date.slice(5)}</td>
                    <td className="px-4 py-2 text-right text-ink">{d.cnt}</td>
                    <td className="px-4 py-2 text-right text-green-700">{d.completed}</td>
                    <td className="px-4 py-2 text-right text-red-500">{d.pending}</td>
                    <td className="px-4 py-2 text-right text-ink">{d.cbm.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-smoke">
                      {d.cost > 0 ? `₩${d.cost.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. 파트너/운송사 */}
      {partners.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">파트너 / 운송사</p>
          <div className="overflow-x-auto rounded-lg border border-divider/70 bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-divider/50 text-smoke">
                  <th className="px-4 py-2 text-left font-medium">파트너</th>
                  <th className="px-4 py-2 text-right font-medium">건수</th>
                  <th className="px-4 py-2 text-right font-medium">CBM</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.name} className="border-b border-divider/30 last:border-0">
                    <td className="px-4 py-2 text-ink">{p.name}</td>
                    <td className="px-4 py-2 text-right text-ink">{p.cnt}</td>
                    <td className="px-4 py-2 text-right text-smoke">
                      {p.cbm > 0 ? p.cbm.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. 박스 타입 분포 */}
      {box_type && Object.keys(box_type.pct).length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">
            박스 타입 분포 (총 {box_type.total}박스)
          </p>
          <div className="space-y-2 rounded-lg border border-divider/70 bg-surface px-4 py-3">
            {BOX_ORDER.filter((k) => box_type.pct[k] !== undefined).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-10 text-xs text-smoke">{key}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-divider/40">
                  <div
                    className="h-full rounded-full bg-[#99462a]"
                    style={{ width: `${box_type.pct[key]}%` }}
                  />
                </div>
                <span className="w-20 text-right text-xs text-smoke">
                  {box_type.counts[key]}박스 ({box_type.pct[key].toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. 기사님 상세 */}
      {driverNames.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">기사님 CBM 달성율</p>
          <div className="space-y-3 rounded-lg border border-divider/70 bg-surface px-4 py-3">
            {driverNames.map((name) => {
              const actual = driver_weekly[name] ?? 0;
              const max = driver_weekly_max[name] ?? 0;
              const pct = driver_pct[name] ?? 0;
              const color = pct >= 80 ? "bg-green-600" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
              return (
                <div key={name}>
                  <div className="flex items-center gap-3">
                    <span className="w-36 truncate text-xs text-smoke">{name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-divider/40">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="w-24 text-right text-xs font-medium text-ink">
                      {actual.toFixed(2)} / {max}m³ ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  {/* 일별 CBM */}
                  {allDates.length > 0 && (
                    <div className="mt-1 flex gap-3 pl-36">
                      {allDates.map((date) => {
                        const cbm = driver_daily[name]?.[date];
                        return (
                          <div key={date} className="text-center">
                            <p className="text-[10px] text-smoke">{date.slice(5)}</p>
                            <p className="text-xs font-medium text-ink">
                              {cbm !== undefined ? cbm.toFixed(2) : "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. CBM 신뢰도 */}
      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">CBM 신뢰도</p>
        <div className="rounded-lg border border-divider/70 bg-surface px-4 py-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-smoke">종합 신뢰도</p>
              <p className={`text-2xl font-semibold ${confidence >= 70 ? "text-green-700" : "text-amber-600"}`}>
                {confidence.toFixed(1)}<span className="ml-1 text-sm font-normal text-smoke">%</span>
              </p>
              <p className="text-xs text-smoke">목표 ≥70%</p>
            </div>
            <div className="flex-1 space-y-1">
              {totalSources > 0 && (
                <>
                  {[
                    { key: "manual", label: "수동입력", color: "bg-green-500" },
                    { key: "box_parse", label: "박스파싱", color: "bg-blue-400" },
                    { key: "product_match", label: "품목매칭", color: "bg-amber-400" },
                    { key: "unmatched", label: "미매칭", color: "bg-red-400" },
                  ].map(({ key, label, color }) => {
                    const val = cbm_sources[key as keyof typeof cbm_sources];
                    const pct = (val / totalSources) * 100;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-16 text-[10px] text-smoke">{label}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-divider/40">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-[10px] text-smoke">{val}건 ({pct.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-smoke">
            <span>박스 미입력 {quality.missing_box_qty}건 ({quality.missing_rate.toFixed(1)}%)</span>
            <span>당일 등록 {quality.same_day_create}건 ({quality.same_day_rate.toFixed(1)}%)</span>
          </div>
        </div>
      </section>

      {/* 7. 트렌드 */}
      {trend.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">트렌드 (최근 4주)</p>
          <div className="rounded-lg border border-divider/70 bg-surface p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} unit="m³" width={44} />
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
                <Bar yAxisId="left" dataKey="cbm" name="CBM (m³)" fill="#99462a" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="cost" name="물류비 (₩)" fill="#B08934" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 8. 다음주 예정 */}
      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-smoke">다음주 예정 (Airtable 확정 기준)</p>
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
