import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { SyncHealth } from "@/widgets/SyncHealth";
import { Tasks } from "@/widgets/Tasks";
import { TmsKpi } from "@/widgets/TmsKpi";
import { AgentFeed } from "@/widgets/AgentFeed";
import { AutoResearchTrend } from "@/widgets/AutoResearchTrend";
import { AutoResearchLog } from "@/widgets/AutoResearchLog";

type LastSync = {
  job_name: string;
  status: string;
  started_at: string;
};

const TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatTimeKst(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

function formatDateKst(iso: string): string {
  const parts = DATE_FORMAT.formatToParts(new Date(iso));
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [lastSync, setLastSync] = useState<LastSync | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("sync_runs")
        .select("job_name, status, started_at")
        .order("started_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) setError(error.message);
      else setLastSync((data?.[0] as LastSync | undefined) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header lastSync={lastSync} error={error} />
      <main className="mx-auto max-w-[1280px] px-6 pb-16 pt-8 sm:px-8 lg:px-12">
        {/* Row 1: KPI + Status tiles */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TmsKpi />
          <Tasks />
          <SyncHealth />
        </div>

        {/* Row 2: Trend chart */}
        <div className="mt-4">
          <AutoResearchTrend />
        </div>

        {/* Row 3: Activity + Log */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <AgentFeed />
          <AutoResearchLog />
        </div>

        <Footer />
      </main>
    </div>
  );
}

function Header({
  lastSync,
  error,
}: {
  lastSync: LastSync | null;
  error: string | null;
}) {
  return (
    <header className="border-b border-divider/70 bg-background">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8 lg:px-12">
        <div className="flex items-baseline gap-3">
          <span
            aria-hidden
            className="font-display text-3xl leading-none text-crail"
          >
            ❈
          </span>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            Sincerely SCM
          </h1>
          <span className="text-sm text-smoke">Agentic OS</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-smoke">
          {error ? (
            <span className="text-destructive">⚠ {error}</span>
          ) : lastSync ? (
            <span className="inline-flex items-center gap-2">
              <span>Last sync</span>
              <span className="font-mono text-ink tnum">
                {formatDateKst(lastSync.started_at)}{" "}
                {formatTimeKst(lastSync.started_at)}
              </span>
              <StatusGlyph
                variant={lastSync.status === "ok" ? "ok" : "failed"}
                label={lastSync.status === "ok" ? "OK" : "Failed"}
              />
            </span>
          ) : (
            <span>Loading…</span>
          )}
          <span className="text-divider">·</span>
          <nav className="flex items-center gap-3 text-xs">
            <span className="hover:text-ink cursor-default">Vault</span>
            <span className="hover:text-ink cursor-default">TMS</span>
            <span className="hover:text-ink cursor-default">WMS</span>
            <span className="hover:text-ink cursor-default">Log</span>
          </nav>
        </div>
      </div>
    </header>
  );
}


function Footer() {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-divider/70 pt-4 text-xs text-smoke">
      <span>Sincerely SCM · Dashboard · v1.6</span>
      <span>Solo mode · daily refresh @ 00:00 KST</span>
    </div>
  );
}
