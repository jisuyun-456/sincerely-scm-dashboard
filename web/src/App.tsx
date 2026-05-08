import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SyncRun = {
  id: number;
  job_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
};

export default function App() {
  const [lastSync, setLastSync] = useState<SyncRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("sync_runs")
        .select("id, job_name, status, started_at, finished_at")
        .order("started_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) setError(error.message);
      else setLastSync(data?.[0] ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Sincerely SCM · Agentic OS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Solo dashboard · daily refresh @ 00:00 KST
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {error ? (
            <span className="text-destructive">⚠ {error}</span>
          ) : lastSync ? (
            <>
              Last sync:{" "}
              <span className="text-foreground">
                {new Date(lastSync.started_at).toLocaleString("ko-KR")}
              </span>{" "}
              ·{" "}
              <span
                className={
                  lastSync.status === "ok"
                    ? "text-success"
                    : lastSync.status === "failed"
                      ? "text-destructive"
                      : "text-warning"
                }
              >
                {lastSync.status === "ok" ? "✓" : "✗"} {lastSync.status}
              </span>
            </>
          ) : (
            "No sync yet"
          )}
        </div>
      </header>

      <main className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Placeholder title="📦 TMS Today" subtitle="Widget B — coming next" />
          <Placeholder title="📋 Tasks" subtitle="Widget D — coming next" />
          <Placeholder title="🔄 Sync Health" subtitle="Widget J — coming next" />
        </div>
        <div className="mt-4">
          <Placeholder
            title="📈 AutoResearch KPI Trend"
            subtitle="Widget C — coming next"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Placeholder
            title="🤖 Agent Activity"
            subtitle="Widget E — coming next"
          />
          <Placeholder
            title="📓 AutoResearch Log"
            subtitle="Widget F — coming next"
          />
        </div>
      </main>
    </div>
  );
}

function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
    </div>
  );
}
