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
  if (status === "completed") return "ok";
  if (status === "failed") return "failed";
  if (status === "started") return "running";
  return "pending";
}

export function AgentFeed() {
  const [events, setEvents] = useState<AgentEvent[] | null>(null);
  const [live, setLive] = useState(false);
  const containerRef = useRef<HTMLUListElement>(null);

  // Initial fetch: last 20 events
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("agent_events")
        .select("id, event_at, agent_name, status, tool_name, duration_ms, session_id")
        .order("event_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (error) {
        console.error("AgentFeed fetch error:", error);
        setEvents([]);
        return;
      }
      setEvents((data ?? []) as AgentEvent[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("agent_events_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_events" },
        (payload) => {
          const incoming = payload.new as AgentEvent;
          setEvents((prev) => {
            if (!prev) return [incoming];
            return [incoming, ...prev].slice(0, 20);
          });
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Today summary
  const today = todayKst();
  const todayEvents = (events ?? []).filter((e) =>
    e.event_at.startsWith(today),
  );
  const failCount = todayEvents.filter((e) => e.status === "failed").length;
  const durations = todayEvents
    .filter((e) => e.duration_ms !== null)
    .map((e) => e.duration_ms as number);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

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
      <SectionHeader title="Agent Activity" meta={meta} />
      <div className="px-6 py-5">
        {events === null ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-28 flex-1" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-smoke">
            No events yet. Sessions will appear here once hooks are configured.
          </p>
        ) : (
          <ul ref={containerRef} className="divide-y divide-divider/40">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2.5 text-sm"
              >
                <span className="font-mono text-xs text-smoke tnum">
                  {formatTime(ev.event_at)}
                </span>
                <span className="truncate text-ink">
                  {ev.agent_name ?? "claude-code"}
                  {ev.tool_name && (
                    <span className="ml-1.5 text-xs text-smoke">
                      · {ev.tool_name}
                    </span>
                  )}
                </span>
                <span className="font-mono text-xs text-smoke tnum">
                  {formatDuration(ev.duration_ms)}
                </span>
                <StatusGlyph
                  variant={statusVariant(ev.status)}
                  label={ev.status}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {events !== null && events.length > 0 && (
        <div className="flex items-center justify-between border-t border-divider/70 px-6 py-3 text-xs text-smoke">
          <span>
            Today · {todayEvents.length} runs
            {failCount > 0 && (
              <span className="ml-1 text-crail">· {failCount} failed</span>
            )}
            {avgDuration !== null && (
              <span className="ml-1">· avg {formatDuration(avgDuration)}</span>
            )}
          </span>
          <span>SCM_WORK · hooks</span>
        </div>
      )}
    </Card>
  );
}
