import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/listings/[id] — get listing detail
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...listing,
    price: listing.price.toString(),
    escrows: listing.escrows.map((e) => ({
      ...e,
      escrowAmount: e.escrowAmount.toString(),
    })),
  });
}
