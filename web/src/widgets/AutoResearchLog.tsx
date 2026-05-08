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

function tagColor(entryType: string): string {
  if (entryType.startsWith("WEEKLY_TMS")) return "text-orange-warm";
  if (entryType.startsWith("WEEKLY_WMS")) return "text-warning";
  if (entryType.includes("INFRA")) return "text-zinc-400";
  return "text-zinc-500";
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
      if (error) {
        setError(error.message);
      } else {
        setRows((data ?? []) as Row[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const meta = rows ? `${rows.length} ENTRIES` : "LOADING";

  return (
    <Card className="min-h-[200px]">
      <SectionHeader title="AUTORESEARCH · LOG" meta={meta} />
      <div className="divide-y divide-zinc-800 text-xs">
        {rows === null ? (
          <div className="space-y-2 px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-3 text-destructive">⚠ {error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-wide text-zinc-600">
            ○ NO LOG ENTRIES YET
          </div>
        ) : (
          rows.map((r) => {
            const tag = r.entry_type.replace(/^WEEKLY_/, "");
            return (
              <div
                key={`${r.log_date}-${r.title}`}
                className="grid grid-cols-[88px_56px_1fr] items-center gap-3 px-4 py-2 hover:bg-zinc-900/40"
              >
                <span className="font-mono tabular-nums text-zinc-500">
                  {DATE_FMT.format(new Date(r.log_date))}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wide ${tagColor(
                    r.entry_type,
                  )}`}
                >
                  · {tag}
                </span>
                {r.output_link ? (
                  <a
                    href={r.output_link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="truncate text-zinc-300 hover:text-orange-warm hover:underline"
                  >
                    {r.title}
                  </a>
                ) : (
                  <span className="truncate text-zinc-300">{r.title}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
