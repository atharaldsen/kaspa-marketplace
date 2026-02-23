"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { EscrowStatusBadge } from "@/components/escrow-status-badge";
import { MilestoneTracker } from "@/components/milestone-tracker";
import { KasAmount } from "@/components/kas-amount";
import Link from "next/link";

// DAA blocks ≈ 1 per second on Kaspa
function formatDaaRemaining(blocks: number): string {
  if (blocks < 60) return `${blocks} seconds`;
  if (blocks < 3600) return `${Math.round(blocks / 60)} minutes`;
  if (blocks < 86400) return `${(blocks / 3600).toFixed(1)} hours`;
  return `${(blocks / 86400).toFixed(1)} days`;
}

interface EscrowDetail {
  id: string;
  escrowApiId: string;
  status: string;
  fundingAddress: string;
  escrowAmount: string;
  stageIndex: number;
  fundingTxId?: string | null;
  releaseTxId?: string | null;
  refundTxId?: string | null;
  disputeTxId?: string | null;
  utxoAmount?: number | null;
  currentDaa?: number | null;
  expiresAtDaa?: number | null;
  autoLockError?: string;
  fundingConfirmed: boolean;
  settlementConfirmed: boolean;
  listing: {
    id: string;
    title: string;
    price: string;
    escrowPattern: string;
    seller: { id: string; name: string | null; image: string | null };
  };
  buyer: { id: string; name: string | null; image: string | null };
  role: "buyer" | "seller";
  createdAt: string;
  stages?: {
    id: string;
    stageIndex: number;
    status: string;
    escrowAmount: string;
    stageName?: string;
  }[] | null;
}

// Which wizard step we're on (4 steps: Send Payment → Locking → Secured → Complete)
function getStep(status: string): number {
  if (status === "awaiting_funding" || status === "funded" || status === "funding_detected") return 0;
  if (status === "locking") return 1;
  if (status === "locked") return 2;
  if (["released", "refunded", "disputed", "escaped"].includes(status)) return 3;
  return 0;
}

const SETTLED_STATUSES = ["released", "refunded", "disputed", "escaped"];
const STEPS = ["Send Payment", "Locking", "Secured", "Complete"];

