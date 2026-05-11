import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type DayoungRow = {
  pks_id: string;
  project: string | null;
  scheduled_date: string | null;
  movement_date: string | null;
  material_status: string | null;
  progress_status: string[] | null;
  items: string | null;
  quantity: number | null;
};

const DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return DATE_FORMAT.format(new Date(iso));
}

function materialStatusColor(status: string | null): string {
  if (!status) return "text-smoke";
  if (status === "이동완료" || status === "협력사입고") return "text-emerald-600";
  if (status === "입고완료") return "text-blue-500";
  if (status === "이동대기") return "text-amber-500";
  return "text-smoke";
}

function progressBadge(statuses: string[] | null): string {
  if (!statuses || statuses.length === 0) return "대기";
  const last = statuses[statuses.length - 1];
  return last.replace(/^\d+\./, "").trim();
}

function progressColor(statuses: string[] | null): string {
  const badge = progressBadge(statuses);
  if (badge.includes("완료")) return "bg-emerald-100 text-emerald-700";
  if (badge.includes("진행")) return "bg-blue-100 text-blue-700";
  if (badge.includes("딜레이") || badge.includes("중단")) return "bg-red-100 text-red-700";
  return "bg-smoke/10 text-smoke";
}

function kstDateString(offsetDays = 0): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function TmsDayoungSchedule() {
  const [rows, setRows] = useState<DayoungRow[] | "loading" | null>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todayStr = kstDateString(0);
      const endStr = kstDateString(14);
      const { data, error } = await supabase
        .from("wms_dayoung_schedule")
        .select("pks_id, project, scheduled_date, movement_date, material_status, progress_status, items, quantity")
        .gte("scheduled_date", todayStr)
        .lte("scheduled_date", endStr)
        .order("scheduled_date", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("TmsDayoungSchedule fetch error:", error);
        setRows(null);
        return;
      }
      setRows((data as DayoungRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const data = rows === "loading" ? null : rows;

  return (
    <Card>
      <SectionHeader
        title="다영기획 임가공 예정"
        meta={loading ? "Loading" : data ? `에이원센터 → 다영기획 · ${data.length}건` : "No data"}
      />
      <div>
        {loading ? (
          <div className="px-6 py-4 space-y-3">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="px-6 py-8 text-sm text-smoke text-center">진행 예정 임가공 없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-divider/40 text-smoke uppercase tracking-wide">
                  <th className="px-6 py-2.5 text-left font-normal">PKS</th>
                  <th className="px-3 py-2.5 text-left font-normal">고객사</th>
                  <th className="px-3 py-2.5 text-left font-normal">임가공 예정일</th>
                  <th className="px-3 py-2.5 text-left font-normal">이동 예정일</th>
                  <th className="px-3 py-2.5 text-left font-normal">자재</th>
                  <th className="px-3 py-2.5 text-left font-normal">진행현황</th>
                  <th className="px-3 py-2.5 text-right font-normal pr-6">수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30">
                {data.map((row) => {
                  const clientName = row.project?.replace(/^PNA\d+-/, "") ?? "—";
                  return (
                    <tr key={row.pks_id} className="hover:bg-smoke/5 transition-colors">
                      <td className="px-6 py-3 font-mono text-smoke">{row.pks_id}</td>
                      <td className="px-3 py-3 text-ink max-w-[160px] truncate" title={clientName}>{clientName}</td>
                      <td className="px-3 py-3 tnum text-ink">{formatDate(row.scheduled_date)}</td>
                      <td className="px-3 py-3 tnum text-smoke">{formatDate(row.movement_date)}</td>
                      <td className={`px-3 py-3 font-medium ${materialStatusColor(row.material_status)}`}>
                        {row.material_status ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${progressColor(row.progress_status)}`}>
                          {progressBadge(row.progress_status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 tnum text-right pr-6 text-ink">
                        {row.quantity != null ? row.quantity.toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
