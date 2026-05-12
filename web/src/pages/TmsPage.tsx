import { useState } from "react";
import { PageTabs } from "@/components/ui/page-tabs";
import { TmsExceptionBanner } from "@/widgets/TmsExceptionBanner";
import { TmsDeliveryNotes } from "@/widgets/TmsDeliveryNotes";
import { TmsMultiTo } from "@/widgets/TmsMultiTo";
import { TmsDayoungSchedule } from "@/widgets/TmsDayoungSchedule";
import { TmsCarrierRanking } from "@/widgets/TmsCarrierRanking";
import { TmsOtifTrend } from "@/widgets/TmsOtifTrend";
import { TmsDailyVolume } from "@/widgets/TmsDailyVolume";
import { TmsPodAging } from "@/widgets/TmsPodAging";
import { TmsKpi } from "@/widgets/TmsKpi";
import { WeeklyKpiSummary } from "@/widgets/WeeklyKpiSummary";
import { PipelineTmsKpi } from "@/widgets/PipelineTmsKpi";
import { TmsTruckLoad } from "@/widgets/TmsTruckLoad";
import { TmsCbmAbc } from "@/widgets/TmsCbmAbc";

const TABS = [
  { key: "work", label: "업무처리" },
  { key: "ops", label: "운영" },
  { key: "analytics", label: "분석" },
];

export function TmsPage() {
  const [tab, setTab] = useState("work");

  return (
    <>
      <PageTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "work" && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TmsDeliveryNotes />
            <TmsMultiTo />
          </div>
          <div className="mt-4">
            <TmsDayoungSchedule />
          </div>
        </>
      )}

      {tab === "ops" && (
        <>
          <TmsKpi />
          <div className="mt-4">
            <TmsTruckLoad />
          </div>
          <div className="mt-4">
            <WeeklyKpiSummary domain="TMS" />
          </div>
          <div className="mt-4">
            <TmsExceptionBanner />
          </div>
          <div className="mt-4">
            <TmsPodAging />
          </div>
        </>
      )}

      {tab === "analytics" && (
        <>
          <PipelineTmsKpi />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TmsOtifTrend />
            <TmsCarrierRanking />
          </div>
          <div className="mt-4">
            <TmsDailyVolume />
          </div>
          <div className="mt-4">
            <TmsCbmAbc />
          </div>
        </>
      )}
    </>
  );
}
