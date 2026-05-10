import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type PodRow = {
  snapshot_date: string;
  shipment_id: string;
  sc_id: string | null;
  shipment_date: string | null;
  aging_days: number | null;
};

type Buckets = { d0_3: number; d4_7: number; d8_14: number; d15plus: number };

function toBuckets(rows: PodRow[]): Buckets {
  const b: Buckets = { d0_3: 0, d4_7: 0, d8_14: 0, d15plus: 0 };
  for (const r of rows) {
    const d = r.aging_days ?? 0;
    if (d <= 3) b.d0_3++;
    else if (d <= 7) b.d4_7++;
    else if (d <= 14) b.d8_14++;
    else b.d15plus++;
  }
  return b;
}

export function TmsPodAging() {
  const [rows, setRows] = useState<PodRow[] | "loading" | null>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("tms_pod_aging")
        .select("snapshot_date, shipment_id, sc_id, shipment_date, aging_days")
        .order("snapshot_date", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) { setRows(null); return; }
      if (!data || data.length === 0) { setRows([]); return; }
      const maxDate = (data as PodRow[])[0].snapshot_date;
      setRows((data as PodRow[]).filter(r => r.snapshot_date === maxDate));
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const data = Array.isArray(rows) ? rows : null;
  const buckets = data ? toBuckets(data) : null;

  return (
    <Card>
      <SectionHeader
        title="POD 미확인 현황"
        meta={loading ? "Loading" : data ? `배송중 ${data.length}건` : "No data"}
      />
      <div className="px-6 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-smoke">배송중 건 없음 — sync 후 확인</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-4 gap-3">
              {([
                { label: "0–3일", val: buckets!.d0_3, cls: "text-ink" },
                { label: "4–7일", val: buckets!.d4_7, cls: "text-warning" },
                { label: "8–14일", val: buckets!.d8_14, cls: "text-destructive/80" },
                { label: "15일+", val: buckets!.d15plus, cls: "font-bold text-destructive" },
              ]).map(({ label, val, cls }) => (
                <div key={label} className="rounded-lg bg-divider/30 p-3 text-center">
                  <div className={`text-xl font-semibold tabular-nums ${cls}`}>{val}</div>
                  <div className="mt-0.5 text-xs text-smoke">{label}</div>
                </div>
              ))}
            </div>
            <ul className="max-h-48 divide-y divide-divider/40 overflow-y-auto text-xs">
              {[...data]
                .sort((a, b) => (b.aging_days ?? 0) - (a.aging_days ?? 0))
                .slice(0, 20)
                .map(r => (
                  <li key={r.shipment_id} className="flex items-center justify-between py-1.5">
                    <span className="font-mono text-smoke">{r.sc_id ?? "—"}</span>
                    <span className="text-smoke">{r.shipment_date ?? "—"}</span>
                    <span className={`font-semibold tabular-nums ${(r.aging_days ?? 0) > 7 ? "text-destructive" : "text-ink"}`}>
                      {r.aging_days ?? "?"}일
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
