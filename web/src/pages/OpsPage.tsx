import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KpiStat } from "@/components/ui/kpi-stat";
import { StatusGlyph } from "@/components/ui/status-glyph";
import {
  fetchRecentEvents,
  fetchAgentStats,
  fetchSessionGroups,
  type OpsEvent,
  type AgentStat,
  type SessionGroup,
} from "@/lib/ops";

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

const SCM_AGENT_MANIFEST = [
  { id: "tms-otif-kpi",          domain: "TMS", label: "OTIF KPI" },
  { id: "tms-shipment",          domain: "TMS", label: "운송장·배차" },
  { id: "tms-cost-lane",         domain: "TMS", label: "운임·Lane" },
  { id: "tms-carrier",           domain: "TMS", label: "Carrier 소싱" },
  { id: "tms-improvement",       domain: "TMS", label: "TMS 개선" },
  { id: "tms_settlement",        domain: "TMS", label: "Settlement" },
  { id: "wms-inbound",           domain: "WMS", label: "입하·검수" },
  { id: "wms-outbound",          domain: "WMS", label: "출고·피킹" },
  { id: "wms-inventory",         domain: "WMS", label: "재고 정합성" },
  { id: "wms-master-data",       domain: "WMS", label: "마스터데이터" },
  { id: "wms-return",            domain: "WMS", label: "반품·역물류" },
  { id: "scm-logistics-expert",  domain: "SCM", label: "물류 전략" },
  { id: "tax-accounting-expert", domain: "FI",  label: "세무·회계" },
  { id: "consulting-pm-expert",  domain: "PM",  label: "PM·컨설팅" },
  { id: "meeting-analysis",      domain: "OPS", label: "회의록" },
] as const;

type MergedAgent = {
  agent_id: string;
  label: string;
  domain: string;
  count: number;
  last_run: string;
};

