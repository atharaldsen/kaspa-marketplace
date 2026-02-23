"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useCallback, Suspense } from "react";
import { ListingCard } from "@/components/listing-card";

interface BrowseListing {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  escrowPattern: string;
  imageData: string | null;
  seller: { name: string | null; image: string | null };
}

const categoryLabels: Record<string, string> = {
  general: "General",
  "digital-goods": "Digital Goods",
  services: "Services",
  electronics: "Electronics",
  clothing: "Clothing",
  collectibles: "Collectibles",
};

const patternLabels: Record<string, string> = {
  basic: "Basic Escrow",
  timelocked: "Time-Locked",
  covenant_multi_path: "Multi-Path Covenant",
  payment_split: "Payment Split",
};

type SortOption = "newest" | "price_asc" | "price_desc";

function BrowseFilters({ listings }: { listings: BrowseListing[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const pattern = searchParams.get("pattern") || "";
  const sort = (searchParams.get("sort") || "newest") as SortOption;

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`/browse?${params.toString()}`);
    },
    [searchParams, router]
  );

  const hasFilters = query || category || pattern || sort !== "newest";

  const filtered = useMemo(() => {
    let result = [...listings];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    if (category) {
      result = result.filter((l) => l.category === category);
    }

    if (pattern) {
      result = result.filter((l) => l.escrowPattern === pattern);
    }

    switch (sort) {
      case "price_asc":
        result.sort((a, b) => {
          try {
            const ba = BigInt(a.price), bb = BigInt(b.price);
            return ba < bb ? -1 : ba > bb ? 1 : 0;
          } catch { return 0; }
        });
        break;
      case "price_desc":
        result.sort((a, b) => {
          try {
            const ba = BigInt(a.price), bb = BigInt(b.price);
            return ba > bb ? -1 : ba < bb ? 1 : 0;
          } catch { return 0; }
        });
        break;
      case "newest":
      default:
        break;
    }

    return result;
  }, [listings, query, category, pattern, sort]);

  function clearFilters() {
    router.replace("/browse");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Browse Marketplace</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Find items and services protected by Kaspa escrow.
      </p>

      {/* Filter Bar */}
      <div className="mt-6 space-y-4">
        {/* Search + Sort row */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => updateParams("q", e.target.value)}
              placeholder="Search listings..."
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-kaspa-500 focus:outline-none focus:ring-1 focus:ring-kaspa-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => updateParams("sort", e.target.value === "newest" ? "" : e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kaspa-500 focus:outline-none focus:ring-1 focus:ring-kaspa-500 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 self-center mr-1">Category:</span>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => updateParams("category", category === value ? "" : value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === value
                  ? "bg-kaspa-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pattern chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 self-center mr-1">Escrow:</span>
          {Object.entries(patternLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => updateParams("pattern", pattern === value ? "" : value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                pattern === value
                  ? "bg-kaspa-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500 dark:border-gray-700">
          {listings.length === 0 ? (
            <p>No listings yet. Be the first to create one!</p>
          ) : (
            <>
              <p>No listings match your filters.</p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-sm text-kaspa-500 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-500">
            {filtered.length} {filtered.length === 1 ? "listing" : "listings"}
            {hasFilters ? " matching filters" : ""}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                description={listing.description}
                price={listing.price}
                category={listing.category}
                escrowPattern={listing.escrowPattern}
                imageData={listing.imageData}
                seller={listing.seller}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BrowseClient({ listings }: { listings: BrowseListing[] }) {
  return (
    <Suspense fallback={
      <div>
        <h1 className="text-2xl font-bold">Browse Marketplace</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Find items and services protected by Kaspa escrow.
        </p>
        <div className="mt-8 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-kaspa-500 border-t-transparent" />
        </div>
      </div>
    }>
      <BrowseFilters listings={listings} />
    </Suspense>
  );
}
