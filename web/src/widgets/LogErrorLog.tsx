import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type SyncRun = {
  id: number;
  job_name: string;
  started_at: string;
  error_message: string | null;
  github_run_id: string | null;
};

const TIME_FMT = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function LogErrorLog() {
  const [rows, setRows] = useState<SyncRun[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data } = await supabase.from("sync_runs")
        .select("id, job_name, started_at, error_message, github_run_id")
        .eq("status", "failed")
        .gte("started_at", cutoff.toISOString())
        .order("started_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      setRows((data ?? []) as SyncRun[]);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <SectionHeader title="오류 로그 · 최근 30일" meta={rows ? `${rows.length}건` : "Loading"} />
      <ul className="max-h-80 overflow-y-auto divide-y divide-divider/40">
        {rows === null ? (
          <li className="space-y-3 px-6 py-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </li>
        ) : rows.length === 0 ? (
          <li className="py-8 text-center text-sm text-smoke">최근 30일 오류 없음 ✓</li>
        ) : (
          rows.map(r => (
            <li key={r.id} className="px-6 py-3 text-xs hover:bg-divider/20">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-destructive">{r.job_name}</span>
                <span className="font-mono text-smoke tabular-nums">{TIME_FMT.format(new Date(r.started_at))}</span>
              </div>
              {r.error_message && (
                <p className="truncate font-mono text-smoke">{r.error_message}</p>
              )}
              {r.github_run_id && (
                <a href={`https://github.com/jisuyun-456/sincerely-scm-dashboard/actions/runs/${r.github_run_id}`}
                  target="_blank" rel="noreferrer noopener"
                  className="mt-0.5 inline-block text-crail hover:underline">
                  GH Actions 로그 →
                </a>
              )}
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
