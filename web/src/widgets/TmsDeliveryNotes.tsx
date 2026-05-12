import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type DeliveryNote = {
  sc_id: string;
  to_id: string | null;
  pna_code: string;
  pna_name: string | null;
  shipment_date: string | null;
  delivery_notes: string;
  status: string | null;
};

const DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return DATE_FORMAT.format(new Date(iso));
}

function statusColor(status: string | null): string {
  if (!status) return "bg-divider";
  if (status.includes("완료")) return "bg-emerald-500";
  if (status.includes("배송중")) return "bg-blue-400";
  return "bg-amber-400";
}

function NoteRow({ note, expanded, onToggle }: { note: DeliveryNote; expanded: boolean; onToggle: () => void }) {
  const clientName = note.pna_name?.replace(/^PNA\d+-/, "") ?? "";
  return (
    <li className="border-b border-divider/40 last:border-0 py-3 px-6">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="font-mono text-[11px] text-smoke bg-smoke/10 px-1.5 py-0.5 rounded shrink-0">
          {note.to_id ?? note.sc_id}
        </span>
        <span className="text-xs text-ink font-medium shrink-0">{note.pna_code}</span>
        {clientName && (
          <span className="text-xs text-smoke truncate max-w-[180px]">{clientName}</span>
        )}
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusColor(note.status)}`} />
          <span className="font-mono text-[11px] text-smoke tnum">{formatDate(note.shipment_date)}</span>
        </span>
      </div>
      <button
        onClick={onToggle}
        className="mt-1.5 w-full text-left text-xs text-smoke leading-relaxed hover:text-ink transition-colors"
      >
        <span className={expanded ? "" : "line-clamp-2"}>
          {note.delivery_notes}
        </span>
        {note.delivery_notes.length > 100 && (
          <span className="text-crail ml-1 font-medium">
            {expanded ? " 접기" : " 더보기"}
          </span>
        )}
      </button>
    </li>
  );
}

export function TmsDeliveryNotes() {
  const [rows, setRows] = useState<DeliveryNote[] | "loading" | null>("loading");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const until = new Date();
      until.setDate(until.getDate() + 14);
      const { data, error } = await supabase
        .from("tms_delivery_notes")
        .select("sc_id, to_id, pna_code, pna_name, shipment_date, delivery_notes, status")
        .gte("shipment_date", today)
        .lte("shipment_date", until.toISOString().slice(0, 10))
        .order("shipment_date", { ascending: true })
        .limit(100);
      if (cancelled) return;
      if (error) {
        console.error("TmsDeliveryNotes fetch error:", error);
        setRows(null);
        return;
      }
      setRows((data as DeliveryNote[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = rows === "loading";
  const data = rows === "loading" ? null : rows;

  function toggle(scId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(scId) ? next.delete(scId) : next.add(scId);
      return next;
    });
  }

  return (
    <Card>
      <SectionHeader
        title="배송 요청사항 특이건"
        meta={loading ? "Loading" : data ? `2주 이내 · ${data.length}건` : "No data"}
      />
      <div>
        {loading ? (
          <div className="px-6 py-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="px-6 py-8 text-sm text-smoke text-center">최근 2주 특이건 없음</p>
        ) : (
          <ul className="max-h-[480px] overflow-y-auto">
            {data.map((note) => (
              <NoteRow
                key={note.sc_id}
                note={note}
                expanded={expanded.has(note.sc_id)}
                onToggle={() => toggle(note.sc_id)}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
