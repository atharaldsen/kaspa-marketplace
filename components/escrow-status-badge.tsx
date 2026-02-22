const statusConfig: Record<string, { label: string; color: string }> = {
  awaiting_funding: { label: "Awaiting Funding", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  funding_detected: { label: "Funding Detected", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  locking: { label: "Locking...", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  locked: { label: "Locked", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  releasing: { label: "Releasing...", color: "bg-kaspa-100 text-kaspa-700 dark:bg-kaspa-900/30 dark:text-kaspa-400" },
  released: { label: "Released", color: "bg-kaspa-100 text-kaspa-700 dark:bg-kaspa-900/30 dark:text-kaspa-400" },
  refunding: { label: "Refunding...", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  refunded: { label: "Refunded", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  disputing: { label: "Disputing...", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  disputed: { label: "Disputed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  escaping: { label: "Escaping...", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  escaped: { label: "Escaped", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

export function EscrowStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
