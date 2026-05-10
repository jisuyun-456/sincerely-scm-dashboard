import { SyncHealth } from "@/widgets/SyncHealth";
import { Tasks } from "@/widgets/Tasks";
import { TmsKpi } from "@/widgets/TmsKpi";
import { AgentFeed } from "@/widgets/AgentFeed";
import { AutoResearchTrend } from "@/widgets/AutoResearchTrend";
import { AutoResearchLog } from "@/widgets/AutoResearchLog";

export function HomePage() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TmsKpi />
        <Tasks />
        <SyncHealth />
      </div>
      <div className="mt-4">
        <AutoResearchTrend />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <AgentFeed />
        <AutoResearchLog />
      </div>
    </>
  );
}
