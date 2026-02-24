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

interface ListingSummary {
  id: string;
  title: string;
  price: string;
  category: string;
  escrowPattern: string;
  status: string;
  escrowCount: number;
  hasActiveEscrow: boolean;
  createdAt: string;
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
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/escrows").then((r) => {
        if (!r.ok) throw new Error("Unable to load your escrows.");
        return r.json();
      }),
      fetch("/api/listings/mine").then((r) => {
        if (!r.ok) throw new Error("Unable to load your listings.");
        return r.json();
      }),
    ])
      .then(([escrowData, listingData]) => {
        setEscrows(escrowData);
        setListings(listingData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function cancelListing(listingId: string) {
    setCancellingId(listingId);
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to cancel listing");
        return;
      }
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: "cancelled" } : l))
      );
    } finally {
      setCancellingId(null);
    }
  }

  const active = escrows.filter((e) => !SETTLED_STATUSES.includes(e.status));
  const settled = escrows.filter((e) => SETTLED_STATUSES.includes(e.status));
  const activeListings = listings.filter((l) => l.status === "active");
  const inactiveListings = listings.filter((l) => l.status !== "active");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-kaspa-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ── My Listings ── */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Listings</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Items you&apos;ve listed for sale.
            </p>
          </div>
          <Link
            href="/listings/create"
            className="rounded-lg bg-kaspa-500 px-4 py-2 text-sm font-medium text-white hover:bg-kaspa-600"
          >
            + New Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
            <p>You haven&apos;t listed anything yet.</p>
            <Link
              href="/listings/create"
              className="mt-2 inline-block text-kaspa-500 hover:underline"
            >
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {activeListings.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Active ({activeListings.length})
                </h2>
                <div className="mt-2 space-y-2">
                  {activeListings.map((l) => (
                    <ListingRow
                      key={l.id}
                      listing={l}
                      onCancel={cancelListing}
                      cancelling={cancellingId === l.id}
                    />
                  ))}
                </div>
              </div>
            )}
            {inactiveListings.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Inactive ({inactiveListings.length})
                </h2>
                <div className="mt-2 space-y-2">
                  {inactiveListings.map((l) => (
                    <ListingRow key={l.id} listing={l} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Escrows ── */}
      <div>
        <h1 className="text-2xl font-bold">Escrows</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Your escrow transactions.
        </p>

        {error ? (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        ) : escrows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
            <p>No escrows yet.</p>
            <Link
              href="/browse"
              className="mt-2 inline-block text-kaspa-500 hover:underline"
            >
              Browse the marketplace to get started
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Active ({active.length})
                </h2>
                <div className="mt-2 space-y-2">
                  {active.map((e) => (
                    <EscrowRow key={e.id} escrow={e} />
                  ))}
                </div>
              </div>
            )}
            {settled.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Settled ({settled.length})
                </h2>
                <div className="mt-2 space-y-2">
                  {settled.map((e) => (
                    <EscrowRow key={e.id} escrow={e} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ListingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    sold: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.cancelled}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ListingRow({
  listing,
  onCancel,
  cancelling,
}: {
  listing: ListingSummary;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <Link href={`/listings/${listing.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{listing.title}</span>
          <ListingStatusBadge status={listing.status} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span>{listing.category}</span>
          <span>{listing.escrowPattern}</span>
          {listing.escrowCount > 0 && (
            <span>{listing.escrowCount} escrow{listing.escrowCount !== 1 ? "s" : ""}</span>
          )}
          <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <KasAmount sompi={listing.price} className="shrink-0 font-bold" />
        {listing.status === "active" && !listing.hasActiveEscrow && onCancel && (
          <button
            onClick={() => onCancel(listing.id)}
            disabled={cancelling}
            className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {cancelling ? "Cancelling..." : "Cancel"}
          </button>
        )}
      </div>
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
