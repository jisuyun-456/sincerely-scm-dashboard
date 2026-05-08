import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { PriorityBar } from "@/components/ui/priority-bar";
import { InlineProgress } from "@/components/ui/inline-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Row = {
  snapshot_date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  done: number;
};

type Variant = "critical" | "high" | "medium" | "low";

const ROWS: { key: Variant; label: string }[] = [
  { key: "critical", label: "CRITICAL" },
  { key: "high", label: "HIGH" },
  { key: "medium", label: "MEDIUM" },
  { key: "low", label: "LOW" },
];

export function Tasks() {
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("snapshot_date, critical, high, medium, low, done")
        .order("snapshot_date", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setRow((data?.[0] as Row | undefined) ?? null);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const open = row ? row.critical + row.high + row.medium + row.low : 0;
  const done = row?.done ?? 0;
  const total = open + done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const meta = row ? `${total} TOTAL` : "LOADING";

  return (
    <Card className="min-h-[200px]">
      <SectionHeader title="TASKS · OPEN" meta={meta} />
      <div className="px-4 py-3 font-mono text-xs">
        {!loaded ? (
          <div className="space-y-2.5">
            {ROWS.map((r) => (
              <div key={r.key} className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-destructive text-xs">⚠ {error}</div>
        ) : !row ? (
          <div className="space-y-2 text-zinc-500">
            <div className="text-[11px] uppercase tracking-wide">
              ○ NO SNAPSHOT YET
            </div>
            <div className="text-[10px] text-zinc-600">
              Run sync.yml workflow_dispatch to populate.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {ROWS.map((r) => (
              <div
                key={r.key}
                className="grid grid-cols-[80px_1fr_auto] items-center gap-3"
              >
                <span className="uppercase tracking-wide text-zinc-400">
                  {r.label}
                </span>
                <PriorityBar count={row[r.key]} variant={r.key} />
                <span className="text-right tabular-nums text-zinc-200">
                  {row[r.key]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {row ? (
        <div className="border-t border-zinc-800 px-4 py-3">
          <InlineProgress value={pct} current={done} total={total} />
        </div>
      ) : null}
    </Card>
  );
}
