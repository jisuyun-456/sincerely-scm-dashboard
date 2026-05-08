import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Row = {
  log_date: string;
  entry_type: string;
  title: string;
  status: string | null;
  output_link: string | null;
};

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function tagPill(entryType: string): { label: string; cls: string } {
  if (entryType.startsWith("WEEKLY_TMS"))
    return { label: "TMS", cls: "bg-crail/10 text-crail" };
  if (entryType.startsWith("WEEKLY_WMS"))
    return { label: "WMS", cls: "bg-warning/15 text-warning" };
  if (entryType.includes("INFRA"))
    return { label: "INFRA", cls: "bg-divider/60 text-smoke" };
  return { label: entryType.slice(0, 8), cls: "bg-divider/60 text-smoke" };
}

export function AutoResearchLog() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("autoresearch_log")
        .select("log_date, entry_type, title, status, output_link")
        .order("log_date", { ascending: false })
        .limit(8);
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data ?? []) as Row[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const meta = rows ? `${rows.length} entries` : "Loading";

  return (
    <Card>
      <SectionHeader title="AutoResearch · Log" meta={meta} />
      <ul className="divide-y divide-divider/40">
        {rows === null ? (
          <li className="space-y-3 px-6 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </li>
        ) : error ? (
          <li className="px-6 py-4 text-sm text-destructive">⚠ {error}</li>
        ) : rows.length === 0 ? (
          <li className="px-6 py-12 text-center text-sm text-smoke">
            No log entries yet.
          </li>
        ) : (
          rows.map((r) => {
            const pill = tagPill(r.entry_type);
            return (
              <li
                key={`${r.log_date}-${r.title}`}
                className="grid grid-cols-[88px_56px_1fr] items-center gap-4 px-6 py-3 text-sm hover:bg-divider/20"
              >
                <span className="font-mono text-xs text-smoke tnum">
                  {DATE_FMT.format(new Date(r.log_date))}
                </span>
                <span
                  className={`inline-flex justify-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-editorial ${pill.cls}`}
                >
                  {pill.label}
                </span>
                {r.output_link ? (
                  <a
                    href={r.output_link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="truncate text-ink hover:text-crail hover:underline"
                  >
                    {r.title}
                  </a>
                ) : (
                  <span className="truncate text-ink">{r.title}</span>
                )}
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}
