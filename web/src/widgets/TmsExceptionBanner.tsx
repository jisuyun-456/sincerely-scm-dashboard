import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PodRow = {
  snapshot_date: string;
  shipment_id: string;
  sc_id: string | null;
  shipment_date: string | null;
  aging_days: number | null;
};

export function TmsExceptionBanner() {
  const [overdue, setOverdue] = useState<PodRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tms_pod_aging")
        .select("snapshot_date, shipment_id, sc_id, shipment_date, aging_days")
        .order("snapshot_date", { ascending: false })
        .limit(300);
      if (cancelled || !data || data.length === 0) return;
      const maxDate = (data as PodRow[])[0].snapshot_date;
      const latest = (data as PodRow[]).filter(r => r.snapshot_date === maxDate);
      setOverdue(
        latest
          .filter(r => (r.aging_days ?? 0) > 7)
          .sort((a, b) => (b.aging_days ?? 0) - (a.aging_days ?? 0)),
      );
    })();
    return () => { cancelled = true; };
  }, []);

  if (overdue.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <span className="text-base">⚠</span>
        배송 지연 {overdue.length}건 — POD 미확인 8일+ 초과
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {overdue.slice(0, 10).map(r => (
          <span
            key={r.shipment_id}
            className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-mono text-destructive"
          >
            {r.sc_id ?? r.shipment_id.slice(0, 8)} · {r.aging_days}d
          </span>
        ))}
        {overdue.length > 10 && (
          <span className="text-xs text-smoke">+{overdue.length - 10}건 더</span>
        )}
      </div>
    </div>
  );
}
