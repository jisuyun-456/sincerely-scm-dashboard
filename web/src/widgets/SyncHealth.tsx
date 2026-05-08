import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Row = {
  id: number;
  job_name: string;
  status: string;
  finished_at: string | null;
  started_at: string;
};

const KNOWN_JOBS = [
  "heartbeat",
  "tms_kpi",
  "project_tasks",
  "autoresearch_log",
  "agent_events",
] as const;

type JobName = (typeof KNOWN_JOBS)[number] | string;

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return TIME_FORMAT.format(new Date(iso));
}

function nextMidnightKstFrom(now: Date): Date {
  // 00:00 KST = 15:00 UTC
  const utc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0),
  );
  if (utc.getTime() <= now.getTime()) {
    utc.setUTCDate(utc.getUTCDate() + 1);
  }
  return utc;
}

function formatCountdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "DUE";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}H ${String(m).padStart(2, "0")}M`;
}

function statusVariant(
  status: string,
  jobName: string,
): Parameters<typeof StatusGlyph>[0]["variant"] {
  if (jobName === "agent_events") return "live";
  if (status === "ok") return "ok";
  if (status === "failed") return "failed";
  if (status === "running") return "running";
  return "pending";
}

function statusLabel(status: string | undefined, jobName: string): string {
  if (jobName === "agent_events") return "STREAMING";
  if (!status) return "PENDING";
  return status.toUpperCase();
}

export function SyncHealth() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("sync_runs")
        .select("id, job_name, status, finished_at, started_at")
        .order("started_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        console.error("SyncHealth fetch error:", error);
        setRows([]);
        return;
      }
      // Keep newest row per job_name
      const incoming = (data ?? []) as Row[];
      const seen = new Set<string>();
      const latest: Row[] = [];
      for (const r of incoming) {
        if (!seen.has(r.job_name)) {
          latest.push(r);
          seen.add(r.job_name);
        }
      }
      setRows(latest);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Update countdown every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const byJob = new Map<JobName, Row>();
  (rows ?? []).forEach((r) => byJob.set(r.job_name, r));

  const okCount = (rows ?? []).filter((r) => r.status === "ok").length;
  const totalShown = KNOWN_JOBS.length;
  const meta = rows ? `${totalShown} JOBS · ${okCount} OK` : "LOADING";

  const next = nextMidnightKstFrom(now);
  const countdown = formatCountdown(next, now);

  return (
    <Card>
      <SectionHeader title="SYNC HEALTH" meta={meta} />
      <div className="px-4 py-3 font-mono text-xs">
        {rows === null ? (
          <div className="space-y-2">
            {KNOWN_JOBS.map((j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="ml-auto h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {KNOWN_JOBS.map((job) => {
              const row = byJob.get(job);
              return (
                <div
                  key={job}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-1"
                >
                  <span className="uppercase tracking-wide text-zinc-300">
                    {job}
                  </span>
                  <span className="text-zinc-500 tabular-nums">
                    {job === "agent_events"
                      ? "LIVE"
                      : formatTime(row?.finished_at ?? row?.started_at ?? null)}
                  </span>
                  <StatusGlyph
                    variant={statusVariant(row?.status ?? "", job)}
                    label={statusLabel(row?.status, job)}
                  />
                  <span className="text-[10px] text-zinc-700 tabular-nums">
                    {row ? `id ${row.id}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-wide text-zinc-600">
        <span>NEXT SYNC · {countdown}</span>
        <span>00:00 KST DAILY</span>
      </div>
    </Card>
  );
}
