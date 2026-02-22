"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { EscrowStatusBadge } from "@/components/escrow-status-badge";
import { EscrowActions } from "@/components/escrow-actions";
import { EscrowTimeline } from "@/components/escrow-timeline";
import { MilestoneTracker } from "@/components/milestone-tracker";
import { KasAmount } from "@/components/kas-amount";
import Link from "next/link";

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

export default function EscrowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [escrow, setEscrow] = useState<EscrowDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEscrow = useCallback(async () => {
    try {
      const res = await fetch(`/api/escrows/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load escrow");
      }
      setEscrow(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEscrow();

    // Auto-refresh every 5s for active escrows
    const interval = setInterval(fetchEscrow, 5000);
    return () => clearInterval(interval);
  }, [fetchEscrow]);

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

  const isSettled = ["released", "refunded", "disputed", "escaped"].includes(
    escrow.status
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          &larr; Back to Dashboard
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">Escrow</h1>
          <EscrowStatusBadge status={escrow.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          For{" "}
          <Link
            href={`/listings/${escrow.listing.id}`}
            className="text-kaspa-500 hover:underline"
          >
            {escrow.listing.title}
          </Link>{" "}
          &middot; You are the{" "}
          <span className="font-medium">{escrow.role}</span>
        </p>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <EscrowTimeline
          status={escrow.status}
          fundingTxId={escrow.fundingTxId}
          releaseTxId={escrow.releaseTxId}
          refundTxId={escrow.refundTxId}
          disputeTxId={escrow.disputeTxId}
        />
      </div>

      {/* Milestone Stages (if applicable) */}
      {escrow.stages && escrow.stages.length > 1 && (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <MilestoneTracker stages={escrow.stages} />
        </div>
      )}

      {/* Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-500">Amount</h3>
          <KasAmount sompi={escrow.escrowAmount} className="mt-1 text-xl font-bold" />
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-500">Pattern</h3>
          <p className="mt-1 text-sm font-medium">
            {escrow.listing.escrowPattern}
          </p>
        </div>

        {/* Funding address */}
        <div className="col-span-full rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-500">
            Funding Address
          </h3>
          <p className="mt-1 break-all font-mono text-sm">
            {escrow.fundingAddress}
          </p>
          {escrow.utxoAmount != null && (
            <p className="mt-1 text-xs text-gray-500">
              UTXO balance: {(escrow.utxoAmount / 100_000_000).toFixed(2)} KAS
            </p>
          )}
        </div>

        {/* Parties */}
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-500">Buyer</h3>
          <div className="mt-1 flex items-center gap-2">
            {escrow.buyer.image && (
              <img
                src={escrow.buyer.image}
                alt=""
                className="h-5 w-5 rounded-full"
              />
            )}
            <span className="text-sm">{escrow.buyer.name || "Anonymous"}</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-500">Seller</h3>
          <div className="mt-1 flex items-center gap-2">
            {escrow.listing.seller?.image && (
              <img
                src={escrow.listing.seller.image}
                alt=""
                className="h-5 w-5 rounded-full"
              />
            )}
            <span className="text-sm">
              {escrow.listing.seller?.name || "Anonymous"}
            </span>
          </div>
        </div>

        {/* TX IDs */}
        {escrow.fundingTxId && (
          <div className="col-span-full rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-500">
              Transaction IDs
            </h3>
            <div className="mt-2 space-y-1 text-sm">
              <div>
                <span className="text-gray-500">Funding: </span>
                <span className="break-all font-mono text-xs">
                  {escrow.fundingTxId}
                </span>
                {escrow.fundingConfirmed && (
                  <span className="ml-1 text-xs text-green-600">
                    (confirmed)
                  </span>
                )}
              </div>
              {escrow.releaseTxId && (
                <div>
                  <span className="text-gray-500">Release: </span>
                  <span className="break-all font-mono text-xs">
                    {escrow.releaseTxId}
                  </span>
                  {escrow.settlementConfirmed && (
                    <span className="ml-1 text-xs text-green-600">
                      (confirmed)
                    </span>
                  )}
                </div>
              )}
              {escrow.refundTxId && (
                <div>
                  <span className="text-gray-500">Refund: </span>
                  <span className="break-all font-mono text-xs">
                    {escrow.refundTxId}
                  </span>
                </div>
              )}
              {escrow.disputeTxId && (
                <div>
                  <span className="text-gray-500">Dispute: </span>
                  <span className="break-all font-mono text-xs">
                    {escrow.disputeTxId}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DAA info */}
        {escrow.currentDaa != null && escrow.expiresAtDaa != null && (
          <div className="col-span-full rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-500">
              Time Lock Info
            </h3>
            <div className="mt-1 text-sm">
              <span className="text-gray-500">Current DAA: </span>
              {escrow.currentDaa.toLocaleString()}
              <span className="ml-4 text-gray-500">Expires at: </span>
              {escrow.expiresAtDaa.toLocaleString()}
              {escrow.currentDaa >= escrow.expiresAtDaa && (
                <span className="ml-2 text-orange-600">(expired — refund available)</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isSettled && (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="mb-3 text-sm font-semibold">Actions</h3>
          <EscrowActions
            escrowId={escrow.id}
            status={escrow.status}
            pattern={escrow.listing.escrowPattern}
            role={escrow.role}
            onAction={fetchEscrow}
          />
        </div>
      )}

      {/* Settled notice */}
      {isSettled && (
        <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-900">
          This escrow has been settled.{" "}
          {escrow.status === "released"
            ? "Funds were released to the seller."
            : escrow.status === "refunded"
              ? "Funds were refunded to the buyer."
              : "This escrow was resolved via dispute."}
        </div>
      )}
    </div>
  );
}
