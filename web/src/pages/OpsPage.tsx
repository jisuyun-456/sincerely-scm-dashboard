import { TmsExceptionBanner } from "@/widgets/TmsExceptionBanner";
import { TmsDeliveryNotes } from "@/widgets/TmsDeliveryNotes";
import { TmsMultiTo } from "@/widgets/TmsMultiTo";
import { TmsDayoungSchedule } from "@/widgets/TmsDayoungSchedule";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export function OpsPage() {
  return (
    <>
      <TmsExceptionBanner />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TmsDeliveryNotes />
        <TmsMultiTo />
      </div>
      <div className="mt-4">
        <TmsDayoungSchedule />
      </div>
      <div className="mt-4">
        <Card>
          <SectionHeader title="WMS 업무" meta="준비중" />
          <p className="px-6 py-8 text-sm text-smoke text-center">WMS 위젯 준비 중</p>
        </Card>
      </div>
    </>
  );
}
