import { prisma } from "@/lib/db";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "active" },
    include: { seller: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Browse Marketplace</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Find items and services protected by Kaspa escrow.
      </p>

      {listings.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500 dark:border-gray-700">
          No listings yet. Be the first to create one!
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              description={listing.description}
              price={listing.price.toString()}
              category={listing.category}
              escrowPattern={listing.escrowPattern}
              imageData={listing.imageData}
              seller={{
                name: listing.seller?.name ?? null,
                image: listing.seller?.image ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
