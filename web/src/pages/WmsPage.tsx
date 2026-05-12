import { useState } from "react";
import { PageTabs } from "@/components/ui/page-tabs";
import { AutoResearchTrend } from "@/widgets/AutoResearchTrend";
import { AutoResearchLog } from "@/widgets/AutoResearchLog";
import { WeeklyKpiSummary } from "@/widgets/WeeklyKpiSummary";
import { PipelineWmsKpi } from "@/widgets/PipelineWmsKpi";
import { WmsBoxMixForecast } from "@/widgets/WmsBoxMixForecast";

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
        <WmsBoxMixForecast />
      )}

      {tab === "ops" && (
        <WeeklyKpiSummary domain="WMS" />
      )}

      {tab === "analytics" && (
        <>
          <PipelineWmsKpi />
          <div className="mt-6">
            <AutoResearchTrend />
          </div>
          <div className="mt-4">
            <AutoResearchLog />
          </div>
        </>
      )}
    </>
  );
}
