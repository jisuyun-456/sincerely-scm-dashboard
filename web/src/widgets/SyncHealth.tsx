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
  { id: "heartbeat", label: "Heartbeat" },
  { id: "tms_kpi", label: "TMS KPI" },
  { id: "tms_delivery_notes", label: "Delivery Notes" },
  { id: "tms_multi_to", label: "Multi TO" },
  { id: "wms_dayoung", label: "다영기획" },
  { id: "tms_carrier_otif", label: "Carrier OTIF" },
  { id: "tms_daily_volume", label: "Daily Volume" },
  { id: "tms_pod_aging", label: "POD Aging" },
  { id: "project_tasks", label: "Project Tasks" },
  { id: "autoresearch_trend", label: "AutoResearch Trend" },
  { id: "autoresearch_log", label: "AutoResearch Log" },
] as const;

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return TIME_FORMAT.format(new Date(iso));
}

function nextMidnightKstFrom(now: Date): Date {
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
  if (ms <= 0) return "due";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function statusVariant(
  status: string,
): Parameters<typeof StatusGlyph>[0]["variant"] {
  if (status === "ok") return "ok";
  if (status === "failed") return "failed";
  if (status === "running") return "running";
  return "pending";
}

function statusLabel(status: string | undefined): string {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const byJob = new Map<string, Row>();
  (rows ?? []).forEach((r) => byJob.set(r.job_name, r));
  const okCount = (rows ?? []).filter((r) => r.status === "ok").length;
  const meta = rows ? `${KNOWN_JOBS.length} jobs · ${okCount} ok` : "Loading";

  const next = nextMidnightKstFrom(now);
  const countdown = formatCountdown(next, now);

  return (
    <Card>
      <SectionHeader title="Sync Health" meta={meta} />
      <div className="px-6 py-5">
        {rows === null ? (
          <div className="space-y-3">
            {KNOWN_JOBS.map((j) => (
              <div key={j.id} className="flex items-center gap-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="ml-auto h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-divider/40">
            {KNOWN_JOBS.map((job) => {
              const row = byJob.get(job.id);
              return (
                <li
                  key={job.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2.5 text-sm"
                >
                  <span className="text-ink">{job.label}</span>
                  <span className="font-mono text-xs text-smoke tnum">
                    {formatTime(row?.finished_at ?? row?.started_at ?? null)}
                  </span>
                  <StatusGlyph
                    variant={statusVariant(row?.status ?? "")}
                    label={statusLabel(row?.status)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-divider/70 px-6 py-3 text-xs text-smoke">
        <span>Next sync · {countdown}</span>
        <span>00:00 KST · daily</span>
      </div>
    </Card>
  );
}
