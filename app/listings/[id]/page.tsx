import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { KasAmount } from "@/components/kas-amount";
import { BuyButton } from "@/components/buy-button";
import Link from "next/link";

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

const patternDescriptions: Record<string, string> = {
  basic: "Both buyer and seller must approve before funds are transferred.",
  timelocked: "Buyer gets an automatic refund if the seller doesn't deliver in time.",
  covenant_multi_path:
    "Full protection — approve payment, open a dispute, or get a refund if time runs out.",
  payment_split:
    "Payment is automatically split between seller and a platform fee when approved.",
};

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true, image: true } },
      escrows: {
        select: { id: true, status: true, stageIndex: true, escrowAmount: true },
        orderBy: { stageIndex: "asc" },
      },
    },
  });

  if (!listing) notFound();

  const isSeller = session?.user?.id === listing.sellerId;
  const hasActiveEscrow = listing.escrows.some(
    (e) => !["released", "refunded", "disputed"].includes(e.status)
  );

  let stages: { name: string; priceSompi: string }[] | null = null;
  if (listing.stages) {
    try {
      stages = JSON.parse(listing.stages);
    } catch { /* invalid JSON — ignore */ }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <Link
        href="/browse"
        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        &larr; Back to Browse
      </Link>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {/* Image */}
        <div className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          {listing.imageData ? (
            <img
              src={listing.imageData}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl text-gray-300">
              {listing.category === "digital-goods"
                ? "💾"
                : listing.category === "services"
                  ? "🔧"
                  : "📦"}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {listing.category}
            </span>
            {listing.status !== "active" && (
              <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                {listing.status}
              </span>
            )}
          </div>

          <h1 className="mt-2 text-2xl font-bold">{listing.title}</h1>

          <KasAmount
            sompi={listing.price.toString()}
            className="mt-2 text-2xl font-bold"
          />

          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {listing.description}
          </p>

          {/* Escrow Pattern Info */}
          <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold">Escrow Protection</h3>
            <p className="mt-1 text-sm font-medium text-kaspa-500">
              {patternLabels[listing.escrowPattern] || listing.escrowPattern}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {patternDescriptions[listing.escrowPattern]}
            </p>
            {listing.lockTimeDaa && (
              <p className="mt-1 text-xs text-gray-500">
                Auto-refund if not delivered within ~{formatLockTime(listing.lockTimeDaa)}
              </p>
            )}
            {listing.feePercent && (
              <p className="mt-1 text-xs text-gray-500">
                Platform fee: {listing.feePercent}%
              </p>
            )}
          </div>

          {/* Stages */}
          {stages && stages.length > 0 && (
            <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold">Milestone Stages</h3>
              <div className="mt-2 space-y-2">
                {stages.map((stage, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {i + 1}. {stage.name}
                    </span>
                    <KasAmount sompi={stage.priceSompi} className="font-medium" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller */}
          <div className="mt-4 flex items-center gap-2">
            {listing.seller?.image && (
              <img
                src={listing.seller.image}
                alt=""
                className="h-6 w-6 rounded-full"
              />
            )}
            <span className="text-sm text-gray-500">
              Sold by {listing.seller?.name || "Anonymous"}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-6">
            {!session ? (
              <Link
                href="/api/auth/signin"
                className="block rounded-md bg-kaspa-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-kaspa-600"
              >
                Sign in to Buy
              </Link>
            ) : isSeller ? (
              <p className="text-sm text-gray-500">This is your listing.</p>
            ) : hasActiveEscrow ? (
              <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                An escrow is already in progress for this listing.
              </p>
            ) : listing.status !== "active" ? (
              <p className="text-sm text-gray-500">
                This listing is no longer active.
              </p>
            ) : (
              <BuyButton
                listingId={listing.id}
                title={listing.title}
                price={listing.price.toString()}
                escrowPattern={listing.escrowPattern}
                stages={stages}
                lockTimeDaa={listing.lockTimeDaa}
                feePercent={listing.feePercent}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
