import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { disputeEscrow } from "@/lib/escrow-api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { winner } = body;

  if (!winner || !["buyer", "seller"].includes(winner)) {
    return NextResponse.json(
      { error: "winner must be 'buyer' or 'seller'" },
      { status: 400 }
    );
  }

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
    const result = await disputeEscrow(escrow.escrowApiId, winner);

    await prisma.escrow.update({
      where: { id },
      data: {
        status: result.status,
        disputeTxId: result.tx_id,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Dispute error:", err);
    return NextResponse.json({ error: "Failed to dispute escrow" }, { status: 500 });
  }
}
