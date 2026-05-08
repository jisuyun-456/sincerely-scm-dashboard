import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { SyncHealth } from "@/widgets/SyncHealth";
import { Tasks } from "@/widgets/Tasks";

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
  // returns "08/05/2026" — convert to "2026-05-08"
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
    <div className="min-h-screen bg-background text-foreground dark">
      <Header lastSync={lastSync} error={error} />
      <main className="mx-auto max-w-[1400px] px-6 pb-12 pt-6">
        {/* Row 1: KPI tiles */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PlaceholderTile title="TMS · ACTIVE" code="B" />
          <Tasks />
          <SyncHealth />
        </div>

        {/* Row 2: Trend chart */}
        <div className="mt-3">
          <PlaceholderTile
            title="AUTORESEARCH · KPI TREND · 8W"
            code="C"
            wide
          />
        </div>

        {/* Row 3: Activity + Log */}
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <PlaceholderTile title="AGENT ACTIVITY · LIVE" code="E" />
          <PlaceholderTile title="AUTORESEARCH · LOG" code="F" />
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
    <header className="border-b border-zinc-800 bg-black px-6 py-4">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold uppercase tracking-terminal text-orange-warm">
            SINCERELY-SCM
          </h1>
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">
            · AGENTIC OS
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {error ? (
            <span className="text-destructive">⚠ {error}</span>
          ) : lastSync ? (
            <>
              <span>
                LAST SYNC ·{" "}
                <span className="text-zinc-300 tabular-nums">
                  {formatDateKst(lastSync.started_at)}{" "}
                  {formatTimeKst(lastSync.started_at)}
                </span>
              </span>
              <span className="text-zinc-700">·</span>
              <StatusGlyph
                variant={lastSync.status === "ok" ? "ok" : "failed"}
                label={lastSync.status.toUpperCase()}
              />
            </>
          ) : (
            <span>LOADING</span>
          )}
          <span className="text-zinc-700">·</span>
          <span>
            VAULT · TMS · WMS · LOG
          </span>
        </div>
      </div>
    </header>
  );
}

function PlaceholderTile({
  title,
  code,
  wide,
}: {
  title: string;
  code: string;
  wide?: boolean;
}) {
  return (
    <Card className={wide ? "min-h-[200px]" : "min-h-[160px]"}>
      <SectionHeader title={title} meta={`WIDGET · ${code}`} />
      <div className="flex h-full items-center justify-center px-4 py-6">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-terminal text-zinc-700">
            COMING NEXT
          </div>
          <div className="mt-1 font-mono text-xs text-zinc-600">
            ┄┄┄┄┄┄┄┄┄┄
          </div>
        </div>
      </div>
    </Card>
  );
}

function Footer() {
  return (
    <div className="mt-8 border-t border-zinc-800 pt-3 text-[10px] uppercase tracking-wide text-zinc-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>SINCERELY-SCM · DASHBOARD · v1.5</span>
        <span>SOLO MODE · DAILY REFRESH @ 00:00 KST</span>
      </div>
    </div>
  );
}
