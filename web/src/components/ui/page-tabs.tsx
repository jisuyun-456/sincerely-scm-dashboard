type Tab = { key: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
};

export function PageTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="flex border-b border-divider/70 mb-6">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm transition-colors ${
            active === t.key
              ? "text-ink font-medium border-b-2 border-ink -mb-px"
              : "text-smoke hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