export function OpsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAgent = searchParams.get("agent") ?? "";

  const [events, setEvents]       = useState<OpsEvent[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [sessions, setSessions]   = useState<SessionGroup[]>([]);
  const [viewMode, setViewMode]   = useState<"feed" | "sessions">("feed");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [evts, stats, sesh] = await Promise.all([
        fetchRecentEvents({ agentId: selectedAgent || undefined }),
        fetchAgentStats(),
        fetchSessionGroups(),
      ]);
      setEvents(evts);
      setAgentStats(stats);
      setSessions(sesh);
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
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  const successRate = todayEvents.length
    ? Math.round(
        (todayEvents.filter((e) => e.status === "completed").length /
          todayEvents.length) *
          1000
      ) / 10
    : null;

  const lastEvent = events[0] ?? null;

  // Merge manifest (always show all SCM agents) with DB stats
  const mergedAgents = useMemo((): MergedAgent[] => {
    const dbMap = new Map(agentStats.map((s) => [s.agent_id, s]));
    const result: MergedAgent[] = [];

    for (const a of SCM_AGENT_MANIFEST) {
      const db = dbMap.get(a.id);
      result.push({
        agent_id: a.id,
        label: a.label,
        domain: a.domain,
        count: db?.count ?? 0,
        last_run: db?.last_run ?? "",
      });
      dbMap.delete(a.id);
    }
    // DB agents not in manifest (e.g. "Explore", "general-purpose")
    for (const [id, s] of dbMap) {
      result.push({ agent_id: id, label: id, domain: "", count: s.count, last_run: s.last_run });
    }
    return result.sort((a, b) => b.count - a.count);
  }, [agentStats]);

  // Filter sessions by selected agent
  const filteredSessions = useMemo(() => {
    if (!selectedAgent) return sessions;
    return sessions.filter((s) =>
      s.agents.some((a) => a.agent_id === selectedAgent)
    );
  }, [sessions, selectedAgent]);

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <KpiStat
              label="오늘 실행"
              value={loading ? "—" : todayEvents.length}
              footer={`harness ${todayEvents.filter((e) => e.source === "harness").length} · hook ${todayEvents.filter((e) => e.source === "hook").length}`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <KpiStat
              label="성공률"
              value={successRate === null ? "—" : `${successRate}%`}
              footer={`${todayEvents.filter((e) => e.status === "completed").length} / ${todayEvents.length} completed`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <KpiStat
              label="마지막 실행"
              value={lastEvent ? relativeTime(lastEvent.created_at) : "—"}
              footer={lastEvent?.agent_id ?? ""}
            />
          </CardContent>
        </Card>
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
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${
                !selectedAgent
                  ? "bg-accent text-ink font-medium"
                  : "text-smoke hover:text-ink hover:bg-accent/50"
              }`}
            >
              전체
            </button>
            {mergedAgents.map((s) => (
              <button
                key={s.agent_id}
                onClick={() => setSearchParams({ agent: s.agent_id })}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                  selectedAgent === s.agent_id
                    ? "bg-accent text-ink font-medium"
                    : s.count === 0
                    ? "text-smoke/40 hover:text-smoke hover:bg-accent/30"
                    : "text-smoke hover:text-ink hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {s.domain && (
                    <span
                      className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                        DOMAIN_COLOR[s.domain]?.split(" ")[0] ?? "bg-smoke/40"
                      }`}
                    />
                  )}
                  <span className="truncate">{s.label}</span>
                </div>
                <span className={`ml-2 shrink-0 text-xs ${s.count === 0 ? "text-smoke/30" : "text-smoke"}`}>
                  {s.count}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Event feed */}
        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-ink">
              {selectedAgent
                ? mergedAgents.find((a) => a.agent_id === selectedAgent)?.label ?? selectedAgent
                : "Activity Feed"}
            </span>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs text-smoke">
                {loading ? "로딩 중…" : viewMode === "feed" ? `${events.length}건` : `${filteredSessions.length}개 세션`}
              </span>
              {/* View mode toggle */}
              <div className="flex rounded border border-divider/50 overflow-hidden text-[11px]">
                <button
                  onClick={() => setViewMode("feed")}
                  className={`px-2 py-0.5 ${viewMode === "feed" ? "bg-accent text-ink" : "text-smoke hover:text-ink"}`}
                >
                  피드
                </button>
                <button
                  onClick={() => setViewMode("sessions")}
                  className={`px-2 py-0.5 border-l border-divider/50 ${viewMode === "sessions" ? "bg-accent text-ink" : "text-smoke hover:text-ink"}`}
                >
                  세션별
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {viewMode === "feed" ? (
              events.length === 0 && !loading ? (
                <p className="px-6 py-8 text-sm text-smoke text-center">이벤트 없음</p>
              ) : (
                <ul className="divide-y divide-divider/50">
                  {events.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
              )
            ) : (
              filteredSessions.length === 0 && !loading ? (
                <p className="px-6 py-8 text-sm text-smoke text-center">세션 없음</p>
              ) : (
                <div>
                  {filteredSessions.map((s, i) => (
                    <SessionCard key={s.session_id} group={s} defaultOpen={i < 3} />
                  ))}
                </div>
              )
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

function SessionCard({ group, defaultOpen }: { group: SessionGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const kst = KST.format(new Date(group.started_at));

  return (
    <div className="border-b border-divider/50 last:border-0">
      <button
        className="w-full flex items-center gap-2 px-5 py-3 text-sm hover:bg-accent/30 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-[10px] text-smoke/50">{open ? "▾" : "▸"}</span>
        <span className="font-medium text-ink">{kst}</span>
        <span className="text-xs text-smoke">· {group.agents.length}개 에이전트</span>
        <span className="ml-auto text-[10px] text-smoke/70">{relativeTime(group.started_at)}</span>
      </button>
      {open && (
        <ul className="pb-2 bg-accent/10">
          {group.agents.map((e) => (
            <li key={e.id} className="flex items-center gap-2.5 px-8 py-1.5 text-xs hover:bg-accent/20">
              <div
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  e.status === "completed" ? "bg-success" :
                  e.status === "failed"    ? "bg-destructive" :
                                             "bg-smoke"
                }`}
              />
              <span className="font-medium text-ink w-36 shrink-0 truncate">{e.agent_id}</span>
              {e.domain && (
                <span className={`rounded px-1.5 py-px text-[10px] font-medium shrink-0 ${DOMAIN_COLOR[e.domain] ?? "bg-muted text-smoke"}`}>
                  {e.domain}
                </span>
              )}
              {e.summary && (
                <span className="text-smoke truncate">{e.summary}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}