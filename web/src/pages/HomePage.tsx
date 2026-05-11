import { SyncHealth } from "@/widgets/SyncHealth";
import { Tasks } from "@/widgets/Tasks";
import { TmsKpi } from "@/widgets/TmsKpi";
import { AgentFeed } from "@/widgets/AgentFeed";
import { AutoResearchTrend } from "@/widgets/AutoResearchTrend";
import { AutoResearchLog } from "@/widgets/AutoResearchLog";
import { SimpleTodo } from "@/widgets/SimpleTodo";

export function HomePage() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Tasks />
        </div>
        <TmsKpi />
      </div>
      <div className="mt-4">
        <SimpleTodo />
      </div>
      <div className="mt-4">
        <AutoResearchTrend />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <AgentFeed />
        <AutoResearchLog />
      </div>
      <div className="mt-4">
        <SyncHealth />
      </div>
    </>
  );
}
