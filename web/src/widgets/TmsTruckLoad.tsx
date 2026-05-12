import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type LoadRow = {
  partner_name: string;
  loaded_m3: number;
  capacity_m3: number;
  utilization_pct: number;
  status: "green" | "yellow" | "red";
  shipment_count: number;
  snapshot_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  green:  "bg-green-100 text-green-800",
  yellow: "bg-amber-100 text-amber-800",
  red:    "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  green:  "여유",
  yellow: "주의",
  red:    "초과",
};

export function TmsTruckLoad() {
  const [rows, setRows] = useState<LoadRow[] | "loading" | null>("loading");
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Get latest snapshot
      const { data: latest, error: e1 } = await supabase
        .from("tms_truck_load_today")
        .select("snapshot_at")
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .single();
      if (cancelled) return;
      if (e1 || !latest) { setRows(null); return; }
      const latestRow = latest as { snapshot_at: string };
      setSnapshotAt(latestRow.snapshot_at);

      const { data, error } = await supabase
        .from("tms_truck_load_today")
        .select("partner_name, loaded_m3, capacity_m3, utilization_pct, status, shipment_count, snapshot_at")
        .eq("snapshot_at", latestRow.snapshot_at)
        .order("partner_name", { ascending: true });
      if (cancelled) return;
      if (error) { setRows(null); return; }
      setRows((data as LoadRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const snapshotLabel = snapshotAt
    ? new Date(snapshotAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Card>
      <SectionHeader title="트럭 적재 현황" meta={snapshotLabel ? `${snapshotLabel} 기준` : "오늘"} />
      <div className="px-4 py-3">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : !Array.isArray(rows) || rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-smoke">데이터 없음 — sync 후 확인</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-smoke border-b border-gray-100">
                <th className="py-1 text-left font-normal">기사</th>
                <th className="py-1 text-right font-normal">적재량</th>
                <th className="py-1 text-right font-normal">용량</th>
                <th className="py-1 text-right font-normal">이용률</th>
                <th className="py-1 text-right font-normal">건수</th>
                <th className="py-1 text-right font-normal">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.partner_name} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 font-medium">{r.partner_name}</td>
                  <td className="py-2 text-right tabular-nums">{r.loaded_m3.toFixed(2)}㎥</td>
                  <td className="py-2 text-right tabular-nums text-smoke">{r.capacity_m3}㎥</td>
                  <td className="py-2 text-right tabular-nums font-semibold">{r.utilization_pct.toFixed(1)}%</td>
                  <td className="py-2 text-right tabular-nums text-smoke">{r.shipment_count}건</td>
                  <td className="py-2 text-right">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? ""}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
