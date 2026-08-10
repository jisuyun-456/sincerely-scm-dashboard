const WMS_CARDS = [
  {
    icon: "📦", id: "sk02", title: "SK-02 · Inbound", opus: false,
    items: ["GR / ASN / AQL 검수", "납품 도착 → Dock-to-Stock", "Agent: wms-inbound", "KPI: 납기 준수율, D2S"],
  },
  {
    icon: "🔄", id: "sk03", title: "SK-03 · Inventory", opus: false,
    items: ["Cycle Counting / ADJUST", "재고 불일치 감지", "Agent: wms-inventory", "KPI: 재고 정확도 %, 음수재고"],
  },
  {
    icon: "📤", id: "sk04", title: "SK-04 · Outbound", opus: false,
    items: ["Pick / Pack / Wave / SSCC", "Packing List / Shipping Mark", "Agent: wms-outbound", "KPI: 출고 적시율, 오출고율"],
  },
  {
    icon: "🗂️", id: "sk01", title: "SK-01 · Master Data", opus: false,
    items: ["품목코드(PT) / BIN / ROP", "공급사 / GS1 바코드", "Agent: wms-master-data"],
  },
  {
    icon: "🔁", id: "sk07", title: "SK-07 · Returns", opus: false,
    items: ["RESTOCK / DISPOSE / NCR", "반품 접수 → LOT 격리", "Agent: wms-return", "KPI: 반품 처리율, 폐기율"],
  },
];

const TMS_CARDS = [
  {
    icon: "📋", id: "sk05", title: "SK-05 · Shipment", opus: false,
    items: ["운송장 / 로젠택배", "배차 → POD 확인", "Agent: tms-shipment", "KPI: 배송 완료율, POD 회수율"],
  },
  {
    icon: "📊", id: "sk06", title: "SK-06 · OTIF / KPI", opus: true,
    items: ["OTIF / 소화율 집계", "AutoResearch 주간 리포트", "Agent: tms-otif-kpi", "KPI: OTIF %, 차량이용률"],
  },
  {
    icon: "💰", id: "sk09", title: "SK-09 · Cost-Lane", opus: false,
    items: ["CBM당 비용 / Lane 분석", "발송 모드 최적화", "Agent: tms-cost-lane", "KPI: Lane ROI, 비용 이상"],
  },
  {
    icon: "🤝", id: "dtms2", title: "D-TMS2 · Carrier", opus: true,
    items: ["3PL 평가 / RFQ / SLA", "운임 재협상 / Scorecard", "Agent: tms-carrier"],
  },
  {
    icon: "🔧", id: "dtms1", title: "D-TMS1 · Improvement", opus: true,
    items: ["GAP 분석 / 로드맵", "AS-IS → TO-BE 설계", "Agent: tms-improvement"],
  },
];

const STRATEGY_CARDS = [
  {
    icon: "🌐", id: "d1", title: "D1 · SCM Logistics", opus: true,
    items: ["SCOR / ABC-XYZ 분석", "거점 최적화 / Bullwhip 진단", "Multi-sourcing / 리드타임", "Agent: scm-logistics-expert"],
  },
  {
    icon: "📒", id: "d2", title: "D2 · Tax / Accounting", opus: true,
    items: ["K-IFRS / 더존 아마란스10", "역분개(Storno) / 재고자산", "이전가격 / 부가세", "Agent: tax-accounting-expert"],
  },
  {
    icon: "📝", id: "d3", title: "SK-08 + D3 · Meeting & PM", opus: true,
    items: ["회의록 작성 (SK-08)", "OKR / WBS / RACI / EVM", "BCG / Porter / SWOT / PESTEL", "Agents: meeting-analysis + pm-expert"],
  },
];

