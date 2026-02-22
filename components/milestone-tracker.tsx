import { KasAmount } from "./kas-amount";

interface MilestoneStage {
  id: string;
  stageIndex: number;
  status: string;
  escrowAmount: string;
  stageName?: string;
}

export function MilestoneTracker({ stages }: { stages: MilestoneStage[] }) {
  const sorted = [...stages].sort((a, b) => a.stageIndex - b.stageIndex);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Milestone Progress</h3>
      <div className="space-y-1">
        {sorted.map((stage) => {
          const isComplete = ["released", "refunded", "disputed"].includes(
            stage.status
          );
          const isActive =
            !isComplete && stage.status !== "pending_stage";
          const isPending = stage.status === "pending_stage";

          return (
            <div
              key={stage.id}
              className={`flex items-center justify-between rounded-md border p-3 ${
                isActive
                  ? "border-kaspa-500 bg-kaspa-50 dark:bg-kaspa-900/20"
                  : isComplete
                    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/10"
                    : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isComplete
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-kaspa-500 text-white"
                        : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                  }`}
                >
                  {isComplete ? "✓" : stage.stageIndex + 1}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {stage.stageName || `Stage ${stage.stageIndex + 1}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isComplete
                      ? stage.status === "released"
                        ? "Released"
                        : "Settled"
                      : isActive
                        ? "Active"
                        : isPending
                          ? "Pending"
                          : stage.status}
                  </div>
                </div>
              </div>
              <KasAmount sompi={stage.escrowAmount} className="text-sm font-medium" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
