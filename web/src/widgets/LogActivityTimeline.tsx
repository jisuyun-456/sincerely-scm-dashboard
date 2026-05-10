import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type UnifiedEvent = {
  id: string;
  ts: string;
  type: "agent" | "sync";
  label: string;
  detail: string;
  status: string;
};

const TIME_FMT = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

function statusVariant(s: string): Parameters<typeof StatusGlyph>[0]["variant"] {
  if (s === "ok" || s === "completed") return "ok";
  if (s === "failed") return "failed";
  if (s === "running" || s === "started") return "running";
  return "pending";
}

export function LogActivityTimeline() {
  const [events, setEvents] = useState<UnifiedEvent[] | null>(null);
  const [days, setDays] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEvents(null);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const iso = cutoff.toISOString();

      const [agentRes, syncRes] = await Promise.all([
        supabase.from("agent_events")
          .select("id, event_at, agent_name, tool_name, status")
          .gte("event_at", iso).order("event_at", { ascending: false }).limit(200),
        supabase.from("sync_runs")
          .select("id, started_at, job_name, status, rows_written")
          .gte("started_at", iso).order("started_at", { ascending: false }).limit(200),
      ]);

      if (cancelled) return;

      const agentEvents: UnifiedEvent[] = ((agentRes.data ?? []) as any[]).map(r => ({
        id: `a-${r.id}`,
        ts: r.event_at,
        type: "agent" as const,
        label: r.agent_name ?? "claude",
        detail: r.tool_name ? `→ ${r.tool_name}` : "",
        status: r.status,
      }));

      const syncEvents: UnifiedEvent[] = ((syncRes.data ?? []) as any[]).map(r => ({
        id: `s-${r.id}`,
        ts: r.started_at,
        type: "sync" as const,
        label: r.job_name,
        detail: `${r.rows_written ?? 0}rows`,
        status: r.status,
      }));

      setEvents([...agentEvents, ...syncEvents].sort((a, b) => b.ts.localeCompare(a.ts)));
    })();
    return () => { cancelled = true; };
  }, [days]);

  return (
    <Card>
      <SectionHeader title="통합 활동 타임라인" meta={events ? `${events.length}건` : "Loading"} />
      <div className="flex gap-1 border-b border-divider/40 px-6 pb-0 pt-1">
        {([7, 14, 30] as const).map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              days === d ? "border-b-2 border-crail text-crail" : "text-smoke hover:text-ink"
            }`}>
            {d}일
          </button>
        ))}
      </div>
      <ul className="max-h-[480px] overflow-y-auto divide-y divide-divider/40">
        {events === null ? (
          <li className="space-y-3 px-6 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </li>
        ) : events.length === 0 ? (
          <li className="py-12 text-center text-sm text-smoke">기간 내 활동 없음</li>
        ) : (
          events.map(e => (
            <li key={e.id} className="grid grid-cols-[120px_auto_1fr_auto] items-center gap-3 px-6 py-2.5 text-xs hover:bg-divider/20">
              <span className="font-mono text-smoke tabular-nums">{TIME_FMT.format(new Date(e.ts))}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                e.type === "agent" ? "bg-crail/10 text-crail" : "bg-divider/60 text-smoke"
              }`}>
                {e.type}
              </span>
              <span className="truncate text-ink">
                {e.label} <span className="text-smoke">{e.detail}</span>
              </span>
              <StatusGlyph variant={statusVariant(e.status)} label="" />
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
