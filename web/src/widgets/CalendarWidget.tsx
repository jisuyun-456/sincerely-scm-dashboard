import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

type CalEvent = {
  id: number;
  event_date: string;
  title: string;
  event_type: string;
};

const TYPE_DOT: Record<string, string> = {
  general: "bg-ink",
  important: "bg-crail",
  tms: "bg-blue-500",
  wms: "bg-emerald-500",
};

const TYPE_BADGE: Record<string, string> = {
  general: "bg-smoke/10 text-smoke",
  important: "bg-crail/10 text-crail",
  tms: "bg-blue-100 text-blue-700",
  wms: "bg-emerald-100 text-emerald-700",
};

function kstToday(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function monthDates(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday=0
  const dates: (string | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dd = String(d).padStart(2, "0");
    const mm = String(month + 1).padStart(2, "0");
    dates.push(`${year}-${mm}-${dd}`);
  }
  while (dates.length % 7 !== 0) dates.push(null);
  return dates;
}

export function CalendarWidget() {
  const today = kstToday();
  const [year, setYear] = useState(() => parseInt(today.slice(0, 4)));
  const [month, setMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState("general");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    (async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select("id, event_date, title, event_type")
        .gte("event_date", monthStart)
        .lte("event_date", monthEnd)
        .order("event_date", { ascending: true });
      if (!cancelled) setEvents((data as CalEvent[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  const dates = monthDates(year, month);
  const byDate: Record<string, CalEvent[]> = {};
  for (const ev of events) {
    (byDate[ev.event_date] ??= []).push(ev);
  }

  const selectedEvents = selected ? (byDate[selected] ?? []) : [];

  async function addEvent() {
    if (!selected || !addTitle.trim()) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cal = supabase as any;
    const { data } = await cal
      .from("calendar_events")
      .insert({ event_date: selected, title: addTitle.trim(), event_type: addType })
      .select("id, event_date, title, event_type");
    if (data?.[0]) {
      setEvents((prev) => [...prev, data[0] as CalEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    }
    setAddTitle("");
    setSaving(false);
  }

  async function deleteEvent(id: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("calendar_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelected(null);
  }

  const monthLabel = new Date(year, month).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const selectedLabel = selected
    ? new Date(selected + "T00:00:00").toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : null;

  return (
    <Card>
      <SectionHeader title="캘린더" meta={monthLabel} />
      <div className="px-6 pb-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="px-2 py-1 text-sm text-smoke hover:text-ink transition-colors"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-ink">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="px-2 py-1 text-sm text-smoke hover:text-ink transition-colors"
          >
            ›
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
            <div key={d} className="text-center text-[11px] text-smoke py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-px">
          {dates.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const isToday = date === today;
            const isSelected = date === selected;
            const dayEvents = byDate[date] ?? [];
            const dayNum = parseInt(date.slice(8));
            return (
              <button
                key={date}
                onClick={() => setSelected(isSelected ? null : date)}
                className={`relative flex flex-col items-center rounded py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "bg-ink text-paper"
                    : isToday
                    ? "bg-crail/10 text-crail font-medium"
                    : "hover:bg-smoke/10 text-ink"
                }`}
              >
                <span>{dayNum}</span>
                {dayEvents.length > 0 && (
                  <span
                    className={`mt-0.5 h-1 w-1 rounded-full ${
                      isSelected ? "bg-paper/70" : (TYPE_DOT[dayEvents[0].event_type] ?? "bg-ink")
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date panel */}
        {selected && (
          <div className="mt-4 border-t border-divider/40 pt-4">
            <p className="text-xs font-medium text-smoke mb-2">{selectedLabel}</p>
            {selectedEvents.length === 0 ? (
              <p className="text-xs text-smoke mb-3">일정 없음</p>
            ) : (
              <ul className="mb-3 space-y-1.5">
                {selectedEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        TYPE_BADGE[ev.event_type] ?? "bg-smoke/10 text-smoke"
                      }`}
                    >
                      {ev.event_type}
                    </span>
                    <span className="flex-1 text-ink">{ev.title}</span>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="text-smoke hover:text-destructive text-[11px] transition-colors"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="일정 추가 — Enter"
                className="flex-1 rounded border border-divider/60 bg-transparent px-2.5 py-1.5 text-xs text-ink placeholder:text-smoke/50 focus:border-ink focus:outline-none"
              />
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="rounded border border-divider/60 bg-background px-1.5 py-1.5 text-xs text-ink focus:outline-none"
              >
                <option value="general">일반</option>
                <option value="important">중요</option>
                <option value="tms">TMS</option>
                <option value="wms">WMS</option>
              </select>
              <button
                onClick={addEvent}
                disabled={!addTitle.trim() || saving}
                className="rounded bg-ink px-3 py-1.5 text-xs text-paper transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
