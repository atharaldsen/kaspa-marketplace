interface TimelineEvent {
  label: string;
  txId?: string | null;
  active: boolean;
  completed: boolean;
}

interface EscrowTimelineProps {
  status: string;
  fundingTxId?: string | null;
  releaseTxId?: string | null;
  refundTxId?: string | null;
  disputeTxId?: string | null;
}

const statusOrder = [
  "awaiting_funding",
  "funding_detected",
  "locking",
  "locked",
];

function getEvents(props: EscrowTimelineProps): TimelineEvent[] {
  const { status, fundingTxId, releaseTxId, refundTxId, disputeTxId } = props;
  const idx = statusOrder.indexOf(status);

  const events: TimelineEvent[] = [
    {
      label: "Created",
      active: status === "awaiting_funding",
      completed: idx > 0 || !statusOrder.includes(status),
    },
    {
      label: "Funded",
      txId: fundingTxId,
      active: status === "funding_detected" || status === "locking",
      completed: idx >= 3 || !statusOrder.includes(status),
    },
    {
      label: "Locked",
      active: status === "locked",
      completed: !statusOrder.includes(status),
    },
  ];

  // Add settlement event
  if (releaseTxId || status === "releasing" || status === "released") {
    events.push({
      label: "Released",
      txId: releaseTxId,
      active: status === "releasing",
      completed: status === "released",
    });
  } else if (refundTxId || status === "refunding" || status === "refunded") {
    events.push({
      label: "Refunded",
      txId: refundTxId,
      active: status === "refunding",
      completed: status === "refunded",
    });
  } else if (disputeTxId || status === "disputing" || status === "disputed") {
    events.push({
      label: "Disputed",
      txId: disputeTxId,
      active: status === "disputing",
      completed: status === "disputed",
    });
  } else if (status === "locked") {
    events.push({
      label: "Settlement",
      active: false,
      completed: false,
    });
  }

  return events;
}

function truncateTxId(txId: string) {
  return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
}

export function EscrowTimeline(props: EscrowTimelineProps) {
  const events = getEvents(props);

  return (
    <div className="flex items-center gap-0">
      {events.map((event, i) => (
        <div key={i} className="flex items-center">
          {/* Node */}
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                event.completed
                  ? "bg-kaspa-500 text-white"
                  : event.active
                    ? "border-2 border-kaspa-500 bg-kaspa-50 text-kaspa-600 dark:bg-kaspa-900/20"
                    : "border-2 border-gray-300 text-gray-400 dark:border-gray-700"
              }`}
            >
              {event.completed ? "✓" : i + 1}
            </div>
            <span
              className={`mt-1 text-xs ${
                event.completed || event.active
                  ? "font-medium text-gray-900 dark:text-gray-100"
                  : "text-gray-400"
              }`}
            >
              {event.label}
            </span>
            {event.txId && (
              <span className="mt-0.5 font-mono text-[10px] text-gray-400">
                {truncateTxId(event.txId)}
              </span>
            )}
          </div>

          {/* Connector */}
          {i < events.length - 1 && (
            <div
              className={`mx-1 h-0.5 w-8 sm:w-12 ${
                event.completed
                  ? "bg-kaspa-500"
                  : "bg-gray-300 dark:bg-gray-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
