import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type SyncRun = {
  id: number;
  job_name: string;
  started_at: string;
  status: string;
  rows_written: number | null;
};

const ALL_JOBS = [
  "heartbeat", "tms_kpi", "tms_delivery_notes", "tms_multi_to", "wms_dayoung",
  "tms_carrier_otif", "tms_daily_volume", "tms_pod_aging",
  "project_tasks", "autoresearch_trend", "autoresearch_log",
];

const TIME_FMT = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

function statusVariant(s: string): Parameters<typeof StatusGlyph>[0]["variant"] {
  if (s === "ok") return "ok";
  if (s === "failed") return "failed";
  return "pending";
}

export function LogSyncHistory() {
  const [rows, setRows] = useState<SyncRun[] | null>(null);
  const [job, setJob] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRows(null);
      let q = supabase.from("sync_runs")
        .select("id, job_name, started_at, status, rows_written")
        .order("started_at", { ascending: false }).limit(200);
      if (job !== "all") q = q.eq("job_name", job);
      const { data } = await q;
      if (cancelled) return;
      setRows((data ?? []) as SyncRun[]);
    })();
    return () => { cancelled = true; };
  }, [job]);

  return (
    <Card>
      <SectionHeader title="Sync 실행 이력" meta={rows ? `${rows.length}건` : "Loading"} />
      <div className="border-b border-divider/40 px-6 py-2">
        <select value={job} onChange={e => setJob(e.target.value)}
          className="rounded border border-divider/60 bg-transparent px-2 py-1 text-xs text-ink">
          <option value="all">전체</option>
          {ALL_JOBS.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>
      <ul className="max-h-80 overflow-y-auto divide-y divide-divider/40">
        {rows === null ? (
          <li className="space-y-3 px-6 py-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </li>
        ) : rows.length === 0 ? (
          <li className="py-8 text-center text-sm text-smoke">실행 이력 없음</li>
        ) : (
          rows.map(r => (
            <li key={r.id} className="grid grid-cols-[110px_1fr_56px_auto] items-center gap-3 px-6 py-2 text-xs hover:bg-divider/20">
              <span className="font-mono text-smoke tabular-nums">{TIME_FMT.format(new Date(r.started_at))}</span>
              <span className="truncate text-ink">{r.job_name}</span>
              <span className="text-right text-smoke tabular-nums">{r.rows_written ?? 0}rows</span>
              <StatusGlyph variant={statusVariant(r.status)} label="" />
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