export default function EscrowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [escrow, setEscrow] = useState<EscrowDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchEscrow = useCallback(async () => {
    try {
      const res = await fetch(`/api/escrows/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unable to load escrow details. Please refresh the page.");
      }
      const data = await res.json();
      setEscrow(data);
      setError(null);
      // Clear pending action once status has moved past "locked"
      if (data.status !== "locked") {
        setPendingAction(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEscrow();
    // Poll faster (2s) while escrow is active, slower (10s) once settled
    const interval = setInterval(fetchEscrow, escrow && SETTLED_STATUSES.includes(escrow.status) ? 10000 : 2000);
    return () => clearInterval(interval);
  }, [fetchEscrow]);

  async function doAction(action: string, body?: Record<string, unknown>) {
    setActionLoading(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/escrows/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `${action} failed`);
      }
      // Show transition state until the next poll confirms
      setPendingAction(action);
      fetchEscrow();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  function copyAddress() {
    if (!escrow) return;
    navigator.clipboard.writeText(escrow.fundingAddress).catch(() => {
      // Clipboard API may fail in some browsers — address is still visible in the code block
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-kaspa-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !escrow) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
        {error || "Escrow not found"}
      </div>
    );
  }

  const step = getStep(escrow.status);
  const isSettled = SETTLED_STATUSES.includes(escrow.status);
  const pattern = escrow.listing.escrowPattern;
  const canRefund =
    escrow.status === "locked" &&
    (pattern === "timelocked" || pattern === "covenant_multi_path");
  const canDispute =
    escrow.status === "locked" &&
    (pattern === "covenant_multi_path" || pattern === "arbitrated");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back + Title */}
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          &larr; Back to Dashboard
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-bold">{escrow.listing.title}</h1>
          <EscrowStatusBadge status={escrow.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          <KasAmount sompi={escrow.escrowAmount} className="font-semibold text-gray-900 dark:text-white" />
          {" "}&middot; You are the <span className="font-medium">{escrow.role}</span>
        </p>
      </div>

      {/* Step Progress Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    i < step
                      ? "bg-kaspa-500 text-white"
                      : i === step
                        ? "bg-kaspa-500 text-white ring-4 ring-kaspa-100 dark:ring-kaspa-900"
                        : "bg-gray-200 text-gray-400 dark:bg-gray-700"
                  }`}
                >
                  {i < step ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium ${
                    i <= step ? "text-kaspa-600 dark:text-kaspa-400" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    i < step ? "bg-kaspa-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Stages (if applicable) */}
      {escrow.stages && escrow.stages.length > 1 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <MilestoneTracker stages={escrow.stages} />
        </div>
      )}

      {/* Action error banner */}
      {actionError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* ── Step 0: Send Payment ── */}
      {step === 0 && (
        <div className="rounded-lg border-2 border-kaspa-200 bg-kaspa-50/50 p-6 dark:border-kaspa-800 dark:bg-kaspa-950/30">
          {escrow.role === "buyer" ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Send payment to the escrow address
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Open your Kaspa wallet and send exactly the amount below to the escrow address. This page will update automatically once the payment is detected.
              </p>

              {/* Amount */}
              <div className="mt-5 rounded-lg bg-white p-4 dark:bg-gray-900">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount to send</p>
                <KasAmount sompi={escrow.escrowAmount} className="mt-1 text-2xl font-bold text-gray-900 dark:text-white" />
              </div>

              {/* Address */}
              <div className="mt-3 rounded-lg bg-white p-4 dark:bg-gray-900">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Send to this address</p>
                <div className="mt-2 flex items-start gap-2">
                  <code className="flex-1 break-all rounded bg-gray-100 px-3 py-2 text-sm dark:bg-gray-800">
                    {escrow.fundingAddress}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="shrink-0 rounded-md bg-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {escrow.autoLockError ? (
                <div className="mt-4 rounded-md bg-orange-50 p-3 text-sm text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {escrow.autoLockError}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-kaspa-500 border-t-transparent" />
                  {escrow.status === "funded" || escrow.status === "funding_detected"
                    ? "Payment detected — locking automatically..."
                    : "Waiting for payment..."}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Waiting for the buyer to send payment
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                The buyer needs to send{" "}
                <KasAmount sompi={escrow.escrowAmount} className="font-semibold" />{" "}
                to the escrow address. This page will update automatically.
              </p>
              {escrow.autoLockError ? (
                <div className="mt-4 rounded-md bg-orange-50 p-3 text-sm text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {escrow.autoLockError}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-kaspa-500 border-t-transparent" />
                  {escrow.status === "funded" || escrow.status === "funding_detected"
                    ? "Payment detected — locking automatically..."
                    : "Waiting for payment..."}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Step 1: Locking ── */}
      {step === 1 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-6 text-center dark:border-yellow-800 dark:bg-yellow-950/30">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-kaspa-500 border-t-transparent" />
          <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
            Locking your funds
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            The transaction has been submitted. Waiting for the network to confirm...
          </p>
          <p className="mt-3 text-xs text-gray-400">This usually takes a few seconds.</p>
        </div>
      )}

      {/* ── Step 2: Secured / Locked ── */}
      {step === 2 && !pendingAction && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-green-200 bg-green-50/50 p-6 dark:border-green-800 dark:bg-green-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Funds are secured
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <KasAmount sompi={escrow.escrowAmount} className="font-semibold" /> locked in escrow
                </p>
              </div>
            </div>

            {escrow.role === "buyer" && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Once the seller delivers, approve the payment to release the funds. If there&apos;s an issue, you can open a dispute{canRefund ? " or request a refund" : ""}.
              </p>
            )}
            {escrow.role === "seller" && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Deliver the item or service. The buyer will release the payment once satisfied.
              </p>
            )}
          </div>

          {/* Primary action: Release */}
          <button
            onClick={() => doAction("release")}
            disabled={actionLoading !== null}
            className="w-full rounded-lg bg-kaspa-500 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-kaspa-600 disabled:opacity-50"
          >
            {actionLoading === "release"
              ? "Releasing payment..."
              : "Approve \u2014 Release payment to seller"}
          </button>

          {/* Secondary actions */}
          {(canRefund || canDispute) && (
            <div className="flex gap-2">
              {canRefund && (
                <button
                  onClick={() => doAction("refund")}
                  disabled={actionLoading !== null}
                  className="flex-1 rounded-lg border border-orange-300 px-4 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                >
                  {actionLoading === "refund" ? "Refunding..." : "Request Refund"}
                </button>
              )}
              {canDispute && (
                <button
                  onClick={() => doAction("dispute", { winner: escrow.role })}
                  disabled={actionLoading !== null}
                  className="flex-1 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {actionLoading === "dispute"
                    ? "Disputing..."
                    : escrow.role === "buyer"
                      ? "Dispute \u2014 Request funds back"
                      : "Dispute \u2014 Request payment"}
                </button>
              )}
            </div>
          )}

          {/* DAA countdown for timelocked */}
          {escrow.currentDaa != null && escrow.expiresAtDaa != null && (
            <div className="rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-900">
              {escrow.currentDaa >= escrow.expiresAtDaa ? (
                <span className="text-orange-600 dark:text-orange-400">
                  Time lock has expired &mdash; refund is available.
                </span>
              ) : (
                <span className="text-gray-500">
                  Time lock expires in approximately{" "}
                  <span className="font-semibold">
                    {formatDaaRemaining(escrow.expiresAtDaa - escrow.currentDaa)}
                  </span>.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Transition: Releasing / Refunding / Disputing ── */}
      {pendingAction && !isSettled && (
        <div className="rounded-lg border border-kaspa-200 bg-kaspa-50/50 p-6 text-center dark:border-kaspa-800 dark:bg-kaspa-950/30">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-kaspa-500 border-t-transparent" />
          <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
            {pendingAction === "release"
              ? "Releasing payment..."
              : pendingAction === "refund"
                ? "Processing refund..."
                : "Processing dispute..."}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {pendingAction === "release"
              ? "Sending funds to the seller. This usually takes a few seconds."
              : pendingAction === "refund"
                ? "Returning funds to the buyer. This usually takes a few seconds."
                : "Resolving the dispute. This usually takes a few seconds."}
          </p>
        </div>
      )}

      {/* ── Step 3: Complete ── */}
      {isSettled && (
        <div
          className={`rounded-lg border-2 p-6 text-center ${
            escrow.status === "released"
              ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30"
              : escrow.status === "refunded"
                ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/30"
                : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30"
          }`}
        >
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              escrow.status === "released"
                ? "bg-green-500"
                : escrow.status === "refunded"
                  ? "bg-orange-500"
                  : "bg-red-500"
            } text-white`}
          >
            {escrow.status === "released" ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            )}
          </div>
          <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
            {escrow.status === "released"
              ? "Payment complete"
              : escrow.status === "refunded"
                ? "Payment refunded"
                : "Dispute resolved"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {escrow.status === "released"
              ? "Funds have been released to the seller. The transaction is complete."
              : escrow.status === "refunded"
                ? "Funds have been returned to the buyer."
                : "This escrow was settled through dispute resolution."}
          </p>
        </div>
      )}

      {/* ── Technical Details (collapsible) ── */}
      <details className="rounded-lg border border-gray-200 dark:border-gray-800">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Technical details
        </summary>
        <div className="space-y-3 border-t border-gray-200 px-4 py-4 dark:border-gray-800">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-gray-500">Escrow ID</span>
              <p className="font-mono text-xs break-all">{escrow.escrowApiId}</p>
            </div>
            <div>
              <span className="text-gray-500">Pattern</span>
              <p className="font-medium">{escrow.listing.escrowPattern}</p>
            </div>
            <div>
              <span className="text-gray-500">Buyer</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {escrow.buyer.image && (
                  <img src={escrow.buyer.image} alt="" className="h-4 w-4 rounded-full" />
                )}
                <span>{escrow.buyer.name || "Anonymous"}</span>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Seller</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {escrow.listing.seller?.image && (
                  <img src={escrow.listing.seller.image} alt="" className="h-4 w-4 rounded-full" />
                )}
                <span>{escrow.listing.seller?.name || "Anonymous"}</span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-sm text-gray-500">Funding Address</span>
            <p className="mt-0.5 break-all font-mono text-xs">{escrow.fundingAddress}</p>
          </div>

          {escrow.fundingTxId && (
            <div className="space-y-1 text-sm">
              <span className="text-gray-500">Transaction IDs</span>
              <div className="space-y-1 mt-0.5">
                <p>
                  <span className="text-gray-400">Funding: </span>
                  <span className="font-mono text-xs break-all">{escrow.fundingTxId}</span>
                  {escrow.fundingConfirmed && <span className="ml-1 text-xs text-green-600">(confirmed)</span>}
                </p>
                {escrow.releaseTxId && (
                  <p>
                    <span className="text-gray-400">Release: </span>
                    <span className="font-mono text-xs break-all">{escrow.releaseTxId}</span>
                    {escrow.settlementConfirmed && <span className="ml-1 text-xs text-green-600">(confirmed)</span>}
                  </p>
                )}
                {escrow.refundTxId && (
                  <p>
                    <span className="text-gray-400">Refund: </span>
                    <span className="font-mono text-xs break-all">{escrow.refundTxId}</span>
                  </p>
                )}
                {escrow.disputeTxId && (
                  <p>
                    <span className="text-gray-400">Dispute: </span>
                    <span className="font-mono text-xs break-all">{escrow.disputeTxId}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
