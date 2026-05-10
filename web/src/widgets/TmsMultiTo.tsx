import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type ToItem = {
  sc_id: string;
  shipment_date: string | null;
  status: string | null;
};

type MultiToRow = {
  week_start: string;
  pna_code: string;
  pna_name: string | null;
  to_count: number;
  to_list: ToItem[];
};

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

const DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return DATE_FORMAT.format(new Date(iso));
}

function statusDot(status: string | null): string {
  if (!status) return "bg-divider";
  if (status.includes("완료")) return "bg-emerald-500";
  if (status.includes("배송중")) return "bg-blue-400";
  return "bg-amber-400";
}

function PnaRow({ row }: { row: MultiToRow }) {
  const [open, setOpen] = useState(false);
  const clientName = row.pna_name?.replace(/^PNA\d+-/, "") ?? "";
  return (
    <li className="border-b border-divider/40 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-6 py-3 hover:bg-smoke/5 transition-colors text-left"
      >
        <span className="text-xs font-medium text-ink shrink-0">{row.pna_code}</span>
        {clientName && (
          <span className="text-xs text-smoke flex-1 truncate">{clientName}</span>
        )}
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[11px] font-medium text-crail bg-crail/10 px-1.5 py-0.5 rounded">
            {row.to_count}건
          </span>
          <span className="text-smoke text-xs">{open ? "▲" : "▼"}</span>
        </span>
      </button>
      {open && (
        <ul className="px-6 pb-3 space-y-1">
          {row.to_list.map((to) => (
            <li key={to.sc_id} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(to.status)}`} />
              <span className="font-mono text-smoke">{to.sc_id}</span>
              <span className="text-smoke tnum">{formatDate(to.shipment_date)}</span>
              {to.status && <span className="text-smoke">{to.status}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function TmsMultiTo() {
  const [rows, setRows] = useState<MultiToRow[] | "loading" | null>("loading");
  const weekStart = getWeekStart();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("tms_multi_to_weekly")
        .select("week_start, pna_code, pna_name, to_count, to_list")
        .eq("week_start", weekStart)
        .order("to_count", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("TmsMultiTo fetch error:", error);
        setRows(null);
        return;
      }
      setRows((data as MultiToRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [weekStart]);

  const loading = rows === "loading";
  const data = rows === "loading" ? null : rows;

  const weekLabel = weekStart
    ? `${weekStart.slice(5).replace("-", "/")} 주`
    : "";

  return (
    <Card>
      <SectionHeader
        title="멀티 TO 건"
        meta={loading ? "Loading" : data ? `이번 주 · ${data.length}개 PNA` : weekLabel}
      />
      <div>
        {loading ? (
          <div className="px-6 py-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="px-6 py-8 text-sm text-smoke text-center">이번 주 멀티 TO 건 없음</p>
        ) : (
          <ul className="max-h-[480px] overflow-y-auto">
            {data.map((row) => (
              <PnaRow key={row.pna_code} row={row} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