const TECH_CARDS = [
  {
    icon: "🗄️", id: "airtable", title: "Airtable (SSOT)", opus: false,
    items: ["WMS: appLui4ZR5HWcQRri", "TMS: app4x70a8mOrIKsMf", "Immutable Ledger — INSERT ONLY"],
  },
  {
    icon: "⚡", id: "fastapi", title: "FastAPI (fly.io)", opus: false,
    items: ["PDF 서버 api/app.py", "~$0/월 (auto_stop)", "Barcode / Packing List 생성"],
  },
  {
    icon: "📈", id: "dashboard", title: "Dashboard (Vercel)", opus: false,
    items: ["React + Supabase", "sincerely-scm-dashboard", "GitHub Actions cron 스냅샷"],
  },
  {
    icon: "🔁", id: "ghactions", title: "GitHub Actions", opus: false,
    items: ["Python 백필 파이프라인", "Airtable batch PATCH (10건)", "자동화 스케줄 운영"],
  },
];

const HARNESS_LAYERS = [
  {
    num: "1", icon: "1️⃣", id: "l1", title: "CLAUDE.md",
    card: "bg-sky-50 border-sky-200/70",
    dot: "bg-sky-500",
    label: "text-sky-700",
    items: ["글로벌 지침 + 워크플로우 매트릭스", "모델 선택 (Haiku / Sonnet / Opus)", "라우팅 규칙 + 스킵 매트릭스", "Immutable Ledger"],
  },
  {
    num: "2", icon: "2️⃣", id: "l2", title: "Harness",
    card: "bg-violet-50 border-violet-200/70",
    dot: "bg-violet-500",
    label: "text-violet-700",
    items: ["~/.claude/harness/", "events.jsonl FSM (Phase 1)", "Validation Contracts / Lessons", "Sprint Config + Scripts"],
  },
  {
    num: "3", icon: "3️⃣", id: "l3", title: "Agents (14)",
    card: "bg-emerald-50 border-emerald-200/70",
    dot: "bg-emerald-600",
    label: "text-emerald-700",
    items: ["Core 9: Orchestrator · Planner · Validator", "Workers: code / data / design", "notion-sync · checkpoint-reporter", "Specialized 5: architect · checker"],
  },
  {
    num: "4", icon: "4️⃣", id: "l4", title: "Hooks",
    card: "bg-orange-50 border-orange-200/70",
    dot: "bg-crail",
    label: "text-crail",
    items: ["SessionStart: 메모리 + AutoResearch", "PostToolUse: .py syntax check", "Stop: git status + 미커밋 경고", "Notification: Windows beep"],
  },
  {
    num: "5", icon: "5️⃣", id: "l5", title: "Skills",
    card: "bg-amber-50 border-amber-200/70",
    dot: "bg-amber-500",
    label: "text-amber-700",
    items: ["mission / checkpoint / lesson", "obsidian-routing / agent-template", "frontend-design / claude-api", "brainstorming / writing-plans"],
  },
  {
    num: "6", icon: "6️⃣", id: "l6", title: "Domain Routing",
    card: "bg-rose-50 border-rose-200/70",
    dot: "bg-rose-500",
    label: "text-rose-700",
    items: ["SCM: SK-01~09 + D-TMS1/2 + D1~D3", "STOCK: analyze-kr + screener", "Auto-detect: 키워드 → 에이전트", "Fallback: Sonnet 직접 응답"],
  },
];

type CardData = {
  icon: string;
  id: string;
  title: string;
  opus: boolean;
  items: string[];
};

type Accent = {
  dot: string;
  iconBg: string;
};

