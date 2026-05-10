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

const DOMAINS = ["ALL", "TMS", "WMS", "INFRA", "DEV"] as const;
type Domain = typeof DOMAINS[number];

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

function tagPill(entryType: string) {
  if (entryType.includes("TMS")) return { label: "TMS", cls: "bg-crail/10 text-crail" };
  if (entryType.includes("WMS")) return { label: "WMS", cls: "bg-warning/15 text-warning" };
  if (entryType.includes("INFRA")) return { label: "INFRA", cls: "bg-divider/60 text-smoke" };
  if (entryType.includes("DEV")) return { label: "DEV", cls: "bg-divider/60 text-ink" };
  return { label: entryType.slice(0, 6), cls: "bg-divider/60 text-smoke" };
}

export function VaultResearchTimeline() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [domain, setDomain] = useState<Domain>("ALL");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("autoresearch_log")
        .select("log_date, entry_type, title, status, output_link")
        .order("log_date", { ascending: false });
      if (cancelled) return;
      setRows((data ?? []) as Row[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = rows?.filter(r => domain === "ALL" || r.entry_type.includes(domain)) ?? [];

  return (
    <Card>
      <SectionHeader title="AutoResearch · 전체 기록" meta={rows ? `${filtered.length}건` : "Loading"} />
      <div className="flex gap-1 border-b border-divider/40 px-6 pb-0 pt-1">
        {DOMAINS.map(d => (
          <button key={d} onClick={() => setDomain(d)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              domain === d ? "border-b-2 border-crail text-crail" : "text-smoke hover:text-ink"
            }`}>
            {d}
          </button>
        ))}
      </div>
      <ul className="max-h-[640px] overflow-y-auto divide-y divide-divider/40">
        {rows === null ? (
          <li className="space-y-3 px-6 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </li>
        ) : filtered.length === 0 ? (
          <li className="py-12 text-center text-sm text-smoke">항목 없음</li>
        ) : (
          filtered.map(r => {
            const pill = tagPill(r.entry_type);
            return (
              <li key={`${r.log_date}-${r.title}`}
                className="grid grid-cols-[88px_56px_1fr] items-center gap-4 px-6 py-3 text-sm hover:bg-divider/20">
                <span className="font-mono text-xs text-smoke tabular-nums">
                  {DATE_FMT.format(new Date(r.log_date))}
                </span>
                <span className={`inline-flex justify-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${pill.cls}`}>
                  {pill.label}
                </span>
                {r.output_link ? (
                  <a href={r.output_link} target="_blank" rel="noreferrer noopener"
                    className="truncate text-ink hover:text-crail hover:underline">{r.title}</a>
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
