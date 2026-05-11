import { useState } from "react";
import { PageTabs } from "@/components/ui/page-tabs";
import { AutoResearchTrend } from "@/widgets/AutoResearchTrend";
import { AutoResearchLog } from "@/widgets/AutoResearchLog";
import { WeeklyKpiSummary } from "@/widgets/WeeklyKpiSummary";

const TABS = [
  { key: "work", label: "업무처리" },
  { key: "ops", label: "운영" },
  { key: "analytics", label: "분석" },
];

export function WmsPage() {
  const [tab, setTab] = useState("work");

  return (
    <>
      <PageTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "work" && (
        <div className="flex items-center justify-center py-24 text-smoke text-sm">
          WMS 업무처리 위젯 준비 중
        </div>
      )}

      {tab === "ops" && (
        <WeeklyKpiSummary domain="WMS" />
      )}

      {tab === "analytics" && (
        <>
          <AutoResearchTrend />
          <div className="mt-4">
            <AutoResearchLog />
          </div>
        </>
      )}
    </>
  );
}