function AgentCard({ card, accent }: { card: CardData; accent: Accent }) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-divider/60 bg-manila p-4 transition-all duration-200 hover:-translate-y-px hover:border-divider hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      {card.opus && (
        <span className="absolute right-2.5 top-2.5 rounded-full border border-crail/30 bg-crail/8 px-1.5 py-0.5 font-jakarta text-[9px] font-semibold uppercase tracking-widest text-crail">
          OPUS
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${accent.iconBg}`}>
          {card.icon}
        </span>
        <span className="font-jakarta text-[13px] font-semibold leading-snug text-ink">
          {card.title}
        </span>
      </div>
      <ul className="space-y-1.5">
        {card.items.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-smoke/70">
            <span className={`mt-[4px] h-[4px] w-[4px] shrink-0 rounded-full ${accent.dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionLabel({
  num,
  icon,
  label,
  color,
}: {
  num: string;
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="shrink-0 font-mono text-[9px] tracking-[0.3em] text-smoke/40 select-none">
        {num}
      </span>
      <span className="text-sm leading-none">{icon}</span>
      <h2 className={`font-jakarta text-[15px] font-bold tracking-tight ${color}`}>
        {label}
      </h2>
      <div className="flex-1 border-t border-divider/50" />
    </div>
  );
}

export function LivingMapPage() {
  return (
    <div className="-mx-6 -mt-8 bg-manila px-6 pb-24 pt-12 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">

      {/* ── Hero ───────────────────────────────────────── */}
      <div className="mb-16 max-w-2xl">
        <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.4em] text-smoke/50">
          Sincerely SCM · Living Map · v1.0
        </p>
        <h1 className="font-jakarta text-[52px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[64px]">
          <span className="bg-gradient-to-b from-ink to-ink/50 bg-clip-text text-transparent">
            SCM Operations
          </span>
          <br />
          <span className="bg-gradient-to-r from-crail to-[#c4923a] bg-clip-text text-transparent">
            Living Map
          </span>
        </h1>
        <p className="mt-5 text-[13px] leading-relaxed text-smoke">
          신시어리 포장재 물류팀 — 전 부서·프로세스·AI 에이전트를 한 페이지에
        </p>
      </div>

      {/* ── WMS ────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionLabel num="01" icon="🏭" label="WMS — Warehouse Management" color="text-emerald-700" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {WMS_CARDS.map((c) => (
            <AgentCard key={c.id} card={c} accent={{ dot: "bg-emerald-500/50", iconBg: "bg-emerald-500/10" }} />
          ))}
        </div>
      </section>

      {/* ── TMS ────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionLabel num="02" icon="🚚" label="TMS — Transportation Management" color="text-sky-700" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {TMS_CARDS.map((c) => (
            <AgentCard key={c.id} card={c} accent={{ dot: "bg-sky-500/50", iconBg: "bg-sky-500/10" }} />
          ))}
        </div>
      </section>

      {/* ── Strategy ───────────────────────────────────── */}
      <section className="mb-12">
        <SectionLabel num="03" icon="🎯" label="Strategy & Support" color="text-crail" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {STRATEGY_CARDS.map((c) => (
            <AgentCard key={c.id} card={c} accent={{ dot: "bg-crail/50", iconBg: "bg-crail/8" }} />
          ))}
        </div>
      </section>

      {/* ── Tech Stack ─────────────────────────────────── */}
      <section className="mb-12">
        <SectionLabel num="04" icon="⚙️" label="Tech Stack" color="text-smoke" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TECH_CARDS.map((c) => (
            <AgentCard key={c.id} card={c} accent={{ dot: "bg-smoke/40", iconBg: "bg-smoke/10" }} />
          ))}
        </div>
      </section>

      {/* ── Harness 6 Layers ───────────────────────────── */}
      <section>
        <SectionLabel num="05" icon="🤖" label="Claude Code Harness — 6-Layer Stack" color="text-violet-700" />

        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          {HARNESS_LAYERS.map((l, i) => (
            <div key={l.id} className="flex shrink-0 items-center gap-2">
              <span className={`h-1 w-1 rounded-full ${l.dot}`} />
              <span className="font-mono text-[9px] tracking-widest text-smoke/40">L{l.num}</span>
              {i < HARNESS_LAYERS.length - 1 && (
                <span className="text-divider text-xs">—</span>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {HARNESS_LAYERS.map((l) => (
            <div
              key={l.id}
              className={`flex flex-col gap-2 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${l.card}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">{l.icon}</span>
                <span className={`font-jakarta text-[12px] font-semibold ${l.label}`}>{l.title}</span>
              </div>
              <ul className="space-y-1">
                {l.items.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-smoke/60">
                    <span className={`mt-[3px] h-[3px] w-[3px] shrink-0 rounded-full ${l.dot} opacity-60`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="mt-16 border-t border-divider/50 pt-5 font-mono text-[10px] text-smoke/40">
        Sincerely SCM Living Map · Updated 2026-05-18 · harness-orchestrator + notion-sync
      </div>

    </div>
  );
}
