import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/escrows — list current user's escrows (as buyer or seller)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const escrows = await prisma.escrow.findMany({
    where: {
      OR: [
        { buyerId: session.user.id },
        { listing: { sellerId: session.user.id } },
      ],
    },
    include: {
      listing: {
        select: { id: true, title: true, price: true, escrowPattern: true, sellerId: true },
      },
      buyer: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    escrows.map((e) => ({
      ...e,
      escrowAmount: e.escrowAmount.toString(),
      listing: {
        ...e.listing,
        price: e.listing.price.toString(),
      },
    }))
  );
}
