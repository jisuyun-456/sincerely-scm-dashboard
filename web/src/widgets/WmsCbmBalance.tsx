import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { KpiStat } from "@/components/ui/kpi-stat";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type BalanceRow = {
  snapshot_date: string;
  ytd_inbound_cbm: number;
  ytd_outbound_cbm: number;
  net_stock_cbm: number;
  utilization_pct: number;
  available_cbm: number;
  capacity_outbound: number;
};

function utilBarColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 75) return "bg-amber-400";
  return "bg-emerald-500";
}

export function WmsCbmBalance() {
  const [row, setRow] = useState<BalanceRow | "loading" | null>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("wms_cbm_balance")
        .select("snapshot_date,ytd_inbound_cbm,ytd_outbound_cbm,net_stock_cbm,utilization_pct,available_cbm,capacity_outbound")
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .single();
      if (cancelled) return;
      if (error || !data) { setRow(null); return; }
      setRow(data as BalanceRow);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = row === "loading";
  const b = typeof row === "object" && row !== null ? row : null;

  return (
    <Card>
      <SectionHeader
        title="창고 Running Balance"
        meta={b ? `기준: ${b.snapshot_date}` : undefined}
      />
      <div className="px-6 py-5">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : !b ? (
          <p className="py-10 text-center text-sm text-smoke">데이터 없음 — sync 후 확인</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-6 mb-5">
              <KpiStat
                label="현재 재고 CBM"
                value={b.net_stock_cbm.toFixed(2)}
                unit="m³"
                footer={`YTD 입하 ${b.ytd_inbound_cbm.toFixed(2)} · 출하 ${b.ytd_outbound_cbm.toFixed(2)} m³`}
              />
              <KpiStat
                label="창고 용적률"
                value={b.utilization_pct.toFixed(1)}
                unit={`% / ${b.capacity_outbound}m³`}
              />
              <KpiStat
                label="가용 공간"
                value={b.available_cbm.toFixed(2)}
                unit="m³"
              />
            </div>
            <div className="w-full h-2 rounded-full bg-divider overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${utilBarColor(b.utilization_pct)}`}
                style={{ width: `${Math.min(b.utilization_pct, 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-smoke">
              <span>0%</span>
              <span className="ml-[75%]">75%</span>
              <span>100%</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
