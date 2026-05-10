import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type CarrierRow = {
  snapshot_date: string;
  partner_name: string;
  total_shipments: number;
  delivered_count: number;
  otif_pct: number | null;
};

export function TmsCarrierRanking() {
  const [rows, setRows] = useState<CarrierRow[] | "loading" | null>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("tms_carrier_otif")
        .select("snapshot_date, partner_name, total_shipments, delivered_count, otif_pct")
        .order("snapshot_date", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) { setRows(null); return; }
      if (!data || data.length === 0) { setRows([]); return; }
      const maxDate = (data as CarrierRow[])[0].snapshot_date;
      setRows(
        (data as CarrierRow[])
          .filter(r => r.snapshot_date === maxDate)
          .sort((a, b) => (b.otif_pct ?? 0) - (a.otif_pct ?? 0)),
      );
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const data = Array.isArray(rows) ? rows : null;

  return (
    <Card>
      <SectionHeader
        title="배송사별 완료율"
        meta={loading ? "Loading" : data ? `최근 30일 · ${data.length}개사` : "No data"}
      />
      <div className="px-6 py-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-smoke">데이터 없음 — sync 후 확인</p>
        ) : (
          <ul className="space-y-3">
            {data.map((r, i) => (
              <li key={r.partner_name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 text-right text-xs tabular-nums text-smoke">{i + 1}</span>
                    <span className="text-ink">{r.partner_name}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-ink">
                    {r.otif_pct != null ? `${r.otif_pct.toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-divider/50">
                    <div
                      className="h-full rounded-full bg-crail/70 transition-all"
                      style={{ width: `${r.otif_pct ?? 0}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs tabular-nums text-smoke">
                    {r.delivered_count}/{r.total_shipments}건
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
