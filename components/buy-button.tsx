"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KasAmount } from "./kas-amount";

function formatLockTime(daaBlocks: number): string {
  if (daaBlocks < 60) return `${daaBlocks} seconds`;
  if (daaBlocks < 3600) return `${Math.round(daaBlocks / 60)} minutes`;
  if (daaBlocks < 86400) return `${(daaBlocks / 3600).toFixed(1)} hours`;
  return `${(daaBlocks / 86400).toFixed(1)} days`;
}

const patternLabels: Record<string, string> = {
  basic: "Basic Escrow",
  timelocked: "Time-Locked",
  covenant_multi_path: "Multi-Path Covenant",
  payment_split: "Payment Split",
};

const patternBuyerExplanations: Record<string, string> = {
  basic: "Funds are held in escrow until both you and the seller agree to release.",
  timelocked: "Funds auto-refund to you if the seller doesn't deliver before the timeout.",
  covenant_multi_path: "You can approve, dispute, or receive an automatic refund after timeout.",
  payment_split: "On approval, payment splits between the seller and a platform fee automatically.",
};

interface BuyButtonProps {
  listingId: string;
  title: string;
  price: string;
  escrowPattern: string;
  stages?: { name: string; priceSompi: string }[] | null;
  lockTimeDaa?: number | null;
  feePercent?: number | null;
}

export function BuyButton({
  listingId,
  title,
  price,
  escrowPattern,
  stages,
  lockTimeDaa,
  feePercent,
}: BuyButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${listingId}/buy`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unable to start purchase. Please try again.");
      }

      const escrow = await res.json();
      router.push(`/escrow/${escrow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full rounded-md bg-kaspa-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-kaspa-600"
      >
        Buy with Escrow
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !loading && setShowConfirm(false)}
          />
          {/* Modal */}
          <div className="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-bold">Confirm Purchase</h2>

            {error && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Item</span>
                <span className="text-sm font-medium text-right ml-4 truncate">{title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Price</span>
                <KasAmount sompi={price} className="text-sm font-bold" />
              </div>
              <div>
                <span className="text-sm font-medium text-kaspa-500">
                  {patternLabels[escrowPattern] || escrowPattern}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {patternBuyerExplanations[escrowPattern]}
                </p>
              </div>

              {stages && stages.length > 1 && (
                <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Milestones</p>
                  {stages.map((s, i) => (
                    <div key={i} className="mt-1 flex justify-between text-xs">
                      <span>{s.name}</span>
                      <KasAmount sompi={s.priceSompi} className="font-medium" />
                    </div>
                  ))}
                </div>
              )}

              {lockTimeDaa && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Auto-refund if not delivered within ~{formatLockTime(lockTimeDaa)}
                </p>
              )}

              {feePercent && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Platform fee: {feePercent}% deducted on release
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 rounded-md bg-kaspa-500 px-4 py-2 text-sm font-medium text-white hover:bg-kaspa-600 disabled:opacity-50"
              >
                {loading ? "Creating Escrow..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
