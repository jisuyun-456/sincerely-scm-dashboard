import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type AgentEvent = {
  id: number;
  event_at: string;
  agent_name: string | null;
  status: string;
  tool_name: string | null;
  duration_ms: number | null;
  session_id: string | null;
};

type SyncRun = {
  id: number;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_written: number | null;
};

type FeedItem = {
  key: string;
  type: "agent" | "sync";
  time: string;
  label: string;
  sublabel: string | null;
  status: string;
  duration_ms: number | null;
};

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const TODAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
});

function formatTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

function todayKst(): string {
  return TODAY_FORMAT.format(new Date());
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusVariant(
  status: string,
): Parameters<typeof StatusGlyph>[0]["variant"] {
  if (status === "completed" || status === "ok") return "ok";
  if (status === "failed") return "failed";
  if (status === "started") return "running";
  return "pending";
}

function agentToFeedItem(ev: AgentEvent): FeedItem {
  return {
    key: `agent-${ev.id}`,
    type: "agent",
    time: ev.event_at,
    label: ev.agent_name ?? "claude-code",
    sublabel: ev.tool_name ?? null,
    status: ev.status,
    duration_ms: ev.duration_ms,
  };
}

function syncToFeedItem(run: SyncRun): FeedItem {
  const duration_ms =
    run.finished_at
      ? Date.parse(run.finished_at) - Date.parse(run.started_at)
      : null;
  const sublabel =
    run.rows_written != null && run.rows_written > 0
      ? `${run.rows_written} rows`
      : null;
  return {
    key: `sync-${run.id}`,
    type: "sync",
    time: run.started_at,
    label: run.job_name,
    sublabel,
    status: run.status,
    duration_ms,
  };
}

function mergeFeed(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 25);
}

export function AgentFeed() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [live, setLive] = useState(false);
  const containerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [agentRes, syncRes] = await Promise.all([
        supabase
          .from("agent_events")
          .select("id, event_at, agent_name, status, tool_name, duration_ms, session_id")
          .order("event_at", { ascending: false })
          .limit(15),
        supabase
          .from("sync_runs")
          .select("id, job_name, started_at, finished_at, status, rows_written")
          .neq("job_name", "heartbeat")
          .order("started_at", { ascending: false })
          .limit(15),
      ]);
      if (cancelled) return;
      if (agentRes.error) console.error("AgentFeed agent fetch:", agentRes.error);
      if (syncRes.error) console.error("AgentFeed sync fetch:", syncRes.error);

      const agentItems = ((agentRes.data ?? []) as AgentEvent[]).map(agentToFeedItem);
      const syncItems = ((syncRes.data ?? []) as SyncRun[]).map(syncToFeedItem);
      setItems(mergeFeed([...agentItems, ...syncItems]));
    })();
    return () => { cancelled = true; };
  }, []);

  // Realtime for agent_events only
  useEffect(() => {
    const channel = supabase
      .channel("agent_events_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_events" },
        (payload) => {
          const incoming = agentToFeedItem(payload.new as AgentEvent);
          setItems((prev) => {
            if (!prev) return [incoming];
            return mergeFeed([incoming, ...prev]);
          });
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  const today = todayKst();
  const todayItems = (items ?? []).filter((e) => e.time.startsWith(today));
  const agentCount = todayItems.filter((e) => e.type === "agent").length;
  const syncCount = todayItems.filter((e) => e.type === "sync").length;

  const meta = live ? (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crail opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-crail" />
      </span>
      Live
    </span>
  ) : (
    "Connecting…"
  );

  return (
    <Card>
      <SectionHeader title="Ops Activity" meta={meta} />
      <div className="px-6 py-5">
        {items === null ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-28 flex-1" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-smoke">
            No events yet. Sessions and sync runs will appear here.
          </p>
        ) : (
          <ul ref={containerRef} className="divide-y divide-divider/40">
            {items.map((item) => (
              <li
                key={item.key}
                className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-2.5 py-2.5 text-sm"
              >
                <span className="font-mono text-xs text-smoke tnum w-10">
                  {formatTime(item.time)}
                </span>
                <span
                  aria-hidden
                  className={
                    item.type === "agent"
                      ? "text-crail text-[11px] leading-none"
                      : "text-smoke text-[11px] leading-none"
                  }
                >
                  {item.type === "agent" ? "◎" : "⟳"}
                </span>
                <span className="truncate text-ink text-xs">
                  {item.label}
                  {item.sublabel && (
                    <span className="ml-1.5 text-smoke">· {item.sublabel}</span>
                  )}
                </span>
                <span className="font-mono text-xs text-smoke tnum">
                  {formatDuration(item.duration_ms)}
                </span>
                <StatusGlyph
                  variant={statusVariant(item.status)}
                  label={item.status}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {items !== null && items.length > 0 && (
        <div className="flex items-center justify-between border-t border-divider/70 px-6 py-3 text-xs text-smoke">
          <span>
            Today
            {agentCount > 0 && <span className="ml-1">· {agentCount} sessions</span>}
            {syncCount > 0 && <span className="ml-1">· {syncCount} syncs</span>}
            {agentCount === 0 && syncCount === 0 && <span className="ml-1">· no activity</span>}
          </span>
          <span>SCM_WORK · hooks + cron</span>
        </div>
      )}
    </Card>
  );
}