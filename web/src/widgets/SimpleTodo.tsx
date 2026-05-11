import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

type Note = { id: string; text: string; done: boolean };

const KEY = "scm_notes_v1";

function load(): Note[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

export function SimpleTodo() {
  const [notes, setNotes] = useState<Note[]>(load);
  const [input, setInput] = useState("");

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(notes));
  }, [notes]);

  function add() {
    const text = input.trim();
    if (!text) return;
    setNotes(prev => [{ id: Date.now().toString(), text, done: false }, ...prev]);
    setInput("");
  }

  function toggle(id: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, done: !n.done } : n));
  }

  function remove(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  const openCount = notes.filter(n => !n.done).length;

  return (
    <Card>
      <SectionHeader title="메모" meta={openCount > 0 ? `${openCount}건 미완료` : "없음"} />
      <div className="px-6 py-4">
        <div className="mb-4 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="메모 추가 — Enter"
            className="flex-1 rounded-lg border border-divider/60 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-smoke focus:outline-none focus:ring-1 focus:ring-crail/40"
          />
          <button
            onClick={add}
            className="rounded-lg bg-crail/10 px-4 py-2 text-sm font-medium text-crail hover:bg-crail/20"
          >
            추가
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="py-3 text-center text-sm text-smoke">메모 없음</p>
        ) : (
          <>
            <ul className="space-y-1">
              {[...notes.filter(n => !n.done), ...notes.filter(n => n.done)].map(n => (
                <li key={n.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-divider/20">
                  <input
                    type="checkbox"
                    checked={n.done}
                    onChange={() => toggle(n.id)}
                    className="h-4 w-4 cursor-pointer accent-crail"
                  />
                  <span className={`flex-1 text-sm ${n.done ? "text-smoke line-through" : "text-ink"}`}>
                    {n.text}
                  </span>
                  <button
                    onClick={() => remove(n.id)}
                    className="px-1 text-xs text-smoke hover:text-destructive"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {notes.some(n => n.done) && (
              <button
                onClick={() => setNotes(prev => prev.filter(n => !n.done))}
                className="mt-3 text-xs text-smoke hover:text-destructive"
              >
                완료 항목 전체 삭제
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
