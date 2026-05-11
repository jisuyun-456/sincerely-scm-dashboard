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
        .select("pks_id, project, scheduled_date, movement_date")
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
                  <th className="px-6 py-2.5 text-left font-normal">프로젝트명</th>
                  <th className="px-3 py-2.5 text-left font-normal">임가공 예정일</th>
                  <th className="px-3 py-2.5 text-left font-normal pr-6">이동 예정일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30">
                {data.map((row) => (
                  <tr key={row.pks_id} className="hover:bg-smoke/5 transition-colors">
                    <td className="px-6 py-3 text-ink max-w-[260px] truncate" title={row.project ?? "—"}>
                      {row.project ?? "—"}
                    </td>
                    <td className="px-3 py-3 tnum text-ink">{formatDate(row.scheduled_date)}</td>
                    <td className="px-3 py-3 tnum text-smoke pr-6">{formatDate(row.movement_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
