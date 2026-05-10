import { TmsExceptionBanner } from "@/widgets/TmsExceptionBanner";
import { TmsDeliveryNotes } from "@/widgets/TmsDeliveryNotes";
import { TmsMultiTo } from "@/widgets/TmsMultiTo";
import { TmsDayoungSchedule } from "@/widgets/TmsDayoungSchedule";
import { TmsCarrierRanking } from "@/widgets/TmsCarrierRanking";
import { TmsOtifTrend } from "@/widgets/TmsOtifTrend";
import { TmsDailyVolume } from "@/widgets/TmsDailyVolume";
import { TmsPodAging } from "@/widgets/TmsPodAging";

export function TmsPage() {
  return (
    <>
      <TmsExceptionBanner />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TmsDeliveryNotes />
        <TmsMultiTo />
      </div>
      <div className="mt-4">
        <TmsDayoungSchedule />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TmsCarrierRanking />
        <TmsOtifTrend />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TmsDailyVolume />
        <TmsPodAging />
      </div>
    </>
  );
}
