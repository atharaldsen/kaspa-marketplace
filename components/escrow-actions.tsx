"use client";

import { useState } from "react";

interface EscrowActionsProps {
  escrowId: string;
  status: string;
  pattern: string;
  role: "buyer" | "seller";
  onAction: () => void;
}

export function EscrowActions({
  escrowId,
  status,
  pattern,
  role,
  onAction,
}: EscrowActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doAction(action: string, body?: Record<string, unknown>) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/escrows/${escrowId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `${action} failed`);
      }
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  // Determine which actions are available based on status and pattern
  const canFund = status === "awaiting_funding" || status === "funding_detected";
  const canRelease = status === "locked";
  const canRefund =
    status === "locked" &&
    (pattern === "timelocked" || pattern === "covenant_multi_path");
  const canDispute =
    status === "locked" &&
    (pattern === "covenant_multi_path" || pattern === "arbitrated");

  const isSettled = ["released", "refunded", "disputed", "escaped"].includes(status);

  if (isSettled) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canFund && (
          <button
            onClick={() => doAction("fund")}
            disabled={loading !== null}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading === "fund" ? "Funding..." : "Lock Funds"}
          </button>
        )}

        {canRelease && (
          <button
            onClick={() => doAction("release")}
            disabled={loading !== null}
            className="rounded-md bg-kaspa-500 px-4 py-2 text-sm font-medium text-white hover:bg-kaspa-600 disabled:opacity-50"
          >
            {loading === "release" ? "Releasing..." : "Release to Seller"}
          </button>
        )}

        {canRefund && (
          <button
            onClick={() => doAction("refund")}
            disabled={loading !== null}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {loading === "refund" ? "Refunding..." : "Refund to Buyer"}
          </button>
        )}

        {canDispute && (
          <>
            <button
              onClick={() => doAction("dispute", { winner: "buyer" })}
              disabled={loading !== null}
              className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {loading === "dispute" ? "Disputing..." : `Dispute → Buyer`}
            </button>
            <button
              onClick={() => doAction("dispute", { winner: "seller" })}
              disabled={loading !== null}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {loading === "dispute" ? "Disputing..." : `Dispute → Seller`}
            </button>
          </>
        )}
      </div>

      {status === "awaiting_funding" && (
        <p className="text-xs text-gray-500">
          Send funds to the escrow address, then click &quot;Lock Funds&quot; once detected.
        </p>
      )}
      {status === "locking" && (
        <p className="text-xs text-gray-500">
          Transaction submitted. Waiting for confirmation...
        </p>
      )}
      {status === "locked" && role === "buyer" && (
        <p className="text-xs text-gray-500">
          Funds are locked. Release when the seller delivers, or dispute if there&apos;s an issue.
        </p>
      )}
      {status === "locked" && role === "seller" && (
        <p className="text-xs text-gray-500">
          Funds are locked. Deliver the item/service, then the buyer will release payment.
        </p>
      )}
    </div>
  );
}
