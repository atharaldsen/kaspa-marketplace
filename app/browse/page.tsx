import { prisma } from "@/lib/db";
import { BrowseClient } from "./browse-client";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "active" },
    include: { seller: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  const serialized = listings.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    price: l.price.toString(),
    category: l.category,
    escrowPattern: l.escrowPattern,
    imageData: l.imageData,
    seller: {
      name: l.seller?.name ?? null,
      image: l.seller?.image ?? null,
    },
  }));

  return <BrowseClient listings={serialized} />;
}
