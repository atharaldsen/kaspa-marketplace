"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EscrowStatusBadge } from "@/components/escrow-status-badge";
import { KasAmount } from "@/components/kas-amount";

interface EscrowSummary {
  id: string;
  status: string;
  escrowAmount: string;
  stageIndex: number;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    price: string;
    escrowPattern: string;
    sellerId: string;
  };
  buyer: { id: string; name: string | null; image: string | null };
}

export default function DashboardPage() {
  const [escrows, setEscrows] = useState<EscrowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/escrows")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load escrows");
        return r.json();
      })
      .then(setEscrows)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const active = escrows.filter(
    (e) => !["released", "refunded", "disputed", "escaped"].includes(e.status)
  );
  const settled = escrows.filter((e) =>
    ["released", "refunded", "disputed", "escaped"].includes(e.status)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-kaspa-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Your escrow transactions.
      </p>

      {error ? (
        <div className="mt-8 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      ) : escrows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500 dark:border-gray-700">
          <p>No escrows yet.</p>
          <Link
            href="/browse"
            className="mt-2 inline-block text-kaspa-500 hover:underline"
          >
            Browse the marketplace to get started
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Active */}
          {active.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold">
                Active ({active.length})
              </h2>
              <div className="mt-3 space-y-3">
                {active.map((e) => (
                  <EscrowRow key={e.id} escrow={e} />
                ))}
              </div>
            </div>
          )}

          {/* Settled */}
          {settled.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-500">
                Settled ({settled.length})
              </h2>
              <div className="mt-3 space-y-3">
                {settled.map((e) => (
                  <EscrowRow key={e.id} escrow={e} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EscrowRow({ escrow }: { escrow: EscrowSummary }) {
  return (
    <Link
      href={`/escrow/${escrow.id}`}
      className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:border-kaspa-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-kaspa-800 dark:hover:bg-gray-900/50"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{escrow.listing.title}</span>
          <EscrowStatusBadge status={escrow.status} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span>{escrow.listing.escrowPattern}</span>
          <span>Stage {escrow.stageIndex + 1}</span>
          <span>{new Date(escrow.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <KasAmount sompi={escrow.escrowAmount} className="shrink-0 font-bold" />
    </Link>
  );
}
