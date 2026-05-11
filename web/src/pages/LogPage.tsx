import { LogActivityTimeline } from "@/widgets/LogActivityTimeline";
import { LogSyncHistory } from "@/widgets/LogSyncHistory";
import { LogErrorLog } from "@/widgets/LogErrorLog";
import { AgentFeed } from "@/widgets/AgentFeed";
import { SyncHealth } from "@/widgets/SyncHealth";

export function LogPage() {
  return (
    <>
      <LogActivityTimeline />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <LogSyncHistory />
        <LogErrorLog />
      </div>
      <div className="mt-4">
        <AgentFeed />
      </div>
      <div className="mt-4">
        <SyncHealth />
      </div>
    </>
  );
}
