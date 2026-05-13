import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KpiStat } from "@/components/ui/kpi-stat";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { fetchRecentEvents, fetchAgentStats, type OpsEvent, type AgentStat } from "@/lib/ops";

const POLL_MS = 30_000;

const KST = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return KST.format(new Date(iso));
}

const DOMAIN_COLOR: Record<string, string> = {
  TMS: "bg-blue-900/60 text-blue-300",
  WMS: "bg-emerald-900/60 text-emerald-300",
  SAP: "bg-purple-900/60 text-purple-300",
  FI:  "bg-yellow-900/60 text-yellow-300",
  SCM: "bg-orange-900/60 text-orange-300",
  OPS: "bg-slate-700/60 text-slate-300",
  PM:  "bg-pink-900/60 text-pink-300",
};

const SOURCE_COLOR: Record<string, string> = {
  harness: "bg-emerald-900/60 text-emerald-300",
  hook:    "bg-blue-900/60 text-blue-300",
};

export function OpsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAgent = searchParams.get("agent") ?? "";

  const [events, setEvents] = useState<OpsEvent[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [evts, stats] = await Promise.all([
        fetchRecentEvents({ agentId: selectedAgent || undefined }),
        fetchAgentStats(),
      ]);
      setEvents(evts);
      setAgentStats(stats);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch error");
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const todayEvents = events.filter((e) => {
    const d = new Date(e.created_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  });

  const successRate = todayEvents.length
    ? Math.round((todayEvents.filter((e) => e.status === "completed").length / todayEvents.length) * 1000) / 10
    : null;

  const lastEvent = events[0] ?? null;

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5">
          <KpiStat
            label="오늘 실행"
            value={loading ? "—" : todayEvents.length}
            footer={`harness ${todayEvents.filter(e => e.source === "harness").length} · hook ${todayEvents.filter(e => e.source === "hook").length}`}
          />
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <KpiStat
            label="성공률"
            value={successRate === null ? "—" : `${successRate}%`}
            footer={`${todayEvents.filter(e => e.status === "completed").length} / ${todayEvents.length} completed`}
          />
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <KpiStat
            label="마지막 실행"
            value={lastEvent ? relativeTime(lastEvent.created_at) : "—"}
            footer={lastEvent?.agent_id ?? ""}
          />
        </CardContent></Card>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">⚠ {error}</p>}

      {/* Main layout: sidebar + feed */}
      <div className="grid grid-cols-[220px_1fr] gap-4 items-start">

        {/* Agent sidebar */}
        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-ink">Agents</span>
          </CardHeader>
          <CardContent className="p-2">
            <button
              onClick={() => setSearchParams({})}
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${!selectedAgent ? "bg-accent text-ink font-medium" : "text-smoke hover:text-ink hover:bg-accent/50"}`}
            >
              전체
            </button>
            {agentStats.map((s) => (
              <button
                key={s.agent_id}
                onClick={() => setSearchParams({ agent: s.agent_id })}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${selectedAgent === s.agent_id ? "bg-accent text-ink font-medium" : "text-smoke hover:text-ink hover:bg-accent/50"}`}
              >
                <span className="truncate">{s.agent_id}</span>
                <span className="ml-2 shrink-0 text-xs text-smoke">{s.count}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Event feed */}
        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-ink">
              {selectedAgent ? selectedAgent : "Activity Feed"}
            </span>
            <span className="text-xs text-smoke">{loading ? "로딩 중…" : `${events.length}건`}</span>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 && !loading ? (
              <p className="px-6 py-8 text-sm text-smoke text-center">이벤트 없음</p>
            ) : (
              <ul className="divide-y divide-divider/50">
                {events.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function EventRow({ event: e }: { event: OpsEvent }) {
  const statusColor =
    e.status === "completed" ? "bg-success" :
    e.status === "failed"    ? "bg-destructive" :
                               "bg-smoke";

  return (
    <li className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-accent/30">
      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${statusColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="font-medium text-ink">{e.agent_id}</span>
          <span className={`rounded px-1.5 py-px text-[10px] font-medium ${SOURCE_COLOR[e.source] ?? "bg-muted text-smoke"}`}>
            {e.source}
          </span>
          {e.domain && (
            <span className={`rounded px-1.5 py-px text-[10px] font-medium ${DOMAIN_COLOR[e.domain] ?? "bg-muted text-smoke"}`}>
              {e.domain}
            </span>
          )}
          {e.week && (
            <span className="text-[10px] text-smoke">{e.week}</span>
          )}
        </div>
        {e.summary && (
          <p className="text-xs text-smoke truncate">{e.summary}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {e.duration_ms != null && (
          <div className="text-xs text-smoke">{(e.duration_ms / 1000).toFixed(1)}s</div>
        )}
        <div className="text-[10px] text-smoke/70">{relativeTime(e.created_at)}</div>
      </div>
      <StatusGlyph
        variant={e.status === "completed" ? "ok" : e.status === "failed" ? "failed" : "running"}
        label={e.status}
      />
    </li>
  );
}
