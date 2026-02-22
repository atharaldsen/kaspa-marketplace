import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundEscrow } from "@/lib/escrow-api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const escrow = await prisma.escrow.findUnique({
    where: { id },
    include: { listing: { select: { sellerId: true } } },
  });

  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  if (
    escrow.buyerId !== session.user.id &&
    escrow.listing.sellerId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await refundEscrow(escrow.escrowApiId);

    await prisma.escrow.update({
      where: { id },
      data: {
        status: result.status,
        refundTxId: result.tx_id,
      },
    });

    // Re-activate listing
    await prisma.listing.update({
      where: { id: escrow.listingId },
      data: { status: "active" },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: "Failed to refund escrow" }, { status: 500 });
  }
}
