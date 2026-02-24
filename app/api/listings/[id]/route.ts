import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

const SETTLED_STATUSES = ["released", "refunded", "disputed", "escaped"];

// PATCH /api/listings/[id] — cancel a listing (seller only, no active escrows)
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      escrows: { select: { id: true, status: true } },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (listing.status !== "active") {
    return NextResponse.json(
      { error: "Only active listings can be cancelled." },
      { status: 400 }
    );
  }

  const hasActiveEscrow = listing.escrows.some(
    (e) => !SETTLED_STATUSES.includes(e.status)
  );

  if (hasActiveEscrow) {
    return NextResponse.json(
      { error: "This listing has an active escrow and cannot be cancelled right now." },
      { status: 400 }
    );
  }

  await prisma.listing.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ status: "cancelled" });
}
