import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { HomePage } from "@/pages/HomePage";
import { TmsPage } from "@/pages/TmsPage";
import { WmsPage } from "@/pages/WmsPage";
import { VaultPage } from "@/pages/VaultPage";
import { LogPage } from "@/pages/LogPage";
import { PipelinePage } from "@/pages/PipelinePage";

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tms" element={<TmsPage />} />
          <Route path="/wms" element={<WmsPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
        </Routes>
        <Footer />
      </main>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={active ? "text-ink font-medium" : "hover:text-ink text-smoke"}
    >
      {label}
    </Link>
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
            className="inline-block font-display text-3xl leading-none text-crail animate-spin-slow"
          >
            ❈
          </span>
          <Link to="/" className="font-display text-2xl font-medium tracking-tight text-ink hover:opacity-80">
            Sincerely SCM
          </Link>
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
            <NavLink to="/" label="Home" />
            <NavLink to="/tms" label="TMS" />
            <NavLink to="/wms" label="WMS" />
            <NavLink to="/vault" label="Vault" />
            <NavLink to="/log" label="Log" />
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-divider/70 pt-4 text-xs text-smoke">
      <span>Sincerely SCM · Dashboard · v1.8</span>
      <span>Solo mode · daily refresh @ 00:00 KST</span>
    </div>
  );
}
