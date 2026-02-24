import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/listings/mine — get current user's own listings
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listings = await prisma.listing.findMany({
    where: { sellerId: session.user.id },
    include: {
      escrows: {
        select: { id: true, status: true, stageIndex: true },
        orderBy: { stageIndex: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    listings.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price.toString(),
      category: l.category,
      escrowPattern: l.escrowPattern,
      status: l.status,
      escrowCount: l.escrows.length,
      hasActiveEscrow: l.escrows.some(
        (e) => !["released", "refunded", "disputed", "escaped"].includes(e.status)
      ),
      createdAt: l.createdAt.toISOString(),
    }))
  );
}
