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
  totalStages: number;
  createdAt: string;
  roles: ("buyer" | "seller")[];
  listing: {
    id: string;
    title: string;
    price: string;
    escrowPattern: string;
    sellerId: string;
  };
  buyer: { id: string; name: string | null; image: string | null };
}

const SETTLED_STATUSES = ["released", "refunded", "disputed", "escaped"];

function getActionHint(status: string, role: "buyer" | "seller"): string | null {
  switch (status) {
    case "awaiting_funding":
      return role === "buyer"
        ? "Send KAS to the escrow address"
        : "Waiting for buyer to fund";
    case "funded":
    case "funding_detected":
      return "Payment detected — locking automatically...";
    case "locking":
      return "Funds are being locked...";
    case "locked":
      return role === "buyer"
        ? "Approve when seller delivers"
        : "Waiting for buyer to approve";
    default:
      return null;
  }
}

export default function DashboardPage() {
  const [escrows, setEscrows] = useState<EscrowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/escrows")
      .then((r) => {
        if (!r.ok) throw new Error("Unable to load your escrows. Please refresh the page.");
        return r.json();
      })
      .then(setEscrows)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const active = escrows.filter((e) => !SETTLED_STATUSES.includes(e.status));
  const settled = escrows.filter((e) => SETTLED_STATUSES.includes(e.status));

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

function RoleBadge({ role }: { role: "buyer" | "seller" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        role === "buyer"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
      }`}
    >
      {role === "buyer" ? "Buyer" : "Seller"}
    </span>
  );
}

function EscrowRow({ escrow }: { escrow: EscrowSummary }) {
  // For action hints, prefer buyer perspective (buyer has more actions)
  const primaryRole = escrow.roles.includes("buyer") ? "buyer" : "seller";
  const hint = getActionHint(escrow.status, primaryRole);

  return (
    <Link
      href={`/escrow/${escrow.id}`}
      className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-kaspa-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-kaspa-800 dark:hover:bg-gray-900/50"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{escrow.listing.title}</span>
            <EscrowStatusBadge status={escrow.status} />
            {escrow.roles.map((r) => (
              <RoleBadge key={r} role={r} />
            ))}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span>{escrow.listing.escrowPattern}</span>
            {escrow.totalStages > 1 && (
              <span>Stage {escrow.stageIndex + 1} of {escrow.totalStages}</span>
            )}
            <span>{new Date(escrow.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <KasAmount sompi={escrow.escrowAmount} className="shrink-0 font-bold" />
      </div>

      {hint && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-kaspa-600 dark:text-kaspa-400">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span>{hint}</span>
        </div>
      )}
    </Link>
  );
}
