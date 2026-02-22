"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuyButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
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
      {error && (
        <div className="mb-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full rounded-md bg-kaspa-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-kaspa-600 disabled:opacity-50"
      >
        {loading ? "Creating Escrow..." : "Buy with Escrow"}
      </button>
    </div>
  );
}
