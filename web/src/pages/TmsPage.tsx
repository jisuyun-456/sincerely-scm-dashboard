import { TmsDeliveryNotes } from "@/widgets/TmsDeliveryNotes";
import { TmsMultiTo } from "@/widgets/TmsMultiTo";
import { TmsDayoungSchedule } from "@/widgets/TmsDayoungSchedule";

export function TmsPage() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TmsDeliveryNotes />
        <TmsMultiTo />
      </div>
      <div className="mt-4">
        <TmsDayoungSchedule />
      </div>
    </>
  );
}
