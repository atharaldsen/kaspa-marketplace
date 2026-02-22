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
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not locked") || msg.includes("invalid status")) {
      return NextResponse.json(
        { error: "This escrow is not in a state that allows refund." },
        { status: 400 }
      );
    }
    if (msg.includes("timelock") || msg.includes("not expired")) {
      return NextResponse.json(
        { error: "The time lock has not expired yet. Refund will be available after the lock period ends." },
        { status: 400 }
      );
    }
    if (msg.includes("confirmation")) {
      return NextResponse.json(
        { error: "Transaction not yet confirmed. Please wait a moment and try again." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Unable to process refund right now. Please try again." }, { status: 500 });
  }
}
