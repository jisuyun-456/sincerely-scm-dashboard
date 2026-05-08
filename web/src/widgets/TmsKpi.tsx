import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type TmsKpiRow = {
  snapshot_date: string;
  active_shipments: number;
  otif_pct: number | null;
  pending_pods: number;
  carrier_breakdown: Record<string, number>;
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
});

function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

function OtifDelta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-smoke">—</span>;
  const target = 90;
  if (pct >= target)
    return (
      <span className="text-emerald-600 text-xs font-mono">
        ▲ {pct.toFixed(1)}%
      </span>
    );
  return (
    <span className="text-crail text-xs font-mono">
      ▼ {pct.toFixed(1)}%
    </span>
  );
}

function CarrierBar({
  name,
  count,
  total,
}: {
  name: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="w-20 truncate text-xs text-smoke">{name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-divider overflow-hidden">
        <div
          className="h-full rounded-full bg-crail/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-right font-mono text-xs text-ink tnum">
        {count}
      </span>
    </li>
  );
}

export function TmsKpi() {
  const [row, setRow] = useState<TmsKpiRow | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("tms_kpi")
        .select(
          "snapshot_date, active_shipments, otif_pct, pending_pods, carrier_breakdown",
        )
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("TmsKpi fetch error:", error);
        setRow(null);
        return;
      }
      setRow((data as TmsKpiRow | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = row === "loading";
  const data = row === "loading" ? null : row;

  const carriers = data
    ? Object.entries(data.carrier_breakdown ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];
  const totalCarrier = carriers.reduce((s, [, n]) => s + n, 0);

  const meta = data
    ? formatDate(data.snapshot_date)
    : loading
      ? "Loading"
      : "No data";

  return (
    <Card>
      <SectionHeader title="TMS · Active" meta={meta} />
      <div className="px-6 py-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        ) : data === null ? (
          <p className="text-sm text-smoke">No sync data yet — trigger a workflow run first.</p>
        ) : (
          <>
            {/* Top KPI row */}
            <div className="flex items-end gap-6 mb-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-smoke mb-1">
                  Active
                </p>
                <p className="font-display text-4xl font-medium text-ink tabular-nums leading-none">
                  {data.active_shipments}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-smoke mb-1">
                  OTIF
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-display text-4xl font-medium text-ink tabular-nums leading-none">
                    {data.otif_pct !== null ? Math.round(data.otif_pct) : "—"}
                  </p>
                  {data.otif_pct !== null && (
                    <span className="text-sm text-smoke">%</span>
                  )}
                </div>
                <OtifDelta pct={data.otif_pct} />
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs uppercase tracking-wide text-smoke mb-1">
                  Pending POD
                </p>
                <p className="font-display text-4xl font-medium text-ink tabular-nums leading-none">
                  {data.pending_pods}
                </p>
              </div>
            </div>

            {/* Carrier breakdown */}
            {carriers.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-smoke mb-2">
                  Carrier
                </p>
                <ul className="divide-y divide-divider/40">
                  {carriers.map(([name, count]) => (
                    <CarrierBar
                      key={name}
                      name={name}
                      count={count}
                      total={totalCarrier}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
